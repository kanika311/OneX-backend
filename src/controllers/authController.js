import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { ApiError, normalizePhone } from "../utils/helpers.js";

function userDto(user) {
  return {
    id: user._id,
    name: user.name,
    number: user.number ?? undefined,
    email: user.email ?? undefined,
    role: user.role,
  };
}

export async function register(req, res) {
  const { name, number, email, password, role } = req.body;

  if (role === "admin") {
    const secret = process.env.ADMIN_REGISTER_SECRET;
    if (!secret || req.body.adminSecret !== secret) {
      throw new ApiError(403, "Invalid admin registration secret");
    }
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) throw new ApiError(400, "Email is required");
    if (await User.findOne({ email: normalizedEmail })) {
      throw new ApiError(409, "Email already registered");
    }
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: "admin",
    });
    const token = signToken(user._id);
    return res.status(201).json({ success: true, token, user: userDto(user) });
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
    if (refPhone && refPhone !== normalizedNumber) referredBy = refPhone;
  }

  const user = await User.create({
    name,
    number: normalizedNumber,
    password,
    role: "user",
    ...(referredBy ? { referredBy } : {}),
  });
  const token = signToken(user._id);
  res.status(201).json({ success: true, token, user: userDto(user) });
}

export async function login(req, res) {
  const { number, email, password } = req.body;
  let user;

  if (number) {
    const normalizedNumber = normalizePhone(number);
    if (!normalizedNumber) throw new ApiError(400, "Enter a valid phone number");
    user = await User.findOne({ number: normalizedNumber }).select("+password");
  } else if (email) {
    user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+password");
  } else {
    throw new ApiError(400, "Phone or email is required");
  }

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, number ? "Invalid phone or password" : "Invalid email or password");
  }
  res.json({ success: true, token: signToken(user._id), user: userDto(user) });
}

export async function me(req, res) {
  res.json({ success: true, user: userDto(req.user) });
}
