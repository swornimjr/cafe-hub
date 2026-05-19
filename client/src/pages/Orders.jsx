import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

export default function Orders() {
  const { showToast } = useApp();
  const [items, setItems] = useState([]);

  useEffect(() => {
    authFetch('/api/stock').then(r => r.json()).then(data =>
      setItems(data.filter(r => r.status === 'approved' || r.status === 'sent'))
    );
  }, []);

  async function markFulfilled(id) {
    const res = await authFetch(`/api/stock/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'sent' }),
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === id ? updated : i));
    showToast('Marked as fulfilled ✓');
  }

  return (
    <>
      <div className="page-title">Approved Orders</div>
      <div className="page-sub">Items approved by the boss — fulfil and mark as done</div>
      <div className="card">
        {items.length === 0
          ? <div className="empty"><div className="empty-icon">📭</div>No orders yet</div>
          : items.map(r => (
            <div className="stock-item" key={r._id}>
              <div>
                <div className="stock-name">{r.item}</div>
                <div className="stock-meta">{r.qty} · for {r.store}</div>
              </div>
              <div className="stock-actions">
                {r.status === 'approved'
                  ? <button className="btn btn-green btn-sm" onClick={() => markFulfilled(r._id)}>Mark fulfilled</button>
                  : <span className="badge sent">Fulfilled ✓</span>
                }
              </div>
            </div>
          ))
        }
      </div>
    </>
  );
}
