import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const col = (uid, name) => collection(db, 'users', uid, name);
const withId = (d) => ({ id: d.id, ...d.data() });

/** Semua kebiasaan (termasuk yang diarsipkan), urut menurut `order`. Mengembalikan fungsi berhenti. */
export function subscribeHabits(uid, onData, onError) {
  return onSnapshot(
    col(uid, 'habits'),
    (snap) => onData(snap.docs.map(withId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))),
    onError,
  );
}

/** Catatan centang sejak tanggal `from` (hanya satu filter, jadi tidak butuh indeks tambahan). */
export function subscribeHabitLogs(uid, from, onData, onError) {
  return onSnapshot(
    query(col(uid, 'habitLogs'), where('date', '>=', from)),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  );
}

export async function fetchHabit(uid, id) {
  const snap = await getDoc(doc(db, 'users', uid, 'habits', id));
  return snap.exists() ? withId(snap) : null;
}

/** Simpan kebiasaan baru (tanpa id) atau perbarui yang ada (dengan id). */
export async function saveHabit(uid, data, id) {
  if (id) {
    await updateDoc(doc(db, 'users', uid, 'habits', id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(col(uid, 'habits'), {
    ...data,
    archived: false,
    order: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function setHabitArchived(uid, id, archived) {
  return updateDoc(doc(db, 'users', uid, 'habits', id), { archived, updatedAt: serverTimestamp() });
}

/** Hapus kebiasaan beserta seluruh riwayat centangnya. */
export async function deleteHabit(uid, id) {
  const logs = await getDocs(query(col(uid, 'habitLogs'), where('habitId', '==', id)));
  for (let i = 0; i < logs.docs.length; i += 400) {
    const batch = writeBatch(db);
    logs.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'users', uid, 'habits', id));
}

/**
 * Isi nilai angka (mis. 6 gelas). `done` otomatis true bila nilai mencapai target.
 * Satu dokumen per kebiasaan per hari, sama seperti centang biasa.
 */
export function setHabitValue(uid, habitId, date, value, targetAmount) {
  return setDoc(doc(db, 'users', uid, 'habitLogs', `${habitId}_${date}`), {
    habitId,
    date,
    done: value >= targetAmount,
    value,
    updatedAt: serverTimestamp(),
  });
}

/** Centang atau batalkan centang. Id dokumen tetap = satu centang per kebiasaan per hari. */
export function setHabitDone(uid, habitId, date, done) {
  return setDoc(doc(db, 'users', uid, 'habitLogs', `${habitId}_${date}`), {
    habitId,
    date,
    done,
    value: null,
    updatedAt: serverTimestamp(),
  });
}