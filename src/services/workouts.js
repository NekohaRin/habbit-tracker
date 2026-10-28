import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const col = (uid, name) => collection(db, 'users', uid, name);
const withId = (d) => ({ id: d.id, ...d.data() });

/**
 * Himpunan tanggal yang punya sesi workout sejak `from`.
 * Dipakai kebiasaan tertaut workout: jumlah HARI BERBEDA per minggu = progres mingguan.
 */
export function subscribeWorkoutDates(uid, from, onData, onError) {
  return onSnapshot(
    query(col(uid, 'workoutSessions'), where('date', '>=', from)),
    (snap) => onData(new Set(snap.docs.map((d) => d.data().date))),
    onError,
  );
}

/** Sesi workout sejak `from`, urut terbaru dulu. */
export function subscribeSessions(uid, from, onData, onError) {
  return onSnapshot(
    query(col(uid, 'workoutSessions'), where('date', '>=', from)),
    (snap) => onData(snap.docs.map(withId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))),
    onError,
  );
}

export async function fetchSession(uid, id) {
  const snap = await getDoc(doc(db, 'users', uid, 'workoutSessions', id));
  return snap.exists() ? withId(snap) : null;
}

/** Simpan sesi baru (tanpa id) atau perbarui yang ada. */
export async function saveSession(uid, data, id) {
  if (id) {
    await updateDoc(doc(db, 'users', uid, 'workoutSessions', id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(col(uid, 'workoutSessions'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function deleteSession(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'workoutSessions', id));
}

export function subscribeExercises(uid, onData, onError) {
  return onSnapshot(
    col(uid, 'exercises'),
    (snap) => onData(snap.docs.map(withId).sort((a, b) => a.name.localeCompare(b.name))),
    onError,
  );
}

export async function addExercise(uid, name, muscleGroup = '') {
  const ref = await addDoc(col(uid, 'exercises'), {
    name: name.trim(),
    muscleGroup: muscleGroup.trim(),
    archived: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateExercise(uid, id, patch) {
  return updateDoc(doc(db, 'users', uid, 'exercises', id), patch);
}