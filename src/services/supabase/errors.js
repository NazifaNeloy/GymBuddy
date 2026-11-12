// Turn Supabase Auth errors into short, friendly messages for the UI.

export class AuthFlowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthFlowError';
    this.code = code;
  }
}

const MESSAGES = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Please confirm your email first. Check your inbox for the link we sent.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  email_exists: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'That password is too weak. Try a longer one with letters and numbers.',
  same_password: 'Your new password must be different from your current one.',
  email_address_invalid: 'Enter a valid email address.',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a minute and try again.',
  otp_expired: 'This link has expired or was already used. Request a new one.',
  flow_state_expired: 'This sign-in took too long. Please try again.',
  access_denied: 'Sign-in was cancelled.',
  session_not_found: 'Your session has ended. Please sign in again.',
  refresh_token_not_found: 'Your session has ended. Please sign in again.',
  provider_disabled: 'This sign-in method is not enabled yet.',
  validation_failed: 'Please check the details you entered.',
  network: "Can't reach the server. Check your internet connection and try again.",
  missing_config: 'The app is not configured. Add your Supabase URL and key to .env.',
  unknown: 'Something went wrong. Please try again.',
};

// Older/other error shapes only carry a message.
const MESSAGE_PATTERNS = [
  [/invalid login credentials/i, 'invalid_credentials'],
  [/email not confirmed/i, 'email_not_confirmed'],
  [/already registered|already exists/i, 'user_already_exists'],
  [/rate limit/i, 'over_request_rate_limit'],
  [/network request failed|failed to fetch|fetch failed|network error/i, 'network'],
  [/missing supabase config/i, 'missing_config'],
  [/expired/i, 'otp_expired'],
  [/provider is not enabled|unsupported provider/i, 'provider_disabled'],
];

export function getAuthErrorCode(error) {
  if (!error) return 'unknown';
  if (error.code && MESSAGES[error.code]) return error.code;
  if (error.name === 'AuthRetryableFetchError') return 'network';
  const text = `${error.message ?? ''} ${error.error_description ?? ''}`;
  const match = MESSAGE_PATTERNS.find(([re]) => re.test(text));
  return match ? match[1] : 'unknown';
}

export function getAuthErrorMessage(error) {
  return MESSAGES[getAuthErrorCode(error)];
}

/** Normalise any thrown value into an AuthFlowError with a friendly message. */
export function toAuthError(error) {
  if (error instanceof AuthFlowError) return error;
  const code = getAuthErrorCode(error);
  return new AuthFlowError(code, MESSAGES[code]);
}

export function authError(code) {
  return new AuthFlowError(code, MESSAGES[code] ?? MESSAGES.unknown);
}
