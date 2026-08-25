import {BindingScope, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {randomInt, randomUUID} from 'crypto';
import {Otp} from '../models';
import {OtpRepository} from '../repositories';
import {OtpIdentifierType, OtpPurpose} from '../types/otp.types';
import {OTP_CONFIG} from '../utils/otp-config';
import {BcryptHasher} from './hash.password.bcrypt';
import {OtpRateLimitService} from './otp-rate-limit.service';

export interface IssueOtpOptions {identifier: string; identifierType: OtpIdentifierType; purpose: OtpPurpose; userId?: string; ip?: string}

@injectable({scope: BindingScope.TRANSIENT})
export class OtpService {
  constructor(
    @repository(OtpRepository) private repository: OtpRepository,
    @inject('service.hasher') private hasher: BcryptHasher,
    @inject('services.otp.rate-limit') private limiter: OtpRateLimitService,
  ) {}

  generateCode(): string {return randomInt(100000, 1000000).toString();}

  async enforceLoginSendLimits(phone: string, ip: string): Promise<void> {
    await this.limiter.assertLimit(`otp:send:phone:${phone}`, OTP_CONFIG.phoneHourlyLimit, 3600);
    await this.limiter.assertLimit(`otp:send:ip:${ip}`, OTP_CONFIG.ipSendHourlyLimit, 3600);
  }

  async enforceLoginVerifyLimits(phone: string, ip: string): Promise<void> {
    await this.limiter.assertLimit(`otp:verify:phone:${phone}`, OTP_CONFIG.phoneVerifyHourlyLimit, 3600);
    await this.limiter.assertLimit(`otp:verify:ip:${ip}`, OTP_CONFIG.ipVerifyHourlyLimit, 3600);
  }

  async issue(options: IssueOtpOptions): Promise<{record: Otp; code: string}> {
    await this.limiter.assertLimit(`otp:issue:${options.purpose}:${options.identifier}`, OTP_CONFIG.phoneHourlyLimit, 3600);
    await this.limiter.assertCooldown(`otp:cooldown:${options.purpose}:${options.identifier}`, OTP_CONFIG.resendCooldownSeconds);
    await this.repository.updateAll(
      {isUsed: true, consumedAt: new Date(), expiresAt: new Date()},
      {identifier: options.identifier, purpose: options.purpose, isUsed: false},
    );
    const code = this.generateCode();
    const record = await this.repository.create({
      id: randomUUID(),
      otp: await this.hasher.hashPassword(code),
      type: options.identifierType === OtpIdentifierType.PHONE ? 0 : 1,
      identifierType: options.identifierType,
      purpose: options.purpose,
      identifier: options.identifier,
      userId: options.userId,
      attempts: 0,
      isUsed: false,
      expiresAt: new Date(Date.now() + OTP_CONFIG.expirySeconds * 1000),
    });
    return {record, code};
  }

  async invalidate(id: string): Promise<void> {
    await this.repository.updateById(id, {isUsed: true, consumedAt: new Date(), expiresAt: new Date()});
  }

  async releaseIssueCooldown(purpose: OtpPurpose, identifier: string): Promise<void> {
    await this.limiter.clearCooldown(`otp:cooldown:${purpose}:${identifier}`);
  }

  async recordProviderMessage(id: string, providerMessageId: string): Promise<void> {
    await this.repository.updateById(id, {providerMessageId});
  }

  async verifyAndConsume(id: string, identifier: string, type: OtpIdentifierType, purpose: OtpPurpose, code: string): Promise<Otp> {
    const record = await this.repository.findById(id).catch(() => undefined);
    const invalid = () => new HttpErrors.Unauthorized('Invalid or expired verification code.');
    if (!record || record.identifier !== identifier || record.identifierType !== type || record.purpose !== purpose || record.isUsed) throw invalid();
    if (record.attempts >= OTP_CONFIG.maxAttempts) throw new HttpErrors.TooManyRequests('Verification limit reached. Request a new code.');
    if (record.expiresAt.getTime() <= Date.now()) {await this.invalidate(record.id); throw invalid();}

    const matches = await this.hasher.comparePassword(code, record.otp);
    if (!matches) {
      for (let retry = 0; retry < 3; retry++) {
        const current = retry === 0 ? record : await this.repository.findById(id);
        if (current.isUsed || current.attempts >= OTP_CONFIG.maxAttempts) break;
        const next = current.attempts + 1;
        const result = await this.repository.updateAll(
          {attempts: next, ...(next >= OTP_CONFIG.maxAttempts ? {isUsed: true, consumedAt: new Date()} : {})},
          {id, isUsed: false, attempts: current.attempts},
        );
        if (result.count === 1) {
          if (next >= OTP_CONFIG.maxAttempts) throw new HttpErrors.TooManyRequests('Verification limit reached. Request a new code.');
          throw invalid();
        }
      }
      throw new HttpErrors.TooManyRequests('Verification limit reached. Request a new code.');
    }

    const consumedAt = new Date();
    const result = await this.repository.updateAll(
      {isUsed: true, consumedAt, expiresAt: consumedAt},
      {id, identifier, identifierType: type, purpose, isUsed: false, attempts: {lt: OTP_CONFIG.maxAttempts}},
    );
    if (result.count !== 1) throw invalid();
    record.isUsed = true;
    record.consumedAt = consumedAt;
    return record;
  }

  async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - OTP_CONFIG.retentionDays * 86400000);
    const result = await this.repository.deleteAll({or: [{expiresAt: {lt: cutoff}}, {consumedAt: {lt: cutoff}}]});
    return result.count;
  }
}
