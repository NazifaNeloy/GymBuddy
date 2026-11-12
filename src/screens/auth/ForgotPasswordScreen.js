import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { useFormFields } from '../../hooks/useFormFields';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { validateForgotPasswordForm } from '../../utils/validation';
import { AuthHeader } from './AuthHeader';
import { useClearAuthMessagesOnFocus } from './useAuthMessages';

export function ForgotPasswordScreen({ navigation, route }) {
  const theme = useTheme();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const pending = useAuthStore((s) => s.pending);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  useClearAuthMessagesOnFocus();

  const { values, errors, setField, trySubmit } = useFormFields(
    { email: route?.params?.email ?? '' },
    validateForgotPasswordForm
  );

  const onSubmit = () => {
    if (trySubmit()) requestPasswordReset(values.email);
  };

  return (
    <Screen width="form" center testID="forgot-password-screen">
      <AuthHeader title="Reset your password" subtitle="Enter your email and we'll send you a link to choose a new password." />
      <Banner tone="error" message={error} testID="auth-error" />
      <Banner tone="success" message={notice} testID="auth-notice" />

      <TextField
        label="Email"
        value={values.email}
        onChangeText={setField('email')}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={onSubmit}
        testID="forgot-email"
      />
      <Button
        title={notice ? 'Send again' : 'Send reset link'}
        onPress={onSubmit}
        loading={pending === 'resetRequest'}
        disabled={pending !== null}
        testID="forgot-submit"
      />
      <Button
        title="Back to sign in"
        variant="ghost"
        onPress={() => navigation.navigate('Login')}
        style={{ marginTop: theme.spacing.lg }}
      />
    </Screen>
  );
}
