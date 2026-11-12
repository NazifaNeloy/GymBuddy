import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ExerciseCard } from '../../components/exercises/ExerciseCard';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { OfflineBanner } from '../../components/states/OfflineBanner';
import { AppText } from '../../components/ui/AppText';
import { Banner } from '../../components/ui/Banner';
import { Chip } from '../../components/ui/Chip';
import { TextField } from '../../components/ui/TextField';
import { MUSCLE_GROUPS } from '../../constants/exercises';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useResponsive } from '../../hooks/useResponsive';
import { useExerciseStore } from '../../store/exerciseStore';
import { useTheme } from '../../theme/ThemeProvider';
import { availableMuscleGroups, filterExercises } from '../../utils/exerciseFilters';

export function ExerciseLibraryScreen({ navigation }) {
  const theme = useTheme();
  const { columns, gutter } = useResponsive();
  const { isOffline } = useNetworkStatus();

  const items = useExerciseStore((s) => s.items);
  const status = useExerciseStore((s) => s.status);
  const error = useExerciseStore((s) => s.error);
  const refreshError = useExerciseStore((s) => s.refreshError);
  const refreshing = useExerciseStore((s) => s.refreshing);
  const load = useExerciseStore((s) => s.load);

  const [query, setQuery] = useState('');
  const [muscles, setMuscles] = useState([]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => availableMuscleGroups(items, MUSCLE_GROUPS), [items]);
  const results = useMemo(() => filterExercises(items, { query, muscles }), [items, query, muscles]);

  const toggleMuscle = useCallback(
    (key) => setMuscles((current) => (current.includes(key) ? current.filter((m) => m !== key) : [...current, key])),
    []
  );
  const clearFilters = useCallback(() => {
    setQuery('');
    setMuscles([]);
  }, []);
  const retry = useCallback(() => load({ force: true }), [load]);

  if ((status === 'idle' || status === 'loading') && items.length === 0) {
    return <LoadingState message="Loading exercises…" />;
  }
  if (status === 'error' && items.length === 0) {
    return <ErrorState title="Couldn't load exercises" message={error} onRetry={retry} />;
  }

  const hasFilters = query.trim().length > 0 || muscles.length > 0;
  const cardGap = theme.spacing.md;

  const header = (
    <View style={{ paddingHorizontal: cardGap / 2 }}>
      <OfflineBanner />
      {!isOffline && refreshError ? (
        <Banner tone="warning" message={`Couldn't refresh. Showing saved exercises. ${refreshError}`} />
      ) : null}
      <TextField
        label="Search exercises"
        value={query}
        onChangeText={setQuery}
        placeholder="e.g. bench, squat, biceps, cable"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        testID="exercise-search"
        style={{ marginBottom: theme.spacing.md }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Filter by muscle group"
        contentContainerStyle={{ paddingRight: gutter }}
      >
        <Chip label="All" selected={muscles.length === 0} onPress={() => setMuscles([])} testID="muscle-chip-all" />
        {groups.map((g) => (
          <Chip
            key={g.key}
            label={g.label}
            selected={muscles.includes(g.key)}
            onPress={() => toggleMuscle(g.key)}
            testID={`muscle-chip-${g.key}`}
          />
        ))}
      </ScrollView>
      <AppText variant="caption" color="textMuted" style={{ marginVertical: theme.spacing.sm }} testID="exercise-count">
        {results.length === 1 ? '1 exercise' : `${results.length} exercises`}
      </AppText>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]} testID="exercise-library-screen">
      <FlatList
        key={`cols-${columns}`}
        data={results}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          hasFilters ? (
            <EmptyState
              title="No matching exercises"
              message="Try another word or remove a muscle filter."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <EmptyState title="No exercises yet" message="Pull down to refresh the library." actionLabel="Retry" onAction={retry} />
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.flex, { margin: cardGap / 2 }]}>
            <ExerciseCard
              exercise={item}
              onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id, title: item.name })}
              style={styles.flex}
            />
          </View>
        )}
        contentContainerStyle={{
          paddingHorizontal: gutter - cardGap / 2,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xxl,
          width: '100%',
          maxWidth: theme.layout.contentMaxWidth,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={retry} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
