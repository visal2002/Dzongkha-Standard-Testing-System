import { validatePassportPhotoDataUrl } from '../../../apps/identity-service/src/profile-photo';

function pngDataUrl(width: number, height: number, mime = 'image/png') {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function jpegDataUrl(width: number, height: number) {
  const bytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x07, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
  ]);
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

describe('passport photo validation', () => {
  it('accepts a 35:45 PNG passport photo', () => {
    const photo = pngDataUrl(700, 900);
    expect(validatePassportPhotoDataUrl(photo)).toBe(photo);
  });

  it('accepts a 35:45 JPEG passport photo', () => {
    const photo = jpegDataUrl(350, 450);
    expect(validatePassportPhotoDataUrl(photo)).toBe(photo);
  });

  it.each([
    ['a square photo', pngDataUrl(600, 600)],
    ['a landscape photo', pngDataUrl(900, 700)],
    ['a photo below the minimum resolution', pngDataUrl(280, 360)],
  ])('rejects %s', (_description, photo) => {
    expect(() => validatePassportPhotoDataUrl(photo)).toThrow('35:45 aspect ratio');
  });

  it('rejects unsupported formats and spoofed image content', () => {
    expect(() => validatePassportPhotoDataUrl(pngDataUrl(700, 900, 'image/webp'))).toThrow('JPEG or PNG');
    expect(() => validatePassportPhotoDataUrl(`data:image/png;base64,${Buffer.from('not an image').toString('base64')}`))
      .toThrow('not a valid JPEG or PNG');
  });

  it('rejects files larger than 3 MB', () => {
    const oversized = `data:image/png;base64,${Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64')}`;
    expect(() => validatePassportPhotoDataUrl(oversized)).toThrow('3 MB or smaller');
  });
});
