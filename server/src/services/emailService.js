// Configure a verified SMTP provider before enabling transactional email in production.
export async function sendEmail({ to, subject, text }) {
  if (!process.env.SMTP_HOST)
    throw new Error("Email provider is not configured");
  if (!process.env.MAIL_FROM)
    throw new Error("MAIL_FROM is required for email delivery");
  if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASS))
    throw new Error("SMTP_USER and SMTP_PASS must be configured together");
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
      : {}),
  });
  return transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
