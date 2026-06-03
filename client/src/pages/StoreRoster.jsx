import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authFetch } from '../api.js';
import { weekOfString, addWeeks, formatWeekRange } from '../utils/week.js';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const todayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
const currentWeekOf = weekOfString();

function parseStartHour(time) {
  try {
    const part = time.split('–')[0];
    const pm = /pm/i.test(part);
    const stripped = part.replace(/[apm\s]/gi, '').trim();
    let h = stripped.includes(':')
      ? parseInt(stripped) + parseInt(stripped.split(':')[1]) / 60
      : parseFloat(stripped);
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h;
  } catch { return 9; }
}

const TIMES = [
  '4am','4:30am','5am','5:30am','6am','6:30am','7am','7:30am','8am','8:30am','9am','9:30am',
  '10am','10:30am','11am','11:30am','12pm','12:30pm','1pm','1:30pm','2pm','2:30pm',
  '3pm','3:30pm','4pm','4:30pm','5pm','5:30pm','6pm','6:30pm','7pm','7:30pm','8pm','9pm','10pm',
];

const STORE_PILL = {
  Atrium: {
    bg: '#dcfce7', border: '#86efac', color: '#14532d',
    timeFg: 'rgb(0, 0, 0)',
    meBg: '#16a34a', meBorder: '#16a34a', meColor: '#fff', meTimeFg: '#86efac',
    youBg: '#fff', youColor: '#15803d',
  },
  Cleanskin: {
    bg: '#1e293b', border: '#334155', color: '#e2e8f0',
    timeFg: '#ffffff',
    meBg: '#0f172a', meBorder: '#0f172a', meColor: '#f1f5f9', meTimeFg: '#4ade80',
    youBg: '#16a34a', youColor: '#fff',
  },
};

