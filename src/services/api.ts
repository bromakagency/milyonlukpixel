import { db } from './supabase';
import type { Pixel, Stats, ActivityLog } from './supabase';

export interface PixelFormData {
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
}

export interface PixelBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
  createdAt?: string;
}

function toPixelBlock(pixel: Pixel): PixelBlock {
  return {
    id: pixel.id,
    x: pixel.x,
    y: pixel.y,
    w: pixel.w,
    h: pixel.h,
    imageUrl: pixel.image_url,
    linkUrl: pixel.link_url,
    title: pixel.title,
    createdAt: pixel.created_at,
  };
}

export const api = {
  async getPixels(): Promise<PixelBlock[]> {
    const pixels = await db.pixels.getAll();
    return pixels.map(toPixelBlock);
  },

  async createPixel(data: PixelFormData): Promise<PixelBlock> {
    const pixel = await db.pixels.create({
      x: data.x,
      y: data.y,
      w: data.w,
      h: data.h,
      image_url: data.imageUrl,
      link_url: data.linkUrl,
      title: data.title,
    });

    // Maili backend'e gönder, hata olsa da satın alma akışı kesilmesin.
    void fetch('/api/notify-pixel-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        x: data.x,
        y: data.y,
        w: data.w,
        h: data.h,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        amount: data.w * data.h * 100,
      }),
    }).catch(() => undefined);

    return toPixelBlock(pixel);
  },

  async updatePixel(id: string, data: Partial<PixelFormData>): Promise<PixelBlock> {
    const updates: Partial<Pixel> = {};

    if (typeof data.x === 'number') updates.x = data.x;
    if (typeof data.y === 'number') updates.y = data.y;
    if (typeof data.w === 'number') updates.w = data.w;
    if (typeof data.h === 'number') updates.h = data.h;
    if (typeof data.imageUrl === 'string') updates.image_url = data.imageUrl;
    if (typeof data.linkUrl === 'string') updates.link_url = data.linkUrl;
    if (typeof data.title === 'string') updates.title = data.title;

    const pixel = await db.pixels.update(id, updates);
    if (!pixel) throw new Error('Pixel güncellenemedi');
    return toPixelBlock(pixel);
  },

  async deletePixel(id: string): Promise<void> {
    const deleted = await db.pixels.delete(id);
    if (!deleted) throw new Error('Silme başarısız');
  },

  async getStats(): Promise<Stats> {
    return db.stats.get();
  },

  async getPixelById(id: string): Promise<PixelBlock> {
    const pixel = await db.pixels.getById(id);
    if (!pixel) throw new Error('Pixel bulunamadı');
    return toPixelBlock(pixel);
  },
};