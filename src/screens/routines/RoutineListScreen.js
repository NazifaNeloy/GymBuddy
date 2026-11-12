import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { RoutineCard } from '../../components/routines/RoutineCard';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineBanner } from '../../components/states/OfflineBanner';
import { SyncStatus } from '../../components/states/SyncStatus';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { useResponsive } from '../../hooks/useResponsive';
import { useExerciseStore } from '../../store/exerciseStore';
import { selectMyRoutines, selectTemplates, useRoutineStore } from '../../store/routineStore';
import { useTheme } from '../../theme/ThemeProvider';

function Grid({ children }) {
  const theme = useTheme();
  const { columns } = useResponsive();
  const gap = theme.spacing.md;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {[].concat(children).map((child, i) => (
        <View key={child?.key ?? i} style={{ width: `${100 / columns}%`, padding: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function RoutineListScreen({ navigation }) {
  const theme = useTheme();
  const routines = useRoutineStore((s) => s.routines);
  const routineExercises = useRoutineStore((s) => s.routineExercises);
  const status = useRoutineStore((s) => s.status);
  const error = useRoutineStore((s) => s.error);
  const load = useRoutineStore((s) => s.load);
  const loadExercises = useExerciseStore((s) => s.load);

  useEffect(() => {
    load();
    loadExercises(); // the builder needs exercise names
  }, [load, loadExercises]);

  const mine = useMemo(() => selectMyRoutines({ routines }), [routines]);
  const templates = useMemo(() => selectTemplates({ routines }), [routines]);
  const counts = useMemo(() => {
    const c = {};
    Object.values(routineExercises).forEach((r) => {
      if (!r.deleted_at) c[r.routine_id] = (c[r.routine_id] ?? 0) + 1;
    });
    return c;
  }, [routineExercises]);

  const hasAny = mine.length + templates.length > 0;
  if (!hasAny && (status === 'idle' || status === 'loading')) return <LoadingState message="Loading routines…" />;
  if (!hasAny && status === 'error') return <ErrorState title="Couldn't load routines" message={error} onRetry={load} />;

  const newRoutine = () => navigation.navigate('RoutineBuilder', {});

  return (
    <Screen testID="routine-list-screen">
      <OfflineBanner message="You're offline. Changes are saved on this phone and will sync later." />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <AppText variant="title" accessibilityRole="header">
          My routines
        </AppText>
        <Button title="New routine" onPress={newRoutine} testID="new-routine" />
      </View>
      <SyncStatus style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.md }} />

      {mine.length === 0 ? (
        <Card testID="my-routines-empty">
          <AppText variant="heading">No routines yet</AppText>
          <AppText color="textMuted" style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg }}>
            Build your own plan, or start from one of the starter routines below and change it to suit you.
          </AppText>
          <Button title="Create a routine" variant="secondary" onPress={newRoutine} />
        </Card>
      ) : (
        <Grid>
          {mine.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              exerciseCount={counts[r.id] ?? 0}
              onPress={() => navigation.navigate('RoutineBuilder', { routineId: r.id })}
            />
          ))}
        </Grid>
      )}

      {templates.length > 0 ? (
        <>
          <AppText variant="heading" accessibilityRole="header" style={{ marginTop: theme.spacing.xxl }}>
            Starter routines
          </AppText>
          <AppText variant="caption" color="textMuted" style={{ marginBottom: theme.spacing.md }}>
            Proven beginner plans. Open one and tap “Use this routine” to make your own copy.
          </AppText>
          <Grid>
            {templates.map((r) => (
              <RoutineCard
                key={r.id}
                routine={r}
                isTemplate
                exerciseCount={counts[r.id] ?? 0}
                onPress={() => navigation.navigate('RoutineBuilder', { templateId: r.id })}
              />
            ))}
          </Grid>
        </>
      ) : null}
    </Screen>
  );
}
