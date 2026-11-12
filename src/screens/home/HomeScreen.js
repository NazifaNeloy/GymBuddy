import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

/** Temporary signed-in screen until the real Home and tab navigator are built. */
export function HomeScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const pending = useAuthStore((s) => s.pending);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  const name = user?.user_metadata?.full_name || user?.email || 'there';

  return (
    <Screen width="form" center testID="home-screen">
      <AppText variant="title" accessibilityRole="header">
        Hi, {name}
      </AppText>
      <AppText color="textMuted" style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.xl }}>
        {"You're signed in. Workouts, routines and progress screens come next."}
      </AppText>
      <Banner tone="success" message={notice} />
      <Banner tone="error" message={error} />
      <Button title="Sign out" variant="secondary" onPress={signOut} loading={pending === 'signOut'} testID="sign-out" />
    </Screen>
  );
}
