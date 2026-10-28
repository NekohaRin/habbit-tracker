import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyPeriods, streakFromPeriods, weekCounts, weeklyPeriods } from '../src/lib/streak.js';
import { computeHabitStats, frequencyLabel, isScheduledOn } from '../src/lib/habitStats.js';

const ok = { ok: true };
const no = { ok: false };

test('streakFromPeriods: rangkaian terakhir dan terpanjang', () => {
  assert.deepEqual(streakFromPeriods([ok, ok, no, ok, ok, ok]), { current: 3, longest: 3 });
  assert.deepEqual(streakFromPeriods([ok, ok, ok, no, ok]), { current: 1, longest: 3 });
  assert.deepEqual(streakFromPeriods([]), { current: 0, longest: 0 });
});

test('streakFromPeriods: periode berjalan yang belum selesai tidak memutus streak', () => {
  assert.deepEqual(streakFromPeriods([ok, ok, { ok: false, current: true }]), { current: 2, longest: 2 });
  assert.deepEqual(streakFromPeriods([ok, ok, { ok: true, current: true }]), { current: 3, longest: 3 });
});

test('streakFromPeriods: periode yang dilewati tidak memutus dan tidak menambah', () => {
  assert.deepEqual(streakFromPeriods([ok, { skip: true }, ok, { skip: true }, ok]), {
    current: 3,
    longest: 3,
  });
});

test('dailyPeriods harian: kemarin selesai, hari ini belum -> streak 1', () => {
  const habit = { frequency: { type: 'daily' }, startDate: '2026-10-20' };
  const done = new Set(['2026-10-24']);
  const periods = dailyPeriods(habit, done, '2026-10-25');
  assert.deepEqual(streakFromPeriods(periods), { current: 1, longest: 1 });
});

test('dailyPeriods hari tertentu: hanya hari terjadwal yang dihitung', () => {
  // Senin, Rabu, Jumat. 2026-10-26 Senin, 10-28 Rabu, 10-30 Jumat.
  const habit = { frequency: { type: 'days', days: [1, 3, 5] }, startDate: '2026-10-26' };
  const done = new Set(['2026-10-26', '2026-10-28', '2026-10-30']);
  const periods = dailyPeriods(habit, done, '2026-10-31'); // Sabtu
  assert.deepEqual(streakFromPeriods(periods), { current: 3, longest: 3 });
});

test('dailyPeriods menghormati batas awal jendela perhitungan', () => {
  const habit = { frequency: { type: 'daily' }, startDate: '2026-01-01' };
  const done = new Set(['2026-10-23', '2026-10-24', '2026-10-25']);
  const periods = dailyPeriods(habit, done, '2026-10-25', '2026-10-23');
  assert.equal(periods.length, 3);
  assert.deepEqual(streakFromPeriods(periods), { current: 3, longest: 3 });
});

test('weekCounts menghitung hari berbeda per minggu', () => {
  const counts = weekCounts(['2026-10-26', '2026-10-26', '2026-10-28', '2026-11-02']);
  assert.equal(counts.get('2026-10-26'), 2); // dua hari berbeda, bukan tiga sesi
  assert.equal(counts.get('2026-11-02'), 1);
});

test('weeklyPeriods: minggu yang mencapai target dihitung', () => {
  const counts = weekCounts(['2026-10-12', '2026-10-14', '2026-10-19', '2026-10-21', '2026-10-23']);
  const periods = weeklyPeriods(counts, 2, '2026-10-12', '2026-10-25');
  assert.deepEqual(streakFromPeriods(periods), { current: 2, longest: 2 });
});

test('computeHabitStats: habit tertaut workout, target 3, sudah 2 sesi -> 67%', () => {
  const habit = {
    frequency: { type: 'weekly', timesPerWeek: 3 },
    linkedWorkout: true,
    startDate: '2026-10-01',
  };
  const workoutDates = new Set(['2026-10-26', '2026-10-28']);
  const s = computeHabitStats(habit, {
    doneDates: new Set(),
    workoutDates,
    today: '2026-10-29',
    windowStart: '2026-08-01',
  });
  assert.equal(s.kind, 'weekly');
  assert.equal(s.count, 2);
  assert.equal(s.percent, 67);
  assert.equal(s.met, false);
});

test('computeHabitStats: melebihi target tetap 100% (nilai penuh, tidak lebih)', () => {
  const habit = {
    frequency: { type: 'weekly', timesPerWeek: 2 },
    linkedWorkout: true,
    startDate: '2026-10-01',
  };
  const workoutDates = new Set(['2026-10-26', '2026-10-27', '2026-10-28']);
  const s = computeHabitStats(habit, {
    doneDates: new Set(),
    workoutDates,
    today: '2026-10-29',
    windowStart: '2026-08-01',
  });
  assert.equal(s.percent, 100);
  assert.equal(s.met, true);
});

test('computeHabitStats: weekly biasa menghitung hari yang dicentang, bukan workout', () => {
  const habit = {
    frequency: { type: 'weekly', timesPerWeek: 2 },
    linkedWorkout: false,
    startDate: '2026-10-01',
  };
  const s = computeHabitStats(habit, {
    doneDates: new Set(['2026-10-27']),
    workoutDates: new Set(['2026-10-26', '2026-10-28']),
    today: '2026-10-29',
    windowStart: '2026-08-01',
  });
  assert.equal(s.count, 1);
});

test('isScheduledOn dan frequencyLabel', () => {
  const days = { frequency: { type: 'days', days: [1, 3, 5] }, startDate: '2026-10-01' };
  assert.equal(isScheduledOn(days, '2026-10-26'), true); // Senin
  assert.equal(isScheduledOn(days, '2026-10-27'), false); // Selasa
  assert.equal(isScheduledOn(days, '2026-09-28'), false); // sebelum tanggal mulai
  assert.equal(frequencyLabel(days), 'Mon, Wed, Fri');
  assert.equal(frequencyLabel({ frequency: { type: 'daily' } }), 'Daily');
  assert.equal(frequencyLabel({ frequency: { type: 'weekly', timesPerWeek: 3 } }), '3x / week');
});


test('computeHabitStats: streak berupa angka (harian)', () => {
  const habit = { startDate: '2026-10-01', frequency: { type: 'daily' }, linkedWorkout: false };
  const done = new Set(['2026-10-26', '2026-10-27', '2026-10-28']);
  const s = computeHabitStats(habit, { doneDates: done, workoutDates: new Set(), today: '2026-10-28', windowStart: '2026-07-30' });
  assert.equal(typeof s.streak, 'number');
  assert.equal(s.streak, 3);
  assert.equal(s.longest, 3);
});

test('computeHabitStats: streak berupa angka (mingguan tertaut workout)', () => {
  const habit = { startDate: '2026-10-01', frequency: { type: 'weekly', timesPerWeek: 2 }, linkedWorkout: true };
  // minggu 19-25 Okt: 2 hari latihan (target 2 tercapai); minggu berjalan: 1 hari (belum cukup, tidak memutus)
  const workouts = new Set(['2026-10-20', '2026-10-22', '2026-10-27']);
  const s = computeHabitStats(habit, { doneDates: new Set(), workoutDates: workouts, today: '2026-10-28', windowStart: '2026-07-30' });
  assert.equal(typeof s.streak, 'number');
  assert.equal(s.streak, 1);
  assert.equal(s.count, 1);
  assert.equal(s.percent, 50);
});