import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeatmap, countDone } from '../src/lib/heatmap.js';

const daily = { startDate: '2026-10-01', frequency: { type: 'daily' } };

test('heatmap: 13 kolom x 7 hari, kolom terakhir memuat hari ini, awal Senin', () => {
  const cols = buildHeatmap(daily, new Set(), '2026-10-28');
  assert.equal(cols.length, 13);
  assert.ok(cols.every((c) => c.length === 7));
  const last = cols[12];
  assert.equal(last[0].date, '2026-10-26'); // Senin
  assert.equal(last[2].date, '2026-10-28');
  assert.equal(last[2].state, 'pending');
  assert.equal(last[3].state, 'future');
});

test('heatmap: done, missed, before', () => {
  const cols = buildHeatmap(daily, new Set(['2026-10-26', '2026-10-27']), '2026-10-29', 2);
  const byDate = Object.fromEntries(cols.flat().map((c) => [c.date, c.state]));
  assert.equal(byDate['2026-10-26'], 'done');
  assert.equal(byDate['2026-10-28'], 'missed');
  assert.equal(byDate['2026-10-29'], 'pending');
  const late = { startDate: '2026-10-27', frequency: { type: 'daily' } };
  const lateCols = buildHeatmap(late, new Set(), '2026-10-29', 1);
  assert.equal(lateCols[0][0].state, 'before'); // Senin 26 sebelum tanggal mulai
  assert.equal(lateCols[0][1].state, 'missed'); // Selasa 27 sudah terjadwal dan lewat
});

test('heatmap: hari tidak terjadwal = off; mingguan tanpa hari terlewat', () => {
  const days = { startDate: '2026-10-01', frequency: { type: 'days', days: [1, 3] } }; // Sen, Rab
  const c = buildHeatmap(days, new Set(), '2026-11-01', 1)[0];
  assert.equal(c[0].state, 'missed'); // Sen 26
  assert.equal(c[1].state, 'off'); // Sel 27
  const weekly = { startDate: '2026-10-01', frequency: { type: 'weekly', timesPerWeek: 3 } };
  const w = buildHeatmap(weekly, new Set(['2026-10-27']), '2026-11-01', 1)[0];
  assert.equal(w[0].state, 'off');
  assert.equal(w[1].state, 'done');
});

test('countDone', () => {
  const cols = buildHeatmap(daily, new Set(['2026-10-26', '2026-10-27', '2026-10-28']), '2026-10-29', 1);
  assert.equal(countDone(cols), 3);
});