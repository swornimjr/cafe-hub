import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function Announcements() {
  const { user } = useAuth();
  const { showToast } = useApp();
  const canManage = ['boss', 'teamleader'].includes(user.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    authFetch('/api/announcements').then(r => r.json()).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  async function post() {
    if (!form.title.trim() || !form.body.trim()) { showToast('Title and message are required'); return; }
    setSaving(true);
    try {
      let res;
      try {
        res = await authFetch('/api/announcements', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      } catch {
        showToast('Failed to post — check your connection');
        return;
      }
      if (!res.ok) { showToast('Failed to post announcement'); return; }
      const data = await res.json();
      setItems(prev => [data, ...prev]);
      setForm({ title: '', body: '' });
      setShowForm(false);
      showToast(`Announcement posted · ${data.notified} staff notified ✓`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await authFetch(`/api/announcements/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(a => a._id !== id));
    showToast('Announcement removed');
  }

  return (
    <>
      <div className="page-title">Announcements</div>

      {canManage && (
        <div style={{ marginBottom: 16 }}>
          {showForm ? (
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>New announcement</div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  placeholder="e.g. Staff meeting Friday"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Write your announcement here…"
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={post} disabled={saving}>
                  {saving ? <><span className="btn-spinner" /> Posting…</> : 'Post announcement'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setForm({ title: '', body: '' }); }} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              + New announcement
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📢</div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>No announcements yet</div>
          {canManage && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Post an announcement to notify all staff</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(a => (
            <div key={a._id} className="card" style={{ position: 'relative', borderLeft: '4px solid var(--latte)' }}>
              {canManage && (
                <button
                  onClick={() => remove(a._id)}
                  style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1 }}
                  title="Remove announcement"
                >×</button>
              )}
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, paddingRight: 24 }}>{a.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 10 }}>{a.body}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Posted by {a.createdBy} · {timeAgo(a.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
