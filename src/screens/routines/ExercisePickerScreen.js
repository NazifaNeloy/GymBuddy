import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ExerciseFilterBar } from '../../components/exercises/ExerciseFilterBar';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { equipmentLabel, muscleLabel } from '../../constants/exercises';
import { useResponsive } from '../../hooks/useResponsive';
import { useExerciseStore } from '../../store/exerciseStore';
import { useTheme } from '../../theme/ThemeProvider';
import { filterExercises } from '../../utils/exerciseFilters';
import { plural } from '../../utils/format';

/** Multi-select exercises for one routine day; returns them to the builder via route params. */
export function ExercisePickerScreen({ navigation, route }) {
  const theme = useTheme();
  const { gutter } = useResponsive();
  const { dayIndex = 0, dayName, alreadyAdded = [] } = route.params ?? {};
  const items = useExerciseStore((s) => s.items);
  const status = useExerciseStore((s) => s.status);
  const error = useExerciseStore((s) => s.error);
  const load = useExerciseStore((s) => s.load);

  const [query, setQuery] = useState('');
  const [muscles, setMuscles] = useState([]);
  const [selected, setSelected] = useState([]);
  const added = useMemo(() => new Set(alreadyAdded), [alreadyAdded]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    navigation.setOptions({ title: dayName ? `Add to ${dayName}` : 'Add exercises' });
  }, [navigation, dayName]);

  const results = useMemo(() => filterExercises(items, { query, muscles }), [items, query, muscles]);

  if (items.length === 0 && (status === 'idle' || status === 'loading')) return <LoadingState message="Loading exercises…" />;
  if (items.length === 0 && status === 'error') {
    return <ErrorState title="Couldn't load exercises" message={error} onRetry={() => load({ force: true })} />;
  }

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const done = () =>
    navigation.popTo('RoutineBuilder', { pickedExerciseIds: selected, pickedDayIndex: dayIndex }, { merge: true });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]} testID="exercise-picker-screen">
      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl * 2,
          width: '100%',
          maxWidth: theme.layout.contentMaxWidth,
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.sm }}>
            <ExerciseFilterBar
              exercises={items}
              query={query}
              onQueryChange={setQuery}
              muscles={muscles}
              onMusclesChange={setMuscles}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No matching exercises"
            message="Try another word or remove a muscle filter."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery('');
              setMuscles([]);
            }}
          />
        }
        renderItem={({ item }) => {
          const isAdded = added.has(item.id);
          const isSelected = selected.includes(item.id);
          return (
            <Card
              onPress={isAdded ? undefined : () => toggle(item.id)}
              accessibilityLabel={`${item.name}${isAdded ? ', already in this day' : isSelected ? ', selected' : ''}`}
              testID={`pick-${item.id}`}
              style={{
                marginBottom: theme.spacing.sm,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                borderWidth: isSelected ? 2 : 1,
                opacity: isAdded ? 0.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label">{item.name}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {muscleLabel(item.primary_muscle)} · {equipmentLabel(item.equipment)}
                  </AppText>
                </View>
                <AppText variant="label" color={isSelected ? 'primary' : 'textMuted'}>
                  {isAdded ? 'Added' : isSelected ? '✓ Selected' : 'Select'}
                </AppText>
              </View>
            </Card>
          );
        }}
      />
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingHorizontal: gutter,
            paddingVertical: theme.spacing.md,
          },
        ]}
      >
        <Button
          title={selected.length ? `Add ${plural(selected.length, 'exercise')}` : 'Select exercises to add'}
          onPress={done}
          disabled={selected.length === 0}
          testID="picker-done"
          style={{ width: '100%', maxWidth: theme.layout.formMaxWidth, alignSelf: 'center' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth },
});
