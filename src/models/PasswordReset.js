import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resetToken: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

passwordResetSchema.index({ adminId: 1, used: 1 });

export const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
