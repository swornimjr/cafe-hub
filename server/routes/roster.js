import express from 'express';
import Shift from '../models/Shift.js';
import RosterPublish from '../models/RosterPublish.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { requireBoss } from '../middleware/auth.js';
import { generateRosterPdf } from '../utils/generateRosterPdf.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// Get shifts — boss sees all, staff only see published weeks for their store
router.get('/', async (req, res) => {
  const { store, weekOf } = req.query;
  const filter = {};
  if (store) filter.store = store;
  if (weekOf) filter.weekOf = weekOf;

  // Staff: only return shifts if the week is published
  if (req.user.role !== 'boss') {
    const pub = await RosterPublish.findOne({ store, weekOf, published: true });
    if (!pub) return res.json([]);
  }

  const shifts = await Shift.find(filter);
  res.json(shifts);
});

// Add shift (boss only)
router.post('/', requireBoss, async (req, res) => {
  const shift = await Shift.create(req.body);
  res.status(201).json(shift);
});

// Edit shift (boss only)
router.patch('/:id', requireBoss, async (req, res) => {
  const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(shift);
});

// Delete shift (boss only)
router.delete('/:id', requireBoss, async (req, res) => {
  await Shift.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Get publish status for a store+week
router.get('/publish-status', async (req, res) => {
  const { store, weekOf } = req.query;
  const pub = await RosterPublish.findOne({ store, weekOf });
  res.json(pub || { store, weekOf, published: false });
});

// Publish roster (boss only) — generates PDF, emails, returns PDF for download
router.post('/publish', requireBoss, async (req, res) => {
  const { store, weekOf, weekRange } = req.body;

  const pub = await RosterPublish.findOneAndUpdate(
    { store, weekOf },
    { published: true, publishedAt: new Date() },
    { upsert: true, new: true }
  );

  const [shifts, storeStaff, settings] = await Promise.all([
    Shift.find({ store, weekOf }),
    User.find({ $or: [{ role: store.toLowerCase() }, { role: 'teamleader', originalRole: store.toLowerCase() }] }).select('name shiftType email'),
    Settings.findOne(),
  ]);

  // Include anyone with a shift not in the staff list
  const knownNames = new Set(storeStaff.map(u => u.name));
  shifts.forEach(s => { if (!knownNames.has(s.name)) storeStaff.push({ name: s.name, shiftType: 'closing' }); });

  // Parse start hour from a time string like "7am–3pm" or "12:30pm–8:30pm"
  function parseStartHour(timeStr) {
    try {
      const startPart = timeStr.split('–')[0];
      const pm = /pm/i.test(startPart);
      const stripped = startPart.replace(/[apm\s]/gi, '').trim();
      let h;
      if (stripped.includes(':')) {
        const [hh, mm] = stripped.split(':');
        h = parseInt(hh) + parseInt(mm) / 60;
      } else {
        h = parseFloat(stripped);
      }
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
      return h;
    } catch { return 9; }
  }

  // A person appears in Opening if they have ANY shift starting before 12pm this week
  // A person appears in Closing if they have ANY shift starting at 12pm or later
  // A person can appear in BOTH sections (mixed week) — each section shows only relevant days
  // A person with no shifts falls back to their stored shiftType
  const openingStaff = storeStaff
    .filter(u => {
      const ps = shifts.filter(s => s.name === u.name && s.time);
      if (!ps.length) return (u.shiftType || 'opening') === 'opening';
      return ps.some(s => parseStartHour(s.time) < 12);
    })
    .map(u => u.name);

  const closingStaff = storeStaff
    .filter(u => {
      const ps = shifts.filter(s => s.name === u.name && s.time);
      if (!ps.length) return (u.shiftType || 'closing') === 'closing';
      return ps.some(s => parseStartHour(s.time) >= 12);
    })
    .map(u => u.name);

  function earliestStart(name, section) {
    const relevant = shifts.filter(s => {
      if (s.name !== name || !s.time) return false;
      const h = parseStartHour(s.time);
      return section === 'opening' ? h < 12 : h >= 12;
    });
    return relevant.length ? Math.min(...relevant.map(s => parseStartHour(s.time))) : 99;
  }
  openingStaff.sort((a, b) => earliestStart(a, 'opening') - earliestStart(b, 'opening'));
  closingStaff.sort((a, b) => earliestStart(a, 'closing') - earliestStart(b, 'closing'));

  const filename = `roster-${store.toLowerCase()}-${weekOf}.pdf`;
  const pdfBuffer = await generateRosterPdf(store, weekRange || weekOf, weekOf, shifts, openingStaff, closingStaff);

  // Email
  let emailSent = false;
  const storeEmail = store === 'Atrium' ? settings?.atriumEmail : settings?.cleanskinEmail;
  const to = [settings?.bossEmail, settings?.bossEmail2, settings?.ccEmail, storeEmail].filter(Boolean);
  if (to.length) {
    try {
      await sendEmail({
        to,
        subject: `${store} Roster — ${weekRange || weekOf}`,
        text: `Hi,\n\nThe ${store} roster for ${weekRange || weekOf} has been published. Please find it attached.\n\nCafe Hub`,
        attachments: [{ filename, content: pdfBuffer }],
      });
      emailSent = true;
    } catch (err) {
      console.error('Roster email failed:', err.message);
    }
  }

  // Notify individual staff with their personal shifts
  const emailMap = {};
  storeStaff.forEach(u => { if (u.email) emailMap[u.name] = u.email; });
  const DAYS_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const staffWithShifts = [...new Set(shifts.map(s => s.name))];
  let staffNotified = 0;
  let staffFailed = 0;
  let staffNoEmail = 0;
  for (const name of staffWithShifts) {
    const email = emailMap[name];
    if (!email) { staffNoEmail++; continue; }
    const myShifts = shifts
      .filter(s => s.name === name)
      .sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day));
    const shiftLines = myShifts.map(s => `  ${s.day}: ${s.time}`).join('\n');
    try {
      await sendEmail({
        to: email,
        subject: `Your ${store} roster — ${weekRange || weekOf}`,
        text: `Hi ${name},\n\nYour roster for ${weekRange || weekOf} has been published.\n\nYour shifts this week:\n${shiftLines}\n\nLog in to Cafe Hub to view the full roster.\n\nCafe Hub`,
      });
      staffNotified++;
    } catch (err) {
      staffFailed++;
      console.error(`Roster notification failed for ${name} (${email}):`, err.message);
    }
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'X-Email-Sent': emailSent ? 'true' : 'false',
    'X-Staff-Notified': String(staffNotified),
    'X-Staff-Failed': String(staffFailed),
    'X-Staff-No-Email': String(staffNoEmail),
    'X-Published': 'true',
    'X-Published-At': pub.publishedAt.toISOString(),
  });
  res.send(pdfBuffer);
});

