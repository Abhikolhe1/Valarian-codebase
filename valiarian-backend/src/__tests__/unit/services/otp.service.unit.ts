import {expect} from '@loopback/testlab';
import {BcryptHasher} from '../../../services/hash.password.bcrypt';
import {OtpService} from '../../../services/otp.service';
import {OtpIdentifierType, OtpPurpose} from '../../../types/otp.types';
import {validateAndSanitizeMobile} from '../../../utils/validation.utils';

class FakeOtpRepository {
  record: any;
  async create(data: any) {this.record = {...data, id: 'otp-1', createdAt: new Date()}; return this.record;}
  async findById(id: string) {if (!this.record || id !== this.record.id) throw new Error('not found'); return {...this.record};}
  async updateById(_id: string, data: any) {Object.assign(this.record, data);}
  async deleteAll() {return {count: 0};}
  async updateAll(data: any, where: any) {
    if (!this.record) return {count: 0};
    const matches = Object.entries(where).every(([key, value]: any) => {
      if (value && typeof value === 'object' && 'lt' in value) return this.record[key] < value.lt;
      return this.record[key] === value;
    });
    if (!matches) return {count: 0};
    Object.assign(this.record, data);
    return {count: 1};
  }
}

describe('OtpService security', () => {
  const limiter = {assertLimit: async () => undefined, assertCooldown: async () => undefined, clearCooldown: async () => undefined};
  it('normalizes supported Indian formats to one E.164 identity', () => {
    for (const input of ['8830800191', '91 88308 00191', '918830800191', '+918830800191', '+91 88308-00191']) {
      expect(validateAndSanitizeMobile(input)).to.equal('+918830800191');
    }
  });

  it('always generates six numeric digits and is not fixed', () => {
    const service = new OtpService({} as any, {} as any, limiter as any);
    const values = new Set(Array.from({length: 30}, () => service.generateCode()));
    for (const value of values) expect(value).to.match(/^\d{6}$/);
    expect(values.size).to.be.greaterThan(1);
    expect(values.has('1234')).to.be.false();
  });

  it('stores only a bcrypt hash and binds identifier and purpose', async () => {
    const repository = new FakeOtpRepository();
    const service = new OtpService(repository as any, new BcryptHasher(), limiter as any);
    const {record, code} = await service.issue({identifier: '+918830800191', identifierType: OtpIdentifierType.PHONE, purpose: OtpPurpose.LOGIN_PHONE});
    expect(record.otp).not.to.equal(code);
    expect(record.otp).to.match(/^\$2/);
    expect(record.identifier).to.equal('+918830800191');
    expect(record.purpose).to.equal(OtpPurpose.LOGIN_PHONE);
  });

  it('rejects phone B when the OTP belongs to phone A', async () => {
    const repository = new FakeOtpRepository();
    const service = new OtpService(repository as any, new BcryptHasher(), limiter as any);
    const {record, code} = await service.issue({identifier: '+918830800191', identifierType: OtpIdentifierType.PHONE, purpose: OtpPurpose.LOGIN_PHONE});
    await expect(service.verifyAndConsume(record.id, '+919999999999', OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, code)).to.be.rejected();
    expect(repository.record.isUsed).to.be.false();
  });

  it('rejects wrong purpose, unknown ID, expired, and already-used records', async () => {
    const repository = new FakeOtpRepository();
    const service = new OtpService(repository as any, new BcryptHasher(), limiter as any);
    const {record, code} = await service.issue({identifier: '+918830800191', identifierType: OtpIdentifierType.PHONE, purpose: OtpPurpose.LOGIN_PHONE});
    await expect(service.verifyAndConsume(record.id, record.identifier, OtpIdentifierType.PHONE, OtpPurpose.SIGNUP_PHONE, code)).to.be.rejected();
    await expect(service.verifyAndConsume('unknown-id', record.identifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, code)).to.be.rejected();
    repository.record.expiresAt = new Date(Date.now() - 1);
    await expect(service.verifyAndConsume(record.id, record.identifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, code)).to.be.rejected();
    expect(repository.record.isUsed).to.be.true();
    await expect(service.verifyAndConsume(record.id, record.identifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, code)).to.be.rejected();
  });

  it('invalidates on the third wrong attempt and rejects the correct code afterward', async () => {
    const repository = new FakeOtpRepository();
    const service = new OtpService(repository as any, new BcryptHasher(), limiter as any);
    const {record, code} = await service.issue({identifier: '+918830800191', identifierType: OtpIdentifierType.PHONE, purpose: OtpPurpose.LOGIN_PHONE});
    for (let attempt = 1; attempt <= 3; attempt++) {
      await expect(service.verifyAndConsume(record.id, record.identifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, '000000')).to.be.rejected();
    }
    expect(repository.record.attempts).to.equal(3);
    expect(repository.record.isUsed).to.be.true();
    await expect(service.verifyAndConsume(record.id, record.identifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, code)).to.be.rejected();
  });

  it('atomically permits only one of two concurrent correct consumes', async () => {
    const repository = new FakeOtpRepository();
    const service = new OtpService(repository as any, new BcryptHasher(), limiter as any);
    const {record, code} = await service.issue({identifier: '+918830800191', identifierType: OtpIdentifierType.PHONE, purpose: OtpPurpose.LOGIN_PHONE});
    const results = await Promise.allSettled([
      service.verifyAndConsume(record.id, record.identifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, code),
      service.verifyAndConsume(record.id, record.identifier, OtpIdentifierType.PHONE, OtpPurpose.LOGIN_PHONE, code),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).to.have.length(1);
  });
});
