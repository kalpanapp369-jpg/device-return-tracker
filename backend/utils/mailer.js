const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

async function sendSettlementEmail({ to, customerName, deviceName, recordId, status, refund, deduction, notes, aiDraftBody }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('⚠️  Email skipped — MAIL_USER/MAIL_PASS not set');
    return { skipped: true };
  }

  const isApproved  = status === 'Approved';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusIcon  = isApproved ? '✅' : '❌';

  const emailBody = aiDraftBody ? `
    <div style="background:#f8f9fa;border-left:4px solid #2563eb;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;font-size:14px;line-height:1.7;color:#374151;">
      ${aiDraftBody.replace(/\n/g,'<br/>')}
    </div>` : '';

  const html = `
  <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',sans-serif;">
    <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <div style="background:#2563eb;padding:28px 32px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">📦</div>
        <div style="color:#fff;font-size:20px;font-weight:600;">Device Return Tracker</div>
        <div style="color:#bfdbfe;font-size:13px;margin-top:4px;">One Point Solutions</div>
      </div>
      <div style="padding:32px;">
        <p style="font-size:16px;color:#111827;margin:0 0 6px;">Dear <strong>${customerName}</strong>,</p>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">Your device return settlement has been reviewed:</p>
        <div style="text-align:center;margin-bottom:20px;">
          <span style="display:inline-block;padding:10px 28px;border-radius:30px;background:${statusColor};color:#fff;font-size:16px;font-weight:600;">${statusIcon} ${status}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
          <tr style="background:#f8f9fa;"><td style="padding:10px 14px;color:#6b7280;">Record ID</td><td style="padding:10px 14px;font-weight:600;">#${recordId}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280;">Device</td><td style="padding:10px 14px;font-weight:600;">${deviceName}</td></tr>
          ${isApproved ? `
          <tr style="background:#f8f9fa;"><td style="padding:10px 14px;color:#6b7280;">Deduction</td><td style="padding:10px 14px;font-weight:600;color:#dc2626;">₹${parseFloat(deduction||0).toFixed(2)}</td></tr>
          <tr><td style="padding:10px 14px;color:#6b7280;">Refund</td><td style="padding:10px 14px;font-size:16px;font-weight:700;color:#16a34a;">₹${parseFloat(refund||0).toFixed(2)}</td></tr>` : ''}
          ${notes ? `<tr style="background:#f8f9fa;"><td style="padding:10px 14px;color:#6b7280;">Notes</td><td style="padding:10px 14px;">${notes}</td></tr>` : ''}
        </table>
        ${emailBody}
        ${isApproved && parseFloat(refund) > 0 ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:20px;font-size:14px;color:#166534;">💰 Refund of <strong>₹${parseFloat(refund).toFixed(2)}</strong> will be processed in 3-5 business days.</div>` : ''}
        <p style="font-size:13px;color:#6b7280;margin:0;">For questions: <a href="mailto:support@onepointsolutions.com" style="color:#2563eb;">support@onepointsolutions.com</a></p>
      </div>
      <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e2e6ea;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">One Point Solutions · Device Return Tracker</p>
      </div>
    </div>
  </body></html>`;

  const result = await transporter.sendMail({
    from:    `"Device Return Tracker" <${process.env.MAIL_USER}>`,
    to,
    subject: `${statusIcon} Settlement ${status} — Record #${recordId} | ${deviceName}`,
    html
  });

  console.log(`✅ Email sent to ${to}:`, result.messageId);
  return result;
}

async function sendKYCOtpEmail({ to, customerName, otp }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('⚠️  Email skipped — MAIL_USER/MAIL_PASS not set');
    return { skipped: true };
  }

  const html = `
  <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',sans-serif;">
    <div style="max-width:540px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <div style="background:#2563eb;padding:28px 32px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🔐</div>
        <div style="color:#fff;font-size:20px;font-weight:600;">Device Return Tracker</div>
        <div style="color:#bfdbfe;font-size:13px;margin-top:4px;">KYC Verification</div>
      </div>
      <div style="padding:32px;text-align:center;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">Dear <strong>${customerName}</strong>,</p>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">Please use the following One-Time Password (OTP) to verify your identity for the rental agreement.</p>
        <div style="font-size:36px;font-weight:700;color:#2563eb;letter-spacing:6px;background:#eff6ff;padding:16px;border-radius:8px;display:inline-block;margin-bottom:24px;">
          ${otp}
        </div>
        <p style="font-size:13px;color:#ef4444;margin:0;">Do not share this OTP with anyone. It is valid for 10 minutes.</p>
      </div>
      <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e2e6ea;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">One Point Solutions · Device Return Tracker</p>
      </div>
    </div>
  </body></html>`;

  const result = await transporter.sendMail({
    from:    `"Device Return Tracker" <${process.env.MAIL_USER}>`,
    to,
    subject: `🔐 Your KYC Verification OTP is ${otp}`,
    html
  });

  console.log(`✅ KYC OTP sent to ${to}:`, result.messageId);
  return result;
}

module.exports = { sendSettlementEmail, sendKYCOtpEmail };