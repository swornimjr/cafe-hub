import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const todayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];

export default function Roster({ role }) {
  const { showToast } = useApp();
  const [shifts, setShifts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ day: 'Mon', name: '', store: 'Atrium', time: '' });

  const [search, setSearch] = useState('');

  const isBoss = role === 'boss';
  const filterStore = role === 'atrium' ? 'Atrium' : role === 'cleanskin' ? 'Cleanskin' : null;

  useEffect(() => {
    authFetch('/api/roster').then(r => r.json()).then(setShifts);
  }, []);

  async function saveShift() {
    if (!form.name.trim() || !form.time.trim()) { showToast('Please fill in name and time'); return; }
    const res = await authFetch('/api/roster', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    const newShift = await res.json();
    setShifts(prev => [...prev, newShift]);
    setForm({ day: 'Mon', name: '', store: 'Atrium', time: '' });
    setShowForm(false);
    showToast('Shift added ✓');
  }

  return (
    <>
      <div className="page-title">Weekly Roster</div>
      <div className="page-sub">{isBoss ? 'Both stores' : `${filterStore} only`}</div>
      <input
        className="form-input"
        style={{ marginBottom: 12 }}
        placeholder="Search by name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="card">
        {DAYS.map(d => {
          const dayShifts = shifts.filter(s =>
            s.day === d &&
            (!filterStore || s.store === filterStore) &&
            (!search.trim() || s.name.toLowerCase().includes(search.toLowerCase()))
          );
          const isToday = d === todayLabel;
          return (
            <div className="day-row" key={d}>
              <div className="day-label">
                {d} {isToday && <span className="today-badge">TODAY</span>}
              </div>
              <div className="shifts">
                {dayShifts.length === 0
                  ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                  : dayShifts.map(s => (
                    <div className="shift-pill" key={s._id}>
                      {s.name} <span className="time">{s.time}</span>
                      {isBoss && <span className="store-tag">{s.store}</span>}
                    </div>
                  ))
                }
                {isBoss && (
                  <button className="btn btn-outline btn-sm" onClick={() => { setForm(f => ({ ...f, day: d })); setShowForm(true); }}>
                    + Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isBoss && showForm && (
        <div className="add-form">
          <div className="section-label">Add shift</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Day</label>
              <select className="form-select" value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Staff name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Store</label>
              <select className="form-select" value={form.store} onChange={e => setForm(f => ({ ...f, store: e.target.value }))}>
                <option>Atrium</option><option>Cleanskin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="e.g. 7am–3pm" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveShift}>Save shift</button>
          <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      )}
    </>
  );
}
