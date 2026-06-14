import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@1x-dr-ayesha.com";

  const html = `
    <p>You requested a password reset for your Dr. Ayxh Admin account.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in 15 minutes. If you did not request this, ignore this email.</p>
  `;

  if (!transporter) {
    console.info("[password-reset] SMTP not configured. Reset link:", resetUrl);
    return { sent: false, devLink: resetUrl };
  }

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your admin password · Dr. Ayxh",
    html,
  });

  return { sent: true };
}
