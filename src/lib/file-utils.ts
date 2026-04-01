export const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "log",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "java",
  "cs",
  "cpp",
  "c",
  "h",
  "hpp",
  "php",
  "rb",
  "go",
  "rs",
  "swift",
  "kt",
  "sql",
  "yaml",
  "yml",
  "ini",
  "env",
  "toml",
  "sh",
  "bat",
  "ps1",
  "json",
]);

export const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
]);

export const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);
export const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"]);
export const PDF_EXTENSIONS = new Set(["pdf"]);

export function getBaseName(path: string) {
  const clean = path.replace(/\/$/, "");
  const parts = clean.split("/");
  return parts[parts.length - 1] || clean;
}

export function getExtension(path: string) {
  const name = getBaseName(path);
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function detectFileKind(ext: string) {
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  if (ext === "json") return "json";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "unknown";
}

export function getMimeType(ext: string) {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "application/ogg",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
    pdf: "application/pdf",
  };

  return map[ext] || "application/octet-stream";
}
