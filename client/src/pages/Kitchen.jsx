import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

export default function Kitchen({ role, onKitchenCount }) {
  const { showToast } = useApp();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item: '', qty: '', note: '' });

  const isBoss = role === 'boss';

  useEffect(() => {
    authFetch('/api/kitchen').then(r => r.json()).then(data => {
      setItems(data);
      onKitchenCount?.(data.filter(k => !k.done).length);
    });
  }, []);

  async function saveKitchen() {
    if (!form.item.trim() || !form.qty.trim()) { showToast('Please fill in item and quantity'); return; }
    const requestedBy = role === 'atrium' ? 'Atrium' : 'Cleanskin';
    const res = await authFetch('/api/kitchen', {
      method: 'POST',
      body: JSON.stringify({ ...form, requestedBy }),
    });
    const newItem = await res.json();
    const updated = [newItem, ...items];
    setItems(updated);
    onKitchenCount?.(updated.filter(k => !k.done).length);
    setForm({ item: '', qty: '', note: '' });
    setShowForm(false);
    showToast('Added to kitchen list ✓');
  }

  async function toggleKitchen(id, done) {
    const res = await authFetch(`/api/kitchen/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done: !done }),
    });
    const updated = await res.json();
    const newItems = items.map(i => i._id === id ? updated : i);
    setItems(newItems);
    onKitchenCount?.(newItems.filter(k => !k.done).length);
  }

  return (
    <>
      <div className="page-title">Kitchen Needs</div>
      <div className="page-sub">{isBoss ? 'What Atrium needs from Cleanskin kitchen' : 'Items needed — check off as you prepare them'}</div>

      {(role === 'atrium' || role === 'cleanskin') && (
        <>
          <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowForm(f => !f)}>
            + Add item needed
          </button>
          {showForm && (
            <div className="add-form">
              <div className="section-label">Request from kitchen</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Item</label>
                  <input className="form-input" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} placeholder="e.g. Banana bread" />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="e.g. 2 loaves" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Any extra info" />
              </div>
              <button className="btn btn-primary btn-sm" onClick={saveKitchen}>Submit</button>
            </div>
          )}
        </>
      )}

      <div className="card">
        {items.length === 0
          ? <div className="empty"><div className="empty-icon">✓</div>All done!</div>
          : items.map(k => (
            <div className="kitchen-item" key={k._id}>
              <div className={`kitchen-cb ${k.done ? 'checked' : ''}`} onClick={() => toggleKitchen(k._id, k.done)}>
                {k.done && '✓'}
              </div>
              <div className={`kitchen-text ${k.done ? 'done' : ''}`}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{k.item}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.qty}{k.note ? ' · ' + k.note : ''}</div>
              </div>
              <span className="store-tag">for {k.requestedBy}</span>
            </div>
          ))
        }
      </div>
    </>
  );
}
