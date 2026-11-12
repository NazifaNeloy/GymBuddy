import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExerciseDetailScreen } from '../screens/exercises/ExerciseDetailScreen';
import { ExerciseLibraryScreen } from '../screens/exercises/ExerciseLibraryScreen';

const Stack = createNativeStackNavigator();

export function ExercisesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Exercises' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
