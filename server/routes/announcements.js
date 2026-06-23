import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { requireTeamLeaderOrBoss } from '../middleware/auth.js';
import { handle } from '../middleware/asyncHandler.js';
import { sendEmail } from '../utils/email.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'cafe-hub/announcements', resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    Readable.from(buffer).pipe(stream);
  });
}

const router = express.Router();

router.get('/', handle(async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });
  res.json(announcements);
}));

router.post('/', requireTeamLeaderOrBoss, upload.single('image'), handle(async (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 200);
  const body  = String(req.body.body  || '').trim().slice(0, 2000);
  if (!title || !body) return res.status(400).json({ error: 'Title and message are required' });

  let imageUrl = '';
  let imagePublicId = '';

  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    } catch (err) {
      console.error('Cloudinary upload failed:', err.message);
      return res.status(500).json({ error: 'Image upload failed' });
    }
  }

  const announcement = await Announcement.create({
    title, body, createdBy: req.user.name, imageUrl, imagePublicId,
  });

  const staff = await User.find({ role: { $ne: 'boss' }, email: { $ne: '' } }).select('name email');
  let notified = 0;
  for (const member of staff) {
    try {
      await sendEmail({
        to: member.email,
        subject: 'New announcement on Cafe Hub',
        text: `Hi ${member.name},\n\nThere's a new announcement from ${req.user.name}. Log in to Cafe Hub to read it.\n\nhttps://cafehubs.vercel.app/\n\nCafe Hub`,
      });
      notified++;
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`Announcement email failed for ${member.name}:`, err.message);
    }
  }

  res.status(201).json({ ...announcement.toObject(), notified });
}));

router.delete('/:id', requireTeamLeaderOrBoss, handle(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Not found' });

  if (announcement.imagePublicId) {
    try {
      await cloudinary.uploader.destroy(announcement.imagePublicId);
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  await announcement.deleteOne();
  res.json({ ok: true });
}));

export default router;
