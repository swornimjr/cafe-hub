import express from 'express';
import Product from '../models/Product.js';
import { requireBoss } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const products = await Product.find({ active: true }).sort({ category: 1, name: 1 });
  res.json(products);
});

router.post('/', requireBoss, async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

router.patch('/:id', requireBoss, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

router.delete('/:id', requireBoss, async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { active: false });
  res.json({ ok: true });
});

export default router;
