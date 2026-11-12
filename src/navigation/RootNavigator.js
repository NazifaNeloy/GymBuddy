import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoadingState } from '../components/states/LoadingState';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator();

/**
 * Auth gate. React Navigation swaps whole groups of screens when auth state changes,
 * so signed-out users can never navigate "back" into the app (and vice versa).
 */
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const isPasswordRecovery = useAuthStore((s) => s.isPasswordRecovery);

  if (status === 'initializing') return <LoadingState message="Starting GymBuddy…" />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'signedIn' && isPasswordRecovery ? (
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      ) : status === 'signedIn' ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
