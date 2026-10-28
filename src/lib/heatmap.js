import { addDays, startOfWeek } from './dates.js';
import { isScheduledOn } from './habitStats.js';

/**
 * Kalender heatmap (H-8): `weeks` kolom, tiap kolom 7 hari Senin-Minggu, kolom terakhir memuat hari ini.
 * state tiap sel:
 *  - 'done'    sudah dicentang (atau ada sesi workout untuk kebiasaan tertaut)
 *  - 'missed'  terjadwal, sudah lewat, tidak dicentang
 *  - 'pending' terjadwal dan hari ini, belum dicentang
 *  - 'off'     tidak terjadwal pada hari itu
 *  - 'before'  sebelum tanggal mulai
 *  - 'future'  setelah hari ini
 * Kebiasaan mingguan tidak punya hari "terlewat": hari tanpa centang dianggap 'off'.
 */
export function buildHeatmap(habit, doneDates, today, weeks = 13) {
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const columns = [];
  for (let w = 0; w < weeks; w += 1) {
    const col = [];
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(first, w * 7 + d);
      let state;
      if (date > today) state = 'future';
      else if (date < habit.startDate) state = 'before';
      else if (doneDates.has(date)) state = 'done';
      else if (habit.frequency.type === 'weekly' || !isScheduledOn(habit, date)) state = 'off';
      else state = date === today ? 'pending' : 'missed';
      col.push({ date, state });
    }
    columns.push(col);
  }
  return columns;
}

/** Jumlah hari selesai pada seluruh heatmap. */
export function countDone(columns) {
  return columns.reduce((n, col) => n + col.filter((c) => c.state === 'done').length, 0);
}