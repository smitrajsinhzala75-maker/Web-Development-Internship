const nodemailer = require('nodemailer');

// A global in-memory array to store emails for the developer helper tray on the frontend
global.devEmailLog = [];

const sendEmail = async ({ to, subject, text, html }) => {
  console.log(`\n==================================================`);
  console.log(`📩 EMAIL SENT TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`CONTENT: ${text}`);
  console.log(`==================================================\n`);

  // Log to global in-memory array for Developer Helper UI
  global.devEmailLog.push({
    id: Math.random().toString(36).substring(2, 11),
    to,
    subject,
    text,
    html,
    timestamp: new Date().toISOString()
  });

  // Keep log size reasonable
  if (global.devEmailLog.length > 50) {
    global.devEmailLog.shift();
  }

  // Attempt real email transport if SMTP config exists in .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Slices & Co." <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html
      });
      console.log(`✅ Email delivered via SMTP server.`);
    } catch (error) {
      console.error(`❌ SMTP delivery failed: ${error.message}`);
    }
  } else {
    console.log(`💡 Note: SMTP settings not configured. Email logged to console and Frontend Dev Tray.`);
  }
};

module.exports = { sendEmail };
