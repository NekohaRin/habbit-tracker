import test from 'node:test';
import assert from 'node:assert/strict';
import { settleWithin } from '../src/lib/async.js';

test('settleWithin mengembalikan hasil bila selesai tepat waktu', async () => {
  assert.equal(await settleWithin(Promise.resolve('ok'), 100), 'ok');
});

test('settleWithin melempar kesalahan bila ditolak', async () => {
  await assert.rejects(settleWithin(Promise.reject(new Error('ditolak')), 100), /ditolak/);
});

test('settleWithin kembali setelah batas waktu bila tidak kunjung selesai (offline)', async () => {
  const never = new Promise(() => {});
  const started = Date.now();
  await settleWithin(never, 30);
  assert.ok(Date.now() - started >= 25);
});
