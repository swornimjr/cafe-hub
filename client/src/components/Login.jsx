import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { authFetch } from '../api.js';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => { if (!done) setWarming(true); }, 1500);
    authFetch('/api/health')
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => {})
      .finally(() => { done = true; clearTimeout(timer); setWarming(false); });
    return () => { done = true; clearTimeout(timer); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      login(data.user, data.token);
    } catch {
      setError('Server is still starting up — please wait a moment and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand">
        <div className="login-brand-icon">☕</div>
        <div className="login-brand-name">Cafe Hub</div>
        <div className="login-brand-sub">Atrium &amp; Cleanskin</div>
      </div>
      <div className="login-card">
        <h2>Welcome back</h2>
        <p>Sign in to your account</p>
        {warming && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fffbeb', border: '1px solid #fcd34d',
            borderRadius: 8, padding: '9px 12px', marginBottom: 14,
            fontSize: 13, color: '#92400e',
          }}>
            <span className="btn-spinner" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent', width: 14, height: 14 }} />
            Server is starting up — this takes about 30 seconds…
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Enter your username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter your password"
            />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="login-btn" type="submit" disabled={loading || !form.username || !form.password}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

