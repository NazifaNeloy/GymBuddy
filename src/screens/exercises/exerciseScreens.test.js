import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ExercisesStack } from '../../navigation/ExercisesStack';
import { fetchExercises } from '../../services/supabase/repositories/exercises';
import { authError } from '../../services/supabase/errors';
import { useExerciseStore } from '../../store/exerciseStore';
import { ThemeProvider } from '../../theme/ThemeProvider';

jest.mock('../../services/supabase/repositories/exercises', () => ({ fetchExercises: jest.fn() }));

const library = [
  {
    id: 'bench',
    name: 'Barbell Bench Press',
    primary_muscle: 'chest',
    secondary_muscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    category: 'compound',
    tracking: 'weight_reps',
    instructions: 'Lower the bar to mid-chest, then press up.',
    user_id: null,
  },
  {
    id: 'pullup',
    name: 'Pull-Up',
    primary_muscle: 'back',
    secondary_muscles: ['biceps'],
    equipment: 'bodyweight',
    category: 'compound',
    tracking: 'bodyweight_reps',
    instructions: 'Pull your chest to the bar.',
    user_id: null,
  },
  {
    id: 'squat',
    name: 'Back Squat',
    primary_muscle: 'quads',
    secondary_muscles: [],
    equipment: 'barbell',
    category: 'compound',
    tracking: 'weight_reps',
    instructions: '',
    user_id: null,
  },
];

async function renderLibrary() {
  await render(
    <ThemeProvider>
      <NavigationContainer>
        <ExercisesStack />
      </NavigationContainer>
    </ThemeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useExerciseStore.getState().reset();
  NetInfo.useNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true });
});

describe('ExerciseLibraryScreen', () => {
  it('loads exercises from Supabase and lists them alphabetically', async () => {
    fetchExercises.mockResolvedValue(library);
    await renderLibrary();
    expect(await screen.findByText('Back Squat')).toBeTruthy();
    expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
    expect(screen.getByText('Pull-Up')).toBeTruthy();
    expect(screen.getByTestId('exercise-count')).toHaveTextContent('3 exercises');
  });

  it('shows a loading state first', async () => {
    fetchExercises.mockReturnValue(new Promise(() => {}));
    await renderLibrary();
    expect(screen.getByText('Loading exercises…')).toBeTruthy();
  });

  it('shows an error with retry when nothing is cached', async () => {
    fetchExercises.mockRejectedValueOnce(authError('network')).mockResolvedValueOnce(library);
    await renderLibrary();
    expect(await screen.findByText("Couldn't load exercises")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Pull-Up')).toBeTruthy();
  });

  it('filters by search text', async () => {
    fetchExercises.mockResolvedValue(library);
    await renderLibrary();
    await screen.findByText('Pull-Up');
    await fireEvent.changeText(screen.getByTestId('exercise-search'), 'pullup');
    expect(screen.getByText('Pull-Up')).toBeTruthy();
    expect(screen.queryByText('Back Squat')).toBeNull();
    expect(screen.getByTestId('exercise-count')).toHaveTextContent('1 exercise');
  });

  it('filters by muscle group chips (multi-select, All resets)', async () => {
    fetchExercises.mockResolvedValue(library);
    await renderLibrary();
    await screen.findByText('Pull-Up');
    await fireEvent.press(screen.getByTestId('muscle-chip-back'));
    expect(screen.getByTestId('exercise-count')).toHaveTextContent('1 exercise');
    await fireEvent.press(screen.getByTestId('muscle-chip-quads'));
    expect(screen.getByTestId('exercise-count')).toHaveTextContent('2 exercises');
    await fireEvent.press(screen.getByTestId('muscle-chip-all'));
    expect(screen.getByTestId('exercise-count')).toHaveTextContent('3 exercises');
  });

  it('shows an empty state with "Clear filters" when nothing matches', async () => {
    fetchExercises.mockResolvedValue(library);
    await renderLibrary();
    await screen.findByText('Pull-Up');
    await fireEvent.changeText(screen.getByTestId('exercise-search'), 'zumba');
    expect(screen.getByText('No matching exercises')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Pull-Up')).toBeTruthy();
  });

  it('works offline from the cache and says so', async () => {
    useExerciseStore.setState({ items: library, lastFetchedAt: 0 });
    NetInfo.useNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false });
    fetchExercises.mockRejectedValue(authError('network'));
    await renderLibrary();
    expect(await screen.findByTestId('offline-banner')).toBeTruthy();
    expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
  });
});

describe('ExerciseDetailScreen', () => {
  it('opens from the library and shows details, muscles and instructions', async () => {
    fetchExercises.mockResolvedValue(library);
    await renderLibrary();
    await fireEvent.press(await screen.findByTestId('exercise-card-bench'));
    expect(await screen.findByTestId('exercise-detail-screen')).toBeTruthy();
    expect(screen.getByTestId('detail-primary-muscle')).toHaveTextContent('Chest');
    expect(screen.getByText('Triceps')).toBeTruthy();
    expect(screen.getByText('Lower the bar to mid-chest, then press up.')).toBeTruthy();
    expect(screen.getByText('Weight × reps')).toBeTruthy();
    expect(screen.getByTestId('exercise-history-empty')).toBeTruthy();
  });

  it('falls back to a message when an exercise has no instructions', async () => {
    fetchExercises.mockResolvedValue(library);
    await renderLibrary();
    await fireEvent.press(await screen.findByTestId('exercise-card-squat'));
    expect(await screen.findByText('No instructions yet for this exercise.')).toBeTruthy();
  });
});
