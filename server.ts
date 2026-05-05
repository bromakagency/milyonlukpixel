import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { emailService } from './server/services/emailService.js';
import { getGrossPriceFromBlocks } from './src/utils/pricing.js';
import crypto from 'crypto';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.set('trust proxy', 1);

// ── Cloudflare R2 Client ──────────────────────────────────────────────────
// Vercel'de endpoint boş string olunca hata verebilir, bu yüzden kontrollü oluşturuyoruz.
let r2: S3Client | null = null;
if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
  r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.error('[CRITICAL] Cloudflare R2 yapılandırması eksik!');
}

// Sunucu başlangıcında eksik ENV kontrolü
const requiredEnv = [
  'SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE_KEY', 
  'R2_ACCOUNT_ID', 
  'R2_ACCESS_KEY_ID', 
  'R2_SECRET_ACCESS_KEY', 
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL'
];
requiredEnv.forEach(env => {
  if (!process.env[env]) {
    console.warn(`[WARN] Eksik Environment Variable: ${env}`);
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // Vercel 4.5MB limiti nedeniyle 4MB'a düşürdük
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const uploadRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla dosya yükleme denemesi. Lütfen biraz bekleyin.' },
});

const imageProxyRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla görsel proxy isteği. Lütfen biraz bekleyin.' },
});

const paytrCallbackRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many callback attempts',
});

const paytrTokenRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Cok fazla odeme baslatma denemesi. Lutfen biraz bekleyin.' },
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

function getAdminEmailAllowlist(): Set<string> {
  const raw = [
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.ADMIN_ALLOWED_EMAILS,
  ]
    .filter(Boolean)
    .join(',');

  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

type PixelArea = { id?: string; x: number; y: number; w: number; h: number };

const GRID_BLOCKS_X = 125;
const GRID_BLOCKS_Y = 80;
const PENDING_ORDER_TTL_MINUTES = 15;
const PENDING_UPLOAD_IMAGE_URL = 'https://milyonlukpiksel.com/pending-upload.webp';
const MERCHANT_OID_PATTERN = /^MP\d{10,16}[A-F0-9]{8}$/;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

function normalizeUserIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (raw?.split(',')[0]?.trim() || req.socket.remoteAddress || '1.1.1.1').replace('::ffff:', '');
}

function isPendingUploadImageUrl(value: unknown): boolean {
  return normalizeString(value) === PENDING_UPLOAD_IMAGE_URL;
}

function areasOverlap(a: PixelArea, b: PixelArea): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function validatePurchasePayload(body: Record<string, unknown>): {
  ok: true;
  data: { x: number; y: number; w: number; h: number; imageUrl: string; linkUrl: string; title: string; email: string };
} | { ok: false; error: string } {
  const x = normalizeNumber(body.x);
  const y = normalizeNumber(body.y);
  const w = normalizeNumber(body.w);
  const h = normalizeNumber(body.h);
  const imageUrl = normalizeString(body.imageUrl);
  const linkUrl = normalizeString(body.linkUrl);
  const title = normalizeString(body.title);
  const email = normalizeString(body.email).toLowerCase();

  if (!Number.isInteger(x) || x < 0 || x > GRID_BLOCKS_X - 1) return { ok: false, error: 'Geçersiz X koordinatı' };
  if (!Number.isInteger(y) || y < 0 || y > GRID_BLOCKS_Y - 1) return { ok: false, error: 'Geçersiz Y koordinatı' };
  if (!Number.isInteger(w) || w < 1 || w > GRID_BLOCKS_X) return { ok: false, error: 'Geçersiz genişlik' };
  if (!Number.isInteger(h) || h < 1 || h > GRID_BLOCKS_Y) return { ok: false, error: 'Geçersiz yükseklik' };
  if (x + w > GRID_BLOCKS_X || y + h > GRID_BLOCKS_Y) return { ok: false, error: 'Seçilen alan grid sınırlarını aşıyor' };
  if (title.length < 1 || title.length > 100) return { ok: false, error: 'Başlık 1-100 karakter olmalı' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Geçerli bir e-posta adresi girin' };

  try {
    const parsedImageUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) throw new Error('bad protocol');
  } catch {
    return { ok: false, error: 'Geçerli bir görsel URL girin' };
  }

  try {
    const parsedLinkUrl = new URL(linkUrl);
    if (!['http:', 'https:'].includes(parsedLinkUrl.protocol)) throw new Error('bad protocol');
  } catch {
    return { ok: false, error: 'Geçerli bir hedef link girin' };
  }

  return { ok: true, data: { x, y, w, h, imageUrl, linkUrl, title, email } };
}

