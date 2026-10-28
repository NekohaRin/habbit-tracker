import { isKey } from './dates.js';

// Konversi antara isian form (datar, mudah diikat ke input) dan dokumen kebiasaan di Firestore.
// Bentuk dokumen kebiasaan didefinisikan di src/services/schema.js.

export const NAME_MAX = 40;
export const NOTE_MAX = 200;
export const UNIT_MAX = 12;

export function emptyForm(startDate) {
  return {
    name: '',
    icon: 'drop',
    category: 'kesehatan',
    freqType: 'daily', // 'daily' | 'days' | 'weekly'
    days: [1, 3, 5],
    timesPerWeek: 3,
    useTarget: false,
    amount: 8,
    unit: '',
    linkedWorkout: false,
    startDate,
    note: '',
  };
}

const clampInt = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

/** Dokumen kebiasaan -> isian form. */
export function habitToForm(habit) {
  const f = habit.frequency;
  return {
    name: habit.name,
    icon: habit.icon,
    category: habit.category,
    freqType: f.type,
    days: f.type === 'days' ? [...f.days] : [1, 3, 5],
    timesPerWeek: f.type === 'weekly' ? f.timesPerWeek : 3,
    useTarget: Boolean(habit.target),
    amount: habit.target?.amount ?? 8,
    unit: habit.target?.unit ?? '',
    linkedWorkout: Boolean(habit.linkedWorkout),
    startDate: habit.startDate,
    note: habit.note ?? '',
  };
}

/**
 * Isian form -> dokumen kebiasaan (tanpa createdAt/updatedAt/order/archived).
 * Kebiasaan tertaut workout selalu berfrekuensi mingguan dan tidak memakai target angka.
 */
export function formToHabit(f) {
  let frequency;
  if (f.linkedWorkout || f.freqType === 'weekly') {
    frequency = { type: 'weekly', timesPerWeek: clampInt(f.timesPerWeek, 1, 7) };
  } else if (f.freqType === 'days') {
    frequency = { type: 'days', days: [...new Set(f.days)].sort((a, b) => a - b) };
  } else {
    frequency = { type: 'daily' };
  }
  return {
    name: f.name.trim(),
    icon: f.icon,
    category: f.category,
    frequency,
    target: f.useTarget && !f.linkedWorkout ? { amount: Number(f.amount), unit: f.unit.trim() } : null,
    linkedWorkout: Boolean(f.linkedWorkout),
    startDate: f.startDate,
    note: f.note.trim(),
  };
}

/** Mengembalikan objek { namaField: pesan }. Kosong berarti sah. */
export function validateForm(f, { iconKeys, categoryKeys }) {
  const errors = {};
  const name = f.name.trim();
  if (!name) errors.name = 'Habit name is required.';
  else if (name.length > NAME_MAX) errors.name = `Name can be at most ${NAME_MAX} characters.`;
  if (!iconKeys.includes(f.icon)) errors.icon = 'Choose an icon.';
  if (!categoryKeys.includes(f.category)) errors.category = 'Choose a category.';
  if (!isKey(f.startDate)) errors.startDate = 'Start date is not valid.';
  if (!f.linkedWorkout && f.freqType === 'days' && f.days.length === 0) {
    errors.days = 'Choose at least one day.';
  }
  if (f.useTarget && !f.linkedWorkout) {
    if (!(Number(f.amount) > 0)) errors.amount = 'Target amount must be greater than 0.';
    if (f.unit.trim().length > UNIT_MAX) errors.unit = `Unit can be at most ${UNIT_MAX} characters.`;
  }
  if (f.note.trim().length > NOTE_MAX) errors.note = `Note can be at most ${NOTE_MAX} characters.`;
  return errors;
}
