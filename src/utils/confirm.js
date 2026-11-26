import { Alert, Platform } from 'react-native';

/**
 * Ask the user to confirm a destructive action. Resolves true/false.
 * Uses the native alert on Android/iOS and window.confirm on web (Alert is a no-op there).
 */
export function confirmAction({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false }) {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message ?? ''}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
