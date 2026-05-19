import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// Fix shift name "Swornim" -> "swornim maharjan"
const fix = await db.collection('shifts').updateMany(
  { name: 'Swornim' },
  { $set: { name: 'swornim maharjan' } }
);
console.log(`Fixed ${fix.modifiedCount} shift(s): "Swornim" → "swornim maharjan"`);

// Set shiftType for Atrium staff based on the reference roster image
const opening = ['Dianne', 'Alissa', 'Juliette', 'Sara', 'Giovanna', 'Niko', 'Larissa', 'Don', 'Zaid'];
const closing  = ['Lucinda', 'Maya', 'Namita', 'swornim maharjan', 'Nayan', 'Gabriella', 'Mandip', 'Celin', 'Munawal'];

for (const name of opening) {
  const r = await db.collection('users').updateOne({ name }, { $set: { shiftType: 'opening' } });
  console.log(`opening: ${name} — ${r.matchedCount ? 'ok' : 'NOT FOUND'}`);
}
for (const name of closing) {
  const r = await db.collection('users').updateOne({ name }, { $set: { shiftType: 'closing' } });
  console.log(`closing: ${name} — ${r.matchedCount ? 'ok' : 'NOT FOUND'}`);
}

await mongoose.disconnect();
console.log('Done.');
