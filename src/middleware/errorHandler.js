import { ApiError } from "../utils/helpers.js";

export function notFound(_req, _res, next) {
  next(new ApiError(404, "Route not found"));
}

export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  if (err.code === "LIMIT_FILE_SIZE") status = 400;
  if (err.name === "MulterError") status = 400;
  res.status(status).json({ success: false, message: err.message || "Server error" });
}
