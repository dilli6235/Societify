import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from '@/config/env';
import { logger } from '@/config/logger';
import type { EmailMessage, EmailProvider } from './types';

/**
 * Email channel via nodemailer.
 *
 *   - SMTP_URL set            → real delivery through that SMTP server.
 *   - SMTP_URL unset (dev)    → a throwaway Ethereal test inbox is created on
 *                               first send; each email logs a preview URL you
 *                               can open in the browser. Zero configuration.
 *
 * This means invitations actually "send" out of the box — no credentials,
 * no extra setup. Add SMTP_URL (+ EMAIL_FROM) to deliver to real inboxes.
 */
class NodemailerProvider implements EmailProvider {
  // Disabled only in automated tests; otherwise always on (Ethereal fallback).
  readonly enabled = !isTest;

  private transporter: Transporter | null = null;
  private fromAddress = env.EMAIL_FROM ?? 'Societify <no-reply@societify.local>';
  private usingEthereal = false;

  private async getTransport(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    if (env.SMTP_URL) {
      this.transporter = nodemailer.createTransport(env.SMTP_URL);
    } else if (env.SMTP_USER && env.SMTP_PASS) {
      // Discrete SMTP (e.g. Gmail). App passwords are shown with spaces — strip
      // them defensively so a copy-paste with spaces still works.
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, '') },
      });
      this.fromAddress = env.EMAIL_FROM ?? env.SMTP_USER;
      logger.info({ host: env.SMTP_HOST }, '📮 Email: using configured SMTP server');
    } else {
      // Dev fallback: auto-provision an Ethereal test account.
      const test = await nodemailer.createTestAccount();
      this.usingEthereal = true;
      this.fromAddress = env.EMAIL_FROM ?? `Societify <${test.user}>`;
      this.transporter = nodemailer.createTransport({
        host: test.smtp.host,
        port: test.smtp.port,
        secure: test.smtp.secure,
        auth: { user: test.user, pass: test.pass },
      });
      logger.info('📭 Email: using Ethereal test inbox (preview URLs will be logged)');
    }
    return this.transporter;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.enabled) return;
    const transport = await this.getTransport();
    const info = await transport.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.title,
      text: message.body,
      html: message.html ?? `<p>${message.body}</p>`,
    });

    if (this.usingEthereal) {
      const preview = nodemailer.getTestMessageUrl(info);
      logger.info({ to: message.to, subject: message.title, preview }, '📧 Email sent (Ethereal preview)');
    } else {
      logger.info({ to: message.to, subject: message.title, messageId: info.messageId }, '📧 Email sent');
    }
  }
}

export const emailProvider: EmailProvider = new NodemailerProvider();
