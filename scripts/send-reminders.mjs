// Pengirim pengingat harian. Dijalankan tiap 30 menit oleh GitHub Actions (lihat .github/workflows/reminders.yml).
// Untuk setiap pengguna yang pengingatnya aktif dan jamnya sudah tiba, kirim notifikasi push ke semua
// perangkatnya HANYA bila masih ada kebiasaan harian yang belum dicentang hari ini.
import { pathToFileURL } from 'node:url';
import { DEFAULT_TZ } from '../src/lib/dates.js';
import { buildMessage, pendingHabits, shouldSendNow } from '../src/lib/reminder.js';

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/**
 * @param {{db: any, messaging: any, now?: Date, force?: boolean, log?: (s:string)=>void}} deps
 *   force = abaikan jam & status "sudah terkirim" (untuk uji coba); tidak menulis lastReminderDate.
 */
export async function run({ db, messaging, now = new Date(), force = false, log = console.log }) {
  const users = await db.collection('users').get();
  const stats = { users: users.size, sent: 0, skipped: 0, removedTokens: 0 };

  for (const userDoc of users.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const settings = data.settings ?? {};
    const tz = settings.timezone || DEFAULT_TZ;
    const reminder = settings.reminder;

    let decision;
    if (force) {
      const base = shouldSendNow({ reminder, tz, now, lastSentDate: null });
      decision = { send: reminder?.enabled === true, today: base.today };
    } else {
      decision = shouldSendNow({ reminder, tz, now, lastSentDate: data.lastReminderDate ?? null });
    }
    const who = `user ${uid.slice(0, 6)}…`;
    if (!decision.send) {
      const r = reminder?.enabled === true ? (data.lastReminderDate === decision.today && !force ? 'already sent today' : 'not time yet') : 'reminder is off in settings';
      log(`${who}: skipped (${r})`);
      stats.skipped += 1;
      continue;
    }
    const { today } = decision;
    const userRef = db.collection('users').doc(uid);

    const [habitsSnap, logsSnap, tokensSnap] = await Promise.all([
      userRef.collection('habits').get(),
      userRef.collection('habitLogs').where('date', '==', today).get(),
      userRef.collection('pushTokens').get(),
    ]);
    const habits = habitsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const done = new Set(logsSnap.docs.filter((d) => d.data().done === true).map((d) => d.data().habitId));
    const message = buildMessage(pendingHabits(habits, done, today));

    if (!message) {
      // Semua sudah dicentang: tidak ada yang perlu diingatkan hari ini.
      log(`${who}: skipped (no pending habits today: ${habits.length} habits, ${done.size} done)`);
      if (!force) await userRef.update({ lastReminderDate: today });
      stats.skipped += 1;
      continue;
    }
    if (tokensSnap.empty) {
      log(`${who}: no devices registered`);
      stats.skipped += 1;
      continue;
    }

    const tokens = tokensSnap.docs.map((d) => d.data().token);
    const result = await messaging.sendEach(
      tokens.map((token) => ({
        token,
        data: { title: message.title, body: message.body, url: '/habits' },
        webpush: { headers: { Urgency: 'high', TTL: '7200' } },
      })),
    );

    let ok = 0;
    for (let i = 0; i < result.responses.length; i += 1) {
      const r = result.responses[i];
      if (r.success) {
        ok += 1;
      } else if (DEAD_TOKEN_CODES.has(r.error?.code)) {
        await userRef.collection('pushTokens').doc(tokensSnap.docs[i].id).delete();
        stats.removedTokens += 1;
      } else {
        log(`user ${uid.slice(0, 6)}…: send failed (${r.error?.code ?? 'unknown'})`);
      }
    }
    if (ok > 0) {
      stats.sent += 1;
      if (!force) await userRef.update({ lastReminderDate: today });
    }
  }

  log(`done: ${JSON.stringify(stats)}`);
  return stats;
}

// Dijalankan langsung (bukan di-import oleh tes).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not set.');
    process.exit(1);
  }
  const admin = (await import('firebase-admin')).default;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  await run({
    db: admin.firestore(),
    messaging: admin.messaging(),
    force: process.env.FORCE === '1',
  });
}
