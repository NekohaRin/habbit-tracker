import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteHabit, fetchHabit, saveHabit, setHabitArchived } from '../services/habits';
import { settleWithin } from '../lib/async';
import { DAY_SHORT, todayKey } from '../lib/dates';
import { emptyForm, formToHabit, habitToForm, NAME_MAX, NOTE_MAX, validateForm } from '../lib/habitForm';
import { CATEGORIES, CATEGORY_KEYS, ICON_KEYS, ICON_LABELS } from '../constants';
import { CloseIcon, HabitIcon } from '../components/Icons';
import Switch from '../components/Switch';

export default function HabitForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user, tz } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => emptyForm(todayKey(tz)));
  const [loaded, setLoaded] = useState(!editing);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!editing) return;
    fetchHabit(user.uid, id)
      .then((h) => {
        if (!h) return navigate('/habits', { replace: true });
        setForm(habitToForm(h));
        setLoaded(true);
      })
      .catch(() => setMessage('Could not load the habit.'));
  }, [editing, id, user.uid, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleDay = (d) =>
    set({ days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] });
  const bump = (n) => set({ timesPerWeek: Math.min(7, Math.max(1, Number(form.timesPerWeek) + n)) });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateForm(form, { iconKeys: ICON_KEYS, categoryKeys: CATEGORY_KEYS });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setMessage('');
    try {
      await settleWithin(saveHabit(user.uid, formToHabit(form), id), 1500);
      navigate('/habits');
    } catch {
      setMessage('Could not save. Please try again.');
      setSaving(false);
    }
  };

  const archive = async () => {
    await settleWithin(setHabitArchived(user.uid, id, true), 1500);
    navigate('/habits');
  };
  const remove = async () => {
    if (!window.confirm('Delete this habit and all its history? This cannot be undone.')) return;
    try {
      await deleteHabit(user.uid, id);
      navigate('/habits');
    } catch {
      setMessage('Delete failed. Try again when you are online.');
    }
  };

  if (!loaded) return <div className="splash">{message || 'Loading…'}</div>;

  const linked = form.linkedWorkout;
  const showWeekly = linked || form.freqType === 'weekly';

  return (
    <form className="screen screen-form" onSubmit={submit} noValidate>
      <header className="form-header">
        <button type="button" className="icon-btn" aria-label="Close" onClick={() => navigate(-1)}><CloseIcon /></button>
        <h1>{editing ? <>Edit <em>habit</em></> : <>New <em>habit</em></>}</h1>
      </header>

      <label className="label" htmlFor="name">Name</label>
      <input
        id="name"
        className={`input${errors.name ? ' invalid' : ''}`}
        value={form.name}
        maxLength={NAME_MAX}
        placeholder="e.g. Drink 8 glasses of water"
        onChange={(e) => set({ name: e.target.value })}
      />
      {errors.name && <p className="field-error">{errors.name}</p>}

      <span className="label">Icon</span>
      <div className="icon-grid">
        {ICON_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className="icon-choice"
            aria-pressed={form.icon === k}
            aria-label={ICON_LABELS[k]}
            onClick={() => set({ icon: k })}
          >
            <HabitIcon name={k} />
          </button>
        ))}
      </div>

      <span className="label">Category</span>
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button" className="chip" aria-pressed={form.category === c.key} onClick={() => set({ category: c.key })}>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="switch-row">
        <div>
          <strong>Link to workouts</strong>
          <small>Full score automatically when this week's workout sessions reach your goal. Any days you like.</small>
        </div>
        <Switch checked={linked} onChange={(v) => set({ linkedWorkout: v, freqType: v ? 'weekly' : form.freqType })} label="Link to workouts" />
      </div>

      {!linked && (
        <>
          <span className="label">Frequency</span>
          <div className="segmented" role="group" aria-label="Frequency">
            {[['daily', 'Daily'], ['days', 'Specific days'], ['weekly', 'Per week']].map(([k, label]) => (
              <button key={k} type="button" aria-pressed={form.freqType === k} onClick={() => set({ freqType: k })}>{label}</button>
            ))}
          </div>
        </>
      )}

      {!linked && form.freqType === 'days' && (
        <>
          <div className="day-picker" role="group" aria-label="Days">
            {DAY_SHORT.map((d, i) => (
              <button key={d} type="button" className="day-dot" aria-pressed={form.days.includes(i + 1)} onClick={() => toggleDay(i + 1)}>{d}</button>
            ))}
          </div>
          {errors.days && <p className="field-error">{errors.days}</p>}
        </>
      )}

      {showWeekly && (
        <>
          <span className="label">Goal per week</span>
          <div className="stepper">
            <button type="button" aria-label="Decrease" onClick={() => bump(-1)}>−</button>
            <output>{form.timesPerWeek}x</output>
            <button type="button" aria-label="Increase" onClick={() => bump(1)}>+</button>
          </div>
          {linked && <p className="fine">2–3 times is recommended. Reaching the goal = full score; going beyond adds nothing.</p>}
        </>
      )}

      {!linked && (
        <>
          <label className="check-row">
            <input type="checkbox" checked={form.useTarget} onChange={(e) => set({ useTarget: e.target.checked })} />
            <span>Use a numeric target</span>
          </label>
          {form.useTarget && (
            <div className="target-row">
              <input className={`input${errors.amount ? ' invalid' : ''}`} type="number" inputMode="decimal" min="0" value={form.amount} aria-label="Amount" onChange={(e) => set({ amount: e.target.value })} />
              <input className={`input${errors.unit ? ' invalid' : ''}`} value={form.unit} maxLength={12} placeholder="glasses" aria-label="Unit" onChange={(e) => set({ unit: e.target.value })} />
            </div>
          )}
          {(errors.amount || errors.unit) && <p className="field-error">{errors.amount || errors.unit}</p>}
        </>
      )}

      <label className="label" htmlFor="start">Start date</label>
      <input id="start" className={`input${errors.startDate ? ' invalid' : ''}`} type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
      {errors.startDate && <p className="field-error">{errors.startDate}</p>}

      <label className="label" htmlFor="note">Note (optional)</label>
      <textarea id="note" className="textarea" rows={3} maxLength={NOTE_MAX} value={form.note} onChange={(e) => set({ note: e.target.value })} />
      <span className="counter">{form.note.length}/{NOTE_MAX}</span>

      {message && <p className="error" role="alert">{message}</p>}

      {editing && (
        <div className="row-between">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/habit/${id}/stats`)}>History</button>
          <button type="button" className="btn btn-ghost" onClick={archive}>Archive</button>
          <button type="button" className="btn btn-danger" onClick={remove}>Delete</button>
        </div>
      )}

      <div className="form-footer">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}