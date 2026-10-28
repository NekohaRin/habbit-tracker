import { ICON_PATHS } from '../constants';

const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

function Svg({ size = 24, viewBox = '0 0 24 24', strokeWidth = 2, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      {...line}
    >
      {children}
    </svg>
  );
}

/** Ikon kebiasaan (6 pilihan, lihat ICON_KEYS di constants.js). */
export function HabitIcon({ name, size = 22 }) {
  return (
    <Svg size={size}>
      <path d={ICON_PATHS[name] ?? ICON_PATHS.dots} />
    </Svg>
  );
}

export const CheckIcon = ({ size = 16 }) => (
  <Svg size={size} viewBox="0 0 16 16" strokeWidth={2.4}>
    <path d="M3 8.5l3.2 3L13 4.5" />
  </Svg>
);

export const PlusIcon = ({ size = 24 }) => (
  <Svg size={size} strokeWidth={2.4}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CloseIcon = ({ size = 18 }) => (
  <Svg size={size} strokeWidth={2.4}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const CalendarIcon = ({ size = 20 }) => (
  <Svg size={size}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
);

export const BoltIcon = ({ size = 16 }) => (
  <Svg size={size} strokeWidth={2.2}>
    <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
  </Svg>
);

export const DumbbellIcon = ({ size = 22 }) => (
  <Svg size={size}>
    <path d="M3 12h18" />
    <rect x="5" y="8" width="3" height="8" rx="1" />
    <rect x="16" y="8" width="3" height="8" rx="1" />
  </Svg>
);

export const CheckCircleIcon = ({ size = 22 }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l3 3 5-6" />
  </Svg>
);

export const SlidersIcon = ({ size = 22 }) => (
  <Svg size={size}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
);

export const GridIcon = ({ size = 22 }) => (
  <Svg size={size}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </Svg>
);

export const LogoMark = ({ size = 44 }) => <CheckCircleIcon size={size} />;

/** Cincin progres 0..100 untuk kebiasaan tertaut workout. */
export function ProgressRing({ percent, size = 30 }) {
  const r = 12;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true" focusable="false">
      <circle cx="15" cy="15" r={r} stroke="#cfdbff" strokeWidth="4" />
      <circle
        cx="15"
        cy="15"
        r={r}
        stroke="#2563eb"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 15 15)"
      />
    </svg>
  );
}