import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  diffDays,
  endOfWeek,
  isKey,
  startOfWeek,
  todayKey,
  weekKeys,
  weekday,
} from '../src/lib/dates.js';

test('todayKey mengikuti zona waktu, bukan UTC', () => {
  const now = new Date('2026-10-25T17:30:00Z'); // 00.30 WIB hari berikutnya
  assert.equal(todayKey('Asia/Jakarta', now), '2026-10-26');
  assert.equal(todayKey('UTC', now), '2026-10-25');
});

test('weekday: Senin = 1 sampai Minggu = 7', () => {
  assert.equal(weekday('2026-10-26'), 1);
  assert.equal(weekday('2026-10-28'), 3);
  assert.equal(weekday('2026-10-25'), 7);
});

test('startOfWeek dan endOfWeek memakai minggu Senin sampai Minggu', () => {
  assert.equal(startOfWeek('2026-10-25'), '2026-10-19'); // Minggu masuk minggu sebelumnya
  assert.equal(startOfWeek('2026-10-26'), '2026-10-26');
  assert.equal(endOfWeek('2026-10-26'), '2026-11-01');
  assert.deepEqual(weekKeys('2026-10-28'), [
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
  ]);
});

test('addDays melewati batas bulan, tahun, dan tahun kabisat', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('diffDays menghitung selisih hari', () => {
  assert.equal(diffDays('2026-10-01', '2026-10-31'), 30);
  assert.equal(diffDays('2026-10-31', '2026-10-01'), -30);
});

test('isKey menolak tanggal yang tidak sah', () => {
  assert.equal(isKey('2026-10-25'), true);
  assert.equal(isKey('2026-02-30'), false);
  assert.equal(isKey('25-10-2026'), false);
  assert.equal(isKey(''), false);
  assert.equal(isKey(null), false);
});
