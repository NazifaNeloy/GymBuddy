import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { confirmAction } from '../../utils/confirm';
import { plural } from '../../utils/format';
import { useTheme } from '../../theme/ThemeProvider';

/** Temporary signed-in screen until the real Home and tab navigator are built. */
export function HomeScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const pending = useAuthStore((s) => s.pending);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const name = user?.user_metadata?.full_name || user?.email || 'there';

  // Signing out clears this phone's data, so warn if some changes have not reached the cloud yet.
  const onSignOut = async () => {
    if (pendingCount > 0) {
      const ok = await confirmAction({
        title: 'Sign out?',
        message: `${plural(pendingCount, 'change')} on this phone ${pendingCount === 1 ? "hasn't" : "haven't"} synced yet and will be lost. Connect to the internet first to keep ${pendingCount === 1 ? 'it' : 'them'}.`,
        confirmLabel: 'Sign out anyway',
        destructive: true,
      });
      if (!ok) return;
    }
    signOut();
  };

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
      <Button title="Sign out" variant="secondary" onPress={onSignOut} loading={pending === 'signOut'} testID="sign-out" />
    </Screen>
  );
}
