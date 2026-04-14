const fs = require('fs');
const Imap = require('node-imap');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');
const ocrService = require('./ocr.service');
const Notice = require('../models/Notice');
const Client = require('../models/Client');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Email Service (Ingestion + Outbound Alerts)
 * Ingestion: Polls the firm's inbox for new notices (IMAP)
 * Outbound: Sends alerts to CAs and Clients (SMTP)
 */
class EmailService {
  constructor() {
    this.imap = null;
    this.transporter = null;

    // 1. Setup IMAP Inbound
    if (env.IMAP_HOST && env.IMAP_USER && env.IMAP_PASS) {
      this.imap = new Imap({
        user: env.IMAP_USER,
        password: env.IMAP_PASS,
        host: env.IMAP_HOST,
        port: parseInt(env.IMAP_PORT),
        tls: env.IMAP_TLS === 'true',
        tlsOptions: { rejectUnauthorized: false }
      });
      this.setupListeners();
    }

    // 2. Setup SMTP Outbound
    if (env.SMTP_HOST && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT) || 587,
        secure: env.SMTP_SECURE === 'true',
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      logger.info('SMTP not configured. Email service running in MOCK mode.');
    }
  }

  setupListeners() {
    this.imap.once('ready', () => this.openInbox());
    this.imap.on('error', (err) => logger.error('IMAP Error:', err));
    this.imap.on('end', () => logger.info('IMAP Connection Ended'));
  }

  openInbox() {
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) throw err;
      logger.info('📬 IMAP Inbox Opened. Monitoring for new notices...');
      this.scanForNewEmails();
      this.imap.on('mail', () => this.scanForNewEmails());
    });
  }

  scanForNewEmails() {
    this.imap.search(['UNSEEN', ['HEADER', 'SUBJECT', 'Notice']], (err, results) => {
      if (err || !results.length) return;

      const f = this.imap.fetch(results, { bodies: '', struct: true });
      f.on('message', (msg, seqno) => {
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;
            await this.processEmail(parsed);
            this.imap.addFlags(results, ['\\Seen'], () => { });
          });
        });
      });
    });
  }

  async processEmail(email) {
    logger.info(`Processing email: ${email.subject}`);
    const { queueOcr } = require('../jobs/queue');
    const Tenant = require('../models/Tenant');

    let tenant = await Tenant.findOne();
    if (!tenant) {
      logger.warn('No tenant found in DB. Skipping email ingestion.');
      return;
    }

    const tenantId = tenant._id;
    const attachments = email.attachments.filter(a =>
      a.contentType === 'application/pdf' || a.contentType.startsWith('image/')
    );

    for (const attachment of attachments) {
      try {
        const tempPath = `./uploads/email_${Date.now()}_${attachment.filename}`;
        if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
        fs.writeFileSync(tempPath, attachment.content);

        const notice = await Notice.create({
          tenantId,
          department: 'Other',
          noticeType: 'System Ingested',
          source: 'Email',
          status: 'PendingOCR',
          notes: `Ingested from email: ${email.subject}`
        });

        await queueOcr({
          type: 'extract-fields',
          payload: {
            filePath: tempPath,
            mimeType: attachment.contentType,
            noticeId: notice._id,
            tenantId: tenantId,
          }
        });
        logger.info(`✅ Queued OCR for: ${attachment.filename}`);
      } catch (err) {
        logger.error('Email attachment processing error:', err.message);
      }
    }
  }

  /**
   * Send Deadline Reminder (Detailed notices list)
   */
  async sendDeadlineReminder({ to, userName, notices }) {
    const subject = `Urgent: ${notices.length} Compliance Deadlines Approaching`;
    const noticeRows = notices.map(n => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${n.clientName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${n.department}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; color: ${n.daysLeft < 0 ? '#dc2626' : '#d97706'}">
          ${n.dueDate} (${n.daysLeft < 0 ? 'Overdue' : 'in ' + n.daysLeft + ' days'})
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #2563eb;">Deadline Alert</h2>
        <p>Hi ${userName},</p>
        <p>The following compliant notices assigned to you require immediate attention:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8fafc; text-align: left;">
              <th style="padding: 10px;">Client</th>
              <th style="padding: 10px;">Department</th>
              <th style="padding: 10px;">Due Date</th>
            </tr>
          </thead>
          <tbody>${noticeRows}</tbody>
        </table>
        <a href="${env.FRONTEND_URL}/notices" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Go to Inbox
        </a>
      </div>
    `;

    return this.send({ to, subject, html });
  }

  /**
   * Send Daily Summary to Partners
   */
  async sendDailySummary({ to, userName, stats }) {
    const subject = `Daily Compliance Digest — ${new Date().toLocaleDateString()}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #2563eb;">Daily Summary</h2>
        <p>Hi ${userName}, here is your firm's compliance snapshot for today:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${stats.overdue}</div>
            <div style="font-size: 14px; color: #7f1d1d;">Overdue</div>
          </div>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #d97706;">${stats.dueThisWeek}</div>
            <div style="font-size: 14px; color: #78350f;">Due This Week</div>
          </div>
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${stats.total}</div>
            <div style="font-size: 14px; color: #1e3a8a;">Active Notices</div>
          </div>
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${stats.filed}</div>
            <div style="font-size: 14px; color: #064e3b;">Filed Recently</div>
          </div>
        </div>
        <a href="${env.FRONTEND_URL}/reports" style="display: inline-block; border: 1px solid #2563eb; color: #2563eb; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
          View Risk Dashboard
        </a>
      </div>
    `;

    return this.send({ to, subject, html });
  }

  /**
   * Generic SMTP send
   */
  async send({ to, subject, html, text }) {
    if (!this.transporter) {
      logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return { msg: 'Mock success' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${env.FIRM_NAME || 'NoticeRadar'}" <${env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (err) {
      logger.error(`Email failed to ${to}:`, err);
      throw err;
    }
  }

  start() {
    if (this.imap) {
      this.imap.connect();
    } else {
      logger.warn('IMAP Not Configured. Skipping Email Ingestion.');
    }
  }
}

module.exports = new EmailService();

