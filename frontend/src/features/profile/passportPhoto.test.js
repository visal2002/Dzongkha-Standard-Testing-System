import { describe, expect, it, vi } from 'vitest';
import { PASSPORT_PHOTO_MAX_BYTES, validatePassportPhotoFile } from './passportPhoto';

const photo = (type = 'image/jpeg', size = 1024) => ({ type, size });
const dimensions = (width, height) => vi.fn().mockResolvedValue({ width, height });

describe('validatePassportPhotoFile', () => {
  it('accepts a portrait photo with passport proportions', async () => {
    await expect(validatePassportPhotoFile(photo(), dimensions(700, 900)))
      .resolves.toEqual({ width: 700, height: 900 });
  });

  it.each([
    ['square', 600, 600],
    ['landscape', 900, 700],
    ['too small', 280, 360],
  ])('rejects a %s photo', async (_description, width, height) => {
    await expect(validatePassportPhotoFile(photo(), dimensions(width, height)))
      .rejects.toThrow('35:45 aspect ratio');
  });

  it('rejects unsupported image formats', async () => {
    await expect(validatePassportPhotoFile(photo('image/webp'), dimensions(700, 900)))
      .rejects.toThrow('JPEG or PNG');
  });

  it('rejects photos larger than 3 MB', async () => {
    await expect(validatePassportPhotoFile(photo('image/png', PASSPORT_PHOTO_MAX_BYTES + 1), dimensions(700, 900)))
      .rejects.toThrow('3 MB or smaller');
  });
});
