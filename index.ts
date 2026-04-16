import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import mainRoutes from './routes/mainRoutes';
import providerRoutes from './routes/providerRoutes';
import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { errorHandler } from './middleware/errorHandler';

import helmet from 'helmet';

dotenv.config();

export const app = express();

const port = process.env.PORT || 5000;

// Middleware
// Helmet with CSP disabled for pure REST API (CSP is only needed for HTML pages)
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
// Favicon fix
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to FoodHub Premium API 🍔',
    version: '1.0.0',
    status: 'Operational'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', mainRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`[FoodHub API] Serving at http://localhost:${port}`);
  });
}

export default app;
