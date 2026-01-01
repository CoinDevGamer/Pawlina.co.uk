/**
 * Quick SMTP verification / test sender.
 * Run with: node test-email.js you@example.com
 */
import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

const recipient = process.argv[2] || process.env.SALES_EMAIL;

if (!recipient) {
  console.error("❌ Provide a recipient email as an argument or set SALES_EMAIL.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.trim(),
  },
  tls: { rejectUnauthorized: false },
});

async function main() {
  try {
    await transporter.verify();
    console.log("✅ SMTP credentials verified.");
  } catch (err) {
    console.error("❌ SMTP verify failed:", err);
  }

  try {
    const info = await transporter.sendMail({
      from: `"Pet Market" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: "Test email from Pawlina backend",
      html: "<p>This is a test email to confirm SMTP connectivity.</p>",
    });
    console.log("📤 Test email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Test email send failed:", err);
    process.exit(1);
  }
}

main();
