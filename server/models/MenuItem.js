import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  amount: { type: String, default: '' },
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  category:    { type: String, enum: ['drink', 'food', 'retail'], default: 'drink' },
  price:       { type: Number, default: 0 },
  ingredients: [ingredientSchema],
  notes:       { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('MenuItem', menuItemSchema);
