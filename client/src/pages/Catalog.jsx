import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

const UNITS = ['kg', 'g', 'L', 'mL', 'bottles', 'cans', 'boxes', 'packs', 'bags', 'rolls', 'units'];
const STORES = ['Both', 'Atrium', 'Cleanskin'];

const blank = { name: '', category: '', unit: '', store: 'Both' };

export default function Catalog() {
  const { showToast } = useApp();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [catFilter, setCatFilter] = useState('All');

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await authFetch('/api/products').then(r => r.json());
    setProducts(data);
  }

  function openAdd() { setForm(blank); setEditId(null); setShowForm(true); }
  function openEdit(p) { setForm({ name: p.name, category: p.category, unit: p.unit, store: p.store }); setEditId(p._id); setShowForm(true); }
  function cancel() { setShowForm(false); setEditId(null); }

  async function save() {
    if (!form.name.trim() || !form.category.trim() || !form.unit) {
      showToast('Name, category and unit are required'); return;
    }
    if (editId) {
      const res = await authFetch(`/api/products/${editId}`, { method: 'PATCH', body: JSON.stringify(form) });
      const updated = await res.json();
      setProducts(prev => prev.map(p => p._id === editId ? updated : p));
      showToast('Product updated ✓');
    } else {
      const res = await authFetch('/api/products', { method: 'POST', body: JSON.stringify(form) });
      const created = await res.json();
      setProducts(prev => [...prev, created].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
      showToast('Product added ✓');
    }
    cancel();
  }

  async function remove(id) {
    await authFetch(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p._id !== id));
    showToast('Product removed');
  }

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category))).sort()];
  const displayed = catFilter === 'All' ? products : products.filter(p => p.category === catFilter);

  const grouped = displayed.reduce((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <div className="page-title">Product Catalog</div>
      <div className="page-sub">Manage products that staff can order from</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={openAdd}>+ Add product</button>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button
              key={c}
              className={`btn btn-sm ${catFilter === c ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCatFilter(c)}
            >{c}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="add-form" style={{ marginBottom: 20 }}>
          <div className="section-label">{editId ? 'Edit product' : 'New product'}</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Oat Milk" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Dairy, Dry Goods" list="cat-suggestions" />
              <datalist id="cat-suggestions">
                {Array.from(new Set(products.map(p => p.category))).sort().map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="">— select unit —</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Available for</label>
              <select className="form-select" value={form.store} onChange={e => setForm(f => ({ ...f, store: e.target.value }))}>
                {STORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>{editId ? 'Save changes' : 'Add product'}</button>
            <button className="btn btn-sm btn-outline" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="card"><div className="empty"><div className="empty-icon">📦</div>No products yet — add one above</div></div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <div className="card" key={cat} style={{ marginBottom: 12 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>{cat}</div>
            {items.map(p => (
              <div className="stock-item" key={p._id}>
                <div>
                  <div className="stock-name">{p.name}</div>
                  <div className="stock-meta">{p.unit} · {p.store}</div>
                </div>
                <div className="stock-actions" style={{ gap: 6 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => remove(p._id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}
