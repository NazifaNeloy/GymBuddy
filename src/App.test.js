import { render, screen } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  it('renders the app shell', async () => {
    await render(<App />);
    expect(screen.getByText('GymBuddy')).toBeTruthy();
  });
});
