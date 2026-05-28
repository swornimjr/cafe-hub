import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

const STATUS_STEPS = ['pending', 'approved', 'sent'];
const blankLine = { productInput: '', item: '', unit: '', qty: '', store: '', urgent: false, note: '' };

export default function Stock({ role, onStockCount }) {
  const { showToast } = useApp();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [line, setLine] = useState(blankLine);
  const [cart, setCart] = useState([]);
  const [storeTab, setStoreTab] = useState('All');
  const [view, setView] = useState('active');
  const [sending, setSending] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [sentResult, setSentResult] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productDropdownRef = useRef(null);

  const isBoss = role === 'boss';
  const isTeamLeader = role === 'teamleader';
  const canOrder = isBoss || isTeamLeader;
  const myStore = role === 'atrium' ? 'Atrium' : role === 'cleanskin' ? 'Cleanskin' : null;

  useEffect(() => {
    load();
    if (canOrder) authFetch('/api/products').then(r => r.json()).then(setProducts);
    if (myStore) setLine(l => ({ ...l, store: myStore }));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  async function load() {
    const data = await authFetch('/api/stock').then(r => r.json());
    setItems(data);
    onStockCount?.(data.filter(r => r.status === 'pending').length);
  }

  function pickProduct(val) {
    const p = products.find(p => p.name.toLowerCase() === val.toLowerCase());
    if (p) setLine(l => ({ ...l, productInput: p.name, item: p.name, unit: p.unit }));
    else setLine(l => ({ ...l, productInput: val, item: val, unit: '' }));
  }

  function addToCart() {
    if (!line.item.trim()) { showToast('Select or type a product'); return; }
    if (!line.qty || Number(line.qty) <= 0) { showToast('Enter a quantity'); return; }
    if (!line.store) { showToast('Select a store for this item'); return; }
    setCart(c => [...c, { ...line }]);
    setLine(l => ({ ...blankLine, store: l.store })); // keep store selected for next item
  }

  function removeFromCart(i) {
    setCart(c => c.filter((_, idx) => idx !== i));
  }

  async function placeOrder() {
    if (cart.length === 0) { showToast('Add at least one item'); return; }
    setOrdering(true);
    try {
      await Promise.all(cart.map(c =>
        authFetch('/api/stock', {
          method: 'POST',
          body: JSON.stringify({ item: c.item, unit: c.unit, qty: c.qty, store: c.store, note: c.note, urgent: c.urgent }),
        })
      ));
      setCart([]);
      setLine(myStore ? { ...blankLine, store: myStore } : blankLine);
      setShowForm(false);
      showToast(`${cart.length} item${cart.length > 1 ? 's' : ''} ordered ✓`);
      await load();
    } finally {
      setOrdering(false);
    }
  }

  async function advance(id, status) {
    const res = await authFetch(`/api/stock/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const updated = await res.json();
    const newItems = items.map(i => i._id === id ? updated : i);
    setItems(newItems);
    onStockCount?.(newItems.filter(r => r.status === 'pending').length);
  }

  async function approveAll() {
    const pending = displayed.filter(r => r.status === 'pending');
    await Promise.all(pending.map(r =>
      authFetch(`/api/stock/${r._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) })
    ));
    showToast(`${pending.length} item${pending.length > 1 ? 's' : ''} approved ✓`);
    await load();
  }

  async function deleteOrder(id) {
    await authFetch(`/api/stock/${id}`, { method: 'DELETE' });
    const newItems = items.filter(i => i._id !== id);
    setItems(newItems);
    onStockCount?.(newItems.filter(r => r.status === 'pending').length);
  }

  function startEdit(r) {
    setEditingId(r._id);
    setEditQty(r.qty);
  }

  async function saveEdit(id) {
    if (!editQty || Number(editQty) <= 0) { showToast('Enter a valid quantity'); return; }
    const res = await authFetch(`/api/stock/${id}`, { method: 'PATCH', body: JSON.stringify({ qty: editQty }) });
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === id ? updated : i));
    setEditingId(null);
  }

  async function sendOrder() {
    setSending(true);
    try {
      const res = await authFetch('/api/stock/send', { method: 'POST' });
      if (!res.ok) { const e = await res.json(); showToast(e.error || 'Send failed'); return; }
      const emailSent = res.headers.get('X-Email-Sent') === 'true';
      const itemCount = res.headers.get('X-Items-Sent');
      const waNumber = res.headers.get('X-WhatsApp-Number');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `stock-order-${new Date().toISOString().slice(0, 10)}.pdf`; a.click();
      URL.revokeObjectURL(url);
      setSentResult({ emailSent, itemCount, waNumber });
      await load();
    } finally {
      setSending(false);
    }
  }

  function openWhatsApp(number) {
    window.open(`https://wa.me/${number}?text=${encodeURIComponent('Hi, please find the stock order PDF attached.')}`, '_blank');
  }

  const availableProducts = products.filter(p => !line.store || p.store === 'Both' || p.store === line.store);

  const pendingCount = items.filter(r => r.status === 'pending' && (myStore ? r.store === myStore : storeTab === 'All' || r.store === storeTab)).length;
  const approvedCount = items.filter(r => r.status === 'approved').length;

  const activeItems = items.filter(r => r.status !== 'sent');
  const sentItems = items.filter(r => r.status === 'sent');

  const displayed = (view === 'history' ? sentItems : activeItems).filter(r => {
    if (myStore) return r.store === myStore;
    if (storeTab !== 'All') return r.store === storeTab;
    return true;
  });

  const showStoreTabs = isBoss || isTeamLeader;

  const grouped = displayed.reduce((acc, r) => {
    (acc[r.store] ??= []).push(r);
    return acc;
  }, {});

  const historyByDate = displayed.reduce((acc, r) => {
    const d = new Date(r.updatedAt).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    (acc[d] ??= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <div className="page-title">Stock Orders</div>
      <div className="page-sub">
        {isBoss ? 'Approve orders and send to supplier as PDF' : isTeamLeader ? 'Build orders for your stores — boss will approve and send' : 'View your store orders'}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {canOrder && (
          <button className="btn btn-primary" onClick={() => { setShowForm(f => !f); setCart([]); setLine(myStore ? { ...blankLine, store: myStore } : blankLine); }}>
            {showForm ? 'Cancel order' : '+ New order'}
          </button>
        )}
        {isBoss && pendingCount > 0 && (
          <button className="btn btn-green btn-sm" onClick={approveAll}>
            Approve all pending ({pendingCount})
          </button>
        )}
        {isBoss && approvedCount > 0 && (
          <button className="btn btn-green" onClick={sendOrder} disabled={sending}>
            {sending ? <><span className="btn-spinner" /> Sending…</> : `Send to supplier (${approvedCount} approved)`}
          </button>
        )}
      </div>

      {/* Sent result banner */}
      {sentResult && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', marginBottom: 16, position: 'relative' }}>
          <button style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => setSentResult(null)}>✕</button>
          <div style={{ fontWeight: 600, color: '#166534', marginBottom: 4 }}>Order sent — {sentResult.itemCount} items</div>
          <div style={{ fontSize: 13, color: '#166534', marginBottom: sentResult.waNumber ? 10 : 0 }}>
            {sentResult.emailSent ? '✓ Email sent to supplier' : '⚠ Email not sent (check SMTP in .env)'}
            {' · '}PDF downloaded
          </div>
          {sentResult.waNumber && (
            <button className="btn btn-sm" style={{ background: '#25D366', color: '#fff', border: 'none', marginTop: 6 }} onClick={() => openWhatsApp(sentResult.waNumber)}>
              Open WhatsApp — attach PDF
            </button>
          )}
        </div>
      )}

      {/* Order builder form */}
      {showForm && (
        <div className="add-form" style={{ marginBottom: 20 }}>
          <div className="section-label" style={{ marginBottom: 14 }}>Build your order</div>

          {/* Add line item */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '16px', marginBottom: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Add item</div>

            {/* Row 1: Store (boss only) | Product | Qty */}
            <div className="order-row">
              {!myStore && (
                <div className="shrink">
                  <label className="form-label">Store</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Atrium', 'Cleanskin'].map(s => (
                      <button
                        key={s}
                        className={`btn btn-sm ${line.store === s ? 'btn-primary' : 'btn-outline'}`}
                        style={{ height: 42 }}
                        onClick={() => { setLine(l => ({ ...l, store: s, productInput: '', item: '', unit: '' })); setShowProductDropdown(false); }}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grow-3" style={{ position: 'relative' }} ref={productDropdownRef}>
                <label className="form-label">Product</label>
                <input
                  className="form-input"
                  value={line.productInput}
                  onChange={e => { pickProduct(e.target.value); setShowProductDropdown(true); }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Type or pick a product…"
                  disabled={!myStore && !line.store}
                  autoComplete="off"
                />
                {showProductDropdown && availableProducts.length > 0 && (
                  <ul className="product-dropdown">
                    {availableProducts
                      .filter(p => !line.productInput || p.name.toLowerCase().includes(line.productInput.toLowerCase()))
                      .map(p => (
                        <li
                          key={p._id}
                          className="product-dropdown-item"
                          onMouseDown={e => { e.preventDefault(); pickProduct(p.name); setShowProductDropdown(false); }}
                          onTouchEnd={e => { e.preventDefault(); pickProduct(p.name); setShowProductDropdown(false); }}
                        >
                          <span>{p.name}</span>
                          <span className="product-dropdown-meta">{p.category} · {p.unit}</span>
                        </li>
                      ))
                    }
                  </ul>
                )}
              </div>
              <div className="grow-1">
                <label className="form-label">Qty{line.unit ? ` (${line.unit})` : ''}</label>
                <input
                  className="form-input"
                  type="number" min="1"
                  value={line.qty}
                  onChange={e => setLine(l => ({ ...l, qty: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Row 2: Urgent | Note | Add button */}
            <div className="order-row">
              <div className="grow-1">
                <label className="form-label">Urgent?</label>
                <select className="form-select" value={line.urgent ? '1' : '0'} onChange={e => setLine(l => ({ ...l, urgent: e.target.value === '1' }))}>
                  <option value="0">No</option>
                  <option value="1">Yes — running out today</option>
                </select>
              </div>
              <div className="grow-3">
                <label className="form-label">Note (optional)</label>
                <input className="form-input" value={line.note} onChange={e => setLine(l => ({ ...l, note: e.target.value }))} placeholder="Any extra info" />
              </div>
              <div className="shrink">
                <button className="btn btn-primary" style={{ height: 42, whiteSpace: 'nowrap' }} onClick={addToCart}>+ Add to order</button>
              </div>
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Order list ({cart.length} item{cart.length > 1 ? 's' : ''})
              </div>
              {cart.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 7, marginBottom: 6, border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{c.urgent ? '🔴 ' : ''}{c.item}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>{c.qty}{c.unit ? ` ${c.unit}` : ''}</span>
                    {isBoss && <span style={{ fontSize: 11, marginLeft: 8, padding: '1px 8px', borderRadius: 99, background: 'var(--foam)', color: 'var(--espresso)', fontWeight: 600 }}>{c.store}</span>}
                    {c.note && <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>· {c.note}</span>}
                  </div>
                  <button onClick={() => removeFromCart(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
                </div>
              ))}
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={placeOrder} disabled={ordering}>
                {ordering ? <><span className="btn-spinner" /> Placing order…</> : `Place order (${cart.length} item${cart.length > 1 ? 's' : ''})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* View toggle + store filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${view === 'active' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('active')}>
            Active {activeItems.length > 0 && <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 99, padding: '0 6px', fontSize: 10 }}>{activeItems.length}</span>}
          </button>
          <button className={`btn btn-sm ${view === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('history')}>
            History {sentItems.length > 0 && <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 99, padding: '0 6px', fontSize: 10 }}>{sentItems.length}</span>}
          </button>
        </div>
        {showStoreTabs && (
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Atrium', 'Cleanskin'].map(t => (
              <button key={t} className={`btn btn-sm ${storeTab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStoreTab(t)}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Active orders */}
      {view === 'active' && (
        displayed.length === 0
          ? <div className="card"><div className="empty"><div className="empty-icon">✅</div>No active orders</div></div>
          : Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([storeName, orders]) => (
            <div className="card" key={storeName} style={{ marginBottom: 12 }}>
              {storeTab === 'All' && showStoreTabs && <div className="section-label" style={{ marginBottom: 10 }}>{storeName}</div>}
              {orders.map(r => (
                <div className="stock-item" key={r._id}>
                  <div style={{ flex: 1 }}>
                    <div className="stock-name">{r.urgent ? '🔴 ' : ''}{r.item}</div>
                    <div className="stock-meta">
                      {r.qty}{r.unit ? ` ${r.unit}` : ''}
                      {r.orderedBy ? ` · by ${r.orderedBy}` : ''}
                      {r.note ? ` · ${r.note}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {STATUS_STEPS.map((s, i) => (
                        <span key={s} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 99,
                          background: STATUS_STEPS.indexOf(r.status) >= i ? 'var(--espresso)' : '#e5e7eb',
                          color: STATUS_STEPS.indexOf(r.status) >= i ? '#fff' : '#6b7280',
                          fontWeight: 500,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  {isBoss && (
                    <div className="stock-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      {r.status === 'pending' && (
                        <button className="btn btn-green btn-sm" onClick={() => advance(r._id, 'approved')}>Approve</button>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editingId === r._id ? (
                          <>
                            <input
                              type="number" min="1"
                              value={editQty}
                              onChange={e => setEditQty(e.target.value)}
                              style={{ width: 60, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
                              autoFocus
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => saveEdit(r._id)}>Save</button>
                            <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)}>✕</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-outline" onClick={() => startEdit(r)}>Edit qty</button>
                            <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => deleteOrder(r._id)}>Remove</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
      )}

      {/* History */}
      {view === 'history' && (
        displayed.length === 0
          ? <div className="card"><div className="empty"><div className="empty-icon">📦</div>No order history</div></div>
          : Object.entries(historyByDate).map(([date, orders]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{date}</div>
              <div className="card">
                {orders.map(r => (
                  <div className="stock-item" key={r._id}>
                    <div style={{ flex: 1 }}>
                      <div className="stock-name">{r.item}</div>
                      <div className="stock-meta">
                        {r.qty}{r.unit ? ` ${r.unit}` : ''} · {r.store}
                        {r.orderedBy ? ` · by ${r.orderedBy}` : ''}
                        {r.note ? ` · ${r.note}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: '#dcfce7', color: '#166534', fontWeight: 500 }}>sent</span>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}
    </>
  );
}
