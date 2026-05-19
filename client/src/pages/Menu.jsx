import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

const CATEGORIES = [
  { key: 'drink',  label: 'Drinks',  icon: '☕' },
  { key: 'food',   label: 'Food',    icon: '🍽️' },
  { key: 'retail', label: 'Retail',  icon: '📦' },
];

const CATEGORY_COLORS = {
  drink:  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  food:   { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  retail: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
};

const EMPTY_INGREDIENT = { name: '', amount: '' };
const EMPTY_FORM = { name: '', category: 'drink', price: '', ingredients: [{ name: '', amount: '' }], notes: '' };

export default function Menu() {
  const { user } = useAuth();
  const { showToast } = useApp();
  const canManage = ['boss', 'teamleader'].includes(user?.role);

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    authFetch('/api/menu').then(r => r.json()).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item) {
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      ingredients: item.ingredients.length ? item.ingredients.map(i => ({ ...i })) : [{ name: '', amount: '' }],
      notes: item.notes || '',
    });
    setEditingId(item._id);
    setShowForm(true);
    setExpandedId(null);
  }

  function closeForm() { setShowForm(false); setEditingId(null); }

  function setIngredient(idx, field, val) {
    setForm(f => {
      const ing = f.ingredients.map((r, i) => i === idx ? { ...r, [field]: val } : r);
      return { ...f, ingredients: ing };
    });
  }

  function addIngredient() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', amount: '' }] }));
  }

  function removeIngredient(idx) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!form.name.trim()) { showToast('Enter a product name'); return; }
    if (form.price === '' || isNaN(Number(form.price))) { showToast('Enter a valid price'); return; }
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      ingredients: form.ingredients.filter(i => i.name.trim()),
    };
    try {
      const url    = editingId ? `/api/menu/${editingId}` : '/api/menu';
      const method = editingId ? 'PATCH' : 'POST';
      const res    = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data   = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed'); return; }
      setItems(prev => editingId
        ? prev.map(i => i._id === editingId ? data : i)
        : [data, ...prev]
      );
      closeForm();
      showToast(editingId ? 'Item updated ✓' : 'Item added ✓');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    const res = await authFetch(`/api/menu/${id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Failed to delete'); return; }
    setItems(prev => prev.filter(i => i._id !== id));
    showToast('Item removed');
  }

  const visible = items.filter(i => {
    if (filter !== 'all' && i.category !== filter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = CATEGORIES.map(c => ({
    ...c,
    items: visible.filter(i => i.category === c.key),
  })).filter(g => g.items.length > 0);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>;

  return (
    <>
      <div className="page-title">Menu</div>
      <div className="page-sub">Product prices &amp; ingredients reference</div>

      {/* Toolbar */}
      <div className="flex-between" style={{ marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All' }, ...CATEGORIES.map(c => ({ key: c.key, label: c.label }))].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: filter === f.key ? 'var(--espresso)' : '#fff',
                color: filter === f.key ? '#fff' : 'var(--text)',
              }}
            >{f.label}</button>
          ))}
        </div>
        <div className="flex-gap">
          <input
            className="form-input"
            style={{ width: 180, maxWidth: '100%', padding: '6px 10px', fontSize: 13 }}
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add item</button>
          )}
        </div>
      </div>

      {/* Add / Edit form */}
      {canManage && showForm && (
        <div className="add-form" style={{ marginBottom: 16 }}>
          <div className="section-label">{editingId ? 'Edit item' : 'New menu item'}</div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Product name</label>
              <input className="form-input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Flat White" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="drink">☕ Drink</option>
                <option value="food">🍽️ Food</option>
                <option value="retail">📦 Retail</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: 160 }}>
            <label className="form-label">Selling price ($)</label>
            <input className="form-input" type="number" min="0" step="0.50" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="5.50" />
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 12 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Ingredients</div>
            {form.ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ flex: 2 }}
                  placeholder="e.g. Espresso"
                  value={ing.name}
                  onChange={e => setIngredient(idx, 'name', e.target.value)}
                />
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="e.g. 2 shots"
                  value={ing.amount}
                  onChange={e => setIngredient(idx, 'amount', e.target.value)}
                />
                <button
                  onClick={() => removeIngredient(idx)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}
                >×</button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={addIngredient} style={{ marginTop: 2 }}>
              + Add ingredient
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Contains dairy, ask about oat milk option" />
          </div>

          <div className="flex-gap">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? <><span className="btn-spinner" /> Saving…</> : editingId ? 'Save changes' : 'Add to menu'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={closeForm} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && !showForm && (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📋</div>
            {items.length === 0 ? 'No menu items yet' : 'No items match your search'}
            {canManage && items.length === 0 && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add first item</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grouped item list */}
      {grouped.map(group => {
        const col = CATEGORY_COLORS[group.key];
        return (
          <div key={group.key} style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: col.text, marginBottom: 8,
            }}>
              <span>{group.icon}</span> {group.label}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {group.items.map((item, idx) => {
                const isExpanded = expandedId === item._id;
                const isLast = idx === group.items.length - 1;
                return (
                  <div key={item._id}
                    style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}
                  >
                    {/* Item row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item._id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', cursor: 'pointer', gap: 12,
                        background: isExpanded ? 'var(--milk)' : '#fff',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: col.text,
                        }} />
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1 }}>
                          {item.name}
                        </div>
                        {item.ingredients.length > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {item.ingredients.length} ingredient{item.ingredients.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{
                          fontWeight: 800, fontSize: 16, color: 'var(--latte)',
                          letterSpacing: '-0.02em',
                        }}>
                          ${Number(item.price).toFixed(2)}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 20px 16px 20px',
                        background: 'var(--milk)',
                        borderTop: '1px solid var(--border)',
                      }}>
                        {item.ingredients.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                              Ingredients
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {item.ingredients.map((ing, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                  <span style={{ fontWeight: 500 }}>{ing.name}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>{ing.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.notes && (
                          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {item.notes}
                          </div>
                        )}

                        {canManage && (
                          <div className="flex-gap" style={{ marginTop: 14 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => remove(item._id)}>Remove</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
