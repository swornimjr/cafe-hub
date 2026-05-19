import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  category:    { type: String, default: 'prep' },
  yield:       { type: String, default: '' },
  ingredients: [{ amount: { type: String, default: '' }, name: { type: String, required: true } }],
  steps:       [{ type: String }],
  notes:       { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Recipe', recipeSchema);
