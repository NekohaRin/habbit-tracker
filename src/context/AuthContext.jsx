import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { ensureUserProfile, subscribeProfile } from '../services/account';
import { DEFAULT_TZ } from '../lib/dates';

const AuthContext = createContext(null);

const REDIRECT_FALLBACK_CODES = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
];

function friendlyAuthError(e) {
  switch (e?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication (Settings > Authorized domains).';
    case 'auth/network-request-failed':
      return 'No internet connection. Try again when you are online.';
    default:
      return 'Google sign-in failed. Please try again.';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getRedirectResult(auth).catch((e) => setError(friendlyAuthError(e)));
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await ensureUserProfile(u);
        } catch (e) {
          console.error('Gagal menyiapkan profil', e);
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }
    return subscribeProfile(user.uid, setProfile, (e) => console.error(e));
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (REDIRECT_FALLBACK_CODES.includes(e?.code)) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setError(friendlyAuthError(e));
    }
  }, []);

  const signOut = useCallback(() => firebaseSignOut(auth), []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      tz: profile?.settings?.timezone ?? DEFAULT_TZ,
      signInWithGoogle,
      signOut,
    }),
    [user, profile, loading, error, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
