import { DAY_SHORT, maxKey, startOfWeek, weekday } from './dates.js';
import { dailyPeriods, streakFromPeriods, weekCounts, weeklyPeriods } from './streak.js';

/** Apakah kebiasaan ini tampil pada tanggal tertentu (mulai dari tanggal mulai, sesuai hari terjadwal). */
export function isScheduledOn(habit, key) {
  if (key < habit.startDate) return false;
  if (habit.frequency.type === 'days') return habit.frequency.days.includes(weekday(key));
  return true;
}

/** Label singkat frekuensi untuk lencana di daftar. */
export function frequencyLabel(habit) {
  const f = habit.frequency;
  if (f.type === 'days') {
    return f.days.length === 7 ? 'Daily' : f.days.map((d) => DAY_SHORT[d - 1]).join(', ');
  }
  if (f.type === 'weekly') return `${f.timesPerWeek}x / week`;
  return 'Daily';
}

/**
 * Statistik satu kebiasaan.
 * - daily / days  -> { kind: 'daily', streak, longest }  (streak = angka, bukan objek)
 * - weekly        -> { kind: 'weekly', count, target, percent, met, streak }
 *   Untuk kebiasaan tertaut workout, `count` = jumlah HARI BERBEDA yang punya sesi workout
 *   minggu ini; untuk weekly biasa = jumlah hari yang dicentang minggu ini.
 *   Persentase dibatasi 100: mencapai target = nilai penuh.
 *
 * @param {object} habit
 * @param {{doneDates:Set<string>, workoutDates:Set<string>, today:string, windowStart:string}} ctx
 */
export function computeHabitStats(habit, { doneDates, workoutDates, today, windowStart }) {
  const f = habit.frequency;

  if (f.type === 'weekly') {
    const source = habit.linkedWorkout ? workoutDates : doneDates;
    const counts = weekCounts(source);
    const target = f.timesPerWeek;
    const count = counts.get(startOfWeek(today)) ?? 0;
    const from = maxKey(habit.startDate, windowStart);
    const run = streakFromPeriods(weeklyPeriods(counts, target, from, today));
    return {
      kind: 'weekly',
      count,
      target,
      percent: Math.min(100, Math.round((count / target) * 100)),
      met: count >= target,
      streak: run.current,
      longest: run.longest,
    };
  }

  const run = streakFromPeriods(dailyPeriods(habit, doneDates, today, windowStart));
  return { kind: 'daily', streak: run.current, longest: run.longest };
}