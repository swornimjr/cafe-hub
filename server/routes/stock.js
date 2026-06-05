import express from 'express';
import StockRequest from '../models/StockRequest.js';
import Settings from '../models/Settings.js';
import { requireBoss, requireTeamLeaderOrBoss } from '../middleware/auth.js';
import { generateOrderPdf } from '../utils/generateOrderPdf.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await StockRequest.find().sort({ createdAt: -1 });
  res.json(items);
});

const VALID_STORES = ['Atrium', 'Cleanskin'];
const VALID_STATUS = ['pending', 'approved', 'sent'];

router.post('/', requireTeamLeaderOrBoss, async (req, res) => {
  const item_name = String(req.body.item || '').trim().slice(0, 100);
  const unit = String(req.body.unit || '').trim().slice(0, 30);
  const qty = String(req.body.qty || '').trim().slice(0, 30);
  const store = String(req.body.store || '');
  const note = String(req.body.note || '').trim().slice(0, 300);
  const urgent = Boolean(req.body.urgent);

  if (!item_name || !qty || !store) return res.status(400).json({ error: 'Item, qty and store are required' });
  if (!VALID_STORES.includes(store)) return res.status(400).json({ error: 'Invalid store' });

  const item = await StockRequest.create({
    item: item_name, unit, qty, store, note, urgent,
    orderedBy: req.user.username,
    status: req.user.role === 'boss' ? 'approved' : 'pending',
  });
  res.status(201).json(item);
});

router.patch('/:id', requireBoss, async (req, res) => {
  const allowed = {};
  if (req.body.status !== undefined) {
    const status = String(req.body.status);
    if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    allowed.status = status;
  }
  if (req.body.note !== undefined) allowed.note = String(req.body.note).trim().slice(0, 300);
  if (req.body.qty !== undefined) allowed.qty = String(req.body.qty).trim().slice(0, 30);
  const item = await StockRequest.findByIdAndUpdate(req.params.id, allowed, { new: true });
  res.json(item);
});

router.delete('/:id', requireBoss, async (req, res) => {
  await StockRequest.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.post('/send', requireBoss, async (req, res) => {
  const approved = await StockRequest.find({ status: 'approved' }).sort({ store: 1, createdAt: 1 });
  if (!approved.length) return res.status(400).json({ error: 'No approved orders to send' });

  const settings = await Settings.findOne();
  const dateStr = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'full', timeStyle: 'short' });
  const filename = `stock-order-${new Date().toISOString().slice(0, 10)}.pdf`;

  const pdfBuffer = await generateOrderPdf(approved, dateStr);

  // Mark all as sent
  const ids = approved.map(o => o._id);
  await StockRequest.updateMany({ _id: { $in: ids } }, { status: 'sent' });

  // Email if configured
  let emailSent = false;
  if (settings?.supplierEmail) {
    try {
      const to = [settings.supplierEmail];
      if (settings.bossEmail) to.push(settings.bossEmail);
      if (settings.bossEmail2) to.push(settings.bossEmail2);
      if (settings.ccEmail) to.push(settings.ccEmail);
      await sendEmail({
        to,
        subject: `Stock Order — ${new Date().toLocaleDateString('en-AU')}`,
        text: `Hi,\n\nPlease find the stock order attached.\n\nTotal items: ${approved.length}\n\nCafe Hub`,
        attachments: [{ filename, content: pdfBuffer }],
      });
      emailSent = true;
    } catch (err) {
      console.error('Stock order email failed:', err.message);
    }
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'X-Email-Sent': emailSent ? 'true' : 'false',
    'X-Items-Sent': String(approved.length),
    'X-WhatsApp-Number': settings?.supplierWhatsApp || '',
  });
  res.send(pdfBuffer);
});

export default router;
