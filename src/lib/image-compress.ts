/**
 * Client-side image compression for mood board.
 *
 * Strategy:
 *  - Resize to maxWidth maintaining aspect ratio
 *  - Output as JPEG at specified quality (much smaller than PNG base64)
 *  - Generate both a "full" (1200px) and "thumb" (400px) version
 *  - This typically reduces a 3MB phone photo to ~80-150KB
 */

interface CompressedImage {
  full: string;   // base64 data URL — max 1200px wide, JPEG 0.7
  thumb: string;  // base64 data URL — max 400px wide, JPEG 0.6
}

function resizeToDataURL(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): string {
  let { width, height } = img;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Use better quality resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

export function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    // Hard limit: skip files over 10MB even before processing
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("File too large (max 10MB)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const full = resizeToDataURL(img, 1200, 0.7);
        const thumb = resizeToDataURL(img, 400, 0.6);
        resolve({ full, thumb });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Estimate the byte size of a base64 data URL string.
 * Useful for showing users how much storage each image consumes.
 */
export function base64ByteSize(dataUrl: string): number {
  // data:image/jpeg;base64,<payload>
  const idx = dataUrl.indexOf(",");
  if (idx < 0) return dataUrl.length;
  const payload = dataUrl.slice(idx + 1);
  // Base64 encodes 3 bytes per 4 chars, minus padding
  const padding = (payload.match(/=+$/) ?? [""])[0].length;
  return Math.floor((payload.length * 3) / 4) - padding;
}

/**
 * Format bytes to a human-readable string (KB/MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Estimate total localStorage usage in bytes.
 */
export function estimateStorageUsed(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += key.length * 2; // UTF-16
      total += (localStorage.getItem(key) ?? "").length * 2;
    }
  }
  return total;
}
