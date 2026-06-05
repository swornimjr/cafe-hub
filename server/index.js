import tls from 'tls';
tls.DEFAULT_MAX_VERSION = 'TLSv1.2';
import express from 'express';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
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
import announcementsRouter from './routes/announcements.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  exposedHeaders: ['X-Email-Sent', 'X-Staff-Notified', 'X-Staff-Failed', 'X-Staff-No-Email', 'X-Published', 'X-Published-At'],
}));
app.use(express.json());
app.use(mongoSanitize());

app.use('/api/auth', authRouter);
app.use('/api/roster', requireAuth, rosterRouter);
app.use('/api/stock', requireAuth, stockRouter);
app.use('/api/kitchen', requireAuth, kitchenRouter);
app.use('/api/products', requireAuth, productsRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/menu', requireAuth, menuRouter);
app.use('/api/recipes', requireAuth, recipesRouter);
app.use('/api/announcements', requireAuth, announcementsRouter);

app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.command({ ping: 1 });
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGODB_URI, { tls: true, tlsInsecure: false, serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Keep MongoDB connection warm — Atlas idles after ~5 min of inactivity
      setInterval(async () => {
        try {
          await mongoose.connection.db.command({ ping: 1 });
        } catch (err) {
          console.error('Keep-alive ping failed:', err.message);
        }
      }, 14 * 60 * 1000);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));
