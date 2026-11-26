import { formatElapsed, formatNumber, formatSeconds, formatThousands, plural } from './format';

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

  it('formats elapsed workout time', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(754)).toBe('12:34');
    expect(formatElapsed(3725)).toBe('1:02:05');
  });

  it('formats weights and totals', () => {
    expect(formatNumber(62.5)).toBe('62.5');
    expect(formatNumber('100.00')).toBe('100');
    expect(formatNumber(42.456)).toBe('42.46');
    expect(formatNumber('x')).toBe('0');
    expect(formatThousands(12500)).toBe('12,500');
    expect(formatThousands(999.6)).toBe('1,000');
  });
});
