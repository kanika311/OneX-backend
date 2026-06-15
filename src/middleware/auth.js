import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/helpers.js";

export async function protect(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Not authorized"));
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new ApiError(401, "User not found"));
    req.user = user;
    next();
  } catch {
    next(new ApiError(401, "Invalid token"));
  }
}

export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user) req.user = user;
  } catch {
    /* public */
  }
  next();
}

export function adminOnly(req, _res, next) {
  if (req.user?.role !== "admin") {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
}