// Notify staff of roster changes (boss only)
router.post('/notify-changes', requireBoss, async (req, res) => {
  const { store, weekOf, weekRange, changes } = req.body;
  if (!changes?.length) return res.json({ ok: true, notified: 0 });

  const storeStaff = await User.find({
    $or: [{ role: store.toLowerCase() }, { role: 'teamleader', originalRole: store.toLowerCase() }]
  }).select('name email');

  const emailMap = {};
  storeStaff.forEach(u => { if (u.email) emailMap[u.name] = u.email; });

  // Group changes by staff name
  const byName = {};
  changes.forEach(c => {
    if (!byName[c.name]) byName[c.name] = [];
    byName[c.name].push(c);
  });

  let notified = 0;
  for (const [name, staffChanges] of Object.entries(byName)) {
    const email = emailMap[name];
    if (!email) continue;
    const lines = staffChanges.map(c => {
      if (c.type === 'added')   return `  + Added: ${c.day} ${c.time}`;
      if (c.type === 'removed') return `  - Removed: ${c.day} ${c.time}`;
      if (c.type === 'updated') return `  ~ Updated: ${c.day} ${c.oldTime} → ${c.time}`;
    }).join('\n');
    try {
      await sendEmail({
        to: email,
        subject: `Your ${store} roster has been updated — ${weekRange || weekOf}`,
        text: `Hi ${name},\n\nYour roster for ${weekRange || weekOf} has been updated.\n\nChanges to your shifts:\n${lines}\n\nLog in to Cafe Hub to view your full roster.\n\nCafe Hub`,
      });
      notified++;
    } catch (err) {
      console.error(`Change notify failed for ${name}:`, err.message);
    }
  }

  res.json({ ok: true, notified });
});

// Copy all shifts from one week to another (boss only)
router.post('/copy-week', requireBoss, async (req, res) => {
  const { store, fromWeekOf, toWeekOf } = req.body;
  const source = await Shift.find({ store, weekOf: fromWeekOf });
  if (!source.length) return res.status(404).json({ error: 'No shifts found for that week' });

  // Remove existing shifts in target week first
  await Shift.deleteMany({ store, weekOf: toWeekOf });

  const copies = await Shift.insertMany(
    source.map(s => ({ day: s.day, name: s.name, time: s.time, store: s.store, weekOf: toWeekOf }))
  );
  res.json(copies);
});

// Unpublish roster (boss only)
router.post('/unpublish', requireBoss, async (req, res) => {
  const { store, weekOf } = req.body;
  const pub = await RosterPublish.findOneAndUpdate(
    { store, weekOf },
    { published: false },
    { upsert: true, new: true }
  );
  res.json(pub);
});

export default router;
