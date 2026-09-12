import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setSessionToken } from '../api/client.js';

const STORAGE_KEY = 'healthmitra-user';
export const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);

const defaultSession = {
  id: 'patient-1',
  name: 'Meera Shah',
  role: 'patient',
  email: 'meera@demo.health',
  phone: '+919810000001'
};

const readStoredSession = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const validRole = saved?.role === 'patient' || saved?.role === 'caregiver';
    if (saved?.id && typeof saved?.name === 'string' && validRole) return saved;
  } catch { /* ignore */ }
  return defaultSession;
};

export function useSessionState() {
  const [session, setSession] = useState(() => {
    const stored = readStoredSession();
    setSessionToken(stored?.id || null);
    return stored;
  });
  useEffect(() => { setSessionToken(session?.id || null); }, [session]);
  const signIn = useCallback((user) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); setSessionToken(user.id); setSession(user); }, []);
  const signOut = useCallback(() => { localStorage.removeItem(STORAGE_KEY); setSessionToken(null); setSession(null); }, []);
  return { session, signIn, signOut };
}
