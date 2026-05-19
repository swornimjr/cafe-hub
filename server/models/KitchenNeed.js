import mongoose from 'mongoose';

const kitchenSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty: { type: String, required: true },
  requestedBy: { type: String, enum: ['Atrium','Cleanskin'], required: true },
  note: { type: String, default: '' },
  done: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('KitchenNeed', kitchenSchema);
