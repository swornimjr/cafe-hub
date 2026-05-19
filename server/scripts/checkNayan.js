import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const shifts = await db.collection('shifts').find({ store: 'Atrium', weekOf: '2026-05-11' }).toArray();

// Group by name
const byName = {};
shifts.forEach(s => {
  if (!byName[s.name]) byName[s.name] = [];
  byName[s.name].push(`${s.day}: ${s.time}`);
});

Object.entries(byName).sort().forEach(([name, days]) => {
  console.log(`${name}: ${days.join(', ')}`);
});

console.log('\nTotal shifts:', shifts.length);
await mongoose.disconnect();
