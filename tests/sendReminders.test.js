import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../scripts/send-reminders.mjs';

// Firestore palsu sederhana: data[path] = { fields, sub: { koleksi: [{id, ...}] } }
function fakeDb(users) {
  const updates = [];
  const deleted = [];
  const snap = (docs) => ({ docs, empty: docs.length === 0, size: docs.length });
  const docSnap = (id, data, extra = {}) => ({ id, data: () => data, ...extra });
  const userRef = (u) => ({
    update: async (patch) => updates.push({ uid: u.id, patch }),
    collection: (name) => ({
      get: async () => snap((u.sub[name] ?? []).map((x) => docSnap(x.id, x))),
      where: (_f, _op, val) => ({
        get: async () => snap((u.sub[name] ?? []).filter((x) => x.date === val).map((x) => docSnap(x.id, x))),
      }),
      doc: (id) => ({ delete: async () => deleted.push({ uid: u.id, id }) }),
    }),
  });
  return {
    updates,
    deleted,
    collection: () => ({
      get: async () => snap(users.map((u) => docSnap(u.id, u.data))),
      doc: (id) => userRef(users.find((u) => u.id === id)),
    }),
  };
}

const fakeMessaging = (results) => {
  const sent = [];
  return {
    sent,
    sendEach: async (msgs) => {
      sent.push(...msgs);
      return { responses: msgs.map((m) => results[m.token] ?? { success: true }) };
    },
  };
};

const NOW = new Date('2026-10-28T20:10:00+07:00'); // Rabu 20:10 WIB
const habit = (id, name) => ({ id, name, archived: false, startDate: '2026-10-01', frequency: { type: 'daily' } });
const user = (over = {}) => ({
  id: 'u1abcdef',
  data: { settings: { timezone: 'Asia/Jakarta', reminder: { enabled: true, time: '20:00' } } },
  sub: {
    habits: [habit('h1', 'Water'), habit('h2', 'Read')],
    habitLogs: [{ id: 'h1_2026-10-28', habitId: 'h1', date: '2026-10-28', done: true }],
    pushTokens: [{ id: 't1', token: 't1' }],
  },
  ...over,
});
const quiet = () => {};

test('mengirim bila ada habit belum selesai, lalu menandai terkirim', async () => {
  const db = fakeDb([user()]);
  const msg = fakeMessaging({});
  const s = await run({ db, messaging: msg, now: NOW, log: quiet });
  assert.equal(s.sent, 1);
  assert.equal(msg.sent.length, 1);
  assert.equal(msg.sent[0].data.title, '1 habit left today');
  assert.equal(msg.sent[0].data.body, 'Read');
  assert.deepEqual(db.updates, [{ uid: 'u1abcdef', patch: { lastReminderDate: '2026-10-28' } }]);
});

test('tidak kirim bila semua habit sudah dicentang (dan ditandai selesai hari ini)', async () => {
  const u = user();
  u.sub.habitLogs.push({ id: 'h2_2026-10-28', habitId: 'h2', date: '2026-10-28', done: true });
  const db = fakeDb([u]);
  const msg = fakeMessaging({});
  const s = await run({ db, messaging: msg, now: NOW, log: quiet });
  assert.equal(msg.sent.length, 0);
  assert.equal(s.sent, 0);
  assert.equal(db.updates.length, 1);
});

test('tidak kirim di luar jam, saat nonaktif, atau sudah terkirim hari ini', async () => {
  const early = new Date('2026-10-28T19:00:00+07:00');
  const off = user({ data: { settings: { reminder: { enabled: false, time: '20:00' } } } });
  const sentAlready = user({
    data: { lastReminderDate: '2026-10-28', settings: { reminder: { enabled: true, time: '20:00' } } },
  });
  for (const [users, now] of [[[user()], early], [[off], NOW], [[sentAlready], NOW]]) {
    const msg = fakeMessaging({});
    await run({ db: fakeDb(users), messaging: msg, now, log: quiet });
    assert.equal(msg.sent.length, 0);
  }
});

test('token mati dihapus; kegagalan lain tidak menandai terkirim', async () => {
  const u = user();
  u.sub.pushTokens = [{ id: 'dead', token: 'dead' }];
  const db = fakeDb([u]);
  const msg = fakeMessaging({ dead: { success: false, error: { code: 'messaging/registration-token-not-registered' } } });
  const s = await run({ db, messaging: msg, now: NOW, log: quiet });
  assert.equal(s.removedTokens, 1);
  assert.deepEqual(db.deleted, [{ uid: 'u1abcdef', id: 'dead' }]);
  assert.equal(db.updates.length, 0);
});

test('force: kirim di luar jam dan tidak menulis lastReminderDate', async () => {
  const db = fakeDb([user()]);
  const msg = fakeMessaging({});
  const s = await run({ db, messaging: msg, now: new Date('2026-10-28T09:00:00+07:00'), force: true, log: quiet });
  assert.equal(s.sent, 1);
  assert.equal(db.updates.length, 0);
});
