import { useRef } from 'react';
import { View } from 'react-native';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Divider } from '../../components/ui/Divider';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { useFormFields } from '../../hooks/useFormFields';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { validateLoginForm } from '../../utils/validation';
import { AuthHeader } from './AuthHeader';
import { useClearAuthMessagesOnFocus } from './useAuthMessages';

export function LoginScreen({ navigation }) {
  const theme = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const pending = useAuthStore((s) => s.pending);
  const error = useAuthStore((s) => s.error);
  useClearAuthMessagesOnFocus();

  const passwordRef = useRef(null);
  const { values, errors, setField, trySubmit } = useFormFields({ email: '', password: '' }, validateLoginForm);
  const busy = pending !== null;

  const onSubmit = () => {
    if (trySubmit()) signIn(values);
  };

  return (
    <Screen width="form" center testID="login-screen">
      <AuthHeader showBrand title="Welcome back" subtitle="Sign in to log your workouts and track progress." />
      <Banner tone="error" message={error} testID="auth-error" />

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
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        testID="login-email"
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={values.password}
        onChangeText={setField('password')}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        testID="login-password"
      />

      <View style={{ alignItems: 'flex-end', marginTop: -theme.spacing.sm, marginBottom: theme.spacing.lg }}>
        <Button
          title="Forgot password?"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword', { email: values.email })}
        />
      </View>

      <Button title="Sign in" onPress={onSubmit} loading={pending === 'signIn'} disabled={busy} testID="login-submit" />
      <Divider label="or" />
      <Button
        title="Continue with Google"
        variant="secondary"
        onPress={signInWithGoogle}
        loading={pending === 'google'}
        disabled={busy}
        testID="login-google"
      />
      <Button
        title="New to GymBuddy? Create an account"
        variant="ghost"
        onPress={() => navigation.navigate('Register')}
        style={{ marginTop: theme.spacing.lg }}
      />
    </Screen>
  );
}
