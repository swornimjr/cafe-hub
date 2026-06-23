import express from 'express';
import MenuItem from '../models/MenuItem.js';
import { requireTeamLeaderOrBoss } from '../middleware/auth.js';
import { handle } from '../middleware/asyncHandler.js';

const router = express.Router();

const VALID_CATEGORIES = ['drink', 'food', 'retail'];

function sanitizeMenuItem(body) {
  return {
    name: String(body.name || '').trim().slice(0, 100),
    category: String(body.category || ''),
    sellingPrice: Number(body.sellingPrice) || 0,
    ingredients: Array.isArray(body.ingredients)
      ? body.ingredients.slice(0, 50).map(i => ({
          name: String(i.name || '').trim().slice(0, 80),
          amount: String(i.amount || '').trim().slice(0, 30),
        }))
      : [],
    notes: String(body.notes || '').trim().slice(0, 500),
  };
}

router.get('/', handle(async (req, res) => {
  const items = await MenuItem.find().sort({ category: 1, name: 1 });
  res.json(items);
}));

router.post('/', requireTeamLeaderOrBoss, handle(async (req, res) => {
  const data = sanitizeMenuItem(req.body);
  if (!data.name) return res.status(400).json({ error: 'Name is required' });
  if (!VALID_CATEGORIES.includes(data.category)) return res.status(400).json({ error: 'Invalid category' });
  const item = await MenuItem.create(data);
  res.status(201).json(item);
}));

router.patch('/:id', requireTeamLeaderOrBoss, handle(async (req, res) => {
  const data = sanitizeMenuItem(req.body);
  if (!data.name) return res.status(400).json({ error: 'Name is required' });
  if (!VALID_CATEGORIES.includes(data.category)) return res.status(400).json({ error: 'Invalid category' });
  const item = await MenuItem.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
}));

router.delete('/:id', requireTeamLeaderOrBoss, handle(async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
