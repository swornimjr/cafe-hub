import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth, requireBoss, requireTeamLeaderOrBoss } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

async function sendCredentials(to, name, username, password) {
  if (!to) return false;
  try {
    await sendEmail({
      to,
      subject: 'Your Cafe Hub login details',
      text: `Hi ${name},\n\nYour Cafe Hub account is ready.\n\nUsername: ${username}\nPassword: ${password}\n\nLog in at your store's Cafe Hub link and change your password once you're in.\n\nhttps://cafehubs.vercel.app/`,
    });
    return true;
  } catch (e) {
    console.error('Credentials email failed:', e.message);
    return false;
  }
}

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign(
    { id: user._id, name: user.name, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user._id, name: user.name, role: user.role, username: user.username } });
});

// Get all users
router.get('/users', requireAuth, requireTeamLeaderOrBoss, async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

// Create user
router.post('/users', requireAuth, requireTeamLeaderOrBoss, async (req, res) => {
  const { name, username, role, email } = req.body;
  if (!name || !username || !role || !email) {
    return res.status(400).json({ error: 'Name, username, role and email are required' });
  }
  if (req.user.role === 'teamleader' && ['boss', 'teamleader'].includes(role)) {
    return res.status(403).json({ error: 'Team leaders can only create staff accounts' });
  }
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: 'Username already taken' });

  const words = ['Cafe','Brew','Latte','Mocha','Bean','Roast','Steam'];
  const password = words[Math.floor(Math.random() * words.length)] + Math.floor(1000 + Math.random() * 9000);

  const user = await User.create({ name, username, password, role, email });
  const emailSent = await sendCredentials(email, name, username, password);

  res.status(201).json({
    id: user._id, name: user.name, username: user.username,
    role: user.role, email: user.email, emailSent,
  });
});

// Delete user
router.delete('/users/:id', requireAuth, requireTeamLeaderOrBoss, async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (req.user.role === 'teamleader' && ['boss', 'teamleader'].includes(target.role)) {
    return res.status(403).json({ error: 'Team leaders cannot remove boss or other team leaders' });
  }
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Reset password (boss/TL resets someone else's)
router.patch('/users/:id/password', requireAuth, requireTeamLeaderOrBoss, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.user.role === 'teamleader' && ['boss', 'teamleader'].includes(user.role)) {
    return res.status(403).json({ error: 'Team leaders cannot reset boss or team leader passwords' });
  }
  const { password, sendEmail } = req.body;
  user.password = password;
  await user.save();

  let emailSent = false;
  if (sendEmail && user.email) {
    emailSent = await sendCredentials(user.email, user.name, user.username, password);
  }

  res.json({ ok: true, emailSent });
});

// Update own email (any logged-in user)
router.patch('/me/email', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.email = req.body.email || '';
  await user.save();
  res.json({ ok: true });
});

// Update another user's email (boss/TL)
router.patch('/users/:id/email', requireAuth, requireTeamLeaderOrBoss, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.email = req.body.email || '';
  await user.save();
  res.json({ ok: true, email: user.email });
});

// Send/resend credentials — generates a temp password, optionally updates email first
router.post('/users/:id/resend-credentials', requireAuth, requireTeamLeaderOrBoss, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Allow updating email in the same call
  if (req.body.email) {
    user.email = req.body.email;
  }
  if (!user.email) return res.status(400).json({ error: 'No email address provided' });

  const words = ['Cafe','Brew','Latte','Mocha','Bean','Roast','Steam'];
  const tempPassword = words[Math.floor(Math.random() * words.length)] + Math.floor(1000 + Math.random() * 9000);

  user.password = tempPassword;
  await user.save();

  const sent = await sendCredentials(user.email, user.name, user.username, tempPassword);
  res.json({ ok: sent, email: user.email });
});

// Change own password (any logged-in user)
router.patch('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password required' });
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ ok: true });
});

// Promote to team leader (boss only)
router.patch('/users/:id/promote', requireAuth, requireBoss, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (['boss', 'warehouse'].includes(user.role)) {
    return res.status(400).json({ error: 'Cannot promote this role to team leader' });
  }
  user.originalRole = user.role;
  user.role = 'teamleader';
  await user.save();
  res.json({ id: user._id, name: user.name, username: user.username, role: user.role, originalRole: user.originalRole });
});

// Demote back to original role (boss only)
router.patch('/users/:id/demote', requireAuth, requireBoss, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'teamleader') return res.status(400).json({ error: 'User is not a team leader' });
  user.role = user.originalRole || 'atrium';
  user.originalRole = '';
  await user.save();
  res.json({ id: user._id, name: user.name, username: user.username, role: user.role, originalRole: user.originalRole });
});

export default router;
