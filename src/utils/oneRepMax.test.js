import { epley, setE1rm } from './oneRepMax';

describe('epley', () => {
  it('applies weight × (1 + reps / 30), rounded to 2 decimals', () => {
    expect(epley(100, 5)).toBe(116.67);
    expect(epley(60, 10)).toBe(80);
  });

  it('adds 1/30 of the weight for a single rep', () => {
    expect(epley(140, 1)).toBe(144.67);
  });

  it('returns null outside 1–12 reps or without load', () => {
    expect(epley(100, 0)).toBeNull();
    expect(epley(100, 13)).toBeNull();
    expect(epley(0, 5)).toBeNull();
    expect(epley('abc', 5)).toBeNull();
  });

  it('accepts numeric strings (Postgres numeric comes back as a string)', () => {
    expect(epley('100.00', 5)).toBe(116.67);
  });
});

describe('setE1rm', () => {
  it('ignores warm-up sets', () => {
    expect(setE1rm({ weight_kg: 100, reps: 5, is_warmup: true })).toBeNull();
    expect(setE1rm({ weight_kg: 100, reps: 5, is_warmup: false })).toBe(116.67);
    expect(setE1rm(null)).toBeNull();
  });
});
