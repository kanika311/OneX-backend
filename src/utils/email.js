import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@onex.local";
  const subject = "Reset your 1X Admin password";
  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset your admin password.",
    `Reset your password: ${resetUrl}`,
    "",
    "This link expires in 1 hour.",
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#5c3d4a">Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your <strong>1X · Dr. Ayxh</strong> admin password.</p>
      <p style="margin:28px 0">
        <a href="${resetUrl}" style="background:#5c3d4a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600">
          Reset password
        </a>
      </p>
      <p style="font-size:13px;color:#666">Or copy this link:<br><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size:13px;color:#666">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
    </div>
  `;

  if (!transporter) {
    console.log("[password-reset] SMTP not configured. Reset link:", resetUrl);
    return { dev: true, resetUrl };
  }

  await transporter.sendMail({ from, to, subject, text, html });
  return { dev: false };
}
