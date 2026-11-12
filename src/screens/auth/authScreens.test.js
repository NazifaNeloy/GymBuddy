import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { RootNavigator } from '../../navigation/RootNavigator';
import * as authService from '../../services/supabase/auth';
import { authError } from '../../services/supabase/errors';
import { useAuthStore } from '../../store/authStore';
import { ThemeProvider } from '../../theme/ThemeProvider';

jest.mock('../../services/supabase/auth', () => ({
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(() => () => {}),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  sendPasswordReset: jest.fn(),
  updatePassword: jest.fn(),
  signOut: jest.fn(),
  handleAuthRedirect: jest.fn(),
}));

const session = { access_token: 'at', user: { id: 'u1', email: 'nazifa@example.com', user_metadata: { full_name: 'Nazifa' } } };

async function renderApp(state = { status: 'signedOut' }) {
  useAuthStore.getState().teardown();
  useAuthStore.setState(state);
  await render(
    <ThemeProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('auth gate', () => {
  it('shows a loading state while the session is being restored', async () => {
    await renderApp({ status: 'initializing' });
    expect(screen.getByText('Starting GymBuddy…')).toBeTruthy();
  });

  it('shows Home for a signed-in user and Login after sign-out', async () => {
    authService.signOut.mockResolvedValue();
    await renderApp({ status: 'signedIn', session, user: session.user });
    expect(screen.getByText('Hi, Nazifa')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByTestId('login-screen')).toBeTruthy();
  });

  it('shows the reset screen in password recovery mode', async () => {
    await renderApp({ status: 'signedIn', session, user: session.user, isPasswordRecovery: true });
    expect(screen.getByTestId('reset-password-screen')).toBeTruthy();
  });
});

describe('LoginScreen', () => {
  it('validates before calling the server', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByText('Enter your email address.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(authService.signInWithEmail).not.toHaveBeenCalled();
  });

  it('signs in and switches to Home', async () => {
    authService.signInWithEmail.mockResolvedValue(session);
    await renderApp();
    await fireEvent.changeText(screen.getByTestId('login-email'), 'nazifa@example.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'gymbuddy1');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(authService.signInWithEmail).toHaveBeenCalledWith({ email: 'nazifa@example.com', password: 'gymbuddy1' });
    expect(await screen.findByText('Hi, Nazifa')).toBeTruthy();
  });

  it('shows the server error message', async () => {
    authService.signInWithEmail.mockRejectedValue(authError('invalid_credentials'));
    await renderApp();
    await fireEvent.changeText(screen.getByTestId('login-email'), 'nazifa@example.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'wrong');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy();
  });

  it('starts Google sign-in', async () => {
    authService.signInWithGoogle.mockResolvedValue({ cancelled: true });
    await renderApp();
    await fireEvent.press(screen.getByTestId('login-google'));
    expect(authService.signInWithGoogle).toHaveBeenCalled();
  });
});

describe('RegisterScreen', () => {
  it('shows "check your inbox" after sign-up when confirmation is required', async () => {
    authService.signUpWithEmail.mockResolvedValue({ session: null, needsEmailConfirmation: true });
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'New to GymBuddy? Create an account' }));
    await fireEvent.changeText(await screen.findByTestId('register-name'), 'Nazifa');
    await fireEvent.changeText(screen.getByTestId('register-email'), 'nazifa@example.com');
    await fireEvent.changeText(screen.getByTestId('register-password'), 'gymbuddy1');
    await fireEvent.changeText(screen.getByTestId('register-confirm'), 'gymbuddy1');
    await fireEvent.press(screen.getByTestId('register-submit'));
    expect(await screen.findByTestId('register-check-inbox')).toBeTruthy();
    expect(screen.getByText(/confirmation link to nazifa@example.com/)).toBeTruthy();
  });

  it('flags mismatched passwords', async () => {
    await renderApp();
    await fireEvent.press(screen.getByRole('button', { name: 'New to GymBuddy? Create an account' }));
    await fireEvent.changeText(await screen.findByTestId('register-password'), 'gymbuddy1');
    await fireEvent.changeText(screen.getByTestId('register-confirm'), 'gymbuddy2');
    await fireEvent.press(screen.getByTestId('register-submit'));
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(authService.signUpWithEmail).not.toHaveBeenCalled();
  });
});

describe('ForgotPasswordScreen', () => {
  it('carries over the typed email and confirms the reset email', async () => {
    authService.sendPasswordReset.mockResolvedValue();
    await renderApp();
    await fireEvent.changeText(screen.getByTestId('login-email'), 'nazifa@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    expect((await screen.findByTestId('forgot-email')).props.value).toBe('nazifa@example.com');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(authService.sendPasswordReset).toHaveBeenCalledWith('nazifa@example.com');
    expect(await screen.findByTestId('auth-notice')).toBeTruthy();
  });
});

describe('ResetPasswordScreen', () => {
  it('saves a valid new password and returns to Home', async () => {
    authService.updatePassword.mockResolvedValue(session.user);
    await renderApp({ status: 'signedIn', session, user: session.user, isPasswordRecovery: true });
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'newpass123');
    await fireEvent.changeText(screen.getByTestId('reset-confirm'), 'newpass123');
    await act(async () => {
      fireEvent.press(screen.getByTestId('reset-submit'));
    });
    expect(authService.updatePassword).toHaveBeenCalledWith('newpass123');
    expect(await screen.findByText('Your password has been updated.')).toBeTruthy();
  });
});
