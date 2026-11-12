import { useRef } from 'react';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { useFormFields } from '../../hooks/useFormFields';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { PASSWORD_MIN_LENGTH, validateResetPasswordForm } from '../../utils/validation';
import { AuthHeader } from './AuthHeader';

/** Shown after the user opens a password-reset link from their email. */
export function ResetPasswordScreen() {
  const theme = useTheme();
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const cancelPasswordRecovery = useAuthStore((s) => s.cancelPasswordRecovery);
  const pending = useAuthStore((s) => s.pending);
  const error = useAuthStore((s) => s.error);

  const confirmRef = useRef(null);
  const { values, errors, setField, trySubmit } = useFormFields(
    { password: '', confirmPassword: '' },
    validateResetPasswordForm
  );

  const onSubmit = () => {
    if (trySubmit()) updatePassword(values.password);
  };

  return (
    <Screen width="form" center testID="reset-password-screen">
      <AuthHeader title="Choose a new password" />
      <Banner tone="error" message={error} testID="auth-error" />
      <TextField
        label="New password"
        value={values.password}
        onChangeText={setField('password')}
        error={errors.password}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        testID="reset-password"
      />
      <TextField
        ref={confirmRef}
        label="Confirm new password"
        value={values.confirmPassword}
        onChangeText={setField('confirmPassword')}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        testID="reset-confirm"
      />
      <Button
        title="Save new password"
        onPress={onSubmit}
        loading={pending === 'updatePassword'}
        disabled={pending !== null}
        testID="reset-submit"
      />
      <Button
        title="Cancel"
        variant="ghost"
        onPress={cancelPasswordRecovery}
        disabled={pending !== null}
        style={{ marginTop: theme.spacing.lg }}
      />
    </Screen>
  );
}
