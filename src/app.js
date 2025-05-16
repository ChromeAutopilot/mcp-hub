import express from 'express';
import cors from 'cors';
import { router } from './utils/router.js';
import { authMiddleware } from './middleware/auth.js';
import config from './config.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'multi-tenant-mcp-hub',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', authMiddleware, router);

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

export default app;
