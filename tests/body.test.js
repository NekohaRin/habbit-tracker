import test from 'node:test';
import assert from 'node:assert/strict';
import { compareDates, latestChange, movingAverage, valueOnOrBefore } from '../src/lib/bodyStats.js';
import { cmToDisplay, displayToCm, lengthUnitLabel } from '../src/lib/units.js';

const pts = [
  { date: '2026-10-20', value: 70 },
  { date: '2026-10-22', value: 69 },
  { date: '2026-10-26', value: 68 },
];

test('movingAverage memakai jendela hari kalender', () => {
  const avg = movingAverage(pts, 7);
  assert.deepEqual(avg.map((p) => p.value), [70, 69.5, 69]);
  // jendela 3 hari: pada 10-26 hanya titik 10-26 yang masuk
  assert.equal(movingAverage(pts, 3)[2].value, 68);
});

test('movingAverage tidak bergantung urutan masukan', () => {
  assert.deepEqual(movingAverage([...pts].reverse(), 7), movingAverage(pts, 7));
});

test('valueOnOrBefore', () => {
  assert.equal(valueOnOrBefore(pts, '2026-10-23').value, 69);
  assert.equal(valueOnOrBefore(pts, '2026-10-19'), null);
});

test('latestChange', () => {
  assert.deepEqual(latestChange(pts), { latest: { date: '2026-10-26', value: 68 }, delta: -1 });
  assert.equal(latestChange([]), null);
  assert.equal(latestChange([pts[0]]).delta, null);
});

test('compareDates: selisih dan data kosong', () => {
  const parts = [{ id: 'w', name: 'Waist' }, { id: 'c', name: 'Chest' }];
  const byPart = { w: [{ date: '2026-10-01', value: 80 }, { date: '2026-10-25', value: 78.5 }] };
  const rows = compareDates(parts, byPart, '2026-10-05', '2026-10-26');
  assert.deepEqual(rows[0], { partId: 'w', name: 'Waist', a: 80, b: 78.5, delta: -1.5 });
  assert.equal(rows[1].delta, null);
});

test('konversi panjang', () => {
  assert.equal(lengthUnitLabel('imperial'), 'in');
  assert.equal(cmToDisplay(25.4, 'imperial'), 10);
  assert.equal(displayToCm('10', 'imperial'), 25.4);
  assert.equal(displayToCm('-1', 'metric'), null);
});