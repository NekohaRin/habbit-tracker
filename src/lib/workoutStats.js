import { addDays, endOfWeek, startOfWeek } from './dates.js';

// Evaluasi mingguan (W-5): tiap latihan dibandingkan antara minggu lalu dan minggu ini.
// Volume satu entri = set x repetisi x beban (beban kosong dihitung 1, jadi hanya set x repetisi).

export const entryVolume = (e) => e.sets * e.reps * (e.weightKg || 1);

/** Sesi yang jatuh pada minggu (Senin-Minggu) yang memuat `anyDay`. */
export function sessionsInWeek(sessions, anyDay) {
  const from = startOfWeek(anyDay);
  const to = endOfWeek(anyDay);
  return sessions.filter((s) => s.date >= from && s.date <= to);
}

/** Jumlah HARI BERBEDA yang punya sesi pada minggu itu (dua sesi sehari dihitung satu). */
export function trainingDays(sessions, anyDay) {
  return new Set(sessionsInWeek(sessions, anyDay).map((s) => s.date)).size;
}

function summarize(sessions) {
  const map = new Map();
  for (const s of sessions) {
    for (const e of s.entries ?? []) {
      const cur = map.get(e.exerciseId) ?? { name: e.exerciseName, volume: 0, last: null, lastDate: '' };
      cur.volume += entryVolume(e);
      if (s.date >= cur.lastDate) {
        cur.lastDate = s.date;
        cur.last = { sets: e.sets, reps: e.reps, weightKg: e.weightKg ?? null };
      }
      map.set(e.exerciseId, cur);
    }
  }
  return map;
}

/**
 * Perbandingan per latihan: minggu ini vs minggu lalu.
 * trend: 'up' | 'same' | 'down' | 'new' (tidak ada minggu lalu) | 'skipped' (ada minggu lalu, belum minggu ini).
 */
export function weeklyEvaluation(sessions, today) {
  const thisWeek = summarize(sessionsInWeek(sessions, today));
  const lastWeek = summarize(sessionsInWeek(sessions, addDays(startOfWeek(today), -1)));
  const ids = new Set([...thisWeek.keys(), ...lastWeek.keys()]);
  const rows = [];
  for (const id of ids) {
    const now = thisWeek.get(id);
    const before = lastWeek.get(id);
    let trend;
    if (now && !before) trend = 'new';
    else if (!now) trend = 'skipped';
    else if (now.volume > before.volume) trend = 'up';
    else if (now.volume < before.volume) trend = 'down';
    else trend = 'same';
    rows.push({
      exerciseId: id,
      name: (now ?? before).name,
      trend,
      now: now?.last ?? null,
      before: before?.last ?? null,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** Sesi terbaru (tanggal terbesar), atau null. */
export function latestSession(sessions) {
  return sessions.reduce((best, s) => (!best || s.date >= best.date ? s : best), null);
}