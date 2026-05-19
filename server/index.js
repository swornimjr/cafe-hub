import tls from 'tls';
tls.DEFAULT_MAX_VERSION = 'TLSv1.2';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import rosterRouter from './routes/roster.js';
import stockRouter from './routes/stock.js';
import kitchenRouter from './routes/kitchen.js';
import productsRouter from './routes/products.js';
import settingsRouter from './routes/settings.js';
import menuRouter from './routes/menu.js';
import recipesRouter from './routes/recipes.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/roster', requireAuth, rosterRouter);
app.use('/api/stock', requireAuth, stockRouter);
app.use('/api/kitchen', requireAuth, kitchenRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/menu', requireAuth, menuRouter);
app.use('/api/recipes', requireAuth, recipesRouter);

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGODB_URI, { tls: true, tlsInsecure: false, serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
