import { DEFAULT_TZ } from './lib/dates.js';

// Keputusan K-11: enam ikon tetap. Menambah ikon = menambah entri di sini DAN di firestore.rules.
export const ICON_KEYS = ['drop', 'book', 'bolt', 'moon', 'pen', 'dots'];
export const ICON_LABELS = {
  drop: 'Drop',
  book: 'Book',
  bolt: 'Bolt',
  moon: 'Moon',
  pen: 'Pen',
  dots: 'Other',
};
export const ICON_PATHS = {
  drop: 'M12 3c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 9.5 9 7 12 3z',
  book: 'M4 5h7v14H4z M13 5h7v14h-7z',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  pen: 'M4 20h4L19 9l-4-4L4 16z',
  dots: 'M6 12h.01 M12 12h.01 M18 12h.01',
};

// Keputusan K-12: kategori tetap. Mengubah daftar ini = ubah juga firestore.rules.
export const CATEGORIES = [
  { key: 'kesehatan', label: 'Health' },
  { key: 'belajar', label: 'Learning' },
  { key: 'olahraga', label: 'Fitness' },
  { key: 'kerja', label: 'Work' },
  { key: 'lainnya', label: 'Other' },
];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

// Streak dan progres mingguan dihitung dari data N hari terakhir (hemat kuota baca Firestore).
export const LOG_WINDOW_DAYS = 90;

export const DEFAULT_SETTINGS = { unit: 'metric', timezone: DEFAULT_TZ };

// Bagian tubuh awal; pengguna bebas menambah, mengubah, atau menonaktifkannya (modul Tubuh).
export const DEFAULT_BODY_PARTS = ['Upper arm', 'Chest', 'Waist', 'Thigh', 'Calf'];

// Semua koleksi di bawah users/{uid}; dipakai untuk ekspor dan hapus akun.
export const USER_COLLECTIONS = [
  'habits',
  'habitLogs',
  'exercises',
  'workoutSessions',
  'bodyParts',
  'measurements',
  'bodyWeights',
  'pushTokens',
];
