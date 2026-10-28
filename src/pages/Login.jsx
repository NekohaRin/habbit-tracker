import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from '../components/Icons';

export default function Login() {
  const { user, loading, error, signInWithGoogle } = useAuth();
  const [agreed, setAgreed] = useState(false);
  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <main className="login">
      <div className="login-hero">
        <div className="logo"><LogoMark /></div>
        <h1 className="display">Build habits, <em>one day at a time</em></h1>
        <p className="muted">Track your habits, workouts, and body measurements. Everyone's data is separate and private.</p>
      </div>
      <div className="login-sheet">
        <label className="check-row">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I understand my data is stored privately in my own account and I can export or delete it anytime.</span>
        </label>
        <button type="button" className="btn btn-dark btn-lg" onClick={signInWithGoogle} disabled={loading || !agreed}>
          <span className="g-badge">G</span> Sign in with Google
        </button>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="fine">Google sign-in only. No password to remember.</p>
      </div>
    </main>
  );
}