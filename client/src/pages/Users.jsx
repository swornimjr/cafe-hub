import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

const ROLE_LABELS = {
  boss:       '👔 Boss',
  teamleader: '⭐ Team Leader',
  atrium:     '☕ Atrium',
  cleanskin:  '🍽️ Cleanskin',
  warehouse:  '📦 Warehouse',
};

export default function Users() {
  const { user: me } = useAuth();
  const { showToast } = useApp();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', role: 'atrium', email: '' });
  const [creating, setCreating] = useState(false);

  // inline panel: 'send' (no email yet) | 'edit' (update email)
  const [activePanel, setActivePanel] = useState(null); // { id, mode, email }
  const [panelSaving, setPanelSaving] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  const isBoss = me?.role === 'boss';

  useEffect(() => {
    authFetch('/api/auth/users').then(r => r.json()).then(setUsers);
  }, []);

  function openPanel(uid, mode, existingEmail) {
    setActivePanel({ id: uid, mode, email: existingEmail || '' });
  }
  function closePanel() { setActivePanel(null); }

  // Send or resend credentials (auto-generates password on server)
  async function sendCredentials(uid, email) {
    if (!email) { showToast('Enter an email address'); return; }
    setPanelSaving(true);
    try {
      const res = await authFetch(`/api/auth/users/${uid}/resend-credentials`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error); return; }
      setUsers(prev => prev.map(u => (u.id || u._id) === uid ? { ...u, email: data.email } : u));
      closePanel();
      showToast(data.ok ? 'Credentials emailed ✓ — password auto-generated' : 'Email failed — check Settings');
    } finally {
      setPanelSaving(false);
    }
  }

  // Edit email only (no password reset)
  async function saveEmail(uid) {
    if (!activePanel.email) { showToast('Enter an email address'); return; }
    setPanelSaving(true);
    try {
      const res = await authFetch(`/api/auth/users/${uid}/email`, {
        method: 'PATCH',
        body: JSON.stringify({ email: activePanel.email }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed'); return; }
      setUsers(prev => prev.map(u => (u.id || u._id) === uid ? { ...u, email: activePanel.email } : u));
      closePanel();
      showToast('Email updated ✓');
    } finally {
      setPanelSaving(false);
    }
  }

  async function createUser() {
    if (!form.name || !form.username || !form.email) { showToast('All fields are required'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/auth/users', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { showToast(data.error); return; }
      setUsers(prev => [data, ...prev]);
      setForm({ name: '', username: '', role: 'atrium', email: '' });
      setShowForm(false);
      showToast(data.emailSent ? 'Account created ✓ — login details emailed' : 'Account created ✓ (email failed — check Settings)');
    } finally {
      setCreating(false);
    }
  }

  async function resendCredentials(uid) {
    setResendingId(uid);
    try {
      const res = await authFetch(`/api/auth/users/${uid}/resend-credentials`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error); return; }
      showToast(data.ok ? 'Credentials emailed ✓' : 'Email failed — check Settings');
    } finally {
      setResendingId(null);
    }
  }

  async function deleteUser(id) {
    const res = await authFetch(`/api/auth/users/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); showToast(d.error); return; }
    setUsers(prev => prev.filter(u => (u.id || u._id) !== id));
    showToast('Account removed');
  }

  async function promote(id) {
    const res = await authFetch(`/api/auth/users/${id}/promote`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error); return; }
    setUsers(prev => prev.map(u => (u.id || u._id) === id ? { ...u, ...data } : u));
    showToast('Promoted to team leader ✓');
  }

  async function demote(id) {
    const res = await authFetch(`/api/auth/users/${id}/demote`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error); return; }
    setUsers(prev => prev.map(u => (u.id || u._id) === id ? { ...u, ...data } : u));
    showToast('Demoted to staff ✓');
  }

  const canManage = u => {
    const uid = u.id || u._id;
    if (uid === (me?.id || me?._id)) return false;
    if (!isBoss && ['boss', 'teamleader'].includes(u.role)) return false;
    return true;
  };

  return (
    <>
      <div className="page-title">Staff Accounts</div>
      <div className="page-sub">Manage who can log in</div>

      <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowForm(f => !f)}>
        + Add account
      </button>

      {showForm && (
        <div className="add-form">
          <div className="section-label">New account</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sam Chen" />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} placeholder="e.g. sam" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="atrium">☕ Atrium Staff</option>
              <option value="cleanskin">🍽️ Cleanskin Staff</option>
              <option value="warehouse">📦 Warehouse</option>
              {isBoss && <option value="boss">👔 Boss</option>}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input type="email" className="form-input" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="staff@example.com" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Login details will be emailed automatically</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={createUser} disabled={creating}>
              {creating ? <><span className="btn-spinner" /> Creating…</> : 'Create account'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        {users.length === 0
          ? <div className="empty"><div className="empty-icon">👤</div>No accounts yet</div>
          : users.map(u => {
            const uid = u.id || u._id;
            const manageable = canManage(u);
            const isMe = uid === (me?.id || me?._id);
            const isActive = activePanel?.id === uid;

            return (
              <div className="stock-item" key={uid} style={isMe ? { background: '#fafaf9' } : {}}>
                <div style={{ flex: 1 }}>
                  <div className="stock-name">
                    {u.name} {isMe && <span style={{ fontSize: 11, background: 'var(--latte)', color: 'var(--espresso)', borderRadius: 3, padding: '1px 6px', fontWeight: 700 }}>You</span>}
                  </div>
                  <div className="stock-meta">
                    @{u.username} · {ROLE_LABELS[u.role] || u.role}
                    {u.originalRole && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>(was {ROLE_LABELS[u.originalRole]})</span>}
                  </div>
                  {u.email
                    ? <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>✉ {u.email}</div>
                    : manageable && <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>⚠ No email — click "Send credentials" to add one</div>
                  }

                  {/* Inline panel */}
                  {isActive && (
                    <div style={{ marginTop: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--espresso)', marginBottom: 8 }}>
                        {activePanel.mode === 'edit' ? `Update email for ${u.name}` : `Send credentials to ${u.name}`}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Email address</div>
                          <input
                            type="email"
                            className="form-input"
                            style={{ fontSize: 12, padding: '5px 8px' }}
                            placeholder="staff@example.com"
                            value={activePanel.email}
                            onChange={e => setActivePanel(a => ({ ...a, email: e.target.value }))}
                            autoFocus
                          />
                        </div>
                      </div>
                      {activePanel.mode === 'send' && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                          A random password will be generated and emailed automatically.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {activePanel.mode === 'edit' ? (
                          <button className="btn btn-primary btn-sm" onClick={() => saveEmail(uid)} disabled={panelSaving}>
                            {panelSaving ? <><span className="btn-spinner" /> Saving…</> : 'Save email'}
                          </button>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => sendCredentials(uid, activePanel.email)} disabled={panelSaving}>
                            {panelSaving ? <><span className="btn-spinner" /> Sending…</> : 'Generate & send'}
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={closePanel} disabled={panelSaving}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                {manageable && !isActive && (
                  <div className="stock-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, alignSelf: 'flex-start' }}>
                    {isBoss && u.role !== 'teamleader' && !['boss','warehouse'].includes(u.role) && (
                      <button className="btn btn-sm"
                        style={{ background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a' }}
                        onClick={() => promote(uid)}>Make TL</button>
                    )}
                    {isBoss && u.role === 'teamleader' && (
                      <button className="btn btn-sm btn-outline" onClick={() => demote(uid)}>Remove TL</button>
                    )}
                    {u.email ? (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => openPanel(uid, 'edit', u.email)}>
                          Edit email
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => resendCredentials(uid)}
                          disabled={resendingId === uid}>
                          {resendingId === uid ? <><span className="btn-spinner" /> Sending…</> : 'Reset password'}
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => openPanel(uid, 'send', '')}>
                        Send credentials
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(uid)}>Remove</button>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
    </>
  );
}
