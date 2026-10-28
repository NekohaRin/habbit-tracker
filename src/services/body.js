import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const col = (uid, name) => collection(db, 'users', uid, name);
const withId = (d) => ({ id: d.id, ...d.data() });

export function subscribeBodyParts(uid, onData, onError) {
  return onSnapshot(
    col(uid, 'bodyParts'),
    (snap) => onData(snap.docs.map(withId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))),
    onError,
  );
}

export function addBodyPart(uid, name) {
  return addDoc(col(uid, 'bodyParts'), { name: name.trim(), order: Date.now(), active: true });
}

export function updateBodyPart(uid, id, patch) {
  return updateDoc(doc(db, 'users', uid, 'bodyParts', id), patch);
}

export function subscribeMeasurements(uid, from, onData, onError) {
  return onSnapshot(
    query(col(uid, 'measurements'), where('date', '>=', from)),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  );
}

/** Satu ukuran per bagian per hari: id tetap, menyimpan ulang berarti mengganti nilainya. */
export function saveMeasurement(uid, bodyPartId, date, valueCm) {
  return setDoc(doc(db, 'users', uid, 'measurements', `${bodyPartId}_${date}`), {
    bodyPartId,
    date,
    valueCm,
    updatedAt: serverTimestamp(),
  });
}

export function deleteMeasurement(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'measurements', id));
}

export function subscribeBodyWeights(uid, from, onData, onError) {
  return onSnapshot(
    query(col(uid, 'bodyWeights'), where('date', '>=', from)),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  );
}

/** Satu berat badan per hari: id dokumen = tanggal. */
export function saveBodyWeight(uid, date, valueKg) {
  return setDoc(doc(db, 'users', uid, 'bodyWeights', date), {
    date,
    valueKg,
    updatedAt: serverTimestamp(),
  });
}

export function deleteBodyWeight(uid, date) {
  return deleteDoc(doc(db, 'users', uid, 'bodyWeights', date));
}