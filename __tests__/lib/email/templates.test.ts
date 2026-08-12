import { welcomeEmail, verifyEmail, resetPasswordEmail } from '@/lib/server/email/templates';

describe('email templates', () => {
  it('builds welcome email with brand content', () => {
    const mail = welcomeEmail('Ram Kumar');
    expect(mail.subject).toContain('Welcome');
    expect(mail.html).toContain('Ram Kumar');
    expect(mail.html).toContain('#10b981');
  });

  it('includes verification link with token', () => {
    const mail = verifyEmail('Ram', 'test-token-123');
    expect(mail.html).toContain('test-token-123');
    expect(mail.text).toContain('verify-email');
  });

  it('includes reset password link', () => {
    const mail = resetPasswordEmail('Ram', 'reset-token');
    expect(mail.html).toContain('reset-token');
    expect(mail.html).toContain('Reset password');
  });
});
