import tls from 'tls';
tls.DEFAULT_MAX_VERSION = 'TLSv1.2';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Recipe from '../models/Recipe.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI, { tls: true, tlsInsecure: false, serverSelectionTimeoutMS: 10000 });

await Recipe.create({
  title: 'Vanilla Latte',
  category: 'drinks',
  yield: '1 cup',
  ingredients: [
    { amount: '18g',   name: 'Espresso grounds' },
    { amount: '200ml', name: 'Full cream milk' },
    { amount: '10ml',  name: 'Vanilla syrup' },
  ],
  steps: [
    'Grind and dose 18g into portafilter, tamp evenly.',
    'Pull a double shot (~36ml) in 27–30 seconds.',
    'Steam milk to 65°C with a fine microfoam texture.',
    'Add vanilla syrup to cup, pour espresso, then pour steamed milk.',
    'Finish with a simple latte art pour.',
  ],
  notes: 'Use house vanilla syrup. Adjust syrup to taste for regular customers.',
});

console.log('Sample recipe added ✓');
await mongoose.disconnect();
