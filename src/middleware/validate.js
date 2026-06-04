import { validationResult } from "express-validator";
import { ApiError } from "../utils/helpers.js";

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return next(new ApiError(400, first.msg || "Invalid request"));
  }
  next();
}
