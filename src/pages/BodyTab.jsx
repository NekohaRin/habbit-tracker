import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  addBodyPart,
  deleteBodyWeight,
  saveBodyWeight,
  saveMeasurement,
  subscribeBodyParts,
  subscribeBodyWeights,
  subscribeMeasurements,
  updateBodyPart,
} from '../services/body';
import { settleWithin } from '../lib/async';
import { addDays, formatDate, todayKey } from '../lib/dates';
import { compareDates, latestChange, movingAverage } from '../lib/bodyStats';
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay, lengthUnitLabel, weightUnitLabel } from '../lib/units';
import LineChart from '../components/LineChart';

const WINDOW_DAYS = 365;
const signed = (n) => (n == null ? '–' : `${n > 0 ? '+' : ''}${n}`);

export default function BodyTab() {
  const { user, tz, profile } = useAuth();
  const unit = profile?.settings?.unit ?? 'metric';
  const wLabel = weightUnitLabel(unit);
  const lLabel = lengthUnitLabel(unit);
  const today = todayKey(tz);
  const from = addDays(today, -WINDOW_DAYS);

  const [parts, setParts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [weights, setWeights] = useState(null);
  const [error, setError] = useState('');

  const [wDate, setWDate] = useState(today);
  const [wValue, setWValue] = useState('');
  const [mPart, setMPart] = useState('');
  const [mDate, setMDate] = useState(today);
  const [mValue, setMValue] = useState('');
  const [chartPart, setChartPart] = useState('');
  const [cmpA, setCmpA] = useState(addDays(today, -30));
  const [cmpB, setCmpB] = useState(today);
  const [newPart, setNewPart] = useState('');

  useEffect(() => {
    const onErr = () => setError('Could not load body data. Check your connection and reload.');
    const stops = [
      subscribeBodyParts(user.uid, setParts, onErr),
      subscribeMeasurements(user.uid, from, setMeasurements, onErr),
      subscribeBodyWeights(user.uid, from, setWeights, onErr),
    ];
    return () => stops.forEach((s) => s());
  }, [user.uid, from]);

  const activeParts = parts.filter((p) => p.active);
  useEffect(() => {
    if (!mPart && activeParts[0]) setMPart(activeParts[0].id);
    if (!chartPart && activeParts[0]) setChartPart(activeParts[0].id);
  }, [activeParts, mPart, chartPart]);

  const weightPts = useMemo(
    () => (weights ?? []).map((w) => ({ date: w.date, value: w.valueKg })),
    [weights],
  );
  const byPart = useMemo(() => {
    const map = {};
    measurements.forEach((m) => (map[m.bodyPartId] ??= []).push({ date: m.date, value: m.valueCm }));
    return map;
  }, [measurements]);

  const show = (pts, conv) => pts.map((p) => ({ date: p.date, value: conv(p.value) }));
  const wDisplay = show(weightPts, (v) => kgToDisplay(v, unit));
  const wAvg = movingAverage(wDisplay, 7);
  const wChange = latestChange(wDisplay);
  const partPts = show(byPart[chartPart] ?? [], (v) => cmToDisplay(v, unit));
  const fail = (msg) => () => setError(msg);

  const submitWeight = async (e) => {
    e.preventDefault();
    const kg = displayToKg(wValue, unit);
    if (kg == null || kg > 700) return setError('Enter a valid body weight.');
    if (wDate > today) return setError('The date cannot be in the future.');
    setError('');
    try {
      await settleWithin(saveBodyWeight(user.uid, wDate, kg), 1500);
      setWValue('');
    } catch (err) {
      fail('Could not save body weight.')(err);
    }
  };

  const submitMeasurement = async (e) => {
    e.preventDefault();
    const cm = displayToCm(mValue, unit);
    if (!mPart) return setError('Choose a body part first.');
    if (cm == null || cm > 500) return setError('Enter a valid measurement.');
    if (mDate > today) return setError('The date cannot be in the future.');
    setError('');
    try {
      await settleWithin(saveMeasurement(user.uid, mPart, mDate, cm), 1500);
      setMValue('');
    } catch (err) {
      fail('Could not save the measurement.')(err);
    }
  };

  const submitPart = async (e) => {
    e.preventDefault();
    const name = newPart.trim();
    if (!name) return;
    try {
      await addBodyPart(user.uid, name.slice(0, 30));
      setNewPart('');
    } catch (err) {
      fail('Could not add the body part.')(err);
    }
  };

  const rename = (p) => {
    const name = window.prompt('Rename body part', p.name);
    if (name && name.trim()) updateBodyPart(user.uid, p.id, { name: name.trim().slice(0, 30) }).catch(fail('Could not rename.'));
  };

  const rows = compareDates(
    activeParts,
    Object.fromEntries(Object.entries(byPart).map(([k, v]) => [k, show(v, (x) => cmToDisplay(x, unit))])),
    cmpA,
    cmpB,
  );

  if (weights === null) return <p className="muted">Loading…</p>;

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}

      <h2 className="section-title">Body weight</h2>
      <div className="stats">
        <div className="stat stat-blue">
          <span className="stat-label">Latest ({wLabel})</span>
          <span className="stat-value">{wChange ? wChange.latest.value : '–'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Change vs previous</span>
          <span className="stat-value">{signed(wChange?.delta)}</span>
        </div>
      </div>
      <LineChart
        unitLabel={wLabel}
        series={[
          { name: 'Weight', points: wDisplay },
          { name: '7-day average', points: wAvg, dashed: true },
        ]}
      />
      <form className="target-row" onSubmit={submitWeight}>
        <input className="input" type="date" max={today} value={wDate} aria-label="Date" onChange={(e) => setWDate(e.target.value)} />
        <input className="input" type="number" inputMode="decimal" step="0.1" min="0" placeholder={wLabel} value={wValue} aria-label={`Weight (${wLabel})`} onChange={(e) => setWValue(e.target.value)} />
        <button type="submit" className="btn btn-dark">Save</button>
      </form>
      {(weights ?? []).length > 0 && (
        <div className="list">
          {[...weights].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5).map((w) => (
            <div key={w.id} className="list-row">
              <div><strong>{kgToDisplay(w.valueKg, unit)} {wLabel}</strong><small>{formatDate(w.date)}</small></div>
              <button type="button" className="btn btn-ghost" onClick={() => deleteBodyWeight(user.uid, w.date).catch(fail('Could not delete.'))}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">Measurements</h2>
      {activeParts.length === 0 ? (
        <div className="empty"><p className="muted">Add a body part below to start measuring.</p></div>
      ) : (
        <>
          <form className="target-row" onSubmit={submitMeasurement}>
            <select className="input" aria-label="Body part" value={mPart} onChange={(e) => setMPart(e.target.value)}>
              {activeParts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input className="input" type="number" inputMode="decimal" step="0.1" min="0" placeholder={lLabel} value={mValue} aria-label={`Measurement (${lLabel})`} onChange={(e) => setMValue(e.target.value)} />
          </form>
          <form className="target-row" onSubmit={submitMeasurement}>
            <input className="input" type="date" max={today} value={mDate} aria-label="Date" onChange={(e) => setMDate(e.target.value)} />
            <button type="submit" className="btn btn-dark">Save</button>
          </form>

          <div className="list">
            {activeParts.map((p) => {
              const ch = latestChange(show(byPart[p.id] ?? [], (v) => cmToDisplay(v, unit)));
              return (
                <button key={p.id} type="button" className="list-row" onClick={() => setChartPart(p.id)} aria-pressed={chartPart === p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{ch ? `${ch.latest.value} ${lLabel} · ${formatDate(ch.latest.date)}` : 'No data yet'}</small>
                  </div>
                  <span className="badge">{ch ? signed(ch.delta) : '–'}</span>
                </button>
              );
            })}
          </div>
          <LineChart unitLabel={lLabel} series={[{ name: parts.find((p) => p.id === chartPart)?.name ?? 'Measurement', points: partPts }]} />
        </>
      )}

      <h2 className="section-title">Compare two dates</h2>
      <div className="target-row">
        <input className="input" type="date" max={today} value={cmpA} aria-label="From date" onChange={(e) => setCmpA(e.target.value)} />
        <input className="input" type="date" max={today} value={cmpB} aria-label="To date" onChange={(e) => setCmpB(e.target.value)} />
      </div>
      {activeParts.length > 0 && (
        <div className="list">
          {rows.map((r) => (
            <div key={r.partId} className="list-row">
              <div><strong>{r.name}</strong><small>{r.a ?? '–'} → {r.b ?? '–'} {lLabel}</small></div>
              <span className="badge">{signed(r.delta)}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title">My body parts</h2>
      <form className="target-row" onSubmit={submitPart}>
        <input className="input" value={newPart} maxLength={30} placeholder="e.g. Shoulders" aria-label="New body part" onChange={(e) => setNewPart(e.target.value)} />
        <button type="submit" className="btn btn-dark">Add</button>
      </form>
      <div className="list">
        {parts.map((p) => (
          <div key={p.id} className="list-row">
            <strong style={p.active ? undefined : { opacity: 0.5 }}>{p.name}</strong>
            <span>
              <button type="button" className="btn btn-ghost" onClick={() => rename(p)}>Rename</button>
              <button type="button" className="btn btn-ghost" onClick={() => updateBodyPart(user.uid, p.id, { active: !p.active }).catch(fail('Could not update.'))}>{p.active ? 'Hide' : 'Show'}</button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}