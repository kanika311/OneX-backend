import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { ApiError, normalizePhone } from "../utils/helpers.js";

function userDto(user) {
  return {
    id: user._id,
    name: user.name,
    number: user.number,
    role: user.role,
  };
}

export async function register(req, res) {
  const { name, number, password, role } = req.body;

  const normalizedNumber = normalizePhone(number);

  if (!normalizedNumber) {
    throw new ApiError(400, "Enter a valid 10-digit phone number");
  }

  if (await User.findOne({ number: normalizedNumber })) {
    throw new ApiError(409, "Phone number already registered");
  }

  if (role === "admin") {
    const secret = process.env.ADMIN_REGISTER_SECRET;

    if (!secret || req.body.adminSecret !== secret) {
      throw new ApiError(403, "Invalid admin registration secret");
    }

    const user = await User.create({
      name,
      number: normalizedNumber,
      password,
      role: "admin",
    });

    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: userDto(user),
    });
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

  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: userDto(user),
  });
}

export async function login(req, res) {
  const { number, password } = req.body;

  const normalizedNumber = normalizePhone(number);

  if (!normalizedNumber) {
    throw new ApiError(400, "Enter a valid phone number");
  }

  const user = await User.findOne({
    number: normalizedNumber,
  }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid phone number or password");
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