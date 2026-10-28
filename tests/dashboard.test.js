import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsvFiles, toCsv } from '../src/lib/csv.js';
import { completionRate, weeklyTrainingDays } from '../src/lib/dashboardStats.js';

test('toCsv: kutip, koma, baris baru, dan angka', () => {
  const out = toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['l1\nl2', 5], [null, -3]]);
  assert.equal(out, 'a,b\r\n"x,y","say ""hi"""\r\n"l1\nl2",5\r\n,-3\r\n');
});

test('toCsv: teks berawalan rumus dinetralkan, angka negatif tidak', () => {
  assert.equal(toCsv(['v'], [['=SUM(A1)'], ['+1'], ['@x'], [-2]]), "v\r\n'=SUM(A1)\r\n'+1\r\n'@x\r\n-2\r\n");
});

test('buildCsvFiles: tiga berkas dengan nama kebiasaan dan bagian tubuh', () => {
  const files = buildCsvFiles({
    habits: [{ id: 'h1', name: 'Read' }],
    habitLogs: [{ habitId: 'h1', date: '2026-10-25', done: true, value: null }],
    workoutSessions: [{ date: '2026-10-26', durationMin: 30, note: '', entries: [{ exerciseName: 'Push-up', sets: 3, reps: 8, weightKg: null }] }],
    bodyParts: [{ id: 'p1', name: 'Waist' }],
    measurements: [{ bodyPartId: 'p1', date: '2026-10-24', valueCm: 80 }],
    bodyWeights: [{ date: '2026-10-23', valueKg: 70 }],
  });
  assert.deepEqual(files.map((f) => f.name), ['habit-logs.csv', 'workouts.csv', 'body.csv']);
  assert.match(files[0].text, /2026-10-25,Read,yes,/);
  assert.match(files[1].text, /2026-10-26,Push-up,3,8,,30,/);
  assert.match(files[2].text, /2026-10-23,Body weight,70,kg\r\n2026-10-24,Waist,80,cm/);
});

const daily = { startDate: '2026-10-01', frequency: { type: 'daily' } };

test('completionRate: hari ini yang belum dicentang tidak dihitung', () => {
  // 2026-10-26, jendela 7 hari = 20..26. Selesai 20,21,22 -> 3 dari 6 (26 belum dicentang, tidak dihitung).
  const r = completionRate(daily, new Set(['2026-10-20', '2026-10-21', '2026-10-22']), '2026-10-26', 7);
  assert.deepEqual(r, { done: 3, scheduled: 6, percent: 50 });
});

test('completionRate: mulai di tengah jendela dan hari tertentu', () => {
  const late = { startDate: '2026-10-24', frequency: { type: 'daily' } };
  assert.equal(completionRate(late, new Set(['2026-10-26']), '2026-10-26', 30).scheduled, 3);
  const days = { startDate: '2026-10-01', frequency: { type: 'days', days: [1, 3] } }; // Sen, Rab
  assert.equal(completionRate(days, new Set(), '2026-10-28', 7).scheduled, 1); // Sen 26; Rab 28 hari ini belum dicentang
});

test('completionRate: mingguan -> null; tanpa hari terjadwal -> percent null', () => {
  assert.equal(completionRate({ startDate: '2026-10-01', frequency: { type: 'weekly', timesPerWeek: 3 } }, new Set(), '2026-10-26'), null);
  assert.equal(completionRate({ startDate: '2026-12-01', frequency: { type: 'daily' } }, new Set(), '2026-10-26').percent, null);
});

test('weeklyTrainingDays: urut dari tertua, hari berbeda per minggu', () => {
  const sessions = [{ date: '2026-10-20' }, { date: '2026-10-20' }, { date: '2026-10-22' }, { date: '2026-10-27' }];
  const rows = weeklyTrainingDays(sessions, '2026-10-28', 3);
  assert.deepEqual(rows.map((r) => r.weekStart), ['2026-10-12', '2026-10-19', '2026-10-26']);
  assert.deepEqual(rows.map((r) => r.days), [0, 2, 1]);
});

import { dailyCompletion } from '../src/lib/dashboardStats.js';

test('dailyCompletion: persen per hari, mingguan diabaikan, tanpa jadwal = null', () => {
  const entries = [
    { habit: { startDate: '2026-10-01', frequency: { type: 'daily' } }, done: new Set(['2026-10-27', '2026-10-28']) },
    { habit: { startDate: '2026-10-01', frequency: { type: 'days', days: [2] } }, done: new Set(['2026-10-27']) }, // Selasa
    { habit: { startDate: '2026-10-01', frequency: { type: 'weekly', timesPerWeek: 3 } }, done: new Set(['2026-10-27']) },
  ];
  const rows = dailyCompletion(entries, '2026-10-28', 2);
  assert.deepEqual(rows.map((r) => r.date), ['2026-10-27', '2026-10-28']);
  assert.deepEqual(rows[0], { date: '2026-10-27', done: 2, scheduled: 2, percent: 100 }); // Selasa: dua terjadwal, dua selesai
  assert.deepEqual(rows[1], { date: '2026-10-28', done: 1, scheduled: 1, percent: 100 }); // Rabu: hanya harian
  const none = dailyCompletion([{ habit: { startDate: '2027-01-01', frequency: { type: 'daily' } }, done: new Set() }], '2026-10-28', 1);
  assert.equal(none[0].percent, null);
});