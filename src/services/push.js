import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const isPushConfigured = Boolean(VAPID_KEY);

/** True bila peramban ini bisa menerima push (di iPhone hanya setelah ditambahkan ke Home Screen). */
export async function pushSupported() {
  try {
    return Boolean(app) && 'Notification' in window && (await isSupported());
  } catch {
    return false;
  }
}

export function notificationPermission() {
  return 'Notification' in window ? Notification.permission : 'denied';
}

async function registration() {
  // Scope khusus agar tidak bentrok dengan service worker PWA (sw.js) yang memakai scope "/".
  return navigator.serviceWorker.register('/push-sw.js', { scope: '/push-scope/' });
}

function platform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Minta izin, ambil token FCM perangkat ini, dan simpan di users/{uid}/pushTokens.
 * Melempar Error dengan pesan yang siap ditampilkan.
 */
export async function enablePush(uid) {
  if (!isPushConfigured) throw new Error('Push is not set up yet (missing VITE_FIREBASE_VAPID_KEY).');
  if (!(await pushSupported())) {
    throw new Error('This browser cannot receive notifications. On iPhone, add the app to the Home Screen first.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked. Allow them in the browser or phone settings, then try again.');
  }
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: await registration(),
  });
  if (!token) throw new Error('Could not get a notification token. Try again.');
  await setDoc(doc(db, 'users', uid, 'pushTokens', token), {
    token,
    platform: platform(),
    updatedAt: serverTimestamp(),
  });
}

/** Hapus token perangkat ini. Dipanggil saat pengingat dimatikan. */
export async function disablePush(uid) {
  if (!(await pushSupported()) || Notification.permission !== 'granted' || !isPushConfigured) return;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: await registration(),
  });
  if (token) await deleteDoc(doc(db, 'users', uid, 'pushTokens', token));
  await deleteToken(messaging);
}
