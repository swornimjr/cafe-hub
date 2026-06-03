import { useState, useEffect, useRef } from 'react';
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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    authFetch('/api/announcements').then(r => r.json()).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetForm() {
    setForm({ title: '', body: '' });
    clearImage();
    setShowForm(false);
  }

  async function post() {
    if (!form.title.trim() || !form.body.trim()) { showToast('Title and message are required'); return; }
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('title', form.title.trim());
      payload.append('body', form.body.trim());
      if (imageFile) payload.append('image', imageFile);

      let res;
      try {
        res = await authFetch('/api/announcements', { method: 'POST', body: payload });
      } catch {
        showToast('Failed to post — check your connection');
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to post announcement');
        return;
      }
      const data = await res.json();
      setItems(prev => [data, ...prev]);
      resetForm();
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

              {/* Image upload */}
              <div className="form-group">
                <label className="form-label">Photo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                {imagePreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      onClick={clearImage}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
                        borderRadius: '50%', width: 26, height: 26, cursor: 'pointer',
                        fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Remove photo"
                    >×</button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border)', borderRadius: 10, padding: '20px 16px',
                      textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13,
                    }}
                  >
                    📷 Click to add a photo
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={post} disabled={saving}>
                  {saving ? <><span className="btn-spinner" /> Posting…</> : 'Post announcement'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={resetForm} disabled={saving}>
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
              <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: a.imageUrl ? 10 : 0 }}>{a.body}</div>
              {a.imageUrl && (
                <img
                  src={a.imageUrl}
                  alt={a.title}
                  style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10, marginBottom: 10, display: 'block' }}
                />
              )}
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
