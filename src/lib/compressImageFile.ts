/**
 * Why: Phone photos of Aadhaar/PAN are often 3–5 MB, which made onboarding
 * "Finish" crawl on mobile data. Re-encoding to ≤2000px JPEG keeps documents
 * legible for HR while cutting upload size ~5–10×. PDFs and small files pass through.
 */
const COMPRESSIBLE = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function compressImageFile(
  file: File,
  { maxDimension = 2000, quality = 0.82, minBytes = 600 * 1024 } = {}
): Promise<File> {
  if (!COMPRESSIBLE.includes(file.type) || file.size < minBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // White under transparent PNG areas so documents don't turn black as JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Unsupported decode (e.g. odd PNG) — upload the original; server still validates.
    return file;
  }
}
