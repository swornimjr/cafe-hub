import express from 'express';
import Recipe from '../models/Recipe.js';

const router = express.Router();

function requireManager(req, res, next) {
  if (!['boss', 'teamleader'].includes(req.user.role))
    return res.status(403).json({ error: 'Not authorized' });
  next();
}

router.get('/', async (req, res) => {
  const count = await Recipe.countDocuments();
  if (count === 0) {
    await Recipe.create({
      title: 'Vanilla Latte',
      category: 'drinks',
      yield: '1 cup',
      ingredients: [
        { amount: '18g',   name: 'Espresso grounds' },
        { amount: '200ml', name: 'Full cream milk' },
        { amount: '10ml',  name: 'Vanilla syrup' },
      ],
      steps: [
        'Grind and dose 18g into portafilter, tamp evenly.',
        'Pull a double shot (~36ml) in 27–30 seconds.',
        'Steam milk to 65°C with a fine microfoam texture.',
        'Add vanilla syrup to cup, pour espresso, then pour steamed milk.',
        'Finish with a simple latte art pour.',
      ],
      notes: 'Use house vanilla syrup. Adjust syrup to taste for regular customers.',
    });
  }
  const recipes = await Recipe.find().sort({ category: 1, title: 1 });
  res.json(recipes);
});

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

router.post('/', requireManager, async (req, res) => {
  const data = sanitizeRecipe(req.body);
  if (!data.title) return res.status(400).json({ error: 'Title is required' });
  if (!VALID_RECIPE_CATEGORIES.includes(data.category)) return res.status(400).json({ error: 'Invalid category' });
  const recipe = await Recipe.create(data);
  res.status(201).json(recipe);
});

router.patch('/:id', requireManager, async (req, res) => {
  const data = sanitizeRecipe(req.body);
  if (!data.title) return res.status(400).json({ error: 'Title is required' });
  if (!VALID_RECIPE_CATEGORIES.includes(data.category)) return res.status(400).json({ error: 'Invalid category' });
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!recipe) return res.status(404).json({ error: 'Not found' });
  res.json(recipe);
});

router.delete('/:id', requireManager, async (req, res) => {
  await Recipe.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
