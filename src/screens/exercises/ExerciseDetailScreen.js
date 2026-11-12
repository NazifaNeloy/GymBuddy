import { useEffect } from 'react';
import { View } from 'react-native';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineBanner } from '../../components/states/OfflineBanner';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Screen } from '../../components/ui/Screen';
import { CATEGORY_LABELS, TRACKING_LABELS, equipmentLabel, muscleLabel } from '../../constants/exercises';
import { useResponsive } from '../../hooks/useResponsive';
import { useExerciseStore } from '../../store/exerciseStore';
import { useTheme } from '../../theme/ThemeProvider';

function InfoTile({ label, value, style }) {
  const theme = useTheme();
  return (
    <Card style={[{ padding: theme.spacing.md }, style]}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="label" style={{ marginTop: theme.spacing.xxs }}>
        {value}
      </AppText>
    </Card>
  );
}

function Section({ title, children }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: theme.spacing.xl }}>
      <AppText variant="heading" accessibilityRole="header" style={{ marginBottom: theme.spacing.sm }}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function ExerciseDetailScreen({ route }) {
  const theme = useTheme();
  const { isTablet } = useResponsive();
  const exerciseId = route.params?.exerciseId;
  const exercise = useExerciseStore((s) => s.items.find((e) => e.id === exerciseId) ?? null);
  const status = useExerciseStore((s) => s.status);
  const load = useExerciseStore((s) => s.load);

  // Opened from a deep link or after the cache was cleared: load the library.
  useEffect(() => {
    if (!exercise) load();
  }, [exercise, load]);

  if (!exercise && (status === 'idle' || status === 'loading')) {
    return <LoadingState message="Loading exercise…" />;
  }
  if (!exercise) {
    return (
      <ErrorState
        title="Exercise not found"
        message="It may have been removed, or the library couldn't be loaded."
        onRetry={() => load({ force: true })}
      />
    );
  }

  const tileStyle = { flexBasis: isTablet ? '31%' : '47%', flexGrow: 1, margin: theme.spacing.xs };

  return (
    <Screen testID="exercise-detail-screen">
      <OfflineBanner />
      <AppText variant="title" accessibilityRole="header">
        {exercise.name}
      </AppText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.spacing.md }}>
        <Chip label={muscleLabel(exercise.primary_muscle)} selected testID="detail-primary-muscle" />
        {(exercise.secondary_muscles ?? []).map((m) => (
          <Chip key={m} label={muscleLabel(m)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.xs, marginTop: theme.spacing.sm }}>
        <InfoTile label="Equipment" value={equipmentLabel(exercise.equipment)} style={tileStyle} />
        <InfoTile label="Type" value={CATEGORY_LABELS[exercise.category] ?? exercise.category} style={tileStyle} />
        <InfoTile label="Logged as" value={TRACKING_LABELS[exercise.tracking] ?? exercise.tracking} style={tileStyle} />
      </View>

      <Section title="How to do it">
        <Card>
          <AppText>{exercise.instructions || 'No instructions yet for this exercise.'}</AppText>
        </Card>
      </Section>

      <Section title="Your history">
        <Card testID="exercise-history-empty">
          <AppText variant="label">No sets logged yet</AppText>
          <AppText variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xxs }}>
            After your first workout with this exercise, your best sets, personal records and estimated 1RM will
            show here.
          </AppText>
        </Card>
      </Section>
    </Screen>
  );
}
