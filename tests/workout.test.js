import test from 'node:test';
import assert from 'node:assert/strict';
import { entryVolume, latestSession, sessionsInWeek, trainingDays, weeklyEvaluation } from '../src/lib/workoutStats.js';
import { displayToKg, kgToDisplay } from '../src/lib/units.js';

const e = (id, sets, reps, weightKg = null) => ({ exerciseId: id, exerciseName: id.toUpperCase(), sets, reps, weightKg });
// 2026-10-26 = Senin. Minggu lalu = 19..25 Okt.
const sessions = [
  { id: 'a', date: '2026-10-20', entries: [e('push', 3, 8), e('squat', 3, 10, 20)] },
  { id: 'b', date: '2026-10-27', entries: [e('push', 3, 10), e('squat', 3, 10, 20)] },
  { id: 'c', date: '2026-10-27', entries: [e('curl', 2, 12)] },
];

test('volume: beban kosong dihitung 1', () => {
  assert.equal(entryVolume(e('x', 3, 8)), 24);
  assert.equal(entryVolume(e('x', 3, 8, 10)), 240);
});

test('sessionsInWeek memakai minggu Senin-Minggu', () => {
  assert.equal(sessionsInWeek(sessions, '2026-10-29').length, 2);
  assert.equal(sessionsInWeek(sessions, '2026-10-25').length, 1); // Minggu masuk minggu lalu
});

test('trainingDays: dua sesi di hari yang sama dihitung satu hari', () => {
  assert.equal(trainingDays(sessions, '2026-10-29'), 1);
});

test('weeklyEvaluation: naik, sama, baru', () => {
  const rows = Object.fromEntries(weeklyEvaluation(sessions, '2026-10-29').map((r) => [r.exerciseId, r.trend]));
  assert.equal(rows.push, 'up');
  assert.equal(rows.squat, 'same');
  assert.equal(rows.curl, 'new');
});

test('weeklyEvaluation: turun dan terlewat', () => {
  const s = [
    { date: '2026-10-20', entries: [e('push', 3, 10), e('row', 3, 8)] },
    { date: '2026-10-27', entries: [e('push', 3, 8)] },
  ];
  const rows = Object.fromEntries(weeklyEvaluation(s, '2026-10-28').map((r) => [r.exerciseId, r.trend]));
  assert.equal(rows.push, 'down');
  assert.equal(rows.row, 'skipped');
});

test('latestSession mengembalikan tanggal terbesar', () => {
  assert.equal(latestSession(sessions).date, '2026-10-27');
  assert.equal(latestSession([]), null);
});

test('konversi satuan berat', () => {
  assert.equal(kgToDisplay(10, 'metric'), 10);
  assert.equal(kgToDisplay(10, 'imperial'), 22);
  assert.equal(displayToKg('22', 'imperial'), 10);
  assert.equal(displayToKg('', 'metric'), null);
  assert.equal(displayToKg('0', 'metric'), null);
});