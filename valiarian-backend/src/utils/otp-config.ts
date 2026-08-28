function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export const OTP_CONFIG = {
  digits: 6,
  expirySeconds: positiveInteger('OTP_LOGIN_EXPIRY_SECONDS', 300),
  resendCooldownSeconds: positiveInteger('OTP_LOGIN_RESEND_COOLDOWN_SECONDS', 60),
  maxAttempts: positiveInteger('OTP_LOGIN_MAX_ATTEMPTS', 3),
  phoneHourlyLimit: 5,
  ipSendHourlyLimit: 20,
  phoneVerifyHourlyLimit: 30,
  ipVerifyHourlyLimit: 60,
  retentionDays: positiveInteger('OTP_RETENTION_DAYS', 7),
};

export function validateOtpProviderConfig(): void {
  const provider = process.env.OTP_PHONE_PROVIDER ?? 'whatsapp';
  if (provider === 'disabled') {
    // eslint-disable-next-line no-console
    console.warn('[OTP] WhatsApp OTP provider disabled via OTP_PHONE_PROVIDER=disabled — OTP-via-WhatsApp requests will fail until real credentials are configured.');
    return;
  }
  if (provider !== 'whatsapp') {
    throw new Error(`Unsupported OTP_PHONE_PROVIDER: ${provider}`);
  }

  const required = [
    'WHATSAPP_GRAPH_API_VERSION',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_OTP_TEMPLATE',
    'WHATSAPP_TEMPLATE_LANGUAGE',
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    'META_APP_SECRET',
  ];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) {
    throw new Error(`WhatsApp OTP configuration is incomplete: ${missing.join(', ')}`);
  }
}
