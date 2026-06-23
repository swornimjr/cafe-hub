import express from 'express';
import Settings from '../models/Settings.js';
import { requireBoss } from '../middleware/auth.js';
import { handle } from '../middleware/asyncHandler.js';

const router = express.Router();

const ALLOWED_FIELDS = ['supplierEmail','supplierWhatsApp','bossEmail','bossEmail2','ccEmail','atriumEmail','cleanskinEmail'];

router.get('/', handle(async (req, res) => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  res.json(s);
}));

router.patch('/', requireBoss, handle(async (req, res) => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  const updates = {};
  ALLOWED_FIELDS.forEach(k => {
    if (req.body[k] !== undefined) updates[k] = String(req.body[k]).trim().slice(0, 200);
  });
  Object.assign(s, updates);
  await s.save();
  res.json(s);
}));

export default router;
