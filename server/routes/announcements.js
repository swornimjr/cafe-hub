import express from 'express';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { requireTeamLeaderOrBoss } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// Get all announcements (all staff)
router.get('/', async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });
  res.json(announcements);
});

// Create announcement (boss/TL only) — emails all staff with an email on file
router.post('/', requireTeamLeaderOrBoss, async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and message are required' });

  const announcement = await Announcement.create({ title, body, createdBy: req.user.name });

  // Email all staff who have an email saved (non-boss roles)
  const staff = await User.find({ role: { $ne: 'boss' }, email: { $ne: '' } }).select('name email');
  let notified = 0;
  for (const member of staff) {
    try {
      await sendEmail({
        to: member.email,
        subject: 'New announcement on Cafe Hub',
        text: `Hi ${member.name},\n\nThere's a new announcement from ${req.user.name}. Log in to Cafe Hub to read it.\n\nhttps://cafehubs.vercel.app/\n\nCafe Hub`,
      });
      notified++;
    } catch (err) {
      console.error(`Announcement email failed for ${member.name}:`, err.message);
    }
  }

  res.status(201).json({ ...announcement.toObject(), notified });
});

// Delete announcement (boss/TL only)
router.delete('/:id', requireTeamLeaderOrBoss, async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
