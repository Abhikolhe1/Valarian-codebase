import {Client, expect} from '@loopback/testlab';
import {ValiarianBackendApplication} from '../..';
import {setupApplication} from './test-helper';

describe('User Authentication API (acceptance)', () => {
  let app: ValiarianBackendApplication;
  let client: Client;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
  });

  after(async () => {
    await app.stop();
  });

  describe('POST /api/auth/send-phone-otp', () => {
    it('sends OTP for phone registration', async () => {
      const response = await client
        .post('/api/auth/send-phone-otp')
        .send({
          phone: '9999999999',
        })
        .expect(200);

      expect(response.body).to.have.property('success');
      expect(response.body).to.have.property('message');
    });

    it('rejects invalid phone format', async () => {
      await client
        .post('/api/auth/send-phone-otp')
        .send({
          phone: '123', // Invalid: too short
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/user/login', () => {
    it('rejects login without credentials', async () => {
      await client
        .post('/api/auth/user/login')
        .send({})
        .expect(422); // Unprocessable Entity - missing required fields
    });

    it('rejects login with invalid credentials', async () => {
      const response = await client
        .post('/api/auth/user/login')
        .send({
          identifier: '9876543210',
          password: 'WrongPassword123',
          rememberMe: false,
        });

      // Should return 400 or 401
      expect(response.status).to.be.oneOf([400, 401]);
    });
  });

  describe('POST /api/auth/forgot-password/send-otp', () => {
    it('accepts valid identifier', async () => {
      const response = await client
        .post('/api/auth/forgot-password/send-otp')
        .send({
          identifier: '9876543210',
        });

      // Should return 200 or 400 (if user doesn't exist)
      expect(response.status).to.be.oneOf([200, 400]);
    });
  });

  describe('GET /api/users/profile', () => {
    it('rejects unauthenticated request', async () => {
      await client
        .get('/api/users/profile')
        .expect(401); // Unauthorized
    });
  });

  describe('GET /api/auth/user/sessions', () => {
    it('rejects unauthenticated request', async () => {
      await client
        .get('/api/auth/user/sessions')
        .expect(401); // Unauthorized
    });
  });
});
