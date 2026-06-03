import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  body:          { type: String, required: true },
  createdBy:     { type: String, required: true },
  imageUrl:      { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Announcement', announcementSchema);
