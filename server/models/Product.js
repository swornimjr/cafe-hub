import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  category: { type: String, required: true },
  unit:     { type: String, required: true },
  store:    { type: String, enum: ['Atrium','Cleanskin','Both'], default: 'Both' },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
