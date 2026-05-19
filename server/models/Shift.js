import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  day:    { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], required: true },
  name:   { type: String, required: true },
  store:  { type: String, enum: ['Atrium','Cleanskin'], required: true },
  time:   { type: String, required: true },
  weekOf: { type: String, required: true }, // Monday ISO date: "2026-05-11"
});

export default mongoose.model('Shift', shiftSchema);