async function assertAreaAvailable(
  supabase: any,
  requested: PixelArea,
  currentOrderId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: pixels, error: pixelError } = await supabase
    .from('pixels')
    .select('id, x, y, w, h')
    .eq('status', 'approved');

  if (pixelError) {
    console.error('Pixel availability check failed:', pixelError);
    return { ok: false, error: 'Alan uygunluğu kontrol edilemedi' };
  }

  if ((pixels || []).some((pixel: PixelArea) => areasOverlap(requested, pixel))) {
    return { ok: false, error: 'Bu alan zaten satın alınmış' };
  }

  const reservationCutoff = new Date(Date.now() - PENDING_ORDER_TTL_MINUTES * 60 * 1000).toISOString();
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id, x, y, w, h')
    .eq('status', 'pending')
    .gte('created_at', reservationCutoff);

  if (orderError) {
    console.error('Order reservation check failed:', orderError);
    if (orderError.code === 'PGRST205' || String(orderError.message || '').includes("public.orders")) {
      return { ok: false, error: 'Ödeme altyapısı için veritabanı migration eksik: public.orders tablosu bulunamadı.' };
    }
    return { ok: false, error: 'Rezervasyon kontrolü yapılamadı' };
  }

  const conflicts = (orders || []).filter((order: PixelArea) => order.id !== currentOrderId);
  if (conflicts.some((order: PixelArea) => areasOverlap(requested, order))) {
    return { ok: false, error: 'Bu alan için ödeme işlemi devam ediyor. Biraz sonra tekrar deneyin.' };
  }

  return { ok: true };
}

