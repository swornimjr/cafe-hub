import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection.db;
const shifts = db.collection('shifts');
const users = db.collection('users');

// Get all valid staff names from the users collection
const validUsers = await users.find({}).toArray();
const validNames = validUsers.map(u => u.name);
console.log('Valid staff names:', validNames);

// Find all shifts
const allShifts = await shifts.find({}).toArray();
const uniqueNames = [...new Set(allShifts.map(s => s.name))];
console.log('Names in shifts:', uniqueNames);

// Find shifts with names not in valid users
const invalidNames = uniqueNames.filter(n => !validNames.includes(n));
console.log('Invalid (dummy) names in shifts:', invalidNames);

if (invalidNames.length) {
  const result = await shifts.deleteMany({ name: { $in: invalidNames } });
  console.log(`Deleted ${result.deletedCount} orphaned shifts`);
} else {
  console.log('No orphaned shifts found.');
}

await mongoose.disconnect();
console.log('Done.');
