import { AuthFlowError, authError, getAuthErrorMessage, toAuthError } from './errors';

describe('auth error mapping', () => {
  it('maps Supabase error codes', () => {
    expect(getAuthErrorMessage({ code: 'invalid_credentials' })).toBe('Email or password is incorrect.');
    expect(getAuthErrorMessage({ code: 'over_email_send_rate_limit' })).toMatch(/Too many emails/);
  });

  it('falls back to message patterns', () => {
    expect(getAuthErrorMessage({ message: 'Invalid login credentials' })).toBe('Email or password is incorrect.');
    expect(getAuthErrorMessage(new TypeError('Network request failed'))).toMatch(/internet connection/);
    expect(getAuthErrorMessage({ name: 'AuthRetryableFetchError', message: '' })).toMatch(/internet connection/);
  });

  it('never leaks raw server text for unknown errors', () => {
    expect(getAuthErrorMessage({ message: 'pq: duplicate key value violates constraint' })).toBe(
      'Something went wrong. Please try again.'
    );
    expect(getAuthErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });

  it('toAuthError wraps once and keeps the code', () => {
    const e = toAuthError({ code: 'email_not_confirmed' });
    expect(e).toBeInstanceOf(AuthFlowError);
    expect(e.code).toBe('email_not_confirmed');
    expect(toAuthError(e)).toBe(e);
    expect(authError('user_already_exists').message).toMatch(/already exists/);
  });
});
