import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  supplierEmail:    { type: String, default: '' },
  supplierWhatsApp: { type: String, default: '' },
  bossEmail:        { type: String, default: '' },
  bossEmail2:       { type: String, default: '' },
  ccEmail:          { type: String, default: '' },
  atriumEmail:      { type: String, default: '' },
  cleanskinEmail:   { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
