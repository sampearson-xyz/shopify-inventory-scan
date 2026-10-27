import sharp from "sharp";

const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
]);

const HEIC_EXTENSIONS = [
  ".heic",
  ".heif",
];

export function isHeic(file) {
  if (!file) return false;

  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  return (
    HEIC_TYPES.has(type) ||
    HEIC_EXTENSIONS.some((extension) =>
      name.endsWith(extension),
    )
  );
}

export async function prepareCardImage(file) {
  if (!file || file.size === 0) {
    return null;
  }

  const inputBuffer = Buffer.from(
    await file.arrayBuffer(),
  );

  /*
   * Normalise every uploaded image.
   *
   * This means:
   * HEIC -> JPEG
   * PNG  -> JPEG
   * WEBP -> JPEG
   * JPEG -> optimised JPEG
   *
   * We also rotate according to EXIF data, which is useful
   * for photographs coming directly from an iPhone.
   */
  const outputBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: 2500,
      height: 2500,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 92,
      mozjpeg: true,
    })
    .toBuffer();

  const originalName =
    file.name || "card-image";

  const filename =
    originalName.replace(
      /\.[^.]+$/,
      "",
    ) + ".jpg";

  return new File(
    [outputBuffer],
    filename,
    {
      type: "image/jpeg",
    },
  );
}