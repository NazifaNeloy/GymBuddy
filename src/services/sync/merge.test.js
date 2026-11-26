import { isNewer, maxSyncedAt, mergeRows } from './merge';

const row = (id, updated_at, extra = {}) => ({ id, updated_at, ...extra });

describe('isNewer', () => {
  it('accepts rows we do not have yet', () => {
    expect(isNewer(row('a', '2026-01-01T00:00:00Z'), undefined)).toBe(true);
  });

  it('uses updated_at (last write wins, ties go to the server)', () => {
    const local = row('a', '2026-01-02T00:00:00Z');
    expect(isNewer(row('a', '2026-01-01T00:00:00Z'), local)).toBe(false);
    expect(isNewer(row('a', '2026-01-02T00:00:00Z'), local)).toBe(true);
    expect(isNewer(row('a', '2026-01-03T00:00:00Z'), local)).toBe(true);
  });
});

describe('mergeRows', () => {
  it('keeps newer offline edits and takes newer server rows', () => {
    const local = {
      a: row('a', '2026-01-05T00:00:00Z', { name: 'edited offline' }),
      b: row('b', '2026-01-01T00:00:00Z', { name: 'old' }),
    };
    const remote = [
      row('a', '2026-01-04T00:00:00Z', { name: 'server (older)' }),
      row('b', '2026-01-03T00:00:00Z', { name: 'server (newer)' }),
      row('c', '2026-01-03T00:00:00Z', { name: 'new from another device' }),
    ];
    const { rows, changed } = mergeRows(local, remote);
    expect(rows.a.name).toBe('edited offline');
    expect(rows.b.name).toBe('server (newer)');
    expect(rows.c.name).toBe('new from another device');
    expect(changed).toBe(2);
  });

  it('does not mutate the input map', () => {
    const local = { a: row('a', '2026-01-01T00:00:00Z') };
    mergeRows(local, [row('b', '2026-01-01T00:00:00Z')]);
    expect(Object.keys(local)).toEqual(['a']);
  });

  it('applies server soft-deletes', () => {
    const local = { a: row('a', '2026-01-01T00:00:00Z') };
    const { rows } = mergeRows(local, [row('a', '2026-01-02T00:00:00Z', { deleted_at: '2026-01-02T00:00:00Z' })]);
    expect(rows.a.deleted_at).toBe('2026-01-02T00:00:00Z');
  });
});

describe('maxSyncedAt', () => {
  it('returns the latest synced_at or the fallback', () => {
    expect(maxSyncedAt([{ synced_at: '2026-01-01T00:00:00Z' }, { synced_at: '2026-01-03T00:00:00Z' }])).toBe(
      '2026-01-03T00:00:00Z'
    );
    expect(maxSyncedAt([], 'x')).toBe('x');
  });
});
