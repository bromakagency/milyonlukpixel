import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import * as multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { db } from './src/services/supabase.js';
import { emailService } from './server/services/emailService.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ── Cloudflare R2 Client ──────────────────────────────────────────────────
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const upload = multer.default({
  storage: multer.default.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function getBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
}

function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.error('MISSING ENV:', { url: !!url, serviceKey: !!serviceKey });
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN 
    : '*',
  credentials: true,
}));
app.use(express.json());

// ── Canlı Ziyaretçi Takibi (In-memory Cache) ─────────────────────────
const activeVisitors = new Map<string, number>();

app.post('/api/heartbeat', (req, res) => {
  const visitorId = req.body.visitorId || req.ip;
  if (visitorId) {
    activeVisitors.set(visitorId as string, Date.now());
  }
  res.sendStatus(200);
});

app.get('/api/live-count', (req, res) => {
  const now = Date.now();
  let count = 0;
  for (const [id, time] of activeVisitors.entries()) {
    // 2 dakikadan (120000ms) eski ziyaretçileri temizle
    if (now - time > 120000) {
      activeVisitors.delete(id);
    } else {
      count++;
    }
  }
  // Kullanıcının belirttiği gibi FOMO etkisi (aktif sayı + 2)
  res.json({ count: count + 2 });
});

// ── Cloudflare R2 Dosya Yükleme ───────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Dosya bulunamadı veya geçersiz format.' });
      return;
    }

    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'png';
    const key = `pixels/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME || '',
      Key:         key,
      Body:        req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    // Public URL: R2 custom domain veya r2.dev subdomain
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
    const url = `${publicBase}/${key}`;

    res.json({ url });
  } catch (err) {
    console.error('R2 upload error:', err);
    res.status(500).json({ error: 'Dosya yüklenemedi.' });
  }
});

// Admin login (Supabase Auth üzerinden)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      res.status(500).json({ error: 'Supabase ayarları eksik' });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.json({
      token: data.session?.access_token,
      admin: {
        id: data.user?.id,
        email: data.user?.email,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get admin info (Supabase Auth üzerinden)
app.get('/api/admin/me', async (req, res) => {
  try {
    const token = getBearerToken(req);
    
    if (!token) {
      res.status(401).json({ error: 'Token gerekli' });
      return;
    }
    
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      res.status(500).json({ error: 'Supabase ayarları eksik' });
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Geçersiz token' });
      return;
    }
    
    res.json({
      adminId: user.id,
      email: user.email,
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
    
    // Activity log (best effort)
    try {
      const logService = getSupabaseServiceClient();
      await logService?.from('activity_logs').insert({
        action: 'PIXEL_CREATE',
        description: `Pixel eklendi: ${title}`,
      });
    } catch (_) {}
    
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

    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Yetkilendirme gerekli' });
      return;
    }

    const service = getSupabaseServiceClient();
    if (!service) {
      res.status(500).json({ error: 'Server Supabase service ayarları eksik' });
      return;
    }

    // Verify Supabase JWT before allowing destructive operations.
    const { data: userData, error: userError } = await service.auth.getUser(token);
    if (userError || !userData?.user) {
      res.status(401).json({ error: 'Geçersiz oturum', details: userError?.message });
      return;
    }

    // Silme işlemini service_role client'ı ile yap
    const { data: deletedRows, error: deleteError } = await service
      .from('pixels')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      console.error('DATABASE DELETE ERROR:', deleteError);
      res.status(400).json({ error: 'Veritabanı silme hatası', details: deleteError.message });
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      res.status(404).json({ error: 'Pixel bulunamadı (Zaten silinmiş olabilir)' });
      return;
    }
    
    // Activity log (best effort)
    try {
      await service.from('activity_logs').insert({
        action: 'PIXEL_DELETE',
        description: `Pixel silindi: ${id}`,
      });
    } catch (_) {}
    
    res.status(204).send();
  } catch (error) {
    console.error('DELETE ERROR:', error);
    res.status(500).json({ 
      error: 'Silme başarısız', 
      details: error instanceof Error ? error.message : String(error) 
    });
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

// Sunucuyu dışa aktar (Vercel için gerekli)
export default app;

// Yerel geliştirme için (Vercel dışında çalışırken)
if (process.env.NODE_ENV !== 'production') {
  async function startServer() {
    try {
      // Sadece lokalde Vite'ı dinamik olarak yüklüyoruz
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Vite başlatılamadı:', error);
    }
  }
  startServer();
}
