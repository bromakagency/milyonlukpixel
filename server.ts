import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import * as multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { db } from './src/services/supabase.js';
import { emailService } from './server/services/emailService.js';
import crypto from 'crypto';

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
app.use(express.urlencoded({ extended: true }));

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

// ── PayTR Ödeme Entegrasyonu ──────────────────────────────────────────────────
app.post('/api/payment/paytr-token', async (req, res) => {
  try {
    const { x, y, w, h, imageUrl, linkUrl, title, email } = req.body;
    
    // Validate
    if (!w || !h || !imageUrl) return res.status(400).json({ error: 'Eksik veri' });

    const supabase = getSupabaseServiceClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase servisi yok' });

    const merchant_id = process.env.PAYTR_MERCHANT_ID;
    const merchant_key = process.env.PAYTR_MERCHANT_KEY;
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT;

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return res.status(500).json({ error: 'PayTR bilgileri eksik' });
    }

    const payment_amount = (w * h * 100) * 100; // 1 blok = 100TL = 10000 kuruş
    const merchant_oid = 'MP' + Date.now() + Math.floor(Math.random() * 1000);
    const user_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '1.1.1.1';
    
    const user_email = email || 'customer@milyonlukpiksel.com';
    const user_name = title || 'Müşteri';
    const user_address = 'Türkiye';
    const user_phone = '05555555555';
    const merchant_ok_url = process.env.PAYTR_MERCHANT_OK_URL || 'http://localhost:5173/basarili';
    const merchant_fail_url = process.env.PAYTR_MERCHANT_FAIL_URL || 'http://localhost:5173/hata';
    const user_basket = Buffer.from(JSON.stringify([
      [`Milyonluk Piksel Alanı (${w*10}x${h*10})`, (w*h*100).toString(), 1]
    ])).toString('base64');
    
    const timeout_limit = '30';
    const debug_on = '1'; 
    const test_mode = '1'; 
    const no_installment = '0';
    const max_installment = '0';
    const currency = 'TL';

    // DB'ye bekliyor (pending) durumunda kaydet
    const { data: pixel, error: dbError } = await supabase.from('pixels').insert({
      x, y, w, h,
      image_url: imageUrl,
      link_url: linkUrl,
      title,
      status: 'pending',
      merchant_oid,
      user_email,
      price: w * h * 100
    }).select().single();

    if (dbError) {
      console.error('DB Insert Error:', dbError);
      return res.status(400).json({ error: 'Piksel kaydedilemedi. Zaten alınmış olabilir.' });
    }

    // PayTR Iframe API (Pro)
    // payment_amount zaten yukarıda tanımlanmış

    // Token Hash
    const hash_str = `${merchant_id}${user_ip}${merchant_oid}${user_email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hash_str + merchant_salt).digest('base64');

    const params = new URLSearchParams();
    params.append('merchant_id', merchant_id);
    params.append('user_ip', user_ip as string);
    params.append('merchant_oid', merchant_oid);
    params.append('email', user_email);
    params.append('payment_amount', payment_amount.toString());
    params.append('paytr_token', paytr_token);
    params.append('user_basket', user_basket);
    params.append('debug_on', debug_on);
    params.append('no_installment', no_installment);
    params.append('max_installment', max_installment);
    params.append('user_name', user_name);
    params.append('user_address', user_address);
    params.append('user_phone', user_phone);
    params.append('merchant_ok_url', merchant_ok_url);
    params.append('merchant_fail_url', merchant_fail_url);
    params.append('timeout_limit', timeout_limit);
    params.append('currency', currency);
    params.append('test_mode', test_mode);

    const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const result = await response.json();
    
    if (result.status === 'success') {
      res.json({ token: result.token, oid: merchant_oid });
    } else {
      console.error('PayTR Token Error:', result);
      await supabase.from('pixels').delete().eq('merchant_oid', merchant_oid);
      res.status(500).json({ error: result.reason || 'Ödeme sistemi başlatılamadı' });
    }
  } catch (error) {
    console.error('PayTR API Hatası:', error);
    res.status(500).json({ error: 'Bir hata oluştu' });
  }
});

// PayTR Callback (Webhook)
app.post('/api/payment/paytr-callback', async (req, res) => {
  try {
    const {
      merchant_oid, status, total_amount, hash,
      failed_reason_code, failed_reason_msg, test_mode
    } = req.body;

    const merchant_key = process.env.PAYTR_MERCHANT_KEY || '';
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT || '';

    const hash_str = merchant_oid + merchant_salt + status + total_amount;
    const generated_hash = crypto.createHmac('sha256', merchant_key).update(hash_str).digest('base64');

    if (hash !== generated_hash) {
      console.error('PAYTR HASH MISMATCH:', merchant_oid);
      return res.status(400).send('PAYTR notification failed: bad hash');
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) return res.status(500).send('DB Error');

    if (status === 'success') {
      // Payment Successful
      await supabase.from('pixels')
        .update({ status: 'approved' })
        .eq('merchant_oid', merchant_oid);

      // E-posta gönderimi vs.
      const { data: pixel } = await supabase.from('pixels').select('*').eq('merchant_oid', merchant_oid).single();
      if (pixel) {
        emailService.sendNewPixelNotification({
          title: pixel.title,
          x: pixel.x, y: pixel.y, w: pixel.w, h: pixel.h,
          imageUrl: pixel.image_url, linkUrl: pixel.link_url,
          amount: pixel.price
        });
        
        try {
          await supabase.from('activity_logs').insert({
            action: 'PIXEL_CREATE',
            description: `Yeni Pixel Satın Alındı: ${pixel.title}`,
          });
        } catch (_) {}
      }

      console.log('Payment Approved:', merchant_oid);
      return res.status(200).send('OK');
    } else {
      // Payment Failed
      await supabase.from('pixels')
        .update({ status: 'failed' })
        .eq('merchant_oid', merchant_oid);

      console.log('Payment Failed:', merchant_oid, failed_reason_msg);
      return res.status(200).send('OK');
    }
  } catch (error) {
    console.error('PayTR Callback Error:', error);
    res.status(500).send('Internal Server Error');
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
