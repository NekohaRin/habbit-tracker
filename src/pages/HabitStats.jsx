import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchHabit, subscribeHabitLogs } from '../services/habits';
import { subscribeWorkoutDates } from '../services/workouts';
import { addDays, formatDate, todayKey } from '../lib/dates';
import { computeHabitStats, frequencyLabel } from '../lib/habitStats';
import { completionRate } from '../lib/dashboardStats';
import { buildHeatmap, countDone } from '../lib/heatmap';
import { LOG_WINDOW_DAYS } from '../constants';
import { CloseIcon, HabitIcon } from '../components/Icons';

const STATE_LABEL = {
  done: 'Done',
  missed: 'Missed',
  pending: 'Today, not done yet',
  off: 'Not scheduled',
  before: 'Before start date',
  future: 'Upcoming',
};

export default function HabitStats() {
  const { id } = useParams();
  const { user, tz } = useAuth();
  const navigate = useNavigate();
  const today = todayKey(tz);
  const windowStart = addDays(today, -LOG_WINDOW_DAYS);
  const [habit, setHabit] = useState(null);
  const [logs, setLogs] = useState([]);
  const [workoutDates, setWorkoutDates] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const onErr = () => setError('Could not load data. Check your connection and reload.');
    fetchHabit(user.uid, id)
      .then((h) => (h ? setHabit(h) : navigate('/habits', { replace: true })))
      .catch(onErr);
    const stops = [
      subscribeHabitLogs(user.uid, windowStart, setLogs, onErr),
      subscribeWorkoutDates(user.uid, windowStart, setWorkoutDates, onErr),
    ];
    return () => stops.forEach((s) => s());
  }, [user.uid, id, windowStart, navigate]);

  const doneDates = useMemo(() => {
    if (!habit) return new Set();
    if (habit.linkedWorkout) return workoutDates;
    return new Set(logs.filter((l) => l.habitId === id && l.done).map((l) => l.date));
  }, [habit, logs, workoutDates, id]);

  if (!habit) return <div className="splash">{error || 'Loading…'}</div>;

  const stats = computeHabitStats(habit, { doneDates, workoutDates, today, windowStart });
  const columns = buildHeatmap(habit, doneDates, today, 13);
  const r30 = completionRate(habit, doneDates, today, 30);
  const r90 = completionRate(habit, doneDates, today, 90);

  return (
    <main className="screen screen-form">
      <header className="form-header">
        <button type="button" className="icon-btn" aria-label="Close" onClick={() => navigate(-1)}><CloseIcon /></button>
        <h1><em>{habit.name}</em></h1>
      </header>
      <p className="muted"><HabitIcon name={habit.icon} size={16} /> {habit.linkedWorkout ? 'Linked to workouts' : frequencyLabel(habit)} · since {formatDate(habit.startDate)}</p>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats">
        <div className="stat stat-blue"><span className="stat-label">Current streak</span><span className="stat-value">{stats.streak}</span></div>
        <div className="stat"><span className="stat-label">Days done (13 weeks)</span><span className="stat-value">{countDone(columns)}</span></div>
        {stats.kind === 'weekly' ? (
          <div className="stat"><span className="stat-label">This week</span><span className="stat-value">{stats.count}/{stats.target}</span></div>
        ) : (
          <>
            <div className="stat"><span className="stat-label">Last 30 days</span><span className="stat-value">{r30?.percent == null ? '–' : `${r30.percent}%`}</span></div>
            <div className="stat"><span className="stat-label">Last 90 days</span><span className="stat-value">{r90?.percent == null ? '–' : `${r90.percent}%`}</span></div>
          </>
        )}
      </div>

      <h2 className="section-title">Last 13 weeks</h2>
      <div className="heat" role="img" aria-label={`Calendar of the last 13 weeks. ${countDone(columns)} days done.`}>
        {columns.flat().map((c) => (
          <span key={c.date} className={`heat-cell heat-${c.state}`} title={`${formatDate(c.date)}: ${STATE_LABEL[c.state]}`} />
        ))}
      </div>
      <p className="fine">
        Each column is a week (Mon to Sun), newest on the right. Solid blue = done, light = missed, outlined = today, empty = not scheduled.
      </p>

      <Link to={`/habit/${id}/edit`} className="btn btn-ghost">Edit habit</Link>
    </main>
  );
}