import * as SecureStore from 'expo-secure-store';
import { CHUNK_SIZE, chunkedSecureStore, safeKey } from './secureStorage';

const KEY = 'sb-ndgnpkjvmspgdsrifxbe-auth-token';

describe('chunkedSecureStore', () => {
  afterEach(async () => {
    await chunkedSecureStore.removeItem(KEY);
  });

  it('returns null when nothing is stored', async () => {
    expect(await chunkedSecureStore.getItem(KEY)).toBeNull();
  });

  it('round-trips a small value', async () => {
    await chunkedSecureStore.setItem(KEY, '{"access_token":"abc"}');
    expect(await chunkedSecureStore.getItem(KEY)).toBe('{"access_token":"abc"}');
  });

  it('splits large sessions into chunks under the SecureStore limit', async () => {
    const big = 'x'.repeat(CHUNK_SIZE * 2 + 10);
    await chunkedSecureStore.setItem(KEY, big);
    expect(await chunkedSecureStore.getItem(KEY)).toBe(big);
    const writes = SecureStore.setItemAsync.mock.calls.filter(([k]) => k.startsWith(safeKey(KEY)));
    writes.forEach(([, v]) => expect(v.length).toBeLessThanOrEqual(CHUNK_SIZE));
    expect(await SecureStore.getItemAsync(`${KEY}.n`)).toBe('3');
  });

  it('removes stale chunks when the value shrinks', async () => {
    await chunkedSecureStore.setItem(KEY, 'y'.repeat(CHUNK_SIZE * 3));
    await chunkedSecureStore.setItem(KEY, 'short');
    expect(await chunkedSecureStore.getItem(KEY)).toBe('short');
    expect(await SecureStore.getItemAsync(`${KEY}.1`)).toBeNull();
    expect(await SecureStore.getItemAsync(`${KEY}.2`)).toBeNull();
  });

  it('treats a missing chunk as no session', async () => {
    await chunkedSecureStore.setItem(KEY, 'z'.repeat(CHUNK_SIZE + 5));
    await SecureStore.deleteItemAsync(`${KEY}.1`);
    expect(await chunkedSecureStore.getItem(KEY)).toBeNull();
  });

  it('removeItem clears every chunk', async () => {
    await chunkedSecureStore.setItem(KEY, 'q'.repeat(CHUNK_SIZE + 5));
    await chunkedSecureStore.removeItem(KEY);
    expect(await chunkedSecureStore.getItem(KEY)).toBeNull();
    expect(await SecureStore.getItemAsync(`${KEY}.0`)).toBeNull();
  });

  it('sanitises keys for SecureStore', () => {
    expect(safeKey('sb:abc/auth token')).toBe('sb_abc_auth_token');
  });
});
