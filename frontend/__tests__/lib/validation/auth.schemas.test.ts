import { signupSchema, loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/server/validation/auth.schemas';
import { farmerCreateSchema } from '@/lib/server/validation/farmer.schemas';

describe('auth validation schemas', () => {
  describe('signupSchema', () => {
    const valid = {
      email: 'farmer@example.com',
      name: 'Ram Kumar',
      password: 'password123',
      state: 'Madhya Pradesh',
      district: 'Bhopal',
      tehsil: 'Huzur',
      locality: 'Arera Colony',
    };

    it('accepts valid signup payload', () => {
      const result = signupSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects short password', () => {
      const result = signupSchema.safeParse({ ...valid, password: 'short' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = signupSchema.safeParse({ ...valid, email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('rejects missing location fields', () => {
      const result = signupSchema.safeParse({ ...valid, state: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login', () => {
      const result = loginSchema.safeParse({
        email: 'user@test.com',
        password: 'secret',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@test.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    it('requires refresh_token', () => {
      expect(refreshSchema.safeParse({}).success).toBe(false);
      expect(refreshSchema.safeParse({ refresh_token: 'abc' }).success).toBe(true);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('requires valid email', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
      expect(forgotPasswordSchema.safeParse({ email: 'user@test.com' }).success).toBe(true);
    });
  });

  describe('resetPasswordSchema', () => {
    it('requires token and strong password', () => {
      expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'short' }).success).toBe(false);
      expect(
        resetPasswordSchema.safeParse({ token: 'abc', password: 'password123' }).success
      ).toBe(true);
    });
  });
});

describe('farmerCreateSchema', () => {
  it('accepts valid farmer', () => {
    const result = farmerCreateSchema.safeParse({
      name: 'Suresh Patel',
      phone: '+919876543210',
      location: 'Indore',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid phone', () => {
    const result = farmerCreateSchema.safeParse({
      name: 'Suresh Patel',
      phone: '123',
    });
    expect(result.success).toBe(false);
  });
});
