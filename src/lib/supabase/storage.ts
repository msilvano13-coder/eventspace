import { createClient } from "@/lib/supabase/client";

/**
 * Centralized helpers for Supabase Storage.
 *
 * Buckets
 * -------
 * - event-files   (private) — mood boards, shared files, contracts, signatures
 *     {userId}/{eventId}/moodboard/{imageId}.jpg
 *     {userId}/{eventId}/moodboard/{imageId}_thumb.jpg
 *     {userId}/{eventId}/files/{fileId}/{originalFilename}
 *     {userId}/{eventId}/contracts/{contractId}/original.pdf
 *     {userId}/{eventId}/contracts/{contractId}/signed.pdf
 *     {userId}/{eventId}/contracts/{contractId}/planner_sig.png
 *     {userId}/{eventId}/contracts/{contractId}/client_sig.png
 *
 * - contract-templates (private) — planner's reusable contract templates
 *     {userId}/{templateId}/{originalFilename}
 *
 * - brand-assets (public) — business logos
 *     {userId}/logo.{ext}
 */

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/** Upload a file to storage and return the storage path. */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: Blob | File,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) {
    throw new Error(
      `Failed to upload to ${bucket}/${path}: ${error.message}`,
    );
  }

  return data.path;
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/** Get a public URL (for the brand-assets bucket or any public bucket). */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Get a signed URL for private files (default expiry: 1 hour). */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(
      `Failed to create signed URL for ${bucket}/${path}: ${error.message}`,
    );
  }

  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/** Delete a file from storage. */
export async function deleteFromStorage(
  bucket: string,
  path: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(
      `Failed to delete ${bucket}/${path}: ${error.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Base-64 helpers (useful during migration from base64-in-database)
// ---------------------------------------------------------------------------

/** Convert a base64 data URL to a Blob. */
export function base64ToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(",");
  if (!header || !base64Data) {
    throw new Error("Invalid data URL: expected format data:<mime>;base64,<data>");
  }

  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";

  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

/** Determine the file extension from a data URL or a filename. */
export function getExtFromDataUrl(dataUrl: string): string {
  // If it looks like a data URL, derive extension from the mime type.
  if (dataUrl.startsWith("data:")) {
    const mimeMatch = dataUrl.match(/data:(.*?);/);
    if (mimeMatch) {
      const mime = mimeMatch[1];
      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
        "application/pdf": "pdf",
      };
      return mimeToExt[mime] ?? mime.split("/").pop() ?? "bin";
    }
  }

  // Otherwise treat input as a filename and extract the extension.
  const dotIndex = dataUrl.lastIndexOf(".");
  if (dotIndex !== -1) {
    return dataUrl.slice(dotIndex + 1).toLowerCase();
  }

  return "bin";
}

/** Upload a base64 data URL directly to storage and return the storage path. */
export async function uploadBase64ToStorage(
  bucket: string,
  path: string,
  dataUrl: string,
): Promise<string> {
  const blob = base64ToBlob(dataUrl);
  return uploadToStorage(bucket, path, blob);
}
