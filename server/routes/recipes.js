import express from 'express';
import Recipe from '../models/Recipe.js';

const router = express.Router();

function requireManager(req, res, next) {
  if (!['boss', 'teamleader'].includes(req.user.role))
    return res.status(403).json({ error: 'Not authorized' });
  next();
}

router.get('/', async (req, res) => {
  const recipes = await Recipe.find().sort({ category: 1, title: 1 });
  res.json(recipes);
});

router.post('/', requireManager, async (req, res) => {
  const recipe = await Recipe.create(req.body);
  res.status(201).json(recipe);
});

router.patch('/:id', requireManager, async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!recipe) return res.status(404).json({ error: 'Not found' });
  res.json(recipe);
});

router.delete('/:id', requireManager, async (req, res) => {
  await Recipe.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
