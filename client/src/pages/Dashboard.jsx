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

const STORE_COLORS = {
  Atrium:    { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  Cleanskin: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
};

export default function Dashboard({ role, onStockCount }) {
  const { user } = useAuth();
  const { showToast } = useApp();
  const isBoss = role === 'boss';

  const [stock, setStock]   = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    const fetches = [
      authFetch(`/api/roster?weekOf=${currentWeekOf}`).then(r => r.json()),
    ];
    if (isBoss) {
      fetches.push(authFetch('/api/stock').then(r => r.json()));
    }
    Promise.all(fetches).then(([r, s]) => {
      setShifts(r);
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
        <div className="page-title">{greeting()}, {user?.name?.split(' ')[0]}</div>
        <div className="page-sub">{dateStr} · {formatWeekRange(currentWeekOf)}</div>

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
      <div className="page-title">{greeting()}</div>
      <div className="page-sub">{dateStr}</div>

      {/* Stat cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="stat-card">
          <div className="stat-num" style={pending.length > 0 ? { color: 'var(--amber)' } : {}}>{pending.length}</div>
          <div className="stat-label">Pending stock</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={approved.length > 0 ? { color: 'var(--green)' } : {}}>{approved.length}</div>
          <div className="stat-label">Ready to send</div>
        </div>
      </div>

      {/* Today's roster — both stores */}
      <div className="card">
        <div className="card-title">
          Today's roster — {todayLabel}
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{formatWeekRange(currentWeekOf)}</span>
        </div>
        <div className="roster-today-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[{ store: 'Atrium', shifts: atriumToday }, { store: 'Cleanskin', shifts: cleanskinToday }].map(({ store, shifts }) => {
            const col = STORE_COLORS[store];
            return (
              <div key={store} style={{ border: `1px solid ${col.border}`, borderRadius: 10, padding: '12px 14px', background: col.bg }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: col.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{store}</div>
                {shifts.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No shifts</div>
                  : shifts.map(s => (
                    <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '5px 0', borderBottom: `1px solid ${col.border}` }}>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.time}</span>
                    </div>
                  ))
                }
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
