/** 90 -> "1:30", 45 -> "0:45", 120 -> "2:00" */
export function formatSeconds(total) {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Elapsed workout time: 754 -> "12:34", 3725 -> "1:02:05". */
export function formatElapsed(total) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Trim trailing zeros from weights: 62.5 -> "62.5", 100 -> "100", 42.46 -> "42.46". */
export function formatNumber(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return String(Math.round(v * 100) / 100);
}

/** Large totals with thousands separators (locale-independent): 12500 -> "12,500". */
export function formatThousands(n) {
  return formatNumber(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
