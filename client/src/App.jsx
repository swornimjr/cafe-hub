import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Login from './components/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StoreRoster from './pages/StoreRoster.jsx';
import Stock from './pages/Stock.jsx';
import Orders from './pages/Orders.jsx';
import Users from './pages/Users.jsx';
import Catalog from './pages/Catalog.jsx';
import Menu from './pages/Menu.jsx';
import Recipes from './pages/Recipes.jsx';
import Announcements from './pages/Announcements.jsx';
import Settings from './pages/Settings.jsx';
import { authFetch } from './api.js';

const TAB_ICONS = {
  dashboard:          '⊞',
  'atrium-roster':    '📋',
  'cleanskin-roster': '📋',
  stock:              '📦',
  menu:               '☕',
  recipes:            '📖',
  announcements:      '📢',
  orders:             '✅',
  catalog:            '🗂️',
  users:              '👥',
  settings:           '⚙️',
};

const ROLE_TABS = {
  boss:       ['dashboard','atrium-roster','cleanskin-roster','stock','menu','recipes','announcements','catalog','users','settings'],
  teamleader: ['dashboard','atrium-roster','cleanskin-roster','stock','menu','recipes','announcements','users'],
  atrium:     ['dashboard','atrium-roster','menu','recipes','announcements'],
  cleanskin:  ['dashboard','cleanskin-roster','menu','recipes','announcements'],
  warehouse:  ['dashboard','orders','announcements'],
};

const TAB_LABELS = {
  dashboard:          'Dashboard',
  'atrium-roster':    'Atrium Roster',
  'cleanskin-roster': 'Cleanskin Roster',
  stock:              'Stock Orders',
  menu:               'Menu',
  recipes:            'Recipes',
  announcements:      'Announcements',
  orders:             'Approved Orders',
  catalog:            'Product Catalog',
  users:              'Staff Accounts',
  settings:           'Settings',
};

function ChangePasswordModal({ onClose }) {
  const { showToast } = useApp();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.current || !form.next) { showToast('Fill in all fields'); return; }
    if (form.next !== form.confirm) { showToast('New passwords do not match'); return; }
    if (form.next.length < 6) { showToast('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      const res = await authFetch('/api/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error); return; }
      showToast('Password changed ✓');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 'min(340px, calc(100vw - 32px))', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 18 }}>Change password</div>
        <div className="form-group">
          <label className="form-label">Current password</label>
          <input type="password" className="form-input" value={form.current}
            onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
            placeholder="Your current password" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">New password</label>
          <input type="password" className="form-input" value={form.next}
            onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
            placeholder="At least 6 characters" />
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Confirm new password</label>
          <input type="password" className="form-input" value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && save()} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ flex: 1 }}>
            {saving ? <><span className="btn-spinner" /> Saving…</> : 'Update password'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PageComponent({ tab, role, onStockCount, onTabChange }) {
  if (tab === 'dashboard')        return <Dashboard role={role} onStockCount={onStockCount} onTabChange={onTabChange} />;
  if (tab === 'atrium-roster')    return <StoreRoster key="atrium" role={role} store="Atrium" />;
  if (tab === 'cleanskin-roster') return <StoreRoster key="cleanskin" role={role} store="Cleanskin" />;
  if (tab === 'stock')            return <Stock role={role} onStockCount={onStockCount} />;
  if (tab === 'menu')             return <Menu />;
  if (tab === 'recipes')          return <Recipes />;
  if (tab === 'announcements')    return <Announcements />;
  if (tab === 'orders')           return <Orders />;
  if (tab === 'catalog')          return <Catalog />;
  if (tab === 'users')            return <Users />;
  if (tab === 'settings')         return <Settings />;
  return null;
}

function AppInner() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(null);
  const [stockCount, setStockCount] = useState(0);
  const [showChangePw, setShowChangePw] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [announcementDot, setAnnouncementDot] = useState(false);

  useEffect(() => { setActiveTab(null); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/announcements').then(r => r.json()).then(data => {
      if (!data.length) return;
      const latest = data[0]._id;
      const seen = localStorage.getItem(`cafehub_ann_seen_${user.id}`);
      setAnnouncementDot(seen !== latest);
    }).catch(() => {});
  }, [user]);

  function handleTabClick(tab) {
    setActiveTab(tab);
    setDrawerOpen(false);
    if (tab === 'announcements') {
      authFetch('/api/announcements').then(r => r.json()).then(data => {
        if (data.length) localStorage.setItem(`cafehub_ann_seen_${user.id}`, data[0]._id);
        setAnnouncementDot(false);
      }).catch(() => {});
    }
  }

  const tabs = user ? ROLE_TABS[user.role] : [];
  const currentTab = activeTab && tabs.includes(activeTab) ? activeTab : tabs[0];

  if (!user) return <Login />;

  return (
    <>
      <div className="topbar">
        <div className="topbar-brand">
          <div className="dot">☕</div>
          <div>
            <span>Cafe Hub</span>
            <small>Atrium &amp; Cleanskin</small>
          </div>
        </div>
        <div className="user-badge">
          <span className="mobile-tab-label">{TAB_LABELS[currentTab]}</span>
          <strong className="topbar-name">{user.name}</strong>
          <button className="logout-btn" onClick={() => setShowChangePw(true)} title="Change password">🔑</button>
          <button className="logout-btn mobile-signout" onClick={logout}>Sign out</button>
          <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>

      <nav className="nav-tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={`nav-tab ${currentTab === t ? 'active' : ''}`}
            onClick={() => handleTabClick(t)}
          >
            {TAB_LABELS[t]}
            {t === 'stock' && user.role === 'boss' && stockCount > 0 && <span className="notif" />}
            {t === 'announcements' && announcementDot && <span className="notif" />}
          </button>
        ))}
      </nav>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <nav className="nav-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="topbar-brand">
                <div className="dot">☕</div>
                <div>
                  <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>Cafe Hub</span>
                  <small style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, display: 'block' }}>Atrium &amp; Cleanskin</small>
                </div>
              </div>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            {tabs.map(t => (
              <button
                key={t}
                className={`drawer-item ${currentTab === t ? 'active' : ''}`}
                onClick={() => handleTabClick(t)}
              >
                <span className="drawer-icon">{TAB_ICONS[t]}</span>
                {TAB_LABELS[t]}
                {t === 'stock' && user.role === 'boss' && stockCount > 0 && <span className="notif" style={{ marginLeft: 'auto' }} />}
                {t === 'announcements' && announcementDot && <span className="notif" style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
            <div style={{ marginTop: 'auto', padding: '16px 18px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 12 }}>{user.role}</div>
              <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => { setDrawerOpen(false); logout(); }}>Sign out</button>
            </div>
          </nav>
        </div>
      )}

      <div className="page">
        <PageComponent
          tab={currentTab}
          role={user.role}
          onStockCount={setStockCount}
          onTabChange={handleTabClick}
        />
      </div>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </AuthProvider>
  );
}
