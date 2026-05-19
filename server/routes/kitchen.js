import express from 'express';
import KitchenNeed from '../models/KitchenNeed.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await KitchenNeed.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post('/', async (req, res) => {
  const item = await KitchenNeed.create(req.body);
  res.status(201).json(item);
});

router.patch('/:id', async (req, res) => {
  const item = await KitchenNeed.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

export default router;
