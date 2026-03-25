const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = `${process.env.SMTP_SECURE || 'true'}` === 'true';
const smtpRejectUnauthorized =
  `${process.env.SMTP_REJECT_UNAUTHORIZED || 'false'}` === 'true';

const SITE_SETTINGS = {
  email: {
    type: 'smtp',
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    secure: smtpSecure,
    port: smtpPort,
    tls: {
      rejectUnauthorized: smtpRejectUnauthorized,
    },
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },
  fromMail: process.env.EMAIL_FROM || process.env.EMAIL_USER,
};
export default SITE_SETTINGS;
