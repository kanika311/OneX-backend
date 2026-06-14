import crypto from "crypto";

import { PasswordReset } from "../models/PasswordReset.js";
import { User } from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { ApiError, normalizePhone } from "../utils/helpers.js";
import { validatePasswordStrength } from "../utils/password.js";
import { checkRateLimit } from "../utils/rateLimit.js";
import { signToken } from "../utils/jwt.js";

function userDto(user) {
  return {
    id: user._id,
    name: user.name,
    number: user.number,
    email: user.email,
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
  };
}

function adminAccountDto(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.number,
    role: user.role,
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    createdBy: user.createdBy
      ? { id: user.createdBy._id, name: user.createdBy.name, email: user.createdBy.email }
      : null,
  };
}

/** Public storefront registration — users only, no admin self-registration */
export async function register(req, res) {
  const { name, number, password } = req.body;

  if (req.body.role === "admin" || req.body.role === "super_admin") {
    throw new ApiError(403, "Admin accounts can only be created by a Super Admin");
  }

  const normalizedNumber = normalizePhone(number);

  if (!normalizedNumber) {
    throw new ApiError(400, "Enter a valid 10-digit phone number");
  }

  if (await User.findOne({ number: normalizedNumber })) {
    throw new ApiError(409, "Phone number already registered");
  }

  let referredBy;

  if (req.body.referredBy) {
    const refPhone = normalizePhone(req.body.referredBy);
    if (refPhone && refPhone !== normalizedNumber) {
      referredBy = refPhone;
    }
  }

  const user = await User.create({
    name,
    number: normalizedNumber,
    password,
    role: "user",
    ...(referredBy ? { referredBy } : {}),
  });

  res.status(201).json({
    success: true,
    token: signToken(user._id),
    user: userDto(user),
  });
}

export async function login(req, res) {
  const { number, email, password, identifier } = req.body;
  const loginId = (identifier || email || number || "").trim();

  if (!loginId || !password) {
    throw new ApiError(400, "Email/phone and password are required");
  }

  let user;

  if (loginId.includes("@")) {
    user = await User.findOne({ email: loginId.toLowerCase() }).select("+password");
  } else {
    const normalizedNumber = normalizePhone(loginId);
    if (!normalizedNumber) {
      throw new ApiError(400, "Enter a valid email or phone number");
    }
    user = await User.findOne({ number: normalizedNumber }).select("+password");
  }

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.isActive === false) {
    throw new ApiError(403, "Account deactivated");
  }

  res.json({
    success: true,
    token: signToken(user._id),
    user: userDto(user),
  });
}

export async function me(req, res) {
  res.json({
    success: true,
    user: userDto(req.user),
  });
}

export async function forgotPassword(req, res) {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    throw new ApiError(400, "Enter a valid registered email address");
  }

  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

  if (!checkRateLimit(`forgot:${email}`, 3, 15 * 60 * 1000)) {
    throw new ApiError(429, "Too many reset requests. Try again in 15 minutes.");
  }

  if (!checkRateLimit(`forgot-ip:${ip}`, 10, 60 * 60 * 1000)) {
    throw new ApiError(429, "Too many reset requests from this network.");
  }

  const user = await User.findOne({
    email,
    role: { $in: ["admin", "super_admin"] },
  });

  if (!user) {
    return res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const resetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await PasswordReset.updateMany({ adminId: user._id, used: false }, { used: true });

  await PasswordReset.create({
    adminId: user._id,
    resetToken,
    expiresAt,
  });

  const adminUrl = process.env.ADMIN_PANEL_URL || "http://localhost:3001";
  const resetUrl = `${adminUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({ to: email, resetUrl });

  res.json({
    success: true,
    message: "If that email is registered, a reset link has been sent.",
  });
}

export async function resetPassword(req, res) {
  const { token, password, confirmPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "Reset token is required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    throw new ApiError(400, passwordError);
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const resetRecord = await PasswordReset.findOne({
    resetToken: hashedToken,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    throw new ApiError(400, "Invalid or expired reset link");
  }

  const user = await User.findById(resetRecord.adminId).select("+password");

  if (!user || !["admin", "super_admin"].includes(user.role)) {
    throw new ApiError(400, "Invalid reset link");
  }

  user.password = password;
  await user.save();

  resetRecord.used = true;
  await resetRecord.save();

  await PasswordReset.updateMany(
    { adminId: user._id, used: false, _id: { $ne: resetRecord._id } },
    { used: true },
  );

  res.json({
    success: true,
    message: "Password updated successfully. You can sign in now.",
  });
}

export async function listAdmins(req, res) {
  const search = String(req.query.search || "").trim();
  const filter = { role: { $in: ["admin", "super_admin"] } };

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { email: regex }, { number: regex }];
  }

  const admins = await User.find(filter)
    .select("-password")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    admins: admins.map(adminAccountDto),
  });
}

export async function createAdmin(req, res) {
  const { name, email, phone, password, confirmPassword } = req.body;

  if (!name?.trim()) throw new ApiError(400, "Full name is required");

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new ApiError(400, "Valid email is required");
  }

  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    throw new ApiError(400, "Valid phone number is required");
  }

  if (!password || password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    throw new ApiError(400, passwordError);
  }

  if (await User.findOne({ email: normalizedEmail })) {
    throw new ApiError(409, "Email already registered");
  }

  if (await User.findOne({ number: normalizedPhone })) {
    throw new ApiError(409, "Phone number already registered");
  }

  const admin = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    number: normalizedPhone,
    password,
    role: "admin",
    isActive: true,
    createdBy: req.user._id,
  });

  await admin.populate("createdBy", "name email");

  res.status(201).json({
    success: true,
    admin: adminAccountDto(admin),
    message: "Admin account created",
  });
}

export async function updateAdmin(req, res) {
  const { id } = req.params;
  const { name, email, phone, isActive } = req.body;

  const admin = await User.findOne({
    _id: id,
    role: { $in: ["admin", "super_admin"] },
  });

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  if (admin.role === "super_admin" && req.user._id.toString() !== admin._id.toString()) {
    throw new ApiError(403, "Cannot modify another Super Admin account");
  }

  if (name?.trim()) admin.name = name.trim();

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      throw new ApiError(400, "Valid email is required");
    }
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: admin._id } });
    if (existing) throw new ApiError(409, "Email already in use");
    admin.email = normalizedEmail;
  }

  if (phone !== undefined) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) throw new ApiError(400, "Valid phone number is required");
    const existing = await User.findOne({ number: normalizedPhone, _id: { $ne: admin._id } });
    if (existing) throw new ApiError(409, "Phone number already in use");
    admin.number = normalizedPhone;
  }

  if (typeof isActive === "boolean") {
    if (admin._id.toString() === req.user._id.toString() && !isActive) {
      throw new ApiError(400, "You cannot deactivate your own account");
    }
    admin.isActive = isActive;
  }

  await admin.save();
  await admin.populate("createdBy", "name email");

  res.json({
    success: true,
    admin: adminAccountDto(admin),
    message: "Admin updated",
  });
}

export async function deleteAdmin(req, res) {
  const { id } = req.params;

  const admin = await User.findOne({
    _id: id,
    role: "admin",
  });

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  if (admin._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  await User.deleteOne({ _id: admin._id });

  res.json({
    success: true,
    message: "Admin deleted",
  });
}
