import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const TOKEN_BYTES = 32;
const ONE_HOUR_MS = 60 * 60 * 1000;

export function hashAccountToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRawAccountToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = createRawAccountToken();
  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashAccountToken(token),
      expiresAt: new Date(Date.now() + ONE_HOUR_MS),
    },
  });
  return token;
}

export async function createVerificationToken(userId: string) {
  const token = createRawAccountToken();
  await db.verificationToken.create({
    data: {
      userId,
      tokenHash: hashAccountToken(token),
      expiresAt: new Date(Date.now() + ONE_HOUR_MS),
    },
  });
  return token;
}

export async function sendPasswordResetEmail({ email, name, token }: { email: string; name: string; token: string }) {
  const resetUrl = `${baseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Reset your PSSA Prep password",
    html: `<p>Hi ${escapeHtml(name)},</p><p>Use this link to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}

export async function sendVerificationEmail({ email, name, token }: { email: string; name: string; token: string }) {
  const verifyUrl = `${baseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Verify your PSSA Prep email",
    html: `<p>Hi ${escapeHtml(name)},</p><p>Please verify your email address for PSSA Prep.</p><p><a href="${verifyUrl}">Verify email</a></p>`,
  });
}

function baseUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "\"") return "&quot;";
    return "&#39;";
  });
}
