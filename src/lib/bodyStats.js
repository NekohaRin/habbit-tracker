import { addDays } from './dates.js';

/** Urutkan menaik menurut tanggal: [{date, value}]. */
export const sortByDate = (points) => [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

/**
 * Rata-rata bergerak menurut jendela hari kalender (bukan jumlah titik), supaya hari yang
 * dilewati tidak membuat rata-rata melompat. Tiap titik = rata-rata nilai pada `windowDays` hari
 * terakhir termasuk hari itu.
 */
export function movingAverage(points, windowDays = 7) {
  const sorted = sortByDate(points);
  return sorted.map((p) => {
    const from = addDays(p.date, -(windowDays - 1));
    const inWindow = sorted.filter((q) => q.date >= from && q.date <= p.date);
    const avg = inWindow.reduce((sum, q) => sum + q.value, 0) / inWindow.length;
    return { date: p.date, value: Math.round(avg * 10) / 10 };
  });
}

/** Nilai terakhir pada atau sebelum `date`, atau null. */
export function valueOnOrBefore(points, date) {
  let best = null;
  for (const p of points) if (p.date <= date && (!best || p.date >= best.date)) best = p;
  return best;
}

/** Selisih nilai terbaru dengan nilai sebelumnya: { latest, delta } atau null bila belum ada data. */
export function latestChange(points) {
  const sorted = sortByDate(points);
  if (sorted.length === 0) return null;
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  return { latest, delta: prev ? Math.round((latest.value - prev.value) * 10) / 10 : null };
}

/**
 * Bandingkan dua tanggal untuk tiap bagian (B-4). Memakai nilai terakhir pada atau sebelum tiap tanggal.
 * @param {{id:string,name:string}[]} parts
 * @param {Record<string,{date:string,value:number}[]>} byPart
 */
export function compareDates(parts, byPart, dateA, dateB) {
  return parts.map((part) => {
    const pts = byPart[part.id] ?? [];
    const a = valueOnOrBefore(pts, dateA);
    const b = valueOnOrBefore(pts, dateB);
    return {
      partId: part.id,
      name: part.name,
      a: a?.value ?? null,
      b: b?.value ?? null,
      delta: a && b ? Math.round((b.value - a.value) * 10) / 10 : null,
    };
  });
}