app.use(cors({
  origin: (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGIN)
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

app.get('/api/heartbeat', (_req, res) => {
  res.json({ ok: true });
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
app.post('/api/upload', uploadRateLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Dosya bulunamadı veya geçersiz format.' });
      return;
    }

    const merchantOid = normalizeString(req.body?.merchantOid || req.body?.merchant_oid);
    if (!MERCHANT_OID_PATTERN.test(merchantOid)) {
      res.status(400).json({ error: 'Gecersiz siparis numarasi' });
      return;
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      res.status(500).json({ error: 'Supabase servisi yok' });
      return;
    }

    const reservationCutoff = new Date(Date.now() - PENDING_ORDER_TTL_MINUTES * 60 * 1000).toISOString();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, image_url, status, created_at')
      .eq('merchant_oid', merchantOid)
      .eq('status', 'pending')
      .gte('created_at', reservationCutoff)
      .single();

    if (orderError || !order) {
      res.status(403).json({ error: 'Gecerli bir bekleyen odeme kaydi gerekli' });
      return;
    }

    if (!isPendingUploadImageUrl(order.image_url)) {
      res.status(409).json({ error: 'Bu siparis icin gorsel zaten belirlenmis' });
      return;
    }

    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'png';
    const key = `pixels/${merchantOid}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

    const bucketName = process.env.R2_BUCKET_NAME;
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

    if (!r2 || !bucketName || !publicBase) {
      console.error('R2 upload config missing:', {
        client: Boolean(r2),
        bucketName: Boolean(bucketName),
        publicBase: Boolean(publicBase),
      });
      res.status(500).json({
        error: 'Dosya depolama ayarlari eksik',
        details: 'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME ve R2_PUBLIC_URL kontrol edilmeli.',
      });
      return;
    }

    await r2.send(new PutObjectCommand({
      Bucket:      bucketName,
      Key:         key,
      Body:        req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const url = `${publicBase}/${key}`;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        image_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Order image update error:', updateError);
      res.status(500).json({ error: 'Gorsel siparise baglanamadi' });
      return;
    }

    res.json({ url });
  } catch (err) {
    console.error('R2 upload error:', err);
    res.status(500).json({ error: 'Dosya yüklenemedi.' });
  }
});

// Admin login (Supabase Auth üzerinden)
app.get('/api/upload', (_req, res) => {
  res.status(405).json({ error: 'Dosya yuklemek icin POST kullanilmali' });
});

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

app.get('/api/admin/orders', async (req, res) => {
  try {
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

    const { data: userData, error: userError } = await service.auth.getUser(token);
    if (userError || !userData?.user) {
      res.status(401).json({ error: 'Geçersiz oturum', details: userError?.message });
      return;
    }

    if (!getAdminEmailAllowlist().has(String(userData.user.email || '').trim().toLowerCase())) {
      res.status(403).json({ error: 'Bu islem icin admin yetkisi gerekli' });
      return;
    }

    const { data, error } = await service
      .from('orders')
      .select('id, merchant_oid, x, y, w, h, image_url, link_url, title, email, amount, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      console.error('Admin orders error:', error);
      res.status(500).json({ error: 'Siparişler yüklenemedi' });
      return;
    }

    res.json({
      orders: (data || []).map((order: any) => ({
        id: order.id,
        merchantOid: order.merchant_oid,
        x: order.x,
        y: order.y,
        w: order.w,
        h: order.h,
        imageUrl: order.image_url,
        linkUrl: order.link_url,
        title: order.title,
        email: order.email,
        amount: order.amount,
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      })),
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ error: 'Siparişler yüklenemedi' });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
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

    const { data: userData, error: userError } = await service.auth.getUser(token);
    if (userError || !userData?.user) {
      res.status(401).json({ error: 'Geçersiz oturum', details: userError?.message });
      return;
    }

    if (!getAdminEmailAllowlist().has(String(userData.user.email || '').trim().toLowerCase())) {
      res.status(403).json({ error: 'Bu islem icin admin yetkisi gerekli' });
      return;
    }

    const { data: deletedRows, error: deleteError } = await service
      .from('orders')
      .delete()
      .eq('id', req.params.id)
      .select('id');

    if (deleteError) {
      console.error('Admin order delete error:', deleteError);
      res.status(400).json({ error: 'Sipariş silinemedi', details: deleteError.message });
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      res.status(404).json({ error: 'Sipariş bulunamadı' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Admin order delete error:', error);
    res.status(500).json({ error: 'Sipariş silinemedi' });
  }
});

// Create pixel (admin only)
app.post('/api/pixels', async (req, res) => {
  try {
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

    const { data: userData, error: userError } = await service.auth.getUser(token);
    if (userError || !userData?.user) {
      res.status(401).json({ error: 'Geçersiz oturum', details: userError?.message });
      return;
    }

    if (!getAdminEmailAllowlist().has(String(userData.user.email || '').trim().toLowerCase())) {
      res.status(403).json({ error: 'Bu islem icin admin yetkisi gerekli' });
      return;
    }

    const { x, y, w, h, imageUrl, linkUrl, title } = req.body;
    const validation = validatePurchasePayload({ x, y, w, h, imageUrl, linkUrl, title, email: userData.user.email || 'admin@milyonlukpiksel.com' });
    if (validation.ok === false) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const availability = await assertAreaAvailable(service, validation.data);
    if (availability.ok === false) {
      res.status(409).json({ error: availability.error });
      return;
    }

    const { data: pixel, error: insertError } = await service.from('pixels').insert({
      x: validation.data.x,
      y: validation.data.y,
      w: validation.data.w,
      h: validation.data.h,
      image_url: validation.data.imageUrl,
      link_url: validation.data.linkUrl,
      title: validation.data.title,
      status: 'approved',
      user_email: userData.user.email,
      price: getGrossPriceFromBlocks(validation.data.w, validation.data.h),
    }).select().single();

    if (insertError || !pixel) {
      throw insertError || new Error('Pixel oluşturulamadı');
    }

    // Send email notification to admin
    emailService.sendNewPixelNotification({
      title: validation.data.title,
      x: validation.data.x,
      y: validation.data.y,
      w: validation.data.w,
      h: validation.data.h,
      imageUrl: validation.data.imageUrl,
      linkUrl: validation.data.linkUrl,
      amount: getGrossPriceFromBlocks(validation.data.w, validation.data.h),
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
    if (!getAdminEmailAllowlist().has(String(userData.user.email || '').trim().toLowerCase())) {
      res.status(403).json({ error: 'Bu islem icin admin yetkisi gerekli' });
      return;
    }

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
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      res.status(500).json({ error: 'Supabase servisi yok' });
      return;
    }

    const { data, error } = await supabase
      .from('pixels')
      .select('w, h')
      .eq('status', 'approved');

    if (error) throw error;

    const pixels = data || [];
    const totalPixels = 1000000;
    const soldPixels = pixels.reduce((acc: number, p: { w: number; h: number }) => acc + (p.w * 10 * p.h * 10), 0);
    const availablePixels = totalPixels - soldPixels;
    const totalRevenue = pixels.reduce((acc: number, p: { w: number; h: number }) => acc + getGrossPriceFromBlocks(p.w, p.h), 0);

    res.json({
      totalPixels,
      soldPixels,
      availablePixels,
      totalRevenue,
    });
  } catch (error) {
    res.status(500).json({ error: 'İstatistikler yüklenemedi' });
  }
});

// ── PayTR Ödeme Entegrasyonu ──────────────────────────────────────────────────
app.post('/api/payment/paytr-token', paytrTokenRateLimiter, async (req, res) => {
  try {
    const validation = validatePurchasePayload(req.body);
    if (validation.ok === false) {
      return res.status(400).json({ error: validation.error });
    }
    const { x, y, w, h, imageUrl, linkUrl, title, email } = validation.data;

    const supabase = getSupabaseServiceClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase servisi yok' });

    const availability = await assertAreaAvailable(supabase, { x, y, w, h });
    if (availability.ok === false) {
      return res.status(409).json({ error: availability.error });
    }

    const merchant_id = process.env.PAYTR_MERCHANT_ID;
    const merchant_key = process.env.PAYTR_MERCHANT_KEY;
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT;

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return res.status(500).json({ error: 'PayTR bilgileri eksik' });
    }

    const price = getGrossPriceFromBlocks(w, h);
    const payment_amount = price * 100; // 1 blok = 100TL = 10000 kuruş
    const merchant_oid = 'MP' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
    const user_ip = normalizeUserIp(req);
    
    const user_email = email;
    const user_name = title || 'Müşteri';
    const user_address = 'Türkiye';
    const user_phone = '05555555555';
    const merchant_ok_url  = (process.env.PAYTR_MERCHANT_OK_URL  || 'http://localhost:5173/basarili') + `?oid=${merchant_oid}`;
    const merchant_fail_url = (process.env.PAYTR_MERCHANT_FAIL_URL || 'http://localhost:5173/hata')     + `?oid=${merchant_oid}`;
    const user_basket = Buffer.from(JSON.stringify([
      [`Milyonluk Piksel Alanı (${w*10}x${h*10})`, price.toString(), 1]
    ])).toString('base64');
    
    const timeout_limit = '30';
    const debug_on = process.env.PAYTR_DEBUG_ON || (process.env.NODE_ENV === 'production' ? '0' : '1');
    const test_mode = process.env.PAYTR_TEST_MODE || (process.env.NODE_ENV === 'production' ? '0' : '1');
    const no_installment = '1';
    const max_installment = '0';
    const currency = 'TL';

    // DB'ye bekliyor (pending) durumunda kaydet
    const { data: order, error: dbError } = await supabase.from('orders').insert({
      x, y, w, h,
      image_url: imageUrl,
      link_url: linkUrl,
      title,
      email: user_email,
      amount: price,
      status: 'pending',
      merchant_oid,
    }).select().single();

    if (dbError || !order) {
      console.error('Order Insert Error:', dbError);
      return res.status(400).json({ error: 'Ödeme kaydı oluşturulamadı. Alan başka bir işlemde olabilir.' });
    }

    // PayTR Iframe API (Pro)
    // payment_amount zaten yukarıda tanımlanmış

    // Token Hash
    const hash_str = `${merchant_id}${user_ip}${merchant_oid}${user_email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
    const paytr_token = crypto.createHmac('sha256', merchant_key).update(hash_str + merchant_salt).digest('base64');

    const params = new URLSearchParams();
    params.append('merchant_id', merchant_id);
    params.append('user_ip', user_ip);
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
      await supabase.from('orders').update({
        status: 'failed',
        details: { paytr_reason: result.reason || null },
        updated_at: new Date().toISOString(),
      }).eq('merchant_oid', merchant_oid);
      res.status(500).json({ error: result.reason || 'Ödeme sistemi başlatılamadı' });
    }
  } catch (error) {
    console.error('PayTR API Hatası:', error);
    res.status(500).json({ error: 'Bir hata oluştu' });
  }
});

// PayTR Callback (Webhook)
app.post('/api/payment/paytr-callback', paytrCallbackRateLimiter, async (req, res) => {
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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_oid', merchant_oid)
      .single();

    if (orderError || !order) {
      console.error('PayTR order not found:', merchant_oid, orderError);
      return res.status(200).send('OK');
    }

    const expectedAmount = Number(order.amount) * 100;
    if (Number(total_amount) !== expectedAmount) {
      console.error('PAYTR AMOUNT MISMATCH:', { merchant_oid, expectedAmount, total_amount });
      await supabase.from('orders').update({
        status: 'rejected',
        details: {
          ...(order.details || {}),
          rejected_reason: 'amount_mismatch',
          total_amount,
          expected_amount: expectedAmount,
        },
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      return res.status(200).send('OK');
    }

    if (status === 'success') {
      // Payment Successful
      if (order.status === 'paid') {
        return res.status(200).send('OK');
      }

      if (isPendingUploadImageUrl(order.image_url)) {
        console.error('PAYTR PAID BUT IMAGE UPLOAD MISSING:', merchant_oid);
        await supabase.from('orders').update({
          status: 'rejected',
          details: {
            ...(order.details || {}),
            rejected_reason: 'missing_image_upload',
            paytr_status: status,
            total_amount,
            test_mode,
          },
          updated_at: new Date().toISOString(),
        }).eq('id', order.id);
        return res.status(200).send('OK');
      }

      const availability = await assertAreaAvailable(
        supabase,
        { x: order.x, y: order.y, w: order.w, h: order.h },
        order.id
      );

      if (availability.ok === false) {
        console.error('Paid order area unavailable:', { merchant_oid, error: availability.error });
        await supabase.from('orders').update({
          status: 'rejected',
          details: {
            ...(order.details || {}),
            rejected_reason: 'area_unavailable_after_payment',
            paytr_status: status,
            total_amount,
            test_mode,
          },
          updated_at: new Date().toISOString(),
        }).eq('id', order.id);
        return res.status(200).send('OK');
      }

      // E-posta gönderimi vs.
      const { data: existingPixel } = await supabase
        .from('pixels')
        .select('*')
        .eq('merchant_oid', merchant_oid)
        .maybeSingle();

      const { data: pixel, error: pixelError } = existingPixel
        ? { data: existingPixel, error: null }
        : await supabase.from('pixels').insert({
            x: order.x,
            y: order.y,
            w: order.w,
            h: order.h,
            image_url: order.image_url,
            link_url: order.link_url,
            title: order.title,
            status: 'approved',
            merchant_oid,
            user_email: order.email,
            price: order.amount,
          }).select().single();

      if (pixelError || !pixel) {
        console.error('Pixel create after payment failed:', pixelError);
        return res.status(500).send('DB Error');
      }

      await supabase.from('orders').update({
        status: 'paid',
        details: {
          ...(order.details || {}),
          paytr_status: status,
          total_amount,
          test_mode,
        },
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      if (pixel) {
        emailService.sendNewPixelNotification({
          title: pixel.title,
          x: pixel.x, y: pixel.y, w: pixel.w, h: pixel.h,
          imageUrl: pixel.image_url, linkUrl: pixel.link_url,
          amount: pixel.price || order.amount
        });

        if (order.email) {
          emailService.sendPixelApprovedNotification({
            title: pixel.title,
            x: pixel.x, y: pixel.y, w: pixel.w, h: pixel.h,
            imageUrl: pixel.image_url, linkUrl: pixel.link_url,
            amount: pixel.price || order.amount
          }, order.email);
        }
        
      }

      console.log('Payment Approved:', merchant_oid);
      return res.status(200).send('OK');
    } else {
      // Payment Failed
      await supabase.from('orders').update({
        status: 'failed',
        details: {
          ...(order.details || {}),
          failed_reason_code,
          failed_reason_msg,
          paytr_status: status,
          total_amount,
          test_mode,
        },
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);

      console.log('Payment Failed:', merchant_oid, failed_reason_msg);
      return res.status(200).send('OK');
    }
  } catch (error) {
    console.error('PayTR Callback Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ── Image Proxy (CORS bypass for R2 CDN) ─────────────────────────────────────
// Frontend'den fetch ettiğimizde R2'nin CORS politikası engeller.
// Bu endpoint sunucu tarafında görseli çekip client'a iletir.
app.get('/api/payment/order-status/:oid', async (req, res) => {
  try {
    const oid = normalizeString(req.params.oid);
    // OID format: 'MP' + Date.now() (13 rakam) + randomBytes(4).hex.toUpperCase() (8 karakter [0-9A-F])
    // Örnek: MP1746134567890A1B2C3D4E  (toplam ~23 karakter)
    // Eski regex (^MP\d+[A-F0-9]{8}$) kırıktı: \d+ greedy olduğu için hex kısımdaki
    // rakamları da yutuyordu ve ~%62 ihtimalle 400 dönüyordu.
    if (!/^MP\d{10,16}[A-F0-9]{8}$/.test(oid)) {
      res.status(400).json({ error: 'Geçersiz sipariş numarası' });
      return;
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      res.status(500).json({ error: 'Supabase servisi yok' });
      return;
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('status, image_url')
      .eq('merchant_oid', oid)
      .single();

    if (error || !order) {
      res.status(404).json({ error: 'Sipariş bulunamadı' });
      return;
    }

    res.json({ status: order.status, imageUrl: order.image_url });
  } catch (error) {
    console.error('Order status error:', error);
    res.status(500).json({ error: 'Sipariş durumu alınamadı' });
  }
});

app.get('/api/proxy-image', imageProxyRateLimiter, async (req, res) => {
  const imageUrl = req.query.url as string;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'URL parametresi gerekli' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Geçerli bir URL gerekli' });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isPrivateHost =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === '169.254.169.254';

  if (!['http:', 'https:'].includes(parsedUrl.protocol) || isPrivateHost) {
    return res.status(403).json({ error: 'Bu görsel URL’i proxy için güvenli değil' });
  }

  // Sadece kendi domainlerimizden gelen URL'lere izin ver (güvenlik)
  const ownOrigins = new Set([
    'https://cdn.milyonlukpiksel.com',
    'https://www.milyonlukpiksel.com',
    'https://milyonlukpiksel.com',
  ]);

  if (process.env.R2_PUBLIC_URL) {
    try {
      ownOrigins.add(new URL(process.env.R2_PUBLIC_URL).origin);
    } catch {
      console.warn('Invalid R2_PUBLIC_URL for proxy allowlist');
    }
  }

  if (!ownOrigins.has(parsedUrl.origin) && parsedUrl.protocol !== 'https:') {
    return res.status(403).json({ error: 'Harici gorsel proxy icin HTTPS gerekli' });
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Görsel yüklenemedi' });
    }

    const contentType = response.headers.get('content-type') || 'image/webp';
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (!contentType.startsWith('image/')) {
      return res.status(415).json({ error: 'Sadece görsel dosyaları proxylenebilir' });
    }
    if (contentLength > 6 * 1024 * 1024) {
      return res.status(413).json({ error: 'Görsel çok büyük' });
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 6 * 1024 * 1024) {
      return res.status(413).json({ error: 'Görsel çok büyük' });
    }

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Proxy image error:', error);
    return res.status(500).json({ error: 'Görsel proxy hatası' });
  }
});

// ── Global Hata Yakalayıcı ────────────────────────────────────────────────
// Bu middleware tüm rotalardan sonra eklenmeli. 
// Hata oluştuğunda HTML yerine JSON dönmesini sağlar (Frontend'deki 'Unexpected token A' hatasını çözer)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]:', err);
  
  // Multer hataları (Dosya çok büyük vb.)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      error: 'Dosya yükleme hatası', 
      details: err.message === 'File too large' ? 'Dosya boyutu 5MB sınırını aşıyor' : err.message 
    });
  }

  res.status(err.status || 500).json({
    error: 'Sunucu hatası oluştu',
    message: err.message || 'Bilinmeyen bir hata',
    path: req.path
  });
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
