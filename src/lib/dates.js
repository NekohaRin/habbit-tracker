// Semua tanggal di aplikasi disimpan sebagai teks 'YYYY-MM-DD' menurut zona waktu pengguna
// (bawaan WIB). Dengan begitu pergantian hari tidak bergeser oleh UTC dan streak tidak "bocor".
// Minggu dimulai hari Senin. Hari ke-1 = Senin ... hari ke-7 = Minggu.

export const DEFAULT_TZ = 'Asia/Jakarta';
export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;
const pad = (n, len = 2) => String(n).padStart(len, '0');

function toDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromDate(date) {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** True jika teks berupa tanggal kalender yang sah, misalnya '2026-10-25' (bukan '2026-02-30'). */
export function isKey(key) {
  if (typeof key !== 'string' || !KEY_RE.test(key)) return false;
  return fromDate(toDate(key)) === key;
}

/** Tanggal "hari ini" menurut zona waktu tertentu. */
export function todayKey(tz = DEFAULT_TZ, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(key, n) {
  return fromDate(new Date(toDate(key).getTime() + n * DAY_MS));
}

export function diffDays(from, to) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);
}

/** 1 = Senin ... 7 = Minggu */
export function weekday(key) {
  const js = toDate(key).getUTCDay();
  return js === 0 ? 7 : js;
}

export function startOfWeek(key) {
  return addDays(key, -(weekday(key) - 1));
}

export function endOfWeek(key) {
  return addDays(startOfWeek(key), 6);
}

/** Tujuh tanggal (Senin sampai Minggu) pada minggu yang memuat `key`. */
export function weekKeys(key) {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function maxKey(a, b) {
  return a >= b ? a : b;
}

/** Example: 'Sunday, Oct 25' */
export function formatLongDate(key) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toDate(key));
}

/** Example: 'Oct 25, 2026' */
export function formatDate(key) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toDate(key));
}
