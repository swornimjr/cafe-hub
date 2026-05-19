import express from 'express';
import MenuItem from '../models/MenuItem.js';

const router = express.Router();

function requireManager(req, res, next) {
  if (!['boss', 'teamleader'].includes(req.user.role))
    return res.status(403).json({ error: 'Not authorized' });
  next();
}

// All staff can view
router.get('/', async (req, res) => {
  const items = await MenuItem.find().sort({ category: 1, name: 1 });
  res.json(items);
});

// Boss / team leader only
router.post('/', requireManager, async (req, res) => {
  const item = await MenuItem.create(req.body);
  res.status(201).json(item);
});

router.patch('/:id', requireManager, async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.delete('/:id', requireManager, async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
