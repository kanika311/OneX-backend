import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { ApiError } from "../utils/helpers.js";

function userDto(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (role === "admin") {
    const secret = process.env.ADMIN_REGISTER_SECRET;
    if (!secret || req.body.adminSecret !== secret) {
      throw new ApiError(403, "Invalid admin registration secret");
    }
  }
  if (await User.findOne({ email })) throw new ApiError(409, "Email already registered");
  const user = await User.create({
    name,
    email,
    password,
    role: role === "admin" ? "admin" : "user",
  });
  const token = signToken(user._id);
  res.status(201).json({ success: true, token, user: userDto(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  res.json({ success: true, token: signToken(user._id), user: userDto(user) });
}

export async function me(req, res) {
  res.json({ success: true, user: userDto(req.user) });
}
