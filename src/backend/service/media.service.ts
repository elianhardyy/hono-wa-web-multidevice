import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";

export const saveUploadedFile = async (
  file: any,
  prefix: string,
): Promise<string | null> => {
  if (!file) return null;
  if (typeof file.arrayBuffer !== "function") return null;
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) return null;
  if (buf.length > 2_500_000) return null;

  const contentType = String(file.type ?? "");
  const ext = (() => {
    if (contentType === "image/png") return "png";
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/webp") return "webp";
    if (contentType === "image/svg+xml") return "svg";
    if (contentType === "image/x-icon" || contentType === "image/vnd.microsoft.icon")
      return "ico";
    const name = String(file.name ?? "");
    const m = name.match(/\.([a-zA-Z0-9]+)$/);
    if (m?.[1]) return m[1].toLowerCase();
    return "png";
  })();

  const dir = path.resolve("public/assets/uploads");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const abs = path.join(dir, filename);
  await fs.writeFile(abs, buf);
  return `/assets/uploads/${filename}`;
};

export type LoadedMedia = {
  mimetype: string;
  dataB64: string;
  filename: string;
  size: number;
  source: { kind: "url"; url: string } | { kind: "upload"; name: string | null };
  isAudio: boolean;
};

export const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export const filenameFromUrl = (value: string) => {
  try {
    const u = new URL(value);
    const last = u.pathname.split("/").filter(Boolean).pop();
    const raw = last ? decodeURIComponent(last) : "file";
    const safe = raw.replace(/[\u0000-\u001f<>:"/\\|?*\u007f]/g, "_").trim();
    return safe.length > 0 ? safe.slice(0, 120) : "file";
  } catch {
    return "file";
  }
};

export const loadMediaFromUrl = async (url: string, maxBytes: number): Promise<LoadedMedia> => {
  if (!isHttpUrl(url)) throw new Error("invalid_media_url");
  const res = await fetch(url, { redirect: "follow" as any });
  if (!res.ok) throw new Error(`media_fetch_failed:${res.status}`);
  const len = Number(res.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > 0 && len > maxBytes) throw new Error("media_too_large");
  const contentType = String(res.headers.get("content-type") ?? "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const filename = filenameFromUrl(url);

  let buf: Buffer;
  if ((Readable as any).fromWeb && res.body) {
    const chunks: Buffer[] = [];
    let total = 0;
    const stream = Readable.fromWeb(res.body as any);
    for await (const chunk of stream) {
      const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += b.length;
      if (total > maxBytes) throw new Error("media_too_large");
      chunks.push(b);
    }
    buf = Buffer.concat(chunks);
  } else {
    buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) throw new Error("media_too_large");
  }

  return {
    mimetype: contentType || "application/octet-stream",
    dataB64: buf.toString("base64"),
    filename,
    size: buf.length,
    source: { kind: "url", url },
    isAudio: (contentType || "").startsWith("audio/"),
  };
};

export const loadMediaFromUpload = async (file: any, maxBytes: number): Promise<LoadedMedia> => {
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("missing_media_file");
  const size = Number(file.size ?? 0);
  if (Number.isFinite(size) && size > maxBytes) throw new Error("media_too_large");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) throw new Error("empty_media_file");
  if (buf.length > maxBytes) throw new Error("media_too_large");

  const contentType = String(file.type ?? "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const name = String(file.name ?? "").trim();
  const filename = name.length > 0 ? name.slice(0, 120) : "file";

  return {
    mimetype: contentType || "application/octet-stream",
    dataB64: buf.toString("base64"),
    filename,
    size: buf.length,
    source: { kind: "upload", name: name || null },
    isAudio: (contentType || "").startsWith("audio/"),
  };
};

export const resolveMediaInput = async (input: {
  mediaUrl?: string;
  mediaFile?: any;
  maxBytes: number;
}): Promise<LoadedMedia | null> => {
  const url = String(input.mediaUrl ?? "").trim();
  if (url) return await loadMediaFromUrl(url, input.maxBytes);
  const file = input.mediaFile;
  const hasFile =
    file &&
    typeof file.arrayBuffer === "function" &&
    Number((file as any).size ?? 0) > 0;
  if (hasFile) return await loadMediaFromUpload(file, input.maxBytes);
  return null;
};
