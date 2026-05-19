import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

const CATEGORIES = ['syrup','sauce','base','prep','other'];

const EMPTY_FORM = {
  title: '', category: 'prep', yield: '',
  ingredients: [{ amount: '', name: '' }],
  steps: [''],
  notes: '',
};

function badge(cat) {
  const map = {
    syrup: { bg: '#FDF4FF', color: '#7E22CE', label: 'Syrup' },
    sauce: { bg: '#FFF7ED', color: '#C2410C', label: 'Sauce' },
    base:  { bg: '#EFF6FF', color: '#1D4ED8', label: 'Base'  },
    prep:  { bg: '#F0FDF4', color: '#15803D', label: 'Prep'  },
    other: { bg: '#F8FAFC', color: '#475569', label: 'Other' },
  };
  return map[cat] || map.other;
}

export default function Recipes() {
  const { user } = useAuth();
  const { showToast } = useApp();
  const canManage = ['boss', 'teamleader'].includes(user?.role);

  const [recipes, setRecipes]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    authFetch('/api/recipes').then(r => r.json()).then(data => {
      setRecipes(data);
      setLoading(false);
    });
  }, []);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setExpandedId(null);
  }

  function openEdit(r) {
    setForm({
      title: r.title,
      category: r.category || 'prep',
      yield: r.yield || '',
      ingredients: r.ingredients.length ? r.ingredients.map(i => ({ ...i })) : [{ amount: '', name: '' }],
      steps: r.steps.length ? [...r.steps] : [''],
      notes: r.notes || '',
    });
    setEditingId(r._id);
    setShowForm(true);
    setExpandedId(null);
  }

  function closeForm() { setShowForm(false); setEditingId(null); }

  /* ── ingredients ── */
  function setIng(idx, field, val) {
    setForm(f => ({ ...f, ingredients: f.ingredients.map((r, i) => i === idx ? { ...r, [field]: val } : r) }));
  }
  function addIng()        { setForm(f => ({ ...f, ingredients: [...f.ingredients, { amount: '', name: '' }] })); }
  function removeIng(idx)  { setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) })); }

  /* ── steps ── */
  function setStep(idx, val) {
    setForm(f => ({ ...f, steps: f.steps.map((s, i) => i === idx ? val : s) }));
  }
  function addStep()       { setForm(f => ({ ...f, steps: [...f.steps, ''] })); }
  function removeStep(idx) { setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) })); }

  async function save() {
    if (!form.title.trim()) { showToast('Enter a recipe title'); return; }
    setSaving(true);
    const payload = {
      ...form,
      ingredients: form.ingredients.filter(i => i.name.trim()),
      steps: form.steps.filter(s => s.trim()),
    };
    try {
      const url    = editingId ? `/api/recipes/${editingId}` : '/api/recipes';
      const method = editingId ? 'PATCH' : 'POST';
      const res    = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data   = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed'); return; }
      setRecipes(prev => editingId
        ? prev.map(r => r._id === editingId ? data : r)
        : [data, ...prev]
      );
      closeForm();
      showToast(editingId ? 'Recipe updated ✓' : 'Recipe added ✓');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await authFetch(`/api/recipes/${id}`, { method: 'DELETE' });
    setRecipes(prev => prev.filter(r => r._id !== id));
    showToast('Recipe removed');
  }

  const visible = recipes.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>;

  return (
    <>
      <div className="page-title">Recipes</div>
      <div className="page-sub">Preparation guides for syrups, sauces &amp; bases</div>

      {/* Toolbar */}
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          style={{ width: 200, padding: '6px 10px', fontSize: 13 }}
          placeholder="Search recipes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ New recipe</button>
        )}
      </div>

      {/* Form */}
      {canManage && showForm && (
        <div className="add-form" style={{ marginBottom: 16 }}>
          <div className="section-label">{editingId ? 'Edit recipe' : 'New recipe'}</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Recipe title</label>
              <input className="form-input" value={form.title} autoFocus
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Matcha Syrup" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: 220 }}>
            <label className="form-label">Yield (optional)</label>
            <input className="form-input" value={form.yield}
              onChange={e => setForm(f => ({ ...f, yield: e.target.value }))}
              placeholder="e.g. Makes 1 litre" />
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Ingredients</div>
            {form.ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input className="form-input" style={{ flex: '0 0 120px' }}
                  placeholder="Amount" value={ing.amount}
                  onChange={e => setIng(idx, 'amount', e.target.value)} />
                <input className="form-input" style={{ flex: 1 }}
                  placeholder="Ingredient" value={ing.name}
                  onChange={e => setIng(idx, 'name', e.target.value)} />
                <button onClick={() => removeIng(idx)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={addIng}>+ Add ingredient</button>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Steps</div>
            {form.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'var(--espresso)',
                  color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 10,
                }}>{idx + 1}</div>
                <textarea className="form-input form-textarea"
                  style={{ flex: 1, minHeight: 60, resize: 'vertical' }}
                  placeholder={`Step ${idx + 1}…`}
                  value={step}
                  onChange={e => setStep(idx, e.target.value)} />
                <button onClick={() => removeStep(idx)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px', flexShrink: 0, marginTop: 8 }}>×</button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={addStep}>+ Add step</button>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Store in fridge for up to 2 weeks" />
          </div>

          <div className="flex-gap">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? <><span className="btn-spinner" /> Saving…</> : editingId ? 'Save changes' : 'Add recipe'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={closeForm} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {/* Empty */}
      {visible.length === 0 && !showForm && (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📖</div>
            {recipes.length === 0 ? 'No recipes yet' : 'No recipes match your search'}
            {canManage && recipes.length === 0 && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add first recipe</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipe cards */}
      {visible.map(r => {
        const isExpanded = expandedId === r._id;
        const b = badge(r.category);
        return (
          <div key={r._id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
            {/* Header row */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : r._id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 20px', cursor: 'pointer',
                background: isExpanded ? 'var(--milk)' : '#fff',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: b.bg, color: b.color,
                  }}>{b.label}</span>
                  {r.yield && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.yield}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}
                  {r.steps.length > 0 && ` · ${r.steps.length} step${r.steps.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{isExpanded ? '▲' : '▼'}</span>
            </div>

            {/* Expanded */}
            {isExpanded && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)', background: 'var(--milk)' }}>

                {/* Ingredients */}
                {r.ingredients.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Ingredients
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {r.ingredients.map((ing, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 16, padding: '9px 14px',
                          borderBottom: i < r.ingredients.length - 1 ? '1px solid var(--border)' : 'none',
                          fontSize: 13,
                        }}>
                          <span style={{ color: 'var(--latte)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>{ing.amount}</span>
                          <span style={{ fontWeight: 500 }}>{ing.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps */}
                {r.steps.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Method
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {r.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%', background: 'var(--espresso)',
                            color: '#fff', fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>{i + 1}</div>
                          <div style={{ fontSize: 14, lineHeight: 1.55, paddingTop: 4 }}>{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {r.notes && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {r.notes}
                  </div>
                )}

                {/* Actions */}
                {canManage && (
                  <div className="flex-gap" style={{ marginTop: 16 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r._id)}>Remove</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