export default function StoreRoster({ role, store }) {
  const { showToast } = useApp();
  const { user } = useAuth();
  const isBoss = role === 'boss';

  const [weekOf, setWeekOf] = useState(currentWeekOf);
  const [shifts, setShifts] = useState([]);
  const [published, setPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ day: 'Mon', name: '', start: '7am', end: '3pm' });
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [publishResult, setPublishResult] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [notifying, setNotifying] = useState(false);
  const formRef = useRef(null);
  const nameSelectRef = useRef(null);

  useEffect(() => {
    authFetch('/api/auth/users').then(r => r.json()).then(users => {
      setStaffList(users.filter(u =>
        u.role === store.toLowerCase() ||
        (u.role === 'teamleader' && u.originalRole === store.toLowerCase())
      ));
    });
  }, [store]);

  useEffect(() => { setPendingChanges([]); }, [weekOf, store]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch(`/api/roster?store=${store}&weekOf=${weekOf}`).then(r => r.json()),
      authFetch(`/api/roster/publish-status?store=${store}&weekOf=${weekOf}`).then(r => r.json()),
    ]).then(([s, pub]) => {
      setShifts(s);
      setPublished(pub.published);
      setPublishedAt(pub.publishedAt);
      setLoading(false);
    });
  }, [weekOf, store]);

  async function saveShift() {
    if (!form.name) { showToast('Please select a staff member'); return; }
    setSaving(true);
    try {
      const time = `${form.start}–${form.end}`;
      if (editingId) {
        const oldShift = shifts.find(s => s._id === editingId);
        const res = await authFetch(`/api/roster/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ day: form.day, name: form.name, time }),
        });
        const updated = await res.json();
        setShifts(prev => prev.map(s => s._id === editingId ? updated : s));
        if (published) setPendingChanges(prev => [...prev, { type: 'updated', name: form.name, day: form.day, time, oldTime: oldShift?.time }]);
        showToast('Shift updated ✓');
      } else {
        const res = await authFetch('/api/roster', {
          method: 'POST',
          body: JSON.stringify({ day: form.day, name: form.name, time, store, weekOf }),
        });
        const newShift = await res.json();
        setShifts(prev => [...prev, newShift]);
        if (published) setPendingChanges(prev => [...prev, { type: 'added', name: form.name, day: form.day, time }]);
        showToast('Shift added ✓');
      }
      setForm({ day: 'Mon', name: '', start: '7am', end: '3pm' });
      setEditingId(null);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteShift(id) {
    const shift = shifts.find(s => s._id === id);
    await authFetch(`/api/roster/${id}`, { method: 'DELETE' });
    setShifts(prev => prev.filter(s => s._id !== id));
    if (published && shift) setPendingChanges(prev => [...prev, { type: 'removed', name: shift.name, day: shift.day, time: shift.time }]);
    showToast('Shift removed');
  }

  async function publishRoster() {
    setPublishing(true);
    try {
      const weekRange = formatWeekRange(weekOf);
      const res = await authFetch('/api/roster/publish', {
        method: 'POST',
        body: JSON.stringify({ store, weekOf, weekRange }),
      });

      const emailSent = res.headers.get('X-Email-Sent') === 'true';
      const staffNotified = parseInt(res.headers.get('X-Staff-Notified') || '0', 10);
      const staffFailed = parseInt(res.headers.get('X-Staff-Failed') || '0', 10);
      const staffNoEmail = parseInt(res.headers.get('X-Staff-No-Email') || '0', 10);
      const publishedAt = res.headers.get('X-Published-At');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster-${store.toLowerCase()}-${weekOf}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setPublished(true);
      setPublishedAt(publishedAt);
      setPublishResult({ emailSent, staffNotified, staffFailed, staffNoEmail, weekRange });
      showToast(`${store} roster published ✓`);
    } finally {
      setPublishing(false);
    }
  }

  async function copyFromLastWeek() {
    setCopying(true);
    try {
      const fromWeekOf = addWeeks(weekOf, -1);
      const res = await authFetch('/api/roster/copy-week', {
        method: 'POST',
        body: JSON.stringify({ store, fromWeekOf, toWeekOf: weekOf }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'No shifts found for last week'); return; }
      setShifts(data);
      showToast(`Copied ${data.length} shifts from last week ✓`);
    } finally {
      setCopying(false);
    }
  }

  async function notifyChanges() {
    setNotifying(true);
    try {
      const weekRange = formatWeekRange(weekOf);
      const res = await authFetch('/api/roster/notify-changes', {
        method: 'POST',
        body: JSON.stringify({ store, weekOf, weekRange, changes: pendingChanges }),
      });
      const data = await res.json();
      setPendingChanges([]);
      showToast(`Notified ${data.notified} staff member${data.notified === 1 ? '' : 's'} ✓`);
    } finally {
      setNotifying(false);
    }
  }

  async function unpublishRoster() {
    setPublishing(true);
    try {
      await authFetch('/api/roster/unpublish', {
        method: 'POST',
        body: JSON.stringify({ store, weekOf }),
      });
      setPublished(false);
      setPublishedAt(null);
      showToast('Roster unpublished');
    } finally {
      setPublishing(false);
    }
  }

  const isCurrentWeek = weekOf === currentWeekOf;

  return (
    <>
      <div className="page-title">{store} Roster</div>

      {/* Week navigator */}
      <div className="roster-nav">
        <div className="flex-gap">
          <button className="btn btn-outline btn-sm" onClick={() => setWeekOf(w => addWeeks(w, -1))}>← Prev</button>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {formatWeekRange(weekOf)}
            {isCurrentWeek && <span className="today-badge" style={{ marginLeft: 8 }}>This week</span>}
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setWeekOf(w => addWeeks(w, 1))}>Next →</button>
        </div>

        {/* Publish controls (boss only) */}
        {isBoss && (
          <div className="flex-gap">
            <button className="btn btn-outline btn-sm" onClick={copyFromLastWeek} disabled={copying || publishing}>
              {copying ? <><span className="btn-spinner" /> Copying…</> : 'Copy last week'}
            </button>
            {published ? (
              <>
                <span className="badge approved">Published {publishedAt ? new Date(publishedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</span>
                {pendingChanges.length > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={notifyChanges} disabled={notifying}>
                    {notifying ? <><span className="btn-spinner" /> Notifying…</> : `Save & Notify (${pendingChanges.length})`}
                  </button>
                )}
                <button className="btn btn-outline btn-sm" onClick={unpublishRoster} disabled={publishing}>
                  {publishing ? <span className="btn-spinner" /> : 'Unpublish'}
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={publishRoster} disabled={publishing}>
                {publishing ? <><span className="btn-spinner" /> Publishing…</> : 'Publish roster'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Publish result banner */}
      {isBoss && publishResult && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', marginBottom: 16, position: 'relative' }}>
          <button style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => setPublishResult(null)}>✕</button>
          <div style={{ fontWeight: 600, color: '#166534', marginBottom: 4 }}>{store} roster published — {publishResult.weekRange}</div>
          <div style={{ fontSize: 13, color: '#166534', marginBottom: 6 }}>
            {publishResult.emailSent ? '✓ Roster PDF emailed to store' : '⚠ Store email not sent (check Settings)'}
            {' · '}PDF downloaded
          </div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            {publishResult.staffNotified > 0 && (
              <span style={{ color: '#166534' }}>✓ {publishResult.staffNotified} staff notified by email</span>
            )}
            {publishResult.staffFailed > 0 && (
              <span style={{ color: '#b45309', marginLeft: publishResult.staffNotified > 0 ? 8 : 0 }}>
                ⚠ {publishResult.staffFailed} staff email{publishResult.staffFailed > 1 ? 's' : ''} failed — check email settings or verify your domain in Resend
              </span>
            )}
            {publishResult.staffNoEmail > 0 && (
              <span style={{ color: '#6b7280', marginLeft: (publishResult.staffNotified > 0 || publishResult.staffFailed > 0) ? 8 : 0 }}>
                · {publishResult.staffNoEmail} staff have no email saved
              </span>
            )}
            {publishResult.staffNotified === 0 && publishResult.staffFailed === 0 && publishResult.staffNoEmail === 0 && (
              <span style={{ color: '#6b7280' }}>No staff on this roster</span>
            )}
          </div>
          <button
            className="btn btn-sm"
            style={{ background: '#25D366', color: '#fff', border: 'none' }}
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${store} roster for ${publishResult.weekRange} has been published — check your email for the PDF.`)}`, '_blank')}
          >Share on WhatsApp</button>
        </div>
      )}

      {/* Staff: not yet published message */}
      {!isBoss && !published && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Roster not yet published</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Check back soon — your boss is still working on it</div>
        </div>
      )}

      {/* Roster grid */}
      {(isBoss || published) && (
        <div className="card">
          {DAYS.map(d => {
            const dayShifts = shifts.filter(s => s.day === d).sort((a, b) => parseStartHour(a.time) - parseStartHour(b.time));
            const isToday = d === todayLabel && isCurrentWeek;
            return (
              <div className="day-row" key={d}>
                <div className="day-label">
                  {d} {isToday && <span className="today-badge">TODAY</span>}
                </div>
                <div className="shifts">
                  {dayShifts.length === 0
                    ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    : dayShifts.map(s => {
                      const isMe = s.name === user.name;
                      const th = STORE_PILL[store] || STORE_PILL.Atrium;
                      return (
                        <div
                          className="shift-pill"
                          key={s._id}
                          style={isMe
                            ? { background: th.meBg, color: th.meColor, borderColor: th.meBorder, fontWeight: 600 }
                            : { background: th.bg, color: th.color, borderColor: th.border }
                          }
                        >
                          {s.name}
                          <span className="time" style={{ color: isMe ? th.meTimeFg : th.timeFg }}>{s.time}</span>
                          {isMe && <span style={{ fontSize: 10, background: th.youBg, color: th.youColor, borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>You</span>}
                          {isBoss && (<>
                            <span
                              onClick={() => {
                                const [start, end] = s.time.split('–');
                                setForm({ day: s.day, name: s.name, start, end });
                                setEditingId(s._id);
                                setShowForm(true);
                                setTimeout(() => {
                                  formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  nameSelectRef.current?.focus();
                                }, 50);
                              }}
                              style={{ cursor: 'pointer', color: isMe ? th.meTimeFg : th.timeFg, fontSize: 11, marginLeft: 4, opacity: 0.8 }}
                              title="Edit shift"
                            >✎</span>
                            <span
                              onClick={() => deleteShift(s._id)}
                              style={{ cursor: 'pointer', color: isMe ? th.meTimeFg : th.timeFg, fontSize: 13, marginLeft: 2, opacity: 0.8 }}
                              title="Remove shift"
                            >×</span>
                          </>)}
                        </div>
                      );
                    })
                  }
                  {isBoss && (
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      setForm(f => ({ ...f, day: d, name: '', start: '7am', end: '3pm' }));
                      setShowForm(true);
                      setTimeout(() => {
                        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        nameSelectRef.current?.focus();
                      }, 50);
                    }}>
                      + Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add shift form (boss only) */}
      {isBoss && showForm && (
        <div className="add-form" ref={formRef}>
          <div className="section-label">{editingId ? 'Edit shift' : 'Add shift'} — {store}</div>
          <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Day</label>
              <select className="form-select" value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Staff name</label>
              <select className="form-select" ref={nameSelectRef} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}>
                <option value="">Select staff…</option>
                {staffList.map(u => <option key={u._id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start time</label>
              <select className="form-select" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">End time</label>
              <select className="form-select" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))}>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveShift} disabled={saving}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : editingId ? 'Update shift' : 'Save shift'}
          </button>
          <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => { setShowForm(false); setEditingId(null); setForm({ day: 'Mon', name: '', start: '7am', end: '3pm' }); }} disabled={saving}>Cancel</button>
        </div>
      )}
    </>
  );
}
