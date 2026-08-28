export enum OtpPurpose {
  LOGIN_PHONE = 'LOGIN_PHONE',
  SIGNUP_PHONE = 'SIGNUP_PHONE',
  PROFILE_MOBILE = 'PROFILE_MOBILE',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export enum OtpIdentifierType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
}

export type OtpDeliveryChannel = 'whatsapp' | 'email';
