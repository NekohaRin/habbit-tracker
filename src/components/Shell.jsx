import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useWide from '../lib/useWide';
import { CheckCircleIcon, DumbbellIcon, GridIcon, LogoMark, SlidersIcon } from './Icons';

const tabClass = ({ isActive }) => `tab${isActive ? ' active' : ''}`;

/**
 * Kerangka dengan menu. Satu aplikasi, dua tampilan:
 * - HP / layar sempit: tiga menu di bawah (Habit, Workout & Body, Settings).
 * - PC / layar lebar: menu pil di bagian atas panel, Dashboard sebagai halaman utama.
 */
export default function Shell() {
  const wide = useWide();
  const { user } = useAuth();
  return (
    <>
      <div className="brand wide-only" aria-hidden="true">
        <span className="brand-mark"><LogoMark size={26} /></span>
        <span>Habit &amp; Workout</span>
      </div>
      <Outlet />
      <nav className="tabbar" aria-label="Main menu">
        {wide && (
          <NavLink to="/" end className={tabClass}>
            <GridIcon />
            Dashboard
          </NavLink>
        )}
        <NavLink to="/habits" className={tabClass}>
          <CheckCircleIcon />
          Habit
        </NavLink>
        <NavLink to="/workout" className={tabClass}>
          <DumbbellIcon />
          Workout &amp; Body
        </NavLink>
        <NavLink to="/settings" className={tabClass}>
          <SlidersIcon />
          Settings
        </NavLink>
      </nav>
      <NavLink to="/settings" className="avatar-mini wide-only" aria-label="Account settings">
        {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span>{(user?.displayName ?? '?').slice(0, 1)}</span>}
      </NavLink>
    </>
  );
}