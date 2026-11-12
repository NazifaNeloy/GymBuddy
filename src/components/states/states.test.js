import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('state components', () => {
  it('LoadingState shows its message', async () => {
    await wrap(<LoadingState message="Signing you in…" />);
    expect(screen.getByText('Signing you in…')).toBeTruthy();
  });

  it('ErrorState calls onRetry', async () => {
    const onRetry = jest.fn();
    await wrap(<ErrorState message="Network down" onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorState hides the retry button without a handler', async () => {
    await wrap(<ErrorState />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('EmptyState renders its call to action', async () => {
    const onAction = jest.fn();
    await wrap(<EmptyState title="No workouts yet" actionLabel="Start a workout" onAction={onAction} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start a workout' }));
    expect(onAction).toHaveBeenCalled();
  });
});
