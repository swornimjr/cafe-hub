import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

await mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection.db;
const shifts = db.collection('shifts');
const roster = db.collection('rosterpublishes');

const allShifts = await shifts.find({}).toArray();
const weekOfs = [...new Set(allShifts.map(s => s.weekOf))].sort();
console.log('All weekOf values in shifts:', weekOfs);
console.log('Total shifts:', allShifts.length);

// What's today (server side)
const today = new Date();
const day = today.getDay();
const diff = day === 0 ? -6 : 1 - day;
const monday = new Date(today);
monday.setDate(today.getDate() + diff);
monday.setHours(0, 0, 0, 0);
const currentWeekOf = monday.toISOString().slice(0, 10);
console.log('\nServer-calculated currentWeekOf:', currentWeekOf);

const thisWeekShifts = allShifts.filter(s => s.weekOf === currentWeekOf);
console.log(`Shifts for ${currentWeekOf}:`, thisWeekShifts.length);

// Published rosters
const pubs = await roster.find({ published: true }).toArray();
console.log('\nPublished rosters:', pubs.map(p => `${p.store} ${p.weekOf}`));

await mongoose.disconnect();
