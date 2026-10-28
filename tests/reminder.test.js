import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMessage,
  isValidTime,
  minutesOfDay,
  normalizeReminder,
  pendingHabits,
  shouldSendNow,
} from '../src/lib/reminder.js';

const TZ = 'Asia/Jakarta';
// 2026-10-28 20:30 WIB = 13:30 UTC (hari Rabu)
const at = (hhmmWib) => new Date(`2026-10-28T${hhmmWib}:00+07:00`);
const rem = { enabled: true, time: '20:00' };

test('isValidTime / normalizeReminder', () => {
  assert.equal(isValidTime('20:00'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('7:00'), false);
  assert.deepEqual(normalizeReminder(undefined), { enabled: false, time: '20:00' });
  assert.deepEqual(normalizeReminder({ enabled: true, time: 'x' }), { enabled: true, time: '20:00' });
});

test('minutesOfDay memakai zona waktu pengguna', () => {
  assert.equal(minutesOfDay(TZ, at('20:30')), 20 * 60 + 30);
  assert.equal(minutesOfDay('UTC', at('20:30')), 13 * 60 + 30);
  assert.equal(minutesOfDay(TZ, at('00:05')), 5);
});

test('shouldSendNow: sebelum, dalam toleransi, setelah toleransi', () => {
  assert.equal(shouldSendNow({ reminder: rem, tz: TZ, now: at('19:59') }).send, false);
  assert.equal(shouldSendNow({ reminder: rem, tz: TZ, now: at('20:00') }).send, true);
  assert.equal(shouldSendNow({ reminder: rem, tz: TZ, now: at('21:45') }).send, true);
  assert.equal(shouldSendNow({ reminder: rem, tz: TZ, now: at('22:30') }).send, false);
});

test('shouldSendNow: tidak kirim dua kali sehari atau bila nonaktif', () => {
  const r = shouldSendNow({ reminder: rem, tz: TZ, now: at('20:10'), lastSentDate: '2026-10-28' });
  assert.equal(r.send, false);
  assert.equal(r.today, '2026-10-28');
  assert.equal(shouldSendNow({ reminder: { ...rem, enabled: false }, tz: TZ, now: at('20:10') }).send, false);
  assert.equal(shouldSendNow({ reminder: rem, tz: TZ, now: at('20:10'), lastSentDate: '2026-10-27' }).send, true);
});

const habit = (id, extra = {}) => ({
  id,
  name: id,
  archived: false,
  startDate: '2026-10-01',
  frequency: { type: 'daily' },
  ...extra,
});

test('pendingHabits: hanya harian terjadwal, belum selesai, tidak diarsip', () => {
  const habits = [
    habit('a'),
    habit('b'),
    habit('arsip', { archived: true }),
    habit('mingguan', { frequency: { type: 'weekly', timesPerWeek: 3 } }),
    habit('senin', { frequency: { type: 'days', days: [1] } }), // 2026-10-28 = Rabu
    habit('rabu', { frequency: { type: 'days', days: [3] } }),
    habit('besok', { startDate: '2026-10-29' }),
  ];
  const ids = pendingHabits(habits, new Set(['b']), '2026-10-28').map((h) => h.id);
  assert.deepEqual(ids, ['a', 'rabu']);
});

test('buildMessage', () => {
  assert.equal(buildMessage([]), null);
  assert.deepEqual(buildMessage([{ name: 'Water' }]), { title: '1 habit left today', body: 'Water' });
  const m = buildMessage([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }]);
  assert.equal(m.title, '5 habits left today');
  assert.equal(m.body, 'A, B, C +2 more');
});
