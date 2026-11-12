import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Shared AsyncStorage backend for persisted (non-secret) Zustand stores. */
export const persistStorage = createJSONStorage(() => AsyncStorage);
