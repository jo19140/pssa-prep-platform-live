import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string; }) {
  if (!resend) {
    console.log("EMAIL PREVIEW", { to, subject, html });
    return;
  }
  await resend.emails.send({ from: process.env.EMAIL_FROM || "reports@example.com", to, subject, html });
}
