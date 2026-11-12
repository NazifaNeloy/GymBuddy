import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';

/** Clear stale auth errors/notices whenever an auth screen comes into focus. */
export function useClearAuthMessagesOnFocus() {
  const clearMessages = useAuthStore((s) => s.clearMessages);
  useFocusEffect(
    useCallback(() => {
      clearMessages();
    }, [clearMessages])
  );
}
