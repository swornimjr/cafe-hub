import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { authFetch } from '../api.js';

export default function Settings() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ supplierEmail: '', supplierWhatsApp: '', bossEmail: '', bossEmail2: '', ccEmail: '', atriumEmail: '', cleanskinEmail: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    authFetch('/api/settings').then(r => r.json()).then(s => {
      setForm({
        supplierEmail:    s.supplierEmail    || '',
        supplierWhatsApp: s.supplierWhatsApp || '',
        bossEmail:        s.bossEmail        || '',
        bossEmail2:       s.bossEmail2       || '',
        ccEmail:          s.ccEmail          || '',
        atriumEmail:      s.atriumEmail      || '',
        cleanskinEmail:   s.cleanskinEmail   || '',
      });
    });
  }, []);

  async function save() {
    await authFetch('/api/settings', { method: 'PATCH', body: JSON.stringify(form) });
    showToast('Settings saved ✓');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="page-title">Settings</div>
      <div className="page-sub">Configure contacts for stock orders and roster emails</div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Storeroom contact</div>

        <div className="form-group">
          <label className="form-label">Storeroom email</label>
          <input
            className="form-input"
            type="email"
            value={form.supplierEmail}
            onChange={e => setForm(f => ({ ...f, supplierEmail: e.target.value }))}
            placeholder="supplier@example.com"
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PDF order will be emailed here when you click Send Order</div>
        </div>

        <div className="form-group">
          <label className="form-label">Storeroom WhatsApp number</label>
          <input
            className="form-input"
            type="tel"
            value={form.supplierWhatsApp}
            onChange={e => setForm(f => ({ ...f, supplierWhatsApp: e.target.value }))}
            placeholder="61412345678 (include country code, no +)"
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Used to open a WhatsApp chat after sending — attach the downloaded PDF manually</div>
        </div>

        <div className="section-label" style={{ margin: '20px 0 16px' }}>Your contact</div>

        <div className="form-group">
          <label className="form-label">Boss email 1</label>
          <input
            className="form-input"
            type="email"
            value={form.bossEmail}
            onChange={e => setForm(f => ({ ...f, bossEmail: e.target.value }))}
            placeholder="boss@example.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Boss email 2 (optional)</label>
          <input
            className="form-input"
            type="email"
            value={form.bossEmail2}
            onChange={e => setForm(f => ({ ...f, bossEmail2: e.target.value }))}
            placeholder="boss2@example.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">CC email (optional)</label>
          <input
            className="form-input"
            type="email"
            value={form.ccEmail}
            onChange={e => setForm(f => ({ ...f, ccEmail: e.target.value }))}
            placeholder="cc@example.com"
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Receives a copy of every roster and stock order email</div>
        </div>

        <div className="section-label" style={{ margin: '20px 0 16px' }}>Roster emails (optional)</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          When you publish a roster, a PDF is emailed to you. Optionally add a store email (group inbox or shared address) to CC the team.
        </div>

        <div className="form-group">
          <label className="form-label">Atrium store email (optional)</label>
          <input
            className="form-input"
            type="email"
            value={form.atriumEmail}
            onChange={e => setForm(f => ({ ...f, atriumEmail: e.target.value }))}
            placeholder="atrium@example.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Cleanskin store email (optional)</label>
          <input
            className="form-input"
            type="email"
            value={form.cleanskinEmail}
            onChange={e => setForm(f => ({ ...f, cleanskinEmail: e.target.value }))}
            placeholder="cleanskin@example.com"
          />
        </div>

        <button className="btn btn-primary" onClick={save}>{saved ? 'Saved ✓' : 'Save settings'}</button>
      </div>
    </>
  );
}
