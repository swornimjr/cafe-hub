import mongoose from 'mongoose';

const rosterPublishSchema = new mongoose.Schema({
  store:       { type: String, enum: ['Atrium','Cleanskin'], required: true },
  weekOf:      { type: String, required: true }, // Monday date: "2026-05-11"
  published:   { type: Boolean, default: false },
  publishedAt: { type: Date },
});

rosterPublishSchema.index({ store: 1, weekOf: 1 }, { unique: true });

export default mongoose.model('RosterPublish', rosterPublishSchema);
