import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage adapter for the Supabase auth session.
 *
 * On Android/iOS the session is kept in expo-secure-store (Android Keystore / iOS Keychain).
 * SecureStore warns on values over ~2 KB and a Supabase session (JWTs + user metadata) is often
 * larger, so the value is split into chunks:
 *   <key>.n      -> number of chunks
 *   <key>.0..n-1 -> chunk contents
 * This keeps the whole session encrypted at rest without extra crypto libraries.
 *
 * On web there is no SecureStore, so AsyncStorage (localStorage) is used for the demo build.
 */

export const CHUNK_SIZE = 1800;

// SecureStore keys may only contain letters, digits, ".", "-" and "_".
export function safeKey(key) {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

const countKey = (key) => `${safeKey(key)}.n`;
const chunkKey = (key, i) => `${safeKey(key)}.${i}`;

async function readCount(key) {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const n = raw == null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const chunkedSecureStore = {
  async getItem(key) {
    const n = await readCount(key);
    if (n === 0) return null;
    const parts = [];
    for (let i = 0; i < n; i += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part == null) return null; // corrupted / partially written: treat as signed out
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key, value) {
    const previous = await readCount(key);
    const chunks = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    // Remove leftovers if the new value needs fewer chunks than the old one.
    for (let i = chunks.length; i < previous; i += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  },

  async removeItem(key) {
    const n = await readCount(key);
    for (let i = 0; i < n; i += 1) await SecureStore.deleteItemAsync(chunkKey(key, i));
    await SecureStore.deleteItemAsync(countKey(key));
  },
};

export const authStorage = Platform.OS === 'web' ? AsyncStorage : chunkedSecureStore;
