import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeHabits, subscribeHabitLogs } from '../services/habits';
import { subscribeSessions } from '../services/workouts';
import { subscribeBodyParts, subscribeBodyWeights, subscribeMeasurements } from '../services/body';
import { exportAllData } from '../services/account';
import { addDays, formatDate, formatLongDate, todayKey } from '../lib/dates';
import { computeHabitStats, frequencyLabel, isScheduledOn } from '../lib/habitStats';
import { completionRate, dailyCompletion } from '../lib/dashboardStats';
import { latestChange, movingAverage } from '../lib/bodyStats';
import { buildHeatmap } from '../lib/heatmap';
import { weeklyEvaluation } from '../lib/workoutStats';
import { cmToDisplay, kgToDisplay, lengthUnitLabel, weightUnitLabel } from '../lib/units';
import { buildCsvFiles } from '../lib/csv';
import { downloadText } from '../lib/download';
import { LOG_WINDOW_DAYS } from '../constants';
import LineChart from '../components/LineChart';
import { BoltIcon, CheckIcon, HabitIcon, PlusIcon } from '../components/Icons';

const signed = (n) => (n == null ? '–' : `${n > 0 ? '+' : ''}${n}`);
const WEEKDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const weekdayIndex = (key) => (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Grafik batang: penuh = semua selesai (biru), sebagian = bergaris, kosong = batang kecil abu. */
function CompletionBars({ rows }) {
  const W = 480;
  const H = 150;
  const pad = { l: 28, r: 6, t: 14, b: 22 };
  const n = rows.length;
  const slot = (W - pad.l - pad.r) / n;
  const bw = Math.min(34, slot * 0.62);
  const ch = H - pad.t - pad.b;
  const label = (r, i) => (n <= 7 ? WEEKDAY[weekdayIndex(r.date)] : i % 5 === 0 || i === n - 1 ? r.date.slice(8) : '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Share of scheduled habits done per day, last ${n} days`}>
      <defs>
        <pattern id="stripe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#e8eeff" />
          <rect width="3" height="6" fill="#2563eb" />
        </pattern>
      </defs>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ch * (1 - v / 100)} y2={pad.t + ch * (1 - v / 100)} stroke="#e3e8f4" strokeDasharray="3 4" />
          <text x={pad.l - 6} y={pad.t + ch * (1 - v / 100) + 3} fontSize="9" textAnchor="end" fill="#5b6070">{v}%</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const x = pad.l + i * slot + (slot - bw) / 2;
        const h = r.percent == null ? 0 : (r.percent / 100) * ch;
        const full = r.percent === 100;
        return (
          <g key={r.date}>
            <title>{`${formatDate(r.date)}: ${r.scheduled ? `${r.done} of ${r.scheduled} done` : 'nothing scheduled'}`}</title>
            <rect x={x} y={pad.t + ch - Math.max(h, 6)} width={bw} height={Math.max(h, 6)} rx={Math.min(10, bw / 2)} fill={full ? '#2563eb' : r.percent > 0 ? 'url(#stripe)' : '#e3e8f4'} />
            <text x={x + bw / 2} y={H - 6} fontSize="9" textAnchor="middle" fill="#5b6070">{label(r, i)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { user, tz, profile } = useAuth();
  const unit = profile?.settings?.unit ?? 'metric';
  const today = todayKey(tz);
  const windowStart = addDays(today, -LOG_WINDOW_DAYS);
  const bodyFrom = addDays(today, -365);

  const [habits, setHabits] = useState(null);
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [parts, setParts] = useState([]);
  const [weights, setWeights] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [error, setError] = useState('');
  const [range, setRange] = useState(30);
  const [barRange, setBarRange] = useState(7);

  useEffect(() => {
    const onErr = () => setError('Could not load the dashboard. Check your connection and reload.');
    const stops = [
      subscribeHabits(user.uid, setHabits, onErr),
      subscribeHabitLogs(user.uid, windowStart, setLogs, onErr),
      subscribeSessions(user.uid, windowStart, setSessions, onErr),
      subscribeBodyParts(user.uid, setParts, onErr),
      subscribeBodyWeights(user.uid, bodyFrom, setWeights, onErr),
      subscribeMeasurements(user.uid, bodyFrom, setMeasures, onErr),
    ];
    return () => stops.forEach((s) => s());
  }, [user.uid, windowStart, bodyFrom]);

  const workoutDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const valueByKey = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => typeof l.value === 'number' && map.set(`${l.habitId}_${l.date}`, l.value));
    return map;
  }, [logs]);

  const entries = useMemo(() => {
    const doneBy = new Map();
    logs.forEach((l) => {
      if (l.done) (doneBy.get(l.habitId) ?? doneBy.set(l.habitId, new Set()).get(l.habitId)).add(l.date);
    });
    return (habits ?? [])
      .filter((h) => !h.archived)
      .map((habit) => {
        const done = doneBy.get(habit.id) ?? new Set();
        return { habit, done, stats: computeHabitStats(habit, { doneDates: done, workoutDates, today, windowStart }) };
      });
  }, [habits, logs, workoutDates, today, windowStart]);

  const rows = useMemo(
    () => entries.map((e) => ({ ...e, rate: completionRate(e.habit, e.done, today, range) })),
    [entries, today, range],
  );
  const bars = useMemo(() => dailyCompletion(entries, today, barRange), [entries, today, barRange]);
  const evaluation = useMemo(() => weeklyEvaluation(sessions, today), [sessions, today]);
  const dots = useMemo(
    () => buildHeatmap({ startDate: windowStart, frequency: { type: 'weekly', timesPerWeek: 1 } }, workoutDates, today, 13),
    [workoutDates, today, windowStart],
  );

  const goals = entries.filter(({ habit }) => habit.frequency.type === 'weekly' || isScheduledOn(habit, today));
  const scheduledToday = goals.filter(({ habit }) => habit.frequency.type !== 'weekly');
  const doneToday = scheduledToday.filter(({ done }) => done.has(today)).length;
  const bestStreak = entries.reduce((m, { stats }) => Math.max(m, stats.streak ?? 0), 0);
  const totals = rows.reduce(
    (t, { rate }) => (rate ? { done: t.done + rate.done, scheduled: t.scheduled + rate.scheduled } : t),
    { done: 0, scheduled: 0 },
  );
  const overall = totals.scheduled ? Math.round((totals.done / totals.scheduled) * 100) : null;

  const wLabel = weightUnitLabel(unit);
  const lLabel = lengthUnitLabel(unit);
  const wPts = weights.map((w) => ({ date: w.date, value: kgToDisplay(w.valueKg, unit) }));
  const wChange = latestChange(wPts);
  const partRows = parts
    .filter((p) => p.active)
    .map((p) => {
      const pts = measures.filter((m) => m.bodyPartId === p.id).map((m) => ({ date: m.date, value: cmToDisplay(m.valueCm, unit) }));
      return { part: p, change: latestChange(pts) };
    });

  const up = evaluation.find((r) => r.trend === 'up');
  const trainedDays = new Set(sessions.filter((s) => s.date >= addDays(today, -6)).map((s) => s.date)).size;
  const tip = up
    ? `${up.name} is up compared with last week. Keep the same pace.`
    : trainedDays >= 2
      ? 'You hit 2 or more training days this week. That already counts as a full score.'
      : 'Two to three workouts a week is enough for a full score. Any days you like.';

  const exportCsv = async () => {
    setError('');
    try {
      const data = await exportAllData(user.uid);
      buildCsvFiles(data.collections).forEach((f) => downloadText(f.name, f.text));
    } catch {
      setError('CSV export failed. Try again when you are online.');
    }
  };

  if (habits === null) return <main className="screen"><p className="muted">Loading…</p></main>;

  return (
    <main className="screen dash dash2">
      <header className="header-row">
        <div>
          <h1 className="display">Overview <small className="muted">(Habit &amp; workout records)</small></h1>
          <p className="muted">{formatLongDate(today)}</p>
        </div>
        <button type="button" className="btn btn-dark" onClick={exportCsv}>Export CSV</button>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="dash-layout">
        <section className="d-card d-bars" aria-labelledby="d-bars-t">
          <div className="d-head">
            <h2 id="d-bars-t">Habit completion</h2>
            <div className="pills" role="group" aria-label="Range">
              <button type="button" aria-pressed={barRange === 7} onClick={() => setBarRange(7)}>Weekly</button>
              <button type="button" aria-pressed={barRange === 30} onClick={() => setBarRange(30)}>Monthly</button>
            </div>
          </div>
          {entries.length === 0 ? <p className="muted">Add a habit to see your completion trend.</p> : <CompletionBars rows={bars} />}
          <p className="fine">Solid bar = all scheduled habits done. Striped = partly done.</p>
        </section>

        <section className="d-card d-goals" aria-labelledby="d-goals-t">
          <div className="d-head">
            <h2 id="d-goals-t">Daily goals</h2>
            <span className="badge">{doneToday} / {scheduledToday.length} done</span>
          </div>
          <div className="goal-grid">
            {goals.slice(0, 6).map(({ habit, done, stats }) => {
              const numeric = Boolean(habit.target) && !habit.linkedWorkout;
              const val = valueByKey.get(`${habit.id}_${today}`) ?? 0;
              const meta = stats.kind === 'weekly' ? `${stats.count}/${stats.target} this week` : numeric ? `${val}/${habit.target.amount} ${habit.target.unit}`.trim() : done.has(today) ? 'Done' : 'To do';
              const complete = stats.kind === 'weekly' ? stats.met : done.has(today);
              return (
                <Link key={habit.id} to={`/habit/${habit.id}/stats`} className={`goal-chip${complete ? ' is-done' : ''}`}>
                  <span className="goal-icon">{complete ? <CheckIcon size={14} /> : <HabitIcon name={habit.icon} size={16} />}</span>
                  <span><strong>{habit.name}</strong><small>{meta}</small></span>
                </Link>
              );
            })}
            <Link to="/habit/new" className="btn btn-primary goal-add"><PlusIcon size={16} /> Add habit</Link>
          </div>
          {goals.length > 6 && <p className="fine">Showing 6 of {goals.length}. Open Habit for the full list.</p>}
        </section>

        <aside className="d-side">
          <section className="d-card" aria-labelledby="d-recent-t">
            <div className="d-head">
              <h2 id="d-recent-t">Recent workouts</h2>
              <Link to="/workout/new" className="pill-link">Log</Link>
            </div>
            {sessions.length === 0 ? (
              <p className="muted">No workouts logged yet.</p>
            ) : (
              <div className="session-list">
                {sessions.slice(0, 4).map((s) => (
                  <Link key={s.id} to={`/workout/${s.id}/edit`} className="session-row">
                    <span>
                      <strong>{formatDate(s.date)}</strong>
                      <small>{s.entries.map((e) => `${e.exerciseName} ${e.sets}×${e.reps}`).join(', ')}</small>
                    </span>
                    <span className="session-meta">{s.durationMin ? `${s.durationMin} min` : `${s.entries.length} ex.`}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="d-card tip-card" aria-labelledby="d-tip-t">
            <div className="d-head">
              <h2 id="d-tip-t">Weekly highlight</h2>
              <Link to="/workout" className="pill-link pill-light">Open</Link>
            </div>
            <p>{tip}</p>
            <p className="tip-foot"><BoltIcon size={14} /> Best streak {bestStreak}</p>
          </section>
        </aside>

        <section className="d-card d-recap" aria-labelledby="d-recap-t">
          <div className="d-head">
            <h2 id="d-recap-t">Habit recap</h2>
            <div className="pills" role="group" aria-label="Date range">
              {[7, 30, 90].map((n) => (
                <button key={n} type="button" aria-pressed={range === n} onClick={() => setRange(n)}>{n}d</button>
              ))}
            </div>
          </div>
          <div className="recap-bar" role="img" aria-label={overall == null ? 'No data yet' : `${overall}% of scheduled habits done in the last ${range} days`}>
            <span style={{ width: `${overall ?? 0}%` }} />
          </div>
          <p className="fine">{overall == null ? 'No scheduled habits in this range yet.' : `${overall}% of scheduled habits done in the last ${range} days.`}</p>
          {rows.length === 0 ? (
            <p className="muted">No habits yet.</p>
          ) : (
            <div className="recap-list">
              {rows.map(({ habit, stats, rate }) => {
                const pct = stats.kind === 'weekly' ? stats.percent : rate?.percent;
                return (
                  <div key={habit.id} className="recap-row">
                    <span className="goal-icon"><HabitIcon name={habit.icon} size={16} /></span>
                    <Link to={`/habit/${habit.id}/stats`} className="recap-name">
                      <strong>{habit.name}</strong>
                      <small>{habit.linkedWorkout ? 'Linked to workouts' : frequencyLabel(habit)}{stats.streak > 0 ? ` · streak ${stats.streak}` : ''}</small>
                    </Link>
                    <span className="recap-count">{stats.kind === 'weekly' ? `${stats.count}/${stats.target} this week` : rate ? `${rate.done}/${rate.scheduled} days` : '–'}</span>
                    <span className="recap-pct">{pct == null ? '–' : `${pct}%`}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="d-card d-weight" aria-labelledby="d-weight-t">
          <div className="d-head">
            <h2 id="d-weight-t">Body weight</h2>
            <Link to="/workout" className="pill-link">Details</Link>
          </div>
          <LineChart area unitLabel={wLabel} series={[{ name: 'Weight', points: wPts }, { name: '7-day average', points: movingAverage(wPts, 7), dashed: true }]} />
          <p className="fine"><strong>{wChange ? `${wChange.latest.value} ${wLabel}` : '–'}</strong> · change vs previous {signed(wChange?.delta)} {wLabel}</p>
        </section>

        <section className="d-card d-dots" aria-labelledby="d-dots-t">
          <div className="d-head">
            <h2 id="d-dots-t">Training consistency</h2>
          </div>
          <div className="dots" role="img" aria-label="Training days in the last 13 weeks">
            {dots.flat().map((c) => (
              <span key={c.date} className={`dot dot-${c.state === 'done' ? 'on' : c.state === 'future' || c.state === 'before' ? 'none' : 'off'}`} title={`${formatDate(c.date)}${c.state === 'done' ? ': trained' : ''}`} />
            ))}
          </div>
          <p className="fine">Each column is a week, newest on the right. A filled dot is a day with a workout.</p>
        </section>

        <section className="d-card d-meas" aria-labelledby="d-meas-t">
          <div className="d-head">
            <h2 id="d-meas-t">Body measurements</h2>
            <Link to="/workout" className="pill-link">Details</Link>
          </div>
          {partRows.length === 0 ? (
            <p className="muted">No body parts yet.</p>
          ) : (
            <div className="session-list">
              {partRows.map(({ part, change }) => (
                <div key={part.id} className="session-row">
                  <span>
                    <strong>{part.name}</strong>
                    <small>{change ? `${change.latest.value} ${lLabel} · ${formatDate(change.latest.date)}` : 'No data yet'}</small>
                  </span>
                  <span className="session-meta">{change ? signed(change.delta) : '–'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}