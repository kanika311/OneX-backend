import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

import { getPublicBaseUrl, publicUploadUrl as buildPublicUploadUrl } from "../utils/mediaUrl.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Override on VPS/Render persistent disk: e.g. /var/data/uploads */
const configuredDir = process.env.UPLOAD_DIR?.trim();
export const UPLOAD_DIR = configuredDir
  ? path.isAbsolute(configuredDir)
    ? configuredDir
    : path.join(process.cwd(), configuredDir)
  : path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9-]/gi, "-")
      .slice(0, 48) || "image";
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    if (!ok) return cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
    cb(null, true);
  },
});

/** @deprecated import from utils/mediaUrl.js — kept for backwards compatibility */
export function publicUploadUrl(filename, req) {
  return buildPublicUploadUrl(filename, req);
}

export { getPublicBaseUrl };
