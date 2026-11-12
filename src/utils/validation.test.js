import {
  validateEmail,
  validateLoginForm,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRegisterForm,
  validateResetPasswordForm,
} from './validation';

describe('validateEmail', () => {
  it.each([
    ['', 'Enter your email address.'],
    ['   ', 'Enter your email address.'],
    ['nazifa', 'Enter a valid email address.'],
    ['nazifa@cuet', 'Enter a valid email address.'],
    ['a b@x.com', 'Enter a valid email address.'],
  ])('rejects %p', (input, message) => {
    expect(validateEmail(input)).toBe(message);
  });

  it('accepts valid addresses and ignores surrounding spaces', () => {
    expect(validateEmail('student@cuet.ac.bd')).toBeNull();
    expect(validateEmail('  student@gmail.com ')).toBeNull();
  });
});

describe('validateNewPassword', () => {
  it('requires 8+ characters with a letter and a number', () => {
    expect(validateNewPassword('')).toBe('Create a password.');
    expect(validateNewPassword('abc12')).toBe('Use at least 8 characters.');
    expect(validateNewPassword('abcdefgh')).toBe('Include at least one letter and one number.');
    expect(validateNewPassword('12345678')).toBe('Include at least one letter and one number.');
    expect(validateNewPassword('gymbuddy1')).toBeNull();
  });

  it('rejects passwords longer than 72 characters', () => {
    expect(validateNewPassword('a1'.repeat(37))).toBe('Use 72 characters or fewer.');
  });
});

describe('validatePasswordConfirmation', () => {
  it('requires a matching confirmation', () => {
    expect(validatePasswordConfirmation('gymbuddy1', '')).toBe('Re-enter your password.');
    expect(validatePasswordConfirmation('gymbuddy1', 'gymbuddy2')).toBe('Passwords do not match.');
    expect(validatePasswordConfirmation('gymbuddy1', 'gymbuddy1')).toBeNull();
  });
});

describe('form validators', () => {
  it('returns only the fields with errors', () => {
    expect(validateLoginForm({ email: 'x@y.com', password: '' })).toEqual({ password: 'Enter your password.' });
    expect(validateLoginForm({ email: 'x@y.com', password: 'anything' })).toEqual({});
  });

  it('validates the whole register form', () => {
    expect(
      validateRegisterForm({ displayName: '', email: 'bad', password: 'short', confirmPassword: 'nope' })
    ).toEqual({
      displayName: 'Enter your name.',
      email: 'Enter a valid email address.',
      password: 'Use at least 8 characters.',
      confirmPassword: 'Passwords do not match.',
    });
    expect(
      validateRegisterForm({ displayName: 'Nazifa', email: 'n@x.com', password: 'gymbuddy1', confirmPassword: 'gymbuddy1' })
    ).toEqual({});
  });

  it('validates the reset password form', () => {
    expect(validateResetPasswordForm({ password: 'gymbuddy1', confirmPassword: 'gymbuddy1' })).toEqual({});
  });
});
