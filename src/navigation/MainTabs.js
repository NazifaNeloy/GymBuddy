import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useResponsive } from '../hooks/useResponsive';
import { HomeScreen } from '../screens/home/HomeScreen';
import { useTheme } from '../theme/ThemeProvider';
import { ExercisesStack } from './ExercisesStack';

const Tab = createBottomTabNavigator();

/**
 * Signed-in app shell. Phones get a bottom tab bar; tablets get a side rail.
 * Workout, Progress and Profile tabs are added in their own steps.
 */
export function MainTabs() {
  const theme = useTheme();
  const { isTablet } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarPosition: isTablet ? 'left' : 'bottom',
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: theme.typography.label,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ExercisesTab" component={ExercisesStack} options={{ title: 'Exercises' }} />
    </Tab.Navigator>
  );
}
