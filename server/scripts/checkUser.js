import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const users = await db.collection('users').find({}).project({ name: 1, username: 1, role: 1, originalRole: 1 }).toArray();
users.forEach(u => console.log(`${u.name} | role: ${u.role} | originalRole: ${u.originalRole || '-'}`));
await mongoose.disconnect();
