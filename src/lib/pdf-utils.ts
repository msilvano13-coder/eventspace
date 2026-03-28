export const PDF_MAX_SIZE = 2 * 1024 * 1024; // 2MB limit

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function readPdfAsBase64(
  file: File
): Promise<{ dataUrl: string; fileName: string; fileSize: number }> {
  return new Promise((resolve, reject) => {
    if (file.size > PDF_MAX_SIZE) {
      reject(new Error(`File too large (${formatBytes(file.size)}). Maximum is ${formatBytes(PDF_MAX_SIZE)}.`));
      return;
    }
    if (!file.type && !file.name.toLowerCase().endsWith(".pdf")) {
      reject(new Error("Only PDF files are supported."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export function downloadBase64File(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}

export function validatePdfFile(
  file: File
): { file: File; fileName: string; fileSize: number } {
  if (file.size > PDF_MAX_SIZE) {
    throw new Error(
      `File too large (${formatBytes(file.size)}). Maximum is ${formatBytes(PDF_MAX_SIZE)}.`
    );
  }
  if (!file.type && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported.");
  }
  if (file.type && file.type !== "application/pdf") {
    throw new Error("Only PDF files are supported.");
  }
  return { file, fileName: file.name, fileSize: file.size };
}

export async function downloadFromUrl(
  url: string,
  fileName: string
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
