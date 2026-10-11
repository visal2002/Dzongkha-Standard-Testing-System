import sharp from 'sharp';
import { validatePassportPhotoDataUrl } from '../../../apps/identity-service/src/profile-photo';

const photo = async (
  width: number,
  height: number,
  format: 'png' | 'jpeg' = 'png',
  orientation?: number,
) => {
  let image = sharp({ create: { width, height, channels: 3, background: '#987654' } });
  if (orientation) image = image.withMetadata({ orientation });
  const bytes = await (format === 'png' ? image.png() : image.jpeg()).toBuffer();
  return `data:image/${format};base64,${bytes.toString('base64')}`;
};
describe('Secure passport photo normalization', () => {
  it.each(['png', 'jpeg'] as const)(
    'fully decodes %s and stores a metadata-free 350x450 JPEG',
    async (format) => {
      const result = await validatePassportPhotoDataUrl(await photo(700, 900, format));
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
      const bytes = Buffer.from(result.split(',')[1], 'base64');
      const metadata = await sharp(bytes).metadata();
      expect(metadata.width).toBe(350);
      expect(metadata.height).toBe(450);
      expect(metadata.exif).toBeUndefined();
      expect(bytes.length).toBeLessThan(3 * 1024 * 1024);
    },
  );
  it('corrects EXIF orientation before validating proportions', async () => {
    const result = await validatePassportPhotoDataUrl(await photo(900, 700, 'jpeg', 6));
    const metadata = await sharp(Buffer.from(result.split(',')[1], 'base64')).metadata();
    expect(metadata.width).toBe(350);
    expect(metadata.height).toBe(450);
    expect(metadata.orientation).toBeUndefined();
  });
  it.each([
    [280, 360],
    [700, 700],
    [900, 700],
  ])('rejects inadequate crop %sx%s', async (w, h) => {
    await expect(validatePassportPhotoDataUrl(await photo(w, h))).rejects.toThrow();
  });
  it('rejects MIME spoofing, malformed payloads and header-only files', async () => {
    await expect(
      validatePassportPhotoDataUrl((await photo(700, 900)).replace('image/png', 'image/jpeg')),
    ).rejects.toThrow();
    await expect(
      validatePassportPhotoDataUrl('data:image/png;base64,bm90IGFuIGltYWdl'),
    ).rejects.toThrow();
    const bytes = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
    bytes.write('IHDR', 12);
    bytes.writeUInt32BE(700, 16);
    bytes.writeUInt32BE(900, 20);
    await expect(
      validatePassportPhotoDataUrl('data:image/png;base64,' + bytes.toString('base64')),
    ).rejects.toThrow();
  });
  it('rejects SVG and excessive payloads', async () => {
    await expect(
      validatePassportPhotoDataUrl('data:image/svg+xml;base64,PHN2Zy8+'),
    ).rejects.toThrow();
    await expect(
      validatePassportPhotoDataUrl(
        'data:image/png;base64,' + Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64'),
      ),
    ).rejects.toThrow();
  });
});
