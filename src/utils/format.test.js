import { formatSeconds, plural } from './format';

describe('format', () => {
  it('formats rest times', () => {
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatSeconds(45)).toBe('0:45');
    expect(formatSeconds(120)).toBe('2:00');
    expect(formatSeconds(-5)).toBe('0:00');
  });

  it('pluralises', () => {
    expect(plural(1, 'exercise')).toBe('1 exercise');
    expect(plural(3, 'exercise')).toBe('3 exercises');
    expect(plural(2, 'day')).toBe('2 days');
  });
});
