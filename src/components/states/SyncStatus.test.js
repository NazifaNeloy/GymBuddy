import NetInfo from '@react-native-community/netinfo';
import { render, screen } from '@testing-library/react-native';
import { useSyncStore } from '../../store/syncStore';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { SyncStatus } from './SyncStatus';

const show = async (state, online = true) => {
  NetInfo.useNetInfo.mockReturnValue({ isConnected: online, isInternetReachable: online });
  useSyncStore.setState({ pendingCount: 0, failedCount: 0, isSyncing: false, lastError: null, ...state });
  await render(
    <ThemeProvider>
      <SyncStatus />
    </ThemeProvider>
  );
  return screen.getByTestId('sync-status');
};

describe('SyncStatus', () => {
  it('says everything is synced when nothing is pending (even during a background pull)', async () => {
    expect(await show({ isSyncing: true })).toHaveTextContent('All changes synced');
  });

  it('explains offline saves', async () => {
    expect(await show({ pendingCount: 3 }, false)).toHaveTextContent(
      "3 changes saved on this phone. Will sync when you're back online."
    );
  });

  it('shows progress while uploading', async () => {
    expect(await show({ pendingCount: 2, isSyncing: true })).toHaveTextContent('Syncing…');
  });

  it('never gets stuck on "Syncing…" after a failed attempt', async () => {
    expect(await show({ pendingCount: 1, lastError: 'No connection' })).toHaveTextContent(
      '1 change waiting to sync. Retrying automatically.'
    );
  });

  it('reports rows the server rejected', async () => {
    expect(await show({ pendingCount: 2, failedCount: 1 })).toHaveTextContent(
      "1 change couldn't sync yet. Retrying automatically."
    );
  });
});
