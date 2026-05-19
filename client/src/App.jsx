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
import Settings from './pages/Settings.jsx';
import { authFetch } from './api.js';

const ROLE_TABS = {
  boss:       ['dashboard','atrium-roster','cleanskin-roster','stock','menu','recipes','catalog','users','settings'],
  teamleader: ['atrium-roster','cleanskin-roster','stock','menu','recipes','users'],
  atrium:     ['atrium-roster','menu','recipes'],
  cleanskin:  ['cleanskin-roster','menu','recipes'],
  warehouse:  ['orders'],
};

const TAB_LABELS = {
  dashboard:          'Dashboard',
  'atrium-roster':    'Atrium Roster',
  'cleanskin-roster': 'Cleanskin Roster',
  stock:              'Stock Orders',
  menu:               'Menu',
  recipes:            'Recipes',
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

function PageComponent({ tab, role, onStockCount }) {
  if (tab === 'dashboard')        return <Dashboard role={role} onStockCount={onStockCount} />;
  if (tab === 'atrium-roster')    return <StoreRoster role={role} store="Atrium" />;
  if (tab === 'cleanskin-roster') return <StoreRoster role={role} store="Cleanskin" />;
  if (tab === 'stock')            return <Stock role={role} onStockCount={onStockCount} />;
  if (tab === 'menu')             return <Menu />;
  if (tab === 'recipes')          return <Recipes />;
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

  useEffect(() => { setActiveTab(null); }, [user?.id]);

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
          <strong className="topbar-name">{user.name}</strong>
          <button className="logout-btn" onClick={() => setShowChangePw(true)} title="Change password">🔑</button>
          <button className="logout-btn" onClick={logout}>Sign out</button>
        </div>
      </div>

      <nav className="nav-tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={`nav-tab ${currentTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_LABELS[t]}
            {t === 'stock' && user.role === 'boss' && stockCount > 0 && <span className="notif" />}
          </button>
        ))}
      </nav>

      <div className="page">
        <PageComponent
          tab={currentTab}
          role={user.role}
          onStockCount={setStockCount}
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
