import express from 'express';
import Settings from '../models/Settings.js';
import { requireBoss } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  res.json(s);
});

router.patch('/', requireBoss, async (req, res) => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  Object.assign(s, req.body);
  await s.save();
  res.json(s);
});

export default router;
