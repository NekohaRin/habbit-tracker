import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  addExercise,
  deleteSession,
  fetchSession,
  saveSession,
  subscribeExercises,
  subscribeSessions,
} from '../services/workouts';
import { settleWithin } from '../lib/async';
import { addDays, todayKey, isKey } from '../lib/dates';
import { displayToKg, kgToDisplay, weightUnitLabel } from '../lib/units';
import { latestSession } from '../lib/workoutStats';
import { LOG_WINDOW_DAYS } from '../constants';
import { CloseIcon } from '../components/Icons';

const blankRow = () => ({ key: crypto.randomUUID(), exerciseId: '', sets: 3, reps: 8, weight: '' });

export default function WorkoutLog() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user, tz, profile } = useAuth();
  const unit = profile?.settings?.unit ?? 'metric';
  const navigate = useNavigate();
  const today = todayKey(tz);

  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState([blankRow()]);
  const [exercises, setExercises] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loaded, setLoaded] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stops = [
      subscribeExercises(user.uid, setExercises, () => {}),
      subscribeSessions(user.uid, addDays(today, -LOG_WINDOW_DAYS), setRecent, () => {}),
    ];
    return () => stops.forEach((s) => s());
  }, [user.uid, today]);

  useEffect(() => {
    if (!editing) return;
    fetchSession(user.uid, id)
      .then((s) => {
        if (!s) return navigate('/workout', { replace: true });
        setDate(s.date);
        setDuration(s.durationMin ?? '');
        setNote(s.note ?? '');
        setRows(
          s.entries.map((e) => ({
            key: crypto.randomUUID(),
            exerciseId: e.exerciseId,
            sets: e.sets,
            reps: e.reps,
            weight: e.weightKg == null ? '' : kgToDisplay(e.weightKg, unit),
          })),
        );
        setLoaded(true);
      })
      .catch(() => setMessage('Could not load the session.'));
  }, [editing, id, user.uid, navigate, unit]);

  const active = exercises.filter((e) => !e.archived);
  const setRow = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  const copyLast = () => {
    const last = latestSession(recent);
    if (!last) return setMessage('No earlier session to copy yet.');
    setMessage('');
    setRows(
      last.entries.map((e) => ({
        key: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        weight: e.weightKg == null ? '' : kgToDisplay(e.weightKg, unit),
      })),
    );
  };

  const createExercise = async (key) => {
    const name = window.prompt('New exercise name');
    if (!name || !name.trim()) return;
    try {
      const newId = await addExercise(user.uid, name.trim().slice(0, 40));
      setRow(key, { exerciseId: newId });
    } catch {
      setMessage('Could not add the exercise.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!isKey(date)) return setMessage('Choose a valid date.');
    if (date > today) return setMessage('The date cannot be in the future.');
    const byId = new Map(exercises.map((x) => [x.id, x.name]));
    const entries = [];
    for (const r of rows) {
      if (!r.exerciseId) return setMessage('Choose an exercise for every row.');
      const sets = Math.round(Number(r.sets));
      const reps = Math.round(Number(r.reps));
      if (!(sets >= 1 && sets <= 50 && reps >= 1 && reps <= 500)) return setMessage('Sets and reps must be whole numbers above 0.');
      entries.push({
        exerciseId: r.exerciseId,
        exerciseName: byId.get(r.exerciseId) ?? 'Exercise',
        sets,
        reps,
        weightKg: displayToKg(r.weight, unit),
      });
    }
    const dur = duration === '' ? null : Math.round(Number(duration));
    if (dur !== null && !(dur > 0 && dur <= 1440)) return setMessage('Duration must be between 1 and 1440 minutes.');
    setSaving(true);
    try {
      await settleWithin(saveSession(user.uid, { date, durationMin: dur, note: note.trim(), entries }, id), 1500);
      navigate('/workout');
    } catch {
      setMessage('Could not save. Please try again.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try {
      await settleWithin(deleteSession(user.uid, id), 1500);
      navigate('/workout');
    } catch {
      setMessage('Delete failed. Try again.');
    }
  };

  if (!loaded) return <div className="splash">{message || 'Loading…'}</div>;

  return (
    <form className="screen screen-form" onSubmit={submit} noValidate>
      <header className="form-header">
        <button type="button" className="icon-btn" aria-label="Close" onClick={() => navigate(-1)}><CloseIcon /></button>
        <h1>{editing ? <>Edit <em>session</em></> : <>Log <em>workout</em></>}</h1>
      </header>

      <label className="label" htmlFor="date">Date</label>
      <input id="date" className="input" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />

      {!editing && (
        <button type="button" className="btn btn-ghost" onClick={copyLast}>Copy last session</button>
      )}

      <span className="label">Exercises</span>
      {rows.map((r) => (
        <div key={r.key} className="card">
          <select
            className="input"
            aria-label="Exercise"
            value={r.exerciseId}
            onChange={(e) => (e.target.value === '__new' ? createExercise(r.key) : setRow(r.key, { exerciseId: e.target.value }))}
          >
            <option value="">Choose exercise…</option>
            {active.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            {r.exerciseId && !active.some((x) => x.id === r.exerciseId) && (
              <option value={r.exerciseId}>{exercises.find((x) => x.id === r.exerciseId)?.name ?? 'Archived exercise'}</option>
            )}
            <option value="__new">＋ New exercise…</option>
          </select>
          <div className="target-row">
            <input className="input" type="number" inputMode="numeric" min="1" aria-label="Sets" value={r.sets} onChange={(e) => setRow(r.key, { sets: e.target.value })} />
            <span className="muted">sets ×</span>
            <input className="input" type="number" inputMode="numeric" min="1" aria-label="Reps" value={r.reps} onChange={(e) => setRow(r.key, { reps: e.target.value })} />
            <span className="muted">reps</span>
          </div>
          <div className="target-row">
            <input className="input" type="number" inputMode="decimal" min="0" placeholder="optional" aria-label={`Weight (${weightUnitLabel(unit)})`} value={r.weight} onChange={(e) => setRow(r.key, { weight: e.target.value })} />
            <span className="muted">{weightUnitLabel(unit)}</span>
            <button type="button" className="btn btn-ghost" onClick={() => removeRow(r.key)} disabled={rows.length === 1}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={() => setRows((rs) => [...rs, blankRow()])}>＋ Add exercise</button>

      <label className="label" htmlFor="duration">Duration in minutes (optional)</label>
      <input id="duration" className="input" type="number" inputMode="numeric" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />

      <label className="label" htmlFor="wnote">Note (optional)</label>
      <textarea id="wnote" className="textarea" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />

      {message && <p className="error" role="alert">{message}</p>}

      {editing && (
        <div className="row-between">
          <button type="button" className="btn btn-danger" onClick={remove}>Delete session</button>
        </div>
      )}

      <div className="form-footer">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}