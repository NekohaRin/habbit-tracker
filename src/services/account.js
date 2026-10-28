import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_BODY_PARTS, DEFAULT_SETTINGS, USER_COLLECTIONS } from '../constants';

const userRef = (uid) => doc(db, 'users', uid);

/** Buat profil dan bagian tubuh awal saat pertama kali login. Aman dipanggil berulang. */
export async function ensureUserProfile(user) {
  const snap = await getDoc(userRef(user.uid));
  if (snap.exists()) return;
  const batch = writeBatch(db);
  batch.set(userRef(user.uid), {
    displayName: user.displayName ?? '',
    settings: DEFAULT_SETTINGS,
    createdAt: serverTimestamp(),
  });
  DEFAULT_BODY_PARTS.forEach((name, order) => {
    batch.set(doc(collection(db, 'users', user.uid, 'bodyParts')), { name, order, active: true });
  });
  await batch.commit();
}

export function subscribeProfile(uid, onData, onError) {
  return onSnapshot(userRef(uid), (snap) => onData(snap.exists() ? snap.data() : null), onError);
}

/** Ubah sebagian pengaturan, misalnya { unit: 'imperial' }. */
export function updateSettings(uid, patch) {
  const fields = Object.fromEntries(Object.entries(patch).map(([k, v]) => [`settings.${k}`, v]));
  return updateDoc(userRef(uid), fields);
}

/** Seluruh data pengguna sebagai satu objek (untuk tombol Ekspor data). */
export async function exportAllData(uid) {
  const profile = await getDoc(userRef(uid));
  const collections = {};
  for (const name of USER_COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', uid, name));
    collections[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return {
    exportedAt: new Date().toISOString(),
    profile: profile.exists() ? profile.data() : null,
    collections,
  };
}

async function deleteCollection(uid, name) {
  const snap = await getDocs(collection(db, 'users', uid, name));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/** Hapus semua data pengguna di Firestore. Akun login dihapus terpisah oleh pemanggil. */
export async function deleteAllUserData(uid) {
  for (const name of USER_COLLECTIONS) await deleteCollection(uid, name);
  await deleteDoc(userRef(uid));
}
