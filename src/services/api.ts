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
    const token = localStorage.getItem('adminToken');
    
    const res = await fetch('/api/pixels', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Pixel oluşturulamadı' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    
    return res.json();
  },

  async updatePixel(id: string, data: Partial<PixelFormData>): Promise<PixelBlock> {
    const token = localStorage.getItem('adminToken');
    
    const res = await fetch(`/api/pixels/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) throw new Error('Pixel güncellenemedi');
    return res.json();
  },

  async deletePixel(id: string): Promise<void> {
    const token = localStorage.getItem('adminToken');
    
    const res = await fetch(`/api/pixels/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
    });
    
    if (!res.ok) throw new Error('Silme başarısız');
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