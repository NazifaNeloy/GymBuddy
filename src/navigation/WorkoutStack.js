import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExercisePickerScreen } from '../screens/routines/ExercisePickerScreen';
import { RoutineBuilderScreen } from '../screens/routines/RoutineBuilderScreen';
import { RoutineListScreen } from '../screens/routines/RoutineListScreen';
import { ActiveWorkoutScreen } from '../screens/workout/ActiveWorkoutScreen';

const Stack = createNativeStackNavigator();

/** Workout tab: routines, the routine builder and the workout in progress. */
export function WorkoutStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="RoutineList" component={RoutineListScreen} options={{ title: 'Routines' }} />
      <Stack.Screen name="RoutineBuilder" component={RoutineBuilderScreen} options={{ title: '' }} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ title: 'Workout' }} />
      <Stack.Screen
        name="ExercisePicker"
        component={ExercisePickerScreen}
        options={{ title: 'Add exercises', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
