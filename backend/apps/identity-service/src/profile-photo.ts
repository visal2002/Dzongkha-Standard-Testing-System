import { DomainException } from '@dzongjuk/common';

export const PASSPORT_PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const PASSPORT_PHOTO_MIN_WIDTH = 350;
export const PASSPORT_PHOTO_MIN_HEIGHT = 450;
export const PASSPORT_PHOTO_MIN_RATIO = 0.72;
export const PASSPORT_PHOTO_MAX_RATIO = 0.84;

type ImageDimensions = { width: number; height: number };

const invalidPhoto = (message: string): never => {
  throw new DomainException('PROFILE_PHOTO_INVALID', message, 400);
};

function pngDimensions(bytes: Buffer): ImageDimensions | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) || bytes.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) return null;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      if (segmentLength < 7) return null;
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  return null;
}

export function validatePassportPhotoDataUrl(value: string): string {
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return invalidPhoto('Upload a JPEG or PNG passport photo.');

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > PASSPORT_PHOTO_MAX_BYTES) {
    return invalidPhoto('The passport photo must be 3 MB or smaller.');
  }

  const dimensions = match[1] === 'image/png' ? pngDimensions(bytes) : jpegDimensions(bytes);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return invalidPhoto('The selected file is not a valid JPEG or PNG image.');
  }

  const ratio = dimensions.width / dimensions.height;
  if (
    dimensions.width < PASSPORT_PHOTO_MIN_WIDTH
    || dimensions.height < PASSPORT_PHOTO_MIN_HEIGHT
    || ratio < PASSPORT_PHOTO_MIN_RATIO
    || ratio > PASSPORT_PHOTO_MAX_RATIO
  ) {
    return invalidPhoto('Use a portrait passport photo with a 35:45 aspect ratio and at least 350 x 450 pixels.');
  }

  return value;
}
