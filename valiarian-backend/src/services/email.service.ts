/* eslint-disable @typescript-eslint/return-await */
import * as nodemailer from 'nodemailer';
// eslint-disable-next-line @typescript-eslint/naming-convention
import SITE_SETTINGS from '../utils/config';
export interface EmailManager<T = Object> {
  sendMail(mailObj: object): Promise<T>;
}

export class EmailService {
  constructor() { }

  async sendMail(mailObj: object): Promise<object> {
    const transporter = nodemailer.createTransport(SITE_SETTINGS.email);
    const payload = mailObj as Record<string, unknown>;

    console.log('[EmailService] sendMail called', {
      host: SITE_SETTINGS.email.host,
      port: SITE_SETTINGS.email.port,
      secure: SITE_SETTINGS.email.secure,
      authUser: SITE_SETTINGS.email.auth?.user,
      from: payload?.from,
      to: payload?.to,
      cc: payload?.cc,
      bcc: payload?.bcc,
      subject: payload?.subject,
    });

    try {
      const info = await transporter.sendMail(mailObj);
      const infoRecord = info as unknown as Record<string, unknown>;

      console.log('[EmailService] sendMail success', {
        messageId: infoRecord?.messageId,
        accepted: infoRecord?.accepted,
        rejected: infoRecord?.rejected,
        response: infoRecord?.response,
      });

      return info;
    } catch (error: any) {
      console.error('[EmailService] sendMail failed', {
        message: error?.message,
        code: error?.code,
        command: error?.command,
        response: error?.response,
        responseCode: error?.responseCode,
      });
      throw error;
    }
  }
}
