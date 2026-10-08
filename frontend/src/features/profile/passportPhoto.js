export const PASSPORT_PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const PASSPORT_PHOTO_MIN_WIDTH = 350;
export const PASSPORT_PHOTO_MIN_HEIGHT = 450;
export const PASSPORT_PHOTO_MIN_RATIO = 0.72;
export const PASSPORT_PHOTO_MAX_RATIO = 0.84;

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png']);

export function loadImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected file is not a valid JPEG or PNG image.'));
    };
    image.src = url;
  });
}

export async function validatePassportPhotoFile(file, readDimensions = loadImageDimensions) {
  if (!ACCEPTED_TYPES.has(file?.type)) {
    throw new Error('Upload a JPEG or PNG passport photo.');
  }
  if (!file.size || file.size > PASSPORT_PHOTO_MAX_BYTES) {
    throw new Error('The passport photo must be 3 MB or smaller.');
  }

  const dimensions = await readDimensions(file);
  const ratio = dimensions.width / dimensions.height;
  if (
    dimensions.width < PASSPORT_PHOTO_MIN_WIDTH
    || dimensions.height < PASSPORT_PHOTO_MIN_HEIGHT
    || ratio < PASSPORT_PHOTO_MIN_RATIO
    || ratio > PASSPORT_PHOTO_MAX_RATIO
  ) {
    throw new Error('Use a portrait passport photo with a 35:45 aspect ratio and at least 350 x 450 pixels.');
  }
  return dimensions;
}
