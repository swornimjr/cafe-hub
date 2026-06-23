import express from 'express';
import Recipe from '../models/Recipe.js';
import { requireTeamLeaderOrBoss } from '../middleware/auth.js';
import { handle } from '../middleware/asyncHandler.js';

const router = express.Router();

const VALID_RECIPE_CATEGORIES = ['syrup', 'sauce', 'base', 'prep', 'other', 'drinks'];

function sanitizeRecipe(body) {
  return {
    title: String(body.title || '').trim().slice(0, 100),
    category: String(body.category || ''),
    yield: String(body.yield || '').trim().slice(0, 50),
    ingredients: Array.isArray(body.ingredients)
      ? body.ingredients.slice(0, 50).map(i => ({
          amount: String(i.amount || '').trim().slice(0, 30),
          name: String(i.name || '').trim().slice(0, 80),
        }))
      : [],
    steps: Array.isArray(body.steps)
      ? body.steps.slice(0, 30).map(s => String(s).trim().slice(0, 500))
      : [],
    notes: String(body.notes || '').trim().slice(0, 500),
  };
}

router.get('/', handle(async (req, res) => {
  const recipes = await Recipe.find().sort({ category: 1, title: 1 });
  res.json(recipes);
}));

router.post('/', requireTeamLeaderOrBoss, handle(async (req, res) => {
  const data = sanitizeRecipe(req.body);
  if (!data.title) return res.status(400).json({ error: 'Title is required' });
  if (!VALID_RECIPE_CATEGORIES.includes(data.category)) return res.status(400).json({ error: 'Invalid category' });
  const recipe = await Recipe.create(data);
  res.status(201).json(recipe);
}));

router.patch('/:id', requireTeamLeaderOrBoss, handle(async (req, res) => {
  const data = sanitizeRecipe(req.body);
  if (!data.title) return res.status(400).json({ error: 'Title is required' });
  if (!VALID_RECIPE_CATEGORIES.includes(data.category)) return res.status(400).json({ error: 'Invalid category' });
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!recipe) return res.status(404).json({ error: 'Not found' });
  res.json(recipe);
}));

router.delete('/:id', requireTeamLeaderOrBoss, handle(async (req, res) => {
  await Recipe.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
