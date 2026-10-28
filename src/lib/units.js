// Berat disimpan dalam kg. Konversi ke lb hanya untuk tampilan dan isian (keputusan R-8).
const LB_PER_KG = 2.2046226218;
const round1 = (n) => Math.round(n * 10) / 10;

export const weightUnitLabel = (unit) => (unit === 'imperial' ? 'lb' : 'kg');

/** kg tersimpan -> angka tampilan (null tetap null). */
export function kgToDisplay(kg, unit) {
  if (kg == null) return null;
  return round1(unit === 'imperial' ? kg * LB_PER_KG : kg);
}

/** Angka isian pengguna -> kg tersimpan (1 desimal). Kosong atau tidak valid -> null. */
export function displayToKg(value, unit) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!(n > 0)) return null;
  return round1(unit === 'imperial' ? n / LB_PER_KG : n);
}

// Panjang: disimpan dalam cm; tampil dalam inci bila satuan imperial.
const CM_PER_IN = 2.54;
export const lengthUnitLabel = (unit) => (unit === 'imperial' ? 'in' : 'cm');

export function cmToDisplay(cm, unit) {
  if (cm == null) return null;
  return round1(unit === 'imperial' ? cm / CM_PER_IN : cm);
}

export function displayToCm(value, unit) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!(n > 0)) return null;
  return round1(unit === 'imperial' ? n * CM_PER_IN : n);
}