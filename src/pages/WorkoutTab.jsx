import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  addExercise,
  subscribeExercises,
  subscribeSessions,
  updateExercise,
} from '../services/workouts';
import { addDays, formatDate, todayKey } from '../lib/dates';
import { kgToDisplay, weightUnitLabel } from '../lib/units';
import { sessionsInWeek, trainingDays, weeklyEvaluation } from '../lib/workoutStats';
import { LOG_WINDOW_DAYS } from '../constants';
import { PlusIcon } from '../components/Icons';

const TREND = {
  up: { label: 'Up', mark: '▲' },
  same: { label: 'Same', mark: '＝' },
  down: { label: 'Down', mark: '▼' },
  new: { label: 'New', mark: '●' },
  skipped: { label: 'Skipped', mark: '–' },
};

function setText(s, unit) {
  if (!s) return '–';
  const w = kgToDisplay(s.weightKg, unit);
  return `${s.sets}×${s.reps}${w ? ` @ ${w} ${weightUnitLabel(unit)}` : ''}`;
}

export default function WorkoutTab() {
  const { user, tz, profile } = useAuth();
  const unit = profile?.settings?.unit ?? 'metric';
  const today = todayKey(tz);
  const [sessions, setSessions] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const onErr = () => setError('Could not load workouts. Check your connection and reload.');
    const stops = [
      subscribeSessions(user.uid, addDays(today, -LOG_WINDOW_DAYS), setSessions, onErr),
      subscribeExercises(user.uid, setExercises, onErr),
    ];
    return () => stops.forEach((s) => s());
  }, [user.uid, today]);

  const evaluation = useMemo(() => weeklyEvaluation(sessions ?? [], today), [sessions, today]);
  const thisWeek = sessionsInWeek(sessions ?? [], today);
  const days = trainingDays(sessions ?? [], today);

  const add = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      await addExercise(user.uid, name.slice(0, 40));
      setNewName('');
    } catch {
      setError('Could not add the exercise.');
    }
  };

  const toggleArchive = (ex) =>
    updateExercise(user.uid, ex.id, { archived: !ex.archived }).catch(() => setError('Could not update the exercise.'));

  if (sessions === null) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="stats">
        <div className="stat stat-blue">
          <span className="stat-label">Training days this week</span>
          <span className="stat-value">{days}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Sessions this week</span>
          <span className="stat-value">{thisWeek.length}</span>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <h2 className="section-title">Weekly evaluation</h2>
      {evaluation.length === 0 ? (
        <div className="empty"><p className="muted">Log a session to see how each exercise compares with last week.</p></div>
      ) : (
        <div className="list">
          {evaluation.map((r) => (
            <div key={r.exerciseId} className="list-row">
              <div>
                <strong>{r.name}</strong>
                <small>Last week {setText(r.before, unit)} · This week {setText(r.now, unit)}</small>
              </div>
              <span className="badge">{TREND[r.trend].mark} {TREND[r.trend].label}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Recent sessions</h2>
      {sessions.length === 0 ? (
        <div className="empty">
          <p><strong>No sessions yet</strong></p>
          <p className="muted">Tap + to log your first workout. Any day counts.</p>
        </div>
      ) : (
        <div className="list">
          {sessions.slice(0, 10).map((s) => (
            <Link key={s.id} to={`/workout/${s.id}/edit`} className="list-row">
              <div>
                <strong>{formatDate(s.date)}</strong>
                <small>
                  {s.entries.map((e) => e.exerciseName).join(', ')}
                  {s.durationMin ? ` · ${s.durationMin} min` : ''}
                </small>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="section-title">My exercises</h2>
      <form className="target-row" onSubmit={add}>
        <input className="input" value={newName} maxLength={40} placeholder="e.g. Push-up" aria-label="New exercise name" onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="btn btn-dark">Add</button>
      </form>
      {exercises.length > 0 && (
        <div className="list">
          {exercises.map((ex) => (
            <div key={ex.id} className="list-row">
              <strong style={ex.archived ? { opacity: 0.5 } : undefined}>{ex.name}</strong>
              <button type="button" className="btn btn-ghost" onClick={() => toggleArchive(ex)}>{ex.archived ? 'Restore' : 'Archive'}</button>
            </div>
          ))}
        </div>
      )}

      <Link to="/workout/new" className="fab" aria-label="Log workout"><PlusIcon /></Link>
    </>
  );
}