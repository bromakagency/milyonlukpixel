import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import pixelRoutes from './routes/pixels.js';
import adminRoutes from './routes/admin.js';
import { adminService } from './services/adminService.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN 
    : 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use('/api', apiRateLimiter);

app.use('/api/pixels', pixelRoutes);
app.use('/api/admin/auth', adminRoutes);
app.use('/api/stats', async (req, res) => {
  const { pixelService } = await import('./services/pixelService.js');
  const stats = await pixelService.getStats();
  res.json(stats);
});

adminService.initializeDefaultAdmin();

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
