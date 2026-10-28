// Ekspor CSV (D-2). Murni, tanpa DOM, supaya bisa diuji.
// Sel teks yang diawali = + - @ diberi tanda kutip tunggal di depan agar Excel tidak menjalankannya
// sebagai rumus (CSV injection). Angka asli tidak diubah.

function cell(value) {
  if (value == null) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** @param {string[]} columns  @param {Array<Array<string|number|boolean|null>>} rows */
export function toCsv(columns, rows) {
  return [columns, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

const byDate = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

/** Tiga berkas CSV dari hasil exportAllData(): { name, text }[]. */
export function buildCsvFiles(collections) {
  const habits = new Map((collections.habits ?? []).map((h) => [h.id, h.name]));
  const parts = new Map((collections.bodyParts ?? []).map((p) => [p.id, p.name]));

  const habitRows = (collections.habitLogs ?? [])
    .map((l) => [l.date, habits.get(l.habitId) ?? l.habitId, l.done ? 'yes' : 'no', l.value ?? null])
    .sort(byDate);

  const workoutRows = (collections.workoutSessions ?? [])
    .flatMap((s) =>
      (s.entries ?? []).map((e) => [s.date, e.exerciseName, e.sets, e.reps, e.weightKg ?? null, s.durationMin ?? null, s.note ?? '']),
    )
    .sort(byDate);

  const bodyRows = [
    ...(collections.bodyWeights ?? []).map((w) => [w.date, 'Body weight', w.valueKg, 'kg']),
    ...(collections.measurements ?? []).map((m) => [m.date, parts.get(m.bodyPartId) ?? m.bodyPartId, m.valueCm, 'cm']),
  ].sort(byDate);

  return [
    { name: 'habit-logs.csv', text: toCsv(['date', 'habit', 'done', 'value'], habitRows) },
    { name: 'workouts.csv', text: toCsv(['date', 'exercise', 'sets', 'reps', 'weight_kg', 'duration_min', 'note'], workoutRows) },
    { name: 'body.csv', text: toCsv(['date', 'measure', 'value', 'unit'], bodyRows) },
  ];
}