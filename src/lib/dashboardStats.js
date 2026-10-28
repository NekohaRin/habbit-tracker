import { addDays, startOfWeek } from './dates.js';
import { isScheduledOn } from './habitStats.js';
import { trainingDays } from './workoutStats.js';

/**
 * Tingkat selesai kebiasaan harian/hari tertentu dalam `days` hari terakhir.
 * Hanya hari terjadwal yang dihitung. Hari ini baru dihitung bila sudah dicentang,
 * supaya hari yang masih berjalan tidak menurunkan angka. Kebiasaan mingguan -> null.
 */
export function completionRate(habit, doneDates, today, days = 30) {
  if (habit.frequency.type === 'weekly') return null;
  const from = addDays(today, -(days - 1));
  let scheduled = 0;
  let done = 0;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d)) continue;
    if (d === today && !doneDates.has(d)) continue;
    scheduled += 1;
    if (doneDates.has(d)) done += 1;
  }
  return { done, scheduled, percent: scheduled ? Math.round((done / scheduled) * 100) : null };
}

/** Hari latihan per minggu untuk `weeks` minggu terakhir, urut dari yang tertua. */
export function weeklyTrainingDays(sessions, today, weeks = 8) {
  const thisWeek = startOfWeek(today);
  const rows = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = addDays(thisWeek, -7 * i);
    rows.push({ weekStart, days: trainingDays(sessions, weekStart) });
  }
  return rows;
}

/**
 * Persentase kebiasaan harian/hari tertentu yang selesai per hari, untuk `days` hari terakhir
 * (urut dari yang tertua). Kebiasaan mingguan tidak dihitung. percent = null bila tidak ada yang terjadwal.
 * @param {{habit:object, done:Set<string>}[]} entries
 */
export function dailyCompletion(entries, today, days) {
  const rows = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    let scheduled = 0;
    let done = 0;
    for (const { habit, done: doneDates } of entries) {
      if (habit.frequency.type === 'weekly' || !isScheduledOn(habit, date)) continue;
      scheduled += 1;
      if (doneDates.has(date)) done += 1;
    }
    rows.push({ date, done, scheduled, percent: scheduled ? Math.round((done / scheduled) * 100) : null });
  }
  return rows;
}