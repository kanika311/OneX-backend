import fs from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "../middleware/upload.js";
import { normalizeImageForStorage, publicUploadUrl } from "../utils/mediaUrl.js";
import { ApiError } from "../utils/helpers.js";

export async function uploadImage(req, res) {
  if (!req.file) throw new ApiError(400, "No image file provided");
  res.status(201).json({
    success: true,
    url: publicUploadUrl(req.file.filename, req),
    path: normalizeImageForStorage(`/uploads/${req.file.filename}`),
    filename: req.file.filename,
  });
}

export async function listMedia(_req, res) {
  const files = await fs.readdir(UPLOAD_DIR);
  const images = [];
  for (const name of files) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) continue;
    const stat = await fs.stat(path.join(UPLOAD_DIR, name));
    if (!stat.isFile()) continue;
    images.push({
      filename: name,
      url: publicUploadUrl(name, _req),
      path: normalizeImageForStorage(`/uploads/${name}`),
      createdAt: stat.birthtime,
      size: stat.size,
    });
  }
  images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, media: images });
}

export async function deleteMedia(req, res) {
  const name = path.basename(req.params.filename);
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new ApiError(400, "Invalid filename");
  try {
    await fs.unlink(path.join(UPLOAD_DIR, name));
  } catch {
    throw new ApiError(404, "File not found");
  }
  res.json({ success: true, message: "Deleted" });
}
