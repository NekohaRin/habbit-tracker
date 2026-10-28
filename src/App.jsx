import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import HabitToday from './pages/HabitToday';
import HabitForm from './pages/HabitForm';
import WorkoutBody from './pages/WorkoutBody';
import WorkoutLog from './pages/WorkoutLog';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import HabitStats from './pages/HabitStats';
import useWide from './lib/useWide';

/** Halaman utama: Dashboard di layar lebar (PC), layar Habit di layar sempit (HP). */
function Home() {
  const wide = useWide();
  return wide ? <Dashboard /> : <Navigate to="/habits" replace />;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Screen structure (see PRD, section "App structure"):
//   /login                  Login
//   /                       Home: Dashboard on wide screens, redirects to /habits on narrow
//   /habits                 Habit: Today           (tab 1)
//   /workout                Workout & Tubuh        (tab 2)
//   /dashboard              Dashboard (always reachable)
//   /settings               Settings               (tab 3)
//   /workout/new            Log workout form       (full screen)
//   /workout/:id/edit       Edit session form      (full screen)
//   /habit/new              Add habit form         (full screen, no tab bar)
//   /habit/:id/edit         Edit habit form        (full screen, no tab bar)
//   /habit/:id/stats        Habit history          (heatmap and stats)
export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="habits" element={<HabitToday />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workout" element={<WorkoutBody />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="workout/new" element={<WorkoutLog />} />
          <Route path="workout/:id/edit" element={<WorkoutLog />} />
          <Route path="habit/new" element={<HabitForm />} />
          <Route path="habit/:id/edit" element={<HabitForm />} />
          <Route path="habit/:id/stats" element={<HabitStats />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}