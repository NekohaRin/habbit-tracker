import { useEffect, useState } from 'react';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider } from '../firebase';
import { setHabitArchived, subscribeHabits } from '../services/habits';
import Switch from '../components/Switch';
import { deleteAllUserData, exportAllData, updateSettings } from '../services/account';
import { disablePush, enablePush, isPushConfigured, notificationPermission, pushSupported } from '../services/push';
import { normalizeReminder } from '../lib/reminder';

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const unit = profile?.settings?.unit ?? 'metric';
  const [archived, setArchived] = useState([]);
  const reminder = normalizeReminder(profile?.settings?.reminder);
  const [pushOk, setPushOk] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushSupported().then(setPushOk);
  }, []);

  useEffect(
    () => subscribeHabits(user.uid, (all) => setArchived(all.filter((h) => h.archived)), () => {}),
    [user.uid],
  );

  const restore = (id) => setHabitArchived(user.uid, id, false).catch(() => setMessage('Could not restore the habit.'));

  const setUnit = (u) => updateSettings(user.uid, { unit: u }).catch(() => setMessage('Could not save settings.'));

  const saveReminder = (patch) => updateSettings(user.uid, { reminder: { ...reminder, ...patch } });

  const toggleReminder = async (on) => {
    setMessage('');
    setBusy(true);
    try {
      if (on) await enablePush(user.uid);
      else await disablePush(user.uid).catch(() => {});
      await saveReminder({ enabled: on });
    } catch (e) {
      setMessage(e?.message || 'Could not change the reminder. Try again when you are online.');
    } finally {
      setBusy(false);
    }
  };

  const setReminderTime = (time) => {
    if (time) saveReminder({ time }).catch(() => setMessage('Could not save the reminder time.'));
  };

  const reminderHint = !isPushConfigured
    ? 'Not set up yet'
    : !pushOk
      ? 'Not supported here. On iPhone, add the app to the Home Screen first.'
      : notificationPermission() === 'denied'
        ? 'Notifications are blocked in your browser settings'
        : 'Only sent if you still have habits left today';

  const doExport = async () => {
    setMessage('');
    try {
      const data = await exportAllData(user.uid);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-habit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage('Export failed. Try again when you are online.');
    }
  };

  const doDelete = async () => {
    if (!window.confirm('Delete ALL your data and your account? This cannot be undone.')) return;
    try {
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      await deleteAllUserData(user.uid);
      await deleteUser(auth.currentUser);
    } catch (e) {
      setMessage(
        e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request'
          ? 'Nothing was deleted. Confirm with Google to continue.'
          : 'Delete failed. Try again when you are online.',
      );
    }
  };

  return (
    <main className="screen">
      <h1 className="display"><em>Settings</em></h1>

      <div className="profile-card">
        {user.photoURL ? <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{(user.displayName ?? '?').slice(0, 1)}</span>}
        <div>
          <strong>{user.displayName}</strong>
          <p className="muted">{user.email}</p>
        </div>
      </div>

      <h2 className="section-title">Units</h2>
      <div className="segmented segmented-2" role="group" aria-label="Measurement units">
        <button type="button" aria-pressed={unit === 'metric'} onClick={() => setUnit('metric')}>kg · cm</button>
        <button type="button" aria-pressed={unit === 'imperial'} onClick={() => setUnit('imperial')}>lb · in</button>
      </div>

      <h2 className="section-title">Archived habits</h2>
      {archived.length === 0 ? (
        <p className="muted">No archived habits.</p>
      ) : (
        <div className="list">
          {archived.map((h) => (
            <div key={h.id} className="list-row">
              <strong>{h.name}</strong>
              <button type="button" className="btn btn-ghost" onClick={() => restore(h.id)}>Restore</button>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Reminders</h2>
      <div className="switch-row">
        <div>
          <strong>Daily reminder</strong>
          <small>{reminderHint}</small>
        </div>
        <Switch
          checked={reminder.enabled}
          onChange={toggleReminder}
          label="Daily reminder"
          disabled={busy || !isPushConfigured || !pushOk}
        />
      </div>
      {reminder.enabled && (
        <div className="switch-row">
          <div>
            <strong>Remind me at</strong>
            <small>Your local time</small>
          </div>
          <input
            type="time"
            className="time-input"
            value={reminder.time}
            onChange={(e) => setReminderTime(e.target.value)}
            aria-label="Reminder time"
          />
        </div>
      )}

      <h2 className="section-title">Data</h2>
      <div className="row-between">
        <button type="button" className="btn btn-dark" onClick={doExport}>Export data</button>
        <button type="button" className="btn btn-danger" onClick={doDelete}>Delete account &amp; data</button>
      </div>

      {message && <p className="error" role="alert">{message}</p>}

      <button type="button" className="btn btn-ghost btn-lg" onClick={signOut}>Sign out</button>
    </main>
  );
}
