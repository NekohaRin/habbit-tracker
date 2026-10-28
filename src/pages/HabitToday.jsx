import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeHabits, subscribeHabitLogs, setHabitDone, setHabitValue } from '../services/habits';
import { subscribeWorkoutDates } from '../services/workouts';
import { settleWithin } from '../lib/async';
import { addDays, DAY_LETTERS, formatLongDate, todayKey, weekKeys } from '../lib/dates';
import { computeHabitStats, frequencyLabel, isScheduledOn } from '../lib/habitStats';
import { CATEGORIES, LOG_WINDOW_DAYS } from '../constants';
import { BoltIcon, CheckIcon, HabitIcon, PlusIcon, ProgressRing } from '../components/Icons';

export default function HabitToday() {
  const { user, tz } = useAuth();
  const today = todayKey(tz);
  const windowStart = addDays(today, -LOG_WINDOW_DAYS);
  const [selected, setSelected] = useState(today);
  const [habits, setHabits] = useState(null);
  const [logs, setLogs] = useState([]);
  const [workoutDates, setWorkoutDates] = useState(new Set());
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const onErr = () => setError('Could not load data. Check your connection and reload.');
    const stops = [
      subscribeHabits(user.uid, setHabits, onErr),
      subscribeHabitLogs(user.uid, windowStart, setLogs, onErr),
      subscribeWorkoutDates(user.uid, windowStart, setWorkoutDates, onErr),
    ];
    return () => stops.forEach((s) => s());
  }, [user.uid, windowStart]);

  const valueByKey = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      if (typeof l.value === 'number') map.set(`${l.habitId}_${l.date}`, l.value);
    });
    return map;
  }, [logs]);

  const doneByHabit = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      if (!l.done) return;
      if (!map.has(l.habitId)) map.set(l.habitId, new Set());
      map.get(l.habitId).add(l.date);
    });
    return map;
  }, [logs]);

  const items = useMemo(
    () =>
      (habits ?? [])
        .filter((h) => !h.archived)
        .map((h) => ({
          habit: h,
          done: doneByHabit.get(h.id) ?? new Set(),
        }))
        .map((x) => ({
          ...x,
          stats: computeHabitStats(x.habit, { doneDates: x.done, workoutDates, today, windowStart }),
        })),
    [habits, doneByHabit, workoutDates, today, windowStart],
  );

  const visible = items.filter(
    ({ habit }) =>
      (category === 'all' || habit.category === category) &&
      (habit.frequency.type === 'weekly' || isScheduledOn(habit, selected)),
  );
  const dailyVisible = visible.filter(({ habit }) => habit.frequency.type !== 'weekly');
  const doneCount = dailyVisible.filter(({ done }) => done.has(selected)).length;
  const weekly = items.filter(({ stats }) => stats.kind === 'weekly');
  const weeklyMet = weekly.filter(({ stats }) => stats.met).length;
  const bestStreak = items.reduce((m, { stats }) => Math.max(m, stats.streak ?? 0), 0);

  const toggle = async (habit, done) => {
    setError('');
    try {
      await settleWithin(setHabitDone(user.uid, habit.id, selected, !done.has(selected)), 1500);
    } catch {
      setError('Could not save the check-in. Please try again.');
    }
  };

  const bump = async (habit, delta) => {
    setError('');
    const current = valueByKey.get(`${habit.id}_${selected}`) ?? 0;
    const next = Math.max(0, Math.min(100000, current + delta));
    try {
      await settleWithin(setHabitValue(user.uid, habit.id, selected, next, habit.target.amount), 1500);
    } catch {
      setError('Could not save the value. Please try again.');
    }
  };

  const week = weekKeys(selected);

  return (
    <main className="screen">
      <header className="header-row">
        <div>
          <p className="muted">{formatLongDate(selected)}</p>
          <h1 className="display">Habits <em>today</em></h1>
        </div>
      </header>

      <div className="week" role="group" aria-label="Choose a day">
        {week.map((k, i) => (
          <button
            key={k}
            type="button"
            className={`day${k === today ? ' is-today' : ''}`}
            aria-pressed={k === selected}
            disabled={k > today}
            onClick={() => setSelected(k)}
          >
            <span className="letter">{DAY_LETTERS[i]}</span>
            <span className="num">{Number(k.slice(8))}</span>
          </button>
        ))}
      </div>

      <div className="chips" role="group" aria-label="Filter by category">
        {[{ key: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
          <button key={c.key} type="button" className="chip" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="stat stat-blue">
          <span className="stat-label">Done today</span>
          <span className="stat-value">{doneCount} / {dailyVisible.length}</span>
        </div>
        <div className="stat stat-dark">
          <span className="stat-label">Weekly goals</span>
          <span className="stat-value">{weeklyMet} / {weekly.length}</span>
        </div>
        <div className="stat">
          <span className="stat-icon"><BoltIcon /></span>
          <span className="stat-label">Best streak</span>
          <span className="stat-value">{bestStreak}</span>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {habits === null ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p><strong>No habits yet</strong></p>
          <p className="muted">Tap the + button to add your first one.</p>
        </div>
      ) : (
        <ul className="habit-list">
          {visible.map(({ habit, done, stats }) => {
            const isDone = done.has(selected);
            const linked = habit.linkedWorkout;
            const numeric = Boolean(habit.target) && !linked;
            const value = valueByKey.get(`${habit.id}_${selected}`) ?? 0;
            return (
              <li key={habit.id} className={`habit-row${isDone && !linked ? ' is-done' : ''}`}>
                {linked ? (
                  <span className="ring-wrap">
                    <ProgressRing percent={stats.percent} />
                  </span>
                ) : numeric ? (
                  <span className="ring-wrap">
                    <ProgressRing percent={Math.min(100, Math.round((value / habit.target.amount) * 100))} />
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`check-box${isDone ? ' on' : ''}`}
                    aria-pressed={isDone}
                    aria-label={`${isDone ? 'Uncheck' : 'Check'} ${habit.name}`}
                    onClick={() => toggle(habit, done)}
                  >
                    {isDone && <CheckIcon />}
                  </button>
                )}
                <Link to={`/habit/${habit.id}/edit`} className="habit-main">
                  <span className="habit-name"><HabitIcon name={habit.icon} size={18} /> {habit.name}</span>
                  <span className="habit-sub">
                    {stats.kind === 'weekly'
                      ? `${stats.count} of ${stats.target} sessions this week${stats.met ? ' · full score' : ''}`
                      : numeric
                        ? `${value} / ${habit.target.amount} ${habit.target.unit}`.trim()
                        : frequencyLabel(habit)}
                    {stats.streak > 0 && ` · streak ${stats.streak}`}
                  </span>
                </Link>
                {numeric ? (
                  <span className="value-ctl">
                    <button type="button" className="icon-btn" aria-label={`Decrease ${habit.name}`} disabled={value <= 0} onClick={() => bump(habit, -1)}>−</button>
                    <button type="button" className="icon-btn" aria-label={`Increase ${habit.name}`} onClick={() => bump(habit, 1)}>+</button>
                  </span>
                ) : (
                  <span className="badge">{linked ? 'Workout' : frequencyLabel(habit)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link to="/habit/new" className="fab" aria-label="Add habit"><PlusIcon /></Link>
    </main>
  );
}