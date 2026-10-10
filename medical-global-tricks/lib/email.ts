import 'server-only';
import nodemailer from 'nodemailer';
import { q } from './db';
import { randomToken, sha256 } from './crypto';
import { baseUrl } from './http';

export const emailConfigured = () => !!(process.env.SMTP_HOST && process.env.EMAIL_FROM);

/**
 * Sends a transactional email. Until SMTP is configured the message is kept in
 * the admin outbox with status `not_configured`; nothing pretends it was sent.
 */
export async function sendEmail(to: string, subject: string, text: string) {
  if (!emailConfigured()) {
    await q(`INSERT INTO email_outbox(to_email, subject, body_text, status) VALUES ($1,$2,$3,'not_configured')`, [to, subject, text]);
    return { sent: false as const };
  }
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
    await transport.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
    await q(`INSERT INTO email_outbox(to_email, subject, body_text, status) VALUES ($1,$2,$3,'sent')`, [to, subject, '[sent]']);
    return { sent: true as const };
  } catch (e: any) {
    await q(`INSERT INTO email_outbox(to_email, subject, body_text, status, error) VALUES ($1,$2,$3,'failed',$4)`, [to, subject, text, String(e?.message ?? e)]);
    return { sent: false as const };
  }
}

export async function issueEmailToken(userId: string, kind: 'verify' | 'reset') {
  const token = randomToken(32);
  const hours = kind === 'verify' ? 48 : 1;
  await q(`UPDATE email_tokens SET used_at = now() WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`, [userId, kind]);
  await q(
    `INSERT INTO email_tokens(user_id, kind, token_hash, expires_at) VALUES ($1,$2,$3, now() + make_interval(hours => $4))`,
    [userId, kind, sha256(token), hours],
  );
  return token;
}

const base = baseUrl;

export async function sendVerificationEmail(userId: string, email: string, name: string) {
  const token = await issueEmailToken(userId, 'verify');
  const link = `${base()}/verify-email?token=${token}`;
  return sendEmail(email, 'Confirm your email — Medical Global Tricks',
    `Hello ${name},\n\nPlease confirm your email address for Medical Global Tricks:\n${link}\n\nThis link expires in 48 hours. If you did not create an account, ignore this message.\n\n— Medical Global Tricks`);
}

export async function sendResetEmail(userId: string, email: string, name: string) {
  const token = await issueEmailToken(userId, 'reset');
  const link = `${base()}/reset-password?token=${token}`;
  return sendEmail(email, 'Reset your password — Medical Global Tricks',
    `Hello ${name},\n\nA password reset was requested for your Medical Global Tricks account:\n${link}\n\nThis link expires in 1 hour. If you did not request it, you can ignore this message.\n\n— Medical Global Tricks`);
}
