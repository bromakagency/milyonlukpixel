import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { adminService } from './src/services/adminService.js';
import { db } from './src/services/supabase.js';
import { emailService } from './server/services/emailService.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN 
    : '*',
  credentials: true,
}));
app.use(express.json());

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
      return;
    }
    
    const result = await adminService.login(username, password);
    
    if ('error' in result) {
      res.status(401).json({ error: result.error });
      return;
    }
    
    res.json({ success: true, token: result.token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get admin info
app.get('/api/admin/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token gerekli' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const session = await adminService.getMe(token);
    
    if (!session) {
      res.status(401).json({ error: 'Geçersiz token' });
      return;
    }
    
    res.json({
      adminId: session.adminId,
      username: session.username,
      role: session.role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Create pixel (admin only)
app.post('/api/pixels', async (req, res) => {
  try {
    const { x, y, w, h, imageUrl, linkUrl, title } = req.body;
    
    const pixel = await db.pixels.create({
      x, y, w, h,
      image_url: imageUrl,
      link_url: linkUrl,
      title,
    });
    
    await adminService.logActivity(
      'PIXEL_CREATE',
      `Pixel eklendi: ${title}`,
      null, null
    );
    
    // Send email notification to admin
    emailService.sendNewPixelNotification({
      title,
      x, y, w, h,
      imageUrl,
      linkUrl,
      amount: w * h * 100,
    });
    
    res.status(201).json({
      id: pixel.id,
      x: pixel.x,
      y: pixel.y,
      w: pixel.w,
      h: pixel.h,
      imageUrl: pixel.image_url,
      linkUrl: pixel.link_url,
      title: pixel.title,
      createdAt: pixel.created_at,
    });
  } catch (error) {
    console.error('Create pixel error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Pixel oluşturulamadı' });
  }
});

// Delete pixel (admin only)
app.delete('/api/pixels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.pixels.delete(id);
    
    if (!deleted) {
      res.status(404).json({ error: 'Pixel bulunamadı' });
      return;
    }
    
    await adminService.logActivity(
      'PIXEL_DELETE',
      `Pixel silindi: ${id}`,
      null, null
    );
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Silme başarısız' });
  }
});

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.stats.get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'İstatistikler yüklenemedi' });
  }
});

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