/** Grafik garis kecil (SVG). `series`: [{ name, points:[{date,value}], dashed? }]. Tanpa pustaka tambahan. */
export default function LineChart({ series, unitLabel, height = 140, area = false }) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) {
    return <p className="muted">Add at least two entries to see a trend.</p>;
  }
  const W = 320;
  const H = height;
  const pad = { l: 36, r: 8, t: 8, b: 20 };
  const dates = [...new Set(all.map((p) => p.date))].sort();
  const t0 = Date.parse(dates[0]);
  const t1 = Date.parse(dates[dates.length - 1]);
  const vals = all.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const x = (d) => pad.l + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const colors = ['#2563eb', '#0b0b0f'];
  const desc = series.map((s) => `${s.name}: ${s.points.length} points`).join('; ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Trend chart in ${unitLabel}. ${desc}`}>
      <line x1={pad.l} x2={W - pad.r} y1={y(lo)} y2={y(lo)} stroke="#e3e8f4" />
      <line x1={pad.l} x2={W - pad.r} y1={y(hi)} y2={y(hi)} stroke="#e3e8f4" />
      <text x={pad.l - 4} y={y(hi) + 4} fontSize="10" textAnchor="end" fill="#5b6070">{Math.round(hi * 10) / 10}</text>
      <text x={pad.l - 4} y={y(lo) + 4} fontSize="10" textAnchor="end" fill="#5b6070">{Math.round(lo * 10) / 10}</text>
      <text x={pad.l} y={H - 4} fontSize="10" fill="#5b6070">{dates[0].slice(5)}</text>
      <text x={W - pad.r} y={H - 4} fontSize="10" textAnchor="end" fill="#5b6070">{dates[dates.length - 1].slice(5)}</text>
      {area && (() => {
        const main = [...series[0].points].sort((a, b) => (a.date < b.date ? -1 : 1));
        if (main.length < 2) return null;
        const base = y(lo);
        const pts = main.map((p) => `${x(p.date)},${y(p.value)}`).join(' ');
        return <polygon points={`${x(main[0].date)},${base} ${pts} ${x(main[main.length - 1].date)},${base}`} fill="#e8eeff" />;
      })()}
      {series.map((s, i) => {
        const pts = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1));
        return (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={s.dashed ? 2 : 1.5}
              strokeDasharray={s.dashed ? '5 3' : undefined}
              strokeLinejoin="round"
              points={pts.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')}
            />
            {!s.dashed && pts.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r="2.5" fill={colors[i % colors.length]} />)}
          </g>
        );
      })}
    </svg>
  );
}