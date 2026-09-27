import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem('erp_user') || 'null');
  } catch {
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_token');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('erp_token')) { setReady(true); return; }
    api('/auth/me').then((account) => setUser(account)).catch(() => { localStorage.removeItem('erp_token'); localStorage.removeItem('erp_user'); setUser(null); }).finally(() => setReady(true));
  }, []);
  async function login(email, password) {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('erp_token', result.token); localStorage.setItem('erp_user', JSON.stringify(result.user)); setUser(result.user);
  }
  function logout() { localStorage.removeItem('erp_token'); localStorage.removeItem('erp_user'); setUser(null); }
  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
