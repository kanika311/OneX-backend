import { validationResult } from "express-validator";
import { ApiError } from "../utils/helpers.js";

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, errors.array()[0].msg));
  }
  next();
}
