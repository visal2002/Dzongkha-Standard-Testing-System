import sharp from 'sharp';
import { DomainException } from '@dzongjuk/common';
export const PASSPORT_PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const invalid = (message: string): never => {
  throw new DomainException('PROFILE_PHOTO_INVALID', message, 400);
};

// Re-encoding decodes the actual image, strips metadata and stores a safe JPEG.
export async function validatePassportPhotoDataUrl(value: string): Promise<string> {
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return invalid('Please choose a JPG or PNG photo.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > PASSPORT_PHOTO_MAX_BYTES)
    return invalid('This photo could not be saved. Please choose another photo.');
  try {
    const image = sharp(bytes, {
      limitInputPixels: 50_000_000,
      failOn: 'warning',
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !['jpeg', 'png'].includes(metadata.format ?? '') ||
      `image/${metadata.format}` !== match[1] ||
      (metadata.pages ?? 1) > 1
    )
      return invalid('Please choose a JPG or PNG photo.');
    const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
    const height = metadata.autoOrient?.height ?? metadata.height ?? 0;
    if (width < 350 || height < 450)
      return invalid('The photo is too small. Please upload a higher-quality photo.');
    if (Math.abs(width / height - 7 / 9) > 0.015)
      return invalid('Please adjust your photo in the preview and try saving again.');
    const output = await image
      .autoOrient()
      .resize(350, 450, { fit: 'cover', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 88, progressive: true })
      .timeout({ seconds: 10 })
      .toBuffer();
    if (output.length > PASSPORT_PHOTO_MAX_BYTES)
      return invalid('This photo could not be saved. Please choose another photo.');
    return `data:image/jpeg;base64,${output.toString('base64')}`;
  } catch (error) {
    if (error instanceof DomainException) throw error;
    return invalid('We could not read this photo. Please choose a different JPG or PNG photo.');
  }
}
