const SOURCE_LIMIT = 10 * 1024 * 1024;
const OUTPUT_LIMIT = 3 * 1024 * 1024;
const ratio = 7 / 9;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export function suggestCrop(width, height, face) {
  let h = Math.min(height, width / ratio);
  if (face) h = Math.min(h, Math.max(450, face.height * 3));
  const w = h * ratio;
  return {
    width: Math.floor(w),
    height: Math.floor(h),
    x: Math.round(
      clamp((face ? face.x + face.width / 2 : width / 2) - w / 2, 0, width - w),
    ),
    y: Math.round(
      clamp(
        face ? face.y - face.height * 0.65 : (height - h) / 2,
        0,
        height - h,
      ),
    ),
  };
}

export function checkCrop(area) {
  if (!area || area.width < 350 || area.height < 450)
    throw new Error(
      "The photo is too small. Please choose a higher-quality photo or zoom out.",
    );
}

export async function decodePhoto(file) {
  if (!file?.size || file.size > SOURCE_LIMIT)
    throw new Error(
      "This photo is too large to open. Please choose a smaller photo.",
    );
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const heic =
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    /heic|heix|hevc|hevx|mif1|msf1/.test(
      String.fromCharCode(...bytes.slice(8, 16)),
    );
  if (!jpeg && !png && !heic)
    throw new Error("Please choose a JPG, PNG or supported HEIC photo.");
  let image;
  try {
    if (typeof createImageBitmap === "function") {
      try {
        image = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
      } catch {
        /* Some browsers decode HEIC only through an img element. */
      }
    }
    if (!image) {
      const url = URL.createObjectURL(file);
      try {
        image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } catch {
    throw new Error(
      heic
        ? "Your browser cannot open this HEIC photo. Please choose a JPG photo or take a new photo."
        : "We could not read this photo. Please choose another one.",
    );
  }
  try {
    const width = image.naturalWidth || image.width,
      height = image.naturalHeight || image.height;
    if (width * height > 50_000_000)
      throw new Error(
        "This photo is too large to open safely. Please choose a smaller photo.",
      );
    checkCrop(suggestCrop(width, height));
    // Bound working memory and remove source metadata after correcting orientation.
    const scale = Math.min(1, 4096 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob)
      throw new Error(
        "We could not prepare this photo. Please try another one.",
      );
    let faces = null;
    if (typeof window.FaceDetector === "function") {
      try {
        faces = await Promise.race([
          new window.FaceDetector({
            fastMode: false,
            maxDetectedFaces: 5,
          }).detect(canvas),
          new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
      } catch {
        /* Optional detection never blocks the uploader. */
      }
    }
    const area = suggestCrop(
      canvas.width,
      canvas.height,
      faces?.length === 1 ? faces[0].boundingBox : null,
    );
    checkCrop(area);
    return {
      url: URL.createObjectURL(blob),
      area,
      manual: !faces || faces.length !== 1,
      notice:
        faces?.length > 1
          ? "Please choose a photo showing only one person, or adjust the crop to show only you."
          : faces?.length === 0
            ? "We couldn't find your face. Try another photo or adjust the crop."
            : null,
    };
  } finally {
    image.close?.();
  }
}

export async function exportPhoto(url, area) {
  checkCrop(area);
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Please choose your photo again."));
    img.src = url;
  });
  if (
    area.x < 0 ||
    area.y < 0 ||
    area.x + area.width > image.width + 1 ||
    area.y + area.height > image.height + 1
  )
    throw new Error("Please adjust the crop and try again.");
  const canvas = document.createElement("canvas");
  canvas.width = 350;
  canvas.height = 450;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 350, 450);
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 350, 450);
  const pixels = ctx.getImageData(0, 0, 350, 450).data;
  let light = 0,
    edges = 0,
    samples = 0;
  for (let y = 1; y < 449; y += 3)
    for (let x = 1; x < 349; x += 3) {
      const i = (y * 350 + x) * 4;
      const l = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      light += l;
      edges += Math.abs(
        l - (pixels[i - 4] + pixels[i - 3] + pixels[i - 2]) / 3,
      );
      samples++;
    }
  const warning =
    light / samples < 35
      ? "This photo looks dark. A brighter photo may work better."
      : light / samples > 235
        ? "This photo looks very bright. Check that your face is clearly visible."
        : edges / samples < 1.2
          ? "This photo may look blurry. Please check your face is clear before saving."
          : null;
  let blob;
  for (const quality of [0.9, 0.8, 0.65]) {
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= OUTPUT_LIMIT) break;
  }
  if (!blob || blob.size > OUTPUT_LIMIT)
    throw new Error(
      "We could not prepare this photo. Please choose another one.",
    );
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("We could not prepare this photo. Please try again."));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, warning };
}
