import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyForm, formToHabit, habitToForm, validateForm } from '../src/lib/habitForm.js';

const opts = {
  iconKeys: ['drop', 'book', 'bolt', 'moon', 'pen', 'dots'],
  categoryKeys: ['kesehatan', 'belajar', 'olahraga', 'kerja', 'lainnya'],
};

test('form kosong belum sah: nama wajib', () => {
  const errors = validateForm(emptyForm('2026-10-26'), opts);
  assert.deepEqual(Object.keys(errors), ['name']);
});

test('hari tertentu wajib minimal satu hari', () => {
  const f = { ...emptyForm('2026-10-26'), name: 'Jurnal', freqType: 'days', days: [] };
  assert.ok(validateForm(f, opts).days);
});

test('target angka harus lebih dari 0', () => {
  const f = { ...emptyForm('2026-10-26'), name: 'Air', useTarget: true, amount: 0 };
  assert.ok(validateForm(f, opts).amount);
});

test('kebiasaan tertaut workout: mingguan, tanpa target angka', () => {
  const f = {
    ...emptyForm('2026-10-26'),
    name: 'Olahraga',
    category: 'olahraga',
    linkedWorkout: true,
    freqType: 'days',
    days: [1],
    useTarget: true,
    amount: 5,
    unit: 'km',
    timesPerWeek: 3,
  };
  const habit = formToHabit(f);
  assert.deepEqual(habit.frequency, { type: 'weekly', timesPerWeek: 3 });
  assert.equal(habit.target, null);
  assert.equal(habit.linkedWorkout, true);
  assert.deepEqual(validateForm(f, opts), {});
});

test('hari tertentu diurutkan dan tidak ganda', () => {
  const f = { ...emptyForm('2026-10-26'), name: 'Jurnal', freqType: 'days', days: [5, 1, 3, 1] };
  assert.deepEqual(formToHabit(f).frequency, { type: 'days', days: [1, 3, 5] });
});

test('bolak-balik form dan dokumen tidak mengubah isi', () => {
  const f = {
    ...emptyForm('2026-10-26'),
    name: '  Minum air  ',
    useTarget: true,
    amount: 8,
    unit: 'gelas',
    note: 'pagi hari',
  };
  const habit = formToHabit(f);
  assert.equal(habit.name, 'Minum air');
  assert.deepEqual(habit.target, { amount: 8, unit: 'gelas' });
  const back = habitToForm(habit);
  assert.equal(back.name, 'Minum air');
  assert.equal(back.useTarget, true);
  assert.equal(back.unit, 'gelas');
  assert.deepEqual(formToHabit(back), habit);
});
