// Form validation for auth screens. Each validator returns an error message or null.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(value) {
  const email = (value ?? '').trim();
  if (!email) return 'Enter your email address.';
  if (email.length > 254 || !EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

/** For sign-in we only require something to be typed; the server decides if it is correct. */
export function validateLoginPassword(value) {
  if (!value) return 'Enter your password.';
  return null;
}

/** For new passwords (register / reset): at least 8 characters with a letter and a number. */
export function validateNewPassword(value) {
  const password = value ?? '';
  if (!password) return 'Create a password.';
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > 72) return 'Use 72 characters or fewer.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';
  return null;
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return 'Re-enter your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
}

export function validateDisplayName(value) {
  const name = (value ?? '').trim();
  if (!name) return 'Enter your name.';
  if (name.length > 60) return 'Use 60 characters or fewer.';
  return null;
}

/** Keep only fields that have an error; empty object = valid. */
export function collectErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)));
}

export function validateLoginForm({ email, password }) {
  return collectErrors({ email: validateEmail(email), password: validateLoginPassword(password) });
}

export function validateRegisterForm({ displayName, email, password, confirmPassword }) {
  return collectErrors({
    displayName: validateDisplayName(displayName),
    email: validateEmail(email),
    password: validateNewPassword(password),
    confirmPassword: validatePasswordConfirmation(password, confirmPassword),
  });
}

export function validateForgotPasswordForm({ email }) {
  return collectErrors({ email: validateEmail(email) });
}

export function validateResetPasswordForm({ password, confirmPassword }) {
  return collectErrors({
    password: validateNewPassword(password),
    confirmPassword: validatePasswordConfirmation(password, confirmPassword),
  });
}
