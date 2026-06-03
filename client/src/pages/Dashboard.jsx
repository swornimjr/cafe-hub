import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';
import { weekOfString, formatWeekRange } from '../utils/week.js';
import { SkeletonCard, SkeletonList } from '../components/Skeleton.jsx';

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const todayLabel  = DAY_LABELS[new Date().getDay()];
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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const STORE_THEMES = {
  Atrium: {
    bg:        '#a8f6bf',
    headerBg:  '#16a34a',
    border:    '#4ade80',
    rowBorder: '#bbf7d0',
    label:     '#ffffff',
    nameColor: '#14532d',
    timeColor: '#15803d',
    emptyColor:'#86efac',
    icon:      '☕',
  },
  Cleanskin: {
    bg:        '#343c4d',
    headerBg:  '#1e293b',
    border:    '#334155',
    rowBorder: '#1e293b',
    label:     '#94a3b8',
    nameColor: '#f1f5f9',
    timeColor: '#64748b',
    emptyColor:'#475569',
    icon:      '🍽️',
  },
};

export default function Dashboard({ role, onStockCount, onTabChange }) {
  const { user } = useAuth();
  const { showToast } = useApp();
  const isBoss = role === 'boss';

  const [stock, setStock]   = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [latestAnnouncements, setLatestAnnouncements] = useState([]);

  useEffect(() => {
    const fetches = [
      authFetch(`/api/roster?weekOf=${currentWeekOf}`).then(r => r.json()),
      authFetch('/api/announcements').then(r => r.json()),
    ];
    if (isBoss) {
      fetches.push(authFetch('/api/stock').then(r => r.json()));
    }
    Promise.all(fetches).then(([r, ann, s]) => {
      setShifts(r);
      setLatestAnnouncements(ann.slice(0, 1));
      if (s) { setStock(s); onStockCount?.(s.filter(x => x.status === 'pending').length); }
      setLoading(false);
    });
  }, []);

  const byStart = (a, b) => parseStartHour(a.time) - parseStartHour(b.time);
  const todayShifts    = shifts.filter(s => s.day === todayLabel);
  const atriumToday    = todayShifts.filter(s => s.store === 'Atrium').sort(byStart);
  const cleanskinToday = todayShifts.filter(s => s.store === 'Cleanskin').sort(byStart);
  const myShiftsWeek   = shifts.filter(s => s.name === user?.name);
  const pending  = stock.filter(r => r.status === 'pending');
  const approved = stock.filter(r => r.status === 'approved');

  async function approve(id) {
    setApprovingId(id);
    const res = await authFetch(`/api/stock/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
    const updated = await res.json();
    setStock(prev => prev.map(r => r._id === id ? updated : r));
    onStockCount?.(pending.length - 1);
    setApprovingId(null);
  }

  const dateStr = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) return (
    <div className="page">
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <SkeletonCard lines={2} titleWidth="50%" />
        <SkeletonCard lines={2} titleWidth="50%" />
      </div>
      <SkeletonList rows={4} />
    </div>
  );

  /* ── STAFF VIEW ── */
  if (!isBoss) {
    const myToday = myShiftsWeek.filter(s => s.day === todayLabel);
    return (
      <>
        {/* Greeting banner — same style as boss */}
        <div style={{
          background: 'linear-gradient(120deg, var(--espresso) 0%, #2d3f55 100%)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              {greeting()}, {user?.name?.split(' ')[0]}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{dateStr}</div>
          </div>
          <div style={{ fontSize: 32, opacity: 0.85 }}>
            {new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 17 ? '🌤️' : '🌙'}
          </div>
        </div>

        {/* Announcements banner */}
        {latestAnnouncements.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {latestAnnouncements.map(a => (
              <div key={a._id} style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>📢 {a.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{a.body}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Posted by {a.createdBy}</div>
                  <button
                    onClick={() => onTabChange?.('announcements')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#d97706', fontWeight: 600, padding: 0 }}
                  >View all →</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Today card */}
        <div className="card">
          <div className="card-title">Your shift today</div>
          {myToday.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>You're off today — enjoy!</div>
            : myToday.map(s => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--espresso)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>☕</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{s.store}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.time}</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* This week */}
        <div className="card">
          <div className="card-title">Your week — {formatWeekRange(currentWeekOf)}</div>
          {myShiftsWeek.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No shifts scheduled this week</div>
            : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
              const dayShifts = myShiftsWeek.filter(s => s.day === day);
              const isToday = day === todayLabel;
              return (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 38, fontSize: 12, fontWeight: 600, color: isToday ? 'var(--latte)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                    {day}
                  </div>
                  {dayShifts.length === 0
                    ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Off</span>
                    : dayShifts.map(s => (
                      <span key={s._id} className="shift-pill" style={isToday ? { background: 'var(--espresso)', color: '#fff', borderColor: 'var(--espresso)' } : {}}>
                        {s.time} <span className="time" style={isToday ? { color: 'var(--latte-light)' } : {}}>{s.store}</span>
                      </span>
                    ))
                  }
                </div>
              );
            })
          }
        </div>
      </>
    );
  }

  /* ── BOSS VIEW ── */
  return (
    <>
      {/* Greeting banner */}
      <div style={{
        background: 'linear-gradient(120deg, var(--espresso) 0%, #2d3f55 100%)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{greeting()}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{dateStr}</div>
        </div>
        <div style={{ fontSize: 32, opacity: 0.85 }}>
          {new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 17 ? '🌤️' : '🌙'}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        {[
          { count: pending.length,  label: 'Pending stock',  icon: '📦', color: 'var(--amber)', lightBg: 'var(--amber-light)' },
          { count: approved.length, label: 'Ready to send',  icon: '✅', color: 'var(--green)', lightBg: 'var(--green-light)' },
        ].map(({ count, label, icon, color, lightBg }) => (
          <div key={label} className="stat-card" style={{
            borderLeft: `3px solid ${count > 0 ? color : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 18px', textAlign: 'left',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: count > 0 ? lightBg : 'var(--foam)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{icon}</div>
            <div>
              <div className="stat-num" style={{ color: count > 0 ? color : undefined, fontSize: 26, marginBottom: 2 }}>{count}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's roster — both stores */}
      <div className="card">
        <div className="card-title">
          Today's roster — {todayLabel}
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{formatWeekRange(currentWeekOf)}</span>
        </div>
        <div className="roster-today-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[{ store: 'Atrium', shifts: atriumToday }, { store: 'Cleanskin', shifts: cleanskinToday }].map(({ store, shifts }) => {
            const t = STORE_THEMES[store];
            return (
              <div key={store} style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden', background: t.bg }}>
                {/* Store header */}
                <div style={{
                  background: t.headerBg, padding: '9px 14px',
                  borderBottom: `1px solid ${t.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.label, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {t.icon} {store}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.label, opacity: 0.7 }}>
                    {shifts.length} staff
                  </div>
                </div>
                {/* Shift rows */}
                <div style={{ padding: '4px 0' }}>
                  {shifts.length === 0
                    ? <div style={{ fontSize: 12, color: t.emptyColor, padding: '10px 14px' }}>No shifts today</div>
                    : shifts.map((s, i) => (
                      <div key={s._id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: 13, padding: '7px 14px',
                        borderBottom: i < shifts.length - 1 ? `1px solid ${t.rowBorder}` : 'none',
                      }}>
                        <span style={{ fontWeight: 600, color: t.nameColor }}>{s.name}</span>
                        <span style={{ color: t.timeColor, fontSize: 12 }}>{s.time}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending stock requests */}
      {pending.length > 0 && (
        <div className="card">
          <div className="card-title">
            Pending stock requests
            <span className="badge pending">{pending.length} pending</span>
          </div>
          {pending.map(r => (
            <div key={r._id} className="stock-item">
              <div>
                <div className="stock-name">{r.item} {r.urgent && <span className="badge urgent" style={{ marginLeft: 6 }}>Urgent</span>}</div>
                <div className="stock-meta">Qty {r.qty} {r.unit && `· ${r.unit}`} · {r.store} {r.note && `· ${r.note}`}</div>
              </div>
              <button className="btn btn-green btn-sm" onClick={() => approve(r._id)} disabled={approvingId === r._id}>
                {approvingId === r._id ? <><span className="btn-spinner" /> Approving…</> : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
