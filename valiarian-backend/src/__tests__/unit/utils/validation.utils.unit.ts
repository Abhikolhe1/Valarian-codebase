import {expect} from '@loopback/testlab';
import {
  detectInputType,
  sanitizeInput,
  validateAndCheckPassword,
  validateAndSanitizeEmail,
  validateAndSanitizeMobile,
  validateEmail,
  validateMobile,
  validatePasswordStrength,
} from '../../../utils/validation.utils';

describe('Validation Utils (unit)', () => {
  describe('validateEmail', () => {
    it('validates correct email format', () => {
      expect(validateEmail('test@example.com')).to.be.true();
      expect(validateEmail('user.name@domain.co.in')).to.be.true();
    });

    it('rejects invalid email format', () => {
      expect(validateEmail('invalid')).to.be.false();
      expect(validateEmail('test@')).to.be.false();
      expect(validateEmail('@example.com')).to.be.false();
      expect(validateEmail('test @example.com')).to.be.false();
    });
  });

  describe('validateMobile', () => {
    it('validates correct mobile format (10 digits)', () => {
      expect(validateMobile('1234567890')).to.be.true();
      expect(validateMobile('9876543210')).to.be.true();
    });

    it('rejects invalid mobile format', () => {
      expect(validateMobile('123')).to.be.false();
      expect(validateMobile('12345678901')).to.be.false();
      expect(validateMobile('abcdefghij')).to.be.false();
      expect(validateMobile('123-456-7890')).to.be.false();
    });
  });

  describe('validatePasswordStrength', () => {
    it('validates strong password', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.isValid).to.be.true();
      expect(result.errors).to.be.empty();
    });

    it('rejects password without uppercase', () => {
      const result = validatePasswordStrength('password123');
      expect(result.isValid).to.be.false();
      expect(result.errors).to.containEql('Password must contain at least one uppercase letter');
    });

    it('rejects password without lowercase', () => {
      const result = validatePasswordStrength('PASSWORD123');
      expect(result.isValid).to.be.false();
      expect(result.errors).to.containEql('Password must contain at least one lowercase letter');
    });

    it('rejects password without number', () => {
      const result = validatePasswordStrength('PasswordABC');
      expect(result.isValid).to.be.false();
      expect(result.errors).to.containEql('Password must contain at least one number');
    });

    it('rejects password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Pass1');
      expect(result.isValid).to.be.false();
      expect(result.errors).to.containEql('Password must be at least 8 characters long');
    });
  });

  describe('sanitizeInput', () => {
    it('escapes HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).to.equal(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
      );
    });

    it('escapes quotes', () => {
      expect(sanitizeInput('Test "quoted" text')).to.equal('Test &quot;quoted&quot; text');
      expect(sanitizeInput("Test 'quoted' text")).to.equal('Test &#x27;quoted&#x27; text');
    });

    it('leaves normal text unchanged', () => {
      expect(sanitizeInput('Normal text 123')).to.equal('Normal text 123');
    });
  });

  describe('validateAndSanitizeEmail', () => {
    it('validates and trims email', () => {
      expect(validateAndSanitizeEmail('  Test@Example.COM  ')).to.equal('test@example.com');
    });

    it('throws error for invalid email', () => {
      expect(() => validateAndSanitizeEmail('invalid')).to.throw(/Invalid email format/);
    });
  });

  describe('validateAndSanitizeMobile', () => {
    it('validates and trims mobile', () => {
      expect(validateAndSanitizeMobile('  1234567890  ')).to.equal('1234567890');
    });

    it('removes spaces from mobile', () => {
      expect(validateAndSanitizeMobile('123 456 7890')).to.equal('1234567890');
    });

    it('throws error for invalid mobile', () => {
      expect(() => validateAndSanitizeMobile('123')).to.throw(/Invalid mobile format/);
    });
  });

  describe('validateAndCheckPassword', () => {
    it('accepts valid password', () => {
      expect(() => validateAndCheckPassword('Password123')).to.not.throw();
    });

    it('throws error for weak password', () => {
      expect(() => validateAndCheckPassword('weak')).to.throw(/Password does not meet requirements/);
    });
  });

  describe('detectInputType', () => {
    it('detects email input', () => {
      expect(detectInputType('test@example.com')).to.equal('email');
      expect(detectInputType('user@domain.co')).to.equal('email');
    });

    it('detects mobile input', () => {
      expect(detectInputType('1234567890')).to.equal('mobile');
      expect(detectInputType('9876543210')).to.equal('mobile');
    });
  });
});
