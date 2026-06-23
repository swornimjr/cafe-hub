import express from 'express';
import Product from '../models/Product.js';
import { requireBoss } from '../middleware/auth.js';
import { handle } from '../middleware/asyncHandler.js';

const router = express.Router();

const VALID_STORES = ['Atrium', 'Cleanskin', 'Both'];

function sanitizeProduct(body) {
  return {
    name:     String(body.name || '').trim().slice(0, 100),
    category: String(body.category || '').trim().slice(0, 50),
    unit:     String(body.unit || '').trim().slice(0, 30),
    store:    VALID_STORES.includes(body.store) ? body.store : 'Both',
  };
}

router.get('/', handle(async (req, res) => {
  const products = await Product.find({ active: true }).sort({ category: 1, name: 1 });
  res.json(products);
}));

router.post('/', requireBoss, handle(async (req, res) => {
  const data = sanitizeProduct(req.body);
  if (!data.name || !data.category || !data.unit) {
    return res.status(400).json({ error: 'Name, category and unit are required' });
  }
  const product = await Product.create(data);
  res.status(201).json(product);
}));

router.patch('/:id', requireBoss, handle(async (req, res) => {
  const data = sanitizeProduct(req.body);
  if (!data.name || !data.category || !data.unit) {
    return res.status(400).json({ error: 'Name, category and unit are required' });
  }
  const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
}));

router.delete('/:id', requireBoss, handle(async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { active: false });
  res.json({ ok: true });
}));

export default router;
