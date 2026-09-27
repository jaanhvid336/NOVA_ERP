import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from './auth.jsx';
export function LoginPage() {
  const { user, login } = useAuth(); const navigate = useNavigate(); const [email, setEmail] = useState('rep@nova.local'); const [password, setPassword] = useState('password'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await login(email, password); navigate('/'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <main className="login-page"><section className="login-panel"><div className="login-brand"><span className="brand-mark">N</span><span>Nova ERP</span></div><div className="login-copy"><p className="eyebrow">Sales order management</p><h1>Welcome back</h1><p>Sign in to manage your work queue.</p></div><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}><LockKeyhole size={17} />{busy ? 'Signing in...' : 'Sign in'}</button></form><p className="demo-note">Demo accounts use the password: password</p></section></main>;
}
export function PlaceholderPage({ title }) { return <section className="content-panel"><h2>{title}</h2><p>This module is being connected.</p></section>; }
