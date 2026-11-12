import { useRef } from 'react';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Divider } from '../../components/ui/Divider';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { useFormFields } from '../../hooks/useFormFields';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { PASSWORD_MIN_LENGTH, validateRegisterForm } from '../../utils/validation';
import { AuthHeader } from './AuthHeader';
import { useClearAuthMessagesOnFocus } from './useAuthMessages';

export function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const pending = useAuthStore((s) => s.pending);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  useClearAuthMessagesOnFocus();

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const { values, errors, setField, trySubmit } = useFormFields(
    { displayName: '', email: '', password: '', confirmPassword: '' },
    validateRegisterForm
  );
  const busy = pending !== null;

  const onSubmit = () => {
    if (trySubmit()) signUp(values);
  };

  if (notice) {
    // Email confirmation required: show a clear next step instead of the form.
    return (
      <Screen width="form" center testID="register-check-inbox">
        <AuthHeader title="Check your inbox" />
        <Banner tone="success" message={notice} />
        <Button title="Back to sign in" onPress={() => navigation.navigate('Login')} />
      </Screen>
    );
  }

  return (
    <Screen width="form" testID="register-screen">
      <AuthHeader title="Create your account" subtitle="Free, works offline, syncs when you're back online." />
      <Banner tone="error" message={error} testID="auth-error" />

      <TextField
        label="Name"
        value={values.displayName}
        onChangeText={setField('displayName')}
        error={errors.displayName}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        testID="register-name"
      />
      <TextField
        ref={emailRef}
        label="Email"
        value={values.email}
        onChangeText={setField('email')}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        testID="register-email"
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={values.password}
        onChangeText={setField('password')}
        error={errors.password}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        testID="register-password"
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        value={values.confirmPassword}
        onChangeText={setField('confirmPassword')}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        testID="register-confirm"
      />

      <Button title="Create account" onPress={onSubmit} loading={pending === 'signUp'} disabled={busy} testID="register-submit" />
      <Divider label="or" />
      <Button
        title="Continue with Google"
        variant="secondary"
        onPress={signInWithGoogle}
        loading={pending === 'google'}
        disabled={busy}
      />
      <Button
        title="Already have an account? Sign in"
        variant="ghost"
        onPress={() => navigation.navigate('Login')}
        style={{ marginTop: theme.spacing.lg }}
      />
    </Screen>
  );
}
