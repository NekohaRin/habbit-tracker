import { addDays, startOfWeek, weekday, maxKey } from './dates.js';

// Streak dihitung dari daftar "periode" (hari atau minggu) dari yang terlama ke terbaru.
//   { skip: true }                 periode yang tidak dijadwalkan; dilewati, tidak memutus streak
//   { ok: true|false }             periode selesai atau tidak
//   { current: true }              periode yang sedang berjalan; belum selesai tidak memutus streak
// Contoh: hari ini belum dicentang, kemarin sudah -> streak kemarin tetap dihitung.

export function streakFromPeriods(periods) {
  let run = 0;
  let longest = 0;
  for (const p of periods) {
    if (p.skip) continue;
    if (p.ok) {
      run += 1;
      if (run > longest) longest = run;
    } else if (!p.current) {
      run = 0;
    }
  }
  return { current: run, longest };
}

/**
 * Periode harian untuk kebiasaan berfrekuensi 'daily' atau 'days'.
 * @param {{frequency:{type:string, days?:number[]}, startDate:string}} habit
 * @param {Set<string>} doneDates  tanggal yang sudah dicentang
 * @param {string} today
 * @param {string} [windowStart]   batas awal perhitungan (bawaan: tanggal mulai)
 */
export function dailyPeriods(habit, doneDates, today, windowStart) {
  const from = windowStart ? maxKey(habit.startDate, windowStart) : habit.startDate;
  const scheduled = habit.frequency.type === 'days' ? new Set(habit.frequency.days) : null;
  const periods = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (scheduled && !scheduled.has(weekday(d))) {
      periods.push({ skip: true });
    } else {
      periods.push({ ok: doneDates.has(d), current: d === today });
    }
  }
  return periods;
}

/** Jumlah hari berbeda per minggu: Map<tanggal Senin, jumlah>. */
export function weekCounts(dates) {
  const counts = new Map();
  for (const date of new Set(dates)) {
    const week = startOfWeek(date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  return counts;
}

/** Periode mingguan: satu per minggu dari `from` sampai minggu yang memuat `today`. */
export function weeklyPeriods(counts, target, from, today) {
  const lastWeek = startOfWeek(today);
  const periods = [];
  for (let w = startOfWeek(from); w <= lastWeek; w = addDays(w, 7)) {
    periods.push({ ok: (counts.get(w) ?? 0) >= target, current: w === lastWeek });
  }
  return periods;
}
