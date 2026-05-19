import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  item:       { type: String, required: true },
  unit:       { type: String, default: '' },
  qty:        { type: String, required: true },
  store:      { type: String, enum: ['Atrium','Cleanskin'], required: true },
  note:       { type: String, default: '' },
  urgent:     { type: Boolean, default: false },
  status:     { type: String, enum: ['pending','approved','sent'], default: 'pending' },
  orderedBy:  { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('StockRequest', stockSchema);
