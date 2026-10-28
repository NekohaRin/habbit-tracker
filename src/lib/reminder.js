import { DEFAULT_TZ, isKey, todayKey } from './dates.js';
import { isScheduledOn } from './habitStats.js';

// Logika pengingat harian. Dipakai oleh aplikasi (Settings) DAN skrip pengirim di GitHub Actions,
// jadi file ini harus murni JavaScript tanpa import React/Firebase.

export const DEFAULT_REMINDER = { enabled: false, time: '20:00' };

/** Setelah jam pengingat lewat, notifikasi masih boleh dikirim selama rentang ini (menit). */
export const GRACE_MINUTES = 120;

export function isValidTime(t) {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function normalizeReminder(r) {
  return {
    enabled: r?.enabled === true,
    time: isValidTime(r?.time) ? r.time : DEFAULT_REMINDER.time,
  };
}

/** Menit sejak tengah malam pada zona waktu tertentu (0..1439). */
export function minutesOfDay(tz = DEFAULT_TZ, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get('hour') * 60 + get('minute');
}

/**
 * Apakah pengingat perlu dikirim sekarang?
 * Ya bila: aktif, belum terkirim hari ini, dan jam sekarang berada di antara jam pengingat
 * dan jam pengingat + GRACE_MINUTES. Jadwal GitHub Actions bisa telat, jadi ada rentang toleransi.
 */
export function shouldSendNow({ reminder, tz = DEFAULT_TZ, now = new Date(), lastSentDate = null }) {
  const r = normalizeReminder(reminder);
  const today = todayKey(tz, now);
  if (!r.enabled || lastSentDate === today) return { send: false, today };
  const [h, m] = r.time.split(':').map(Number);
  const late = minutesOfDay(tz, now) - (h * 60 + m);
  return { send: late >= 0 && late <= GRACE_MINUTES, today };
}

/** Kebiasaan harian yang terjadwal hari ini tetapi belum dicentang (kebiasaan mingguan dilewati). */
export function pendingHabits(habits, doneHabitIds, today) {
  if (!isKey(today)) return [];
  return habits.filter(
    (h) =>
      !h.archived &&
      h.frequency?.type !== 'weekly' &&
      isScheduledOn(h, today) &&
      !doneHabitIds.has(h.id),
  );
}

/** Isi notifikasi; null bila tidak ada yang perlu diingatkan. */
export function buildMessage(pending) {
  if (pending.length === 0) return null;
  const names = pending.slice(0, 3).map((h) => h.name);
  const more = pending.length - names.length;
  const list = names.join(', ') + (more > 0 ? ` +${more} more` : '');
  return {
    title: pending.length === 1 ? '1 habit left today' : `${pending.length} habits left today`,
    body: list,
  };
}
