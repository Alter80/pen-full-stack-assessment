import path from "node:path";

// Stored outside /public so files are never statically served - access
// only goes through the guarded /api/files/[submissionId] route.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export function contentTypeForExt(ext: string): string {
  return ext === ".pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

/** Only PDF or DOCX, checked by MIME type with a filename-extension fallback (browsers don't always send a reliable MIME type). */
export function validateUploadFile(file: File): { ext: string } | { error: string } {
  if (file.size === 0) return { error: "The file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "File is too large (max 10MB)." };

  const byMime = MIME_TO_EXT[file.type];
  const nameExt = path.extname(file.name).toLowerCase();
  const byName = nameExt === ".pdf" || nameExt === ".docx" ? nameExt : undefined;
  const ext = byMime ?? byName;

  if (!ext) return { error: "Only PDF or DOCX files are accepted." };
  return { ext };
}
