import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection.db;
const users = db.collection('users');
const shifts = db.collection('shifts');

// Find dummy users to remove
const dummies = await users.find({ username: { $in: ['sam', 'nono', 'nonon'] } }).toArray();
console.log('Found dummy users:', dummies.map(u => `${u.name} (${u.username})`));

if (dummies.length === 0) {
  console.log('No dummy users found.');
} else {
  const names = dummies.map(u => u.name);
  const usernames = dummies.map(u => u.username);

  // Remove their shifts too
  const shiftDel = await shifts.deleteMany({ name: { $in: names } });
  console.log(`Deleted ${shiftDel.deletedCount} shifts for dummy users`);

  // Remove the users
  const userDel = await users.deleteMany({ username: { $in: usernames } });
  console.log(`Deleted ${userDel.deletedCount} users`);
}

await mongoose.disconnect();
console.log('Done.');
