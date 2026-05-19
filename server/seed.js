import tls from 'tls';
tls.DEFAULT_MAX_VERSION = 'TLSv1.2';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shift from './models/Shift.js';
import StockRequest from './models/StockRequest.js';
import KitchenNeed from './models/KitchenNeed.js';
import User from './models/User.js';
import RosterPublish from './models/RosterPublish.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI, { tls: true, tlsInsecure: false, serverSelectionTimeoutMS: 10000 });

await Shift.deleteMany();
await StockRequest.deleteMany();
await KitchenNeed.deleteMany();
await User.deleteMany();
await RosterPublish.deleteMany();

await User.create({ name: 'Boss', username: 'boss', password: 'boss123', role: 'boss' });

// Current week Monday
const today = new Date();
const day = today.getDay();
const diff = day === 0 ? -6 : 1 - day;
today.setDate(today.getDate() + diff);
today.setHours(0, 0, 0, 0);
const weekOf = today.toISOString().slice(0, 10);

await Shift.insertMany([
  { day:'Mon', name:'Sam',  store:'Atrium',    time:'7am–3pm',  weekOf },
  { day:'Mon', name:'Jess', store:'Cleanskin', time:'8am–4pm',  weekOf },
  { day:'Tue', name:'Sam',  store:'Atrium',    time:'7am–3pm',  weekOf },
  { day:'Tue', name:'Mia',  store:'Atrium',    time:'10am–6pm', weekOf },
  { day:'Tue', name:'Jess', store:'Cleanskin', time:'8am–4pm',  weekOf },
  { day:'Wed', name:'Tom',  store:'Atrium',    time:'7am–3pm',  weekOf },
  { day:'Wed', name:'Mia',  store:'Cleanskin', time:'8am–4pm',  weekOf },
  { day:'Wed', name:'Jess', store:'Cleanskin', time:'8am–4pm',  weekOf },
  { day:'Thu', name:'Sam',  store:'Atrium',    time:'7am–3pm',  weekOf },
  { day:'Thu', name:'Tom',  store:'Cleanskin', time:'8am–4pm',  weekOf },
  { day:'Fri', name:'Sam',  store:'Atrium',    time:'7am–3pm',  weekOf },
  { day:'Fri', name:'Mia',  store:'Atrium',    time:'10am–6pm', weekOf },
  { day:'Fri', name:'Jess', store:'Cleanskin', time:'8am–4pm',  weekOf },
  { day:'Fri', name:'Tom',  store:'Cleanskin', time:'8am–4pm',  weekOf },
  { day:'Sat', name:'Mia',  store:'Atrium',    time:'8am–2pm',  weekOf },
  { day:'Sat', name:'Tom',  store:'Atrium',    time:'8am–2pm',  weekOf },
  { day:'Sat', name:'Jess', store:'Cleanskin', time:'9am–3pm',  weekOf },
  { day:'Sun', name:'Sam',  store:'Cleanskin', time:'9am–3pm',  weekOf },
  { day:'Sun', name:'Mia',  store:'Cleanskin', time:'9am–3pm',  weekOf },
]);

await StockRequest.insertMany([
  { item:'Oat milk',            qty:'3 x 6-pack',   store:'Atrium',    note:'Running very low', status:'pending',  urgent:true  },
  { item:'Single origin beans', qty:'2 x 1kg bags', store:'Cleanskin', note:'',                 status:'pending',  urgent:false },
  { item:'Takeaway cups (12oz)', qty:'2 sleeves',   store:'Atrium',    note:'',                 status:'approved', urgent:false },
  { item:'Soy milk',            qty:'2 x 6-pack',   store:'Cleanskin', note:'',                 status:'sent',     urgent:false },
]);

await KitchenNeed.insertMany([
  { item:'Sourdough loaves',    qty:'4 loaves', requestedBy:'Atrium', note:'For avo toast',          done:false },
  { item:'Banana bread',        qty:'2 loaves', requestedBy:'Atrium', note:'',                       done:false },
  { item:'Muffins (blueberry)', qty:'12 pcs',   requestedBy:'Atrium', note:'Delivered this morning', done:true  },
]);

console.log('Seeded ✓');
await mongoose.disconnect();
