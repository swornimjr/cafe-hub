import { useState, useEffect, useRef } from 'react';
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

const ROLE_COLORS = {
  boss:       { bg: '#1e293b', text: '#fff' },
  teamleader: { bg: '#fef3c7', text: '#92400e' },
  atrium:     { bg: '#dcfce7', text: '#15803d' },
  cleanskin:  { bg: '#f1f5f9', text: '#334155' },
  warehouse:  { bg: '#dbeafe', text: '#1e40af' },
};

const ROLE_AVATAR = {
  boss:       { bg: '#1e293b', text: '#fff' },
  teamleader: { bg: '#f59e0b', text: '#fff' },
  atrium:     { bg: '#16a34a', text: '#fff' },
  cleanskin:  { bg: '#475569', text: '#fff' },
  warehouse:  { bg: '#2563eb', text: '#fff' },
};

function MenuItem({ icon, label, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '10px 14px',
        border: 'none', background: 'none', textAlign: 'left',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
        color: danger ? 'var(--red)' : 'var(--text)',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#fff1f1' : 'var(--cream)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const { showToast } = useApp();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', role: 'atrium', email: '' });
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [panelSaving, setPanelSaving] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const menuRef = useRef(null);

  const isBoss = me?.role === 'boss';

  useEffect(() => {
    authFetch('/api/auth/users').then(r => r.json()).then(setUsers);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [menuOpen]);

  function openPanel(uid, mode, existingEmail) {
    setMenuOpen(null);
    setActivePanel({ id: uid, mode, email: existingEmail || '' });
  }
  function closePanel() { setActivePanel(null); }

  async function sendCredentials(uid, email) {
    if (!email) { showToast('Enter an email address'); return; }
    setPanelSaving(true);
    try {
      const res = await authFetch(`/api/auth/users/${uid}/resend-credentials`, {
        method: 'POST', body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error); return; }
      setUsers(prev => prev.map(u => (u.id || u._id) === uid ? { ...u, email: data.email } : u));
      closePanel();
      showToast(data.ok ? 'Credentials emailed ✓ — password auto-generated' : 'Email failed — check Settings');
    } finally { setPanelSaving(false); }
  }

  async function saveEmail(uid) {
    if (!activePanel.email) { showToast('Enter an email address'); return; }
    setPanelSaving(true);
    try {
      const res = await authFetch(`/api/auth/users/${uid}/email`, {
        method: 'PATCH', body: JSON.stringify({ email: activePanel.email }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed'); return; }
      setUsers(prev => prev.map(u => (u.id || u._id) === uid ? { ...u, email: activePanel.email } : u));
      closePanel();
      showToast('Email updated ✓');
    } finally { setPanelSaving(false); }
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
    } finally { setCreating(false); }
  }

  async function resendPassword(uid) {
    setMenuOpen(null);
    setResendingId(uid);
    try {
      const res = await authFetch(`/api/auth/users/${uid}/resend-credentials`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error); return; }
      showToast(data.ok ? 'Credentials emailed ✓' : 'Email failed — check Settings');
    } finally { setResendingId(null); }
  }

  async function deleteUser(id) {
    setMenuOpen(null);
    if (!window.confirm('Remove this account?')) return;
    const res = await authFetch(`/api/auth/users/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); showToast(d.error); return; }
    setUsers(prev => prev.filter(u => (u.id || u._id) !== id));
    showToast('Account removed');
  }

  async function promote(id) {
    setMenuOpen(null);
    const res = await authFetch(`/api/auth/users/${id}/promote`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error); return; }
    setUsers(prev => prev.map(u => (u.id || u._id) === id ? { ...u, ...data } : u));
    showToast('Promoted to team leader ✓');
  }

  async function demote(id) {
    setMenuOpen(null);
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

      <div className="card" style={{ padding: 0, overflow: 'visible' }}>
        {users.length === 0
          ? <div className="empty" style={{ padding: '40px 20px' }}><div className="empty-icon">👤</div>No accounts yet</div>
          : users.map((u, idx) => {
            const uid = u.id || u._id;
            const manageable = canManage(u);
            const isMe = uid === (me?.id || me?._id);
            const isActive = activePanel?.id === uid;
            const isMenuOpen = menuOpen === uid;
            const av = ROLE_AVATAR[u.role] || ROLE_AVATAR.atrium;
            const rc = ROLE_COLORS[u.role] || ROLE_COLORS.atrium;
            const isLast = idx === users.length - 1;

            return (
              <div key={uid} style={{
                padding: '14px 18px',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
                background: isMe ? '#fafffe' : '#fff',
                borderRadius: idx === 0 ? '10px 10px 0 0' : isLast ? '0 0 10px 10px' : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: av.bg, color: av.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em',
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{u.name}</span>
                      {isMe && (
                        <span style={{ fontSize: 10, background: 'var(--latte)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700, letterSpacing: '0.03em' }}>YOU</span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                        background: rc.bg, color: rc.text,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {ROLE_LABELS[u.role]?.replace(/^.+?\s/, '') || u.role}
                        {u.originalRole && ` (was ${ROLE_LABELS[u.originalRole]?.replace(/^.+?\s/, '')})`}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{u.username}
                      {u.email && <span> · {u.email}</span>}
                      {!u.email && manageable && <span style={{ color: '#f59e0b' }}> · ⚠ No email</span>}
                    </div>
                  </div>

                  {/* ⋯ menu */}
                  {manageable && !isActive && (
                    <div style={{ position: 'relative', flexShrink: 0 }} ref={isMenuOpen ? menuRef : null}>
                      <button
                        onClick={() => setMenuOpen(isMenuOpen ? null : uid)}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: isMenuOpen ? 'var(--foam)' : '#fff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, color: 'var(--text-muted)', letterSpacing: '0.05em',
                          transition: 'background 0.15s',
                        }}
                      >⋯</button>

                      {isMenuOpen && (
                        <div style={{
                          position: 'absolute', right: 0, top: 38, zIndex: 100,
                          background: '#fff', border: '1px solid var(--border)',
                          borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                          minWidth: 180, overflow: 'hidden',
                        }}>
                          {isBoss && u.role !== 'teamleader' && !['boss','warehouse'].includes(u.role) && (
                            <MenuItem icon="⭐" label="Make Team Leader" onClick={() => promote(uid)} />
                          )}
                          {isBoss && u.role === 'teamleader' && (
                            <MenuItem icon="↩" label="Remove Team Leader" onClick={() => demote(uid)} />
                          )}
                          {u.email ? (
                            <>
                              <MenuItem icon="✉" label="Edit email" onClick={() => openPanel(uid, 'edit', u.email)} />
                              <MenuItem icon="🔑" label="Reset password" onClick={() => resendPassword(uid)} />
                            </>
                          ) : (
                            <MenuItem icon="✉" label="Send credentials" onClick={() => openPanel(uid, 'send', '')} />
                          )}
                          <div style={{ borderTop: '1px solid var(--border)' }}>
                            <MenuItem icon="🗑" label="Remove account" danger onClick={() => deleteUser(uid)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline email panel */}
                {isActive && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--espresso)', marginBottom: 8 }}>
                      {activePanel.mode === 'edit' ? `Update email for ${u.name}` : `Send credentials to ${u.name}`}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Email address</div>
                        <input type="email" className="form-input"
                          style={{ fontSize: 14, padding: '8px 10px' }}
                          placeholder="staff@example.com"
                          value={activePanel.email}
                          onChange={e => setActivePanel(a => ({ ...a, email: e.target.value }))}
                          autoFocus />
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
            );
          })
        }
      </div>
    </>
  );
}
