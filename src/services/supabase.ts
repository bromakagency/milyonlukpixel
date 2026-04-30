/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Vite üretim modunda dinamik erişime (import.meta.env[key]) izin vermez.
// Bu yüzden değişkenleri açıkça yazmalıyız.
const SUPABASE_URL = 
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : '') || 
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || 
  '';

const SUPABASE_ANON_KEY = 
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') || 
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || 
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('CRITICAL: Supabase URL veya Anon Key bulunamadı!');
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null as any;

export interface Pixel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  image_url: string;
  link_url: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  username: string;
  role: 'admin' | 'superadmin';
  created_at: string;
  last_login: string | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  description: string;
  admin_id: string | null;
  admin_username: string | null;
  timestamp: string;
}

export interface Stats {
  totalPixels: number;
  soldPixels: number;
  availablePixels: number;
  totalRevenue: number;
}

export const db = {
  pixels: {
    async getAll(): Promise<Pixel[]> {
      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    async getById(id: string): Promise<Pixel | null> {
      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return null;
      return data;
    },

    async create(pixel: Omit<Pixel, 'id' | 'created_at' | 'updated_at'>): Promise<Pixel> {
      const { data, error } = await supabase
        .from('pixels')
        .insert([pixel])
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('overlap') || error.message.includes('bound')) {
          throw new Error('Bu alan zaten dolu veya sınırları aşıyor');
        }
        throw error;
      }
      return data;
    },

    async update(id: string, updates: Partial<Pixel>): Promise<Pixel | null> {
      const { data, error } = await supabase
        .from('pixels')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) return null;
      return data;
    },

    async delete(id: string): Promise<boolean> {
      // RLS/permission issues can sometimes look like "no rows affected".
      // Ask Supabase to return deleted rows so we can verify the operation.
      const { data, error } = await supabase
        .from('pixels')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Pixel silinemedi (bulunamadı veya yetki yok)');
      }
      return true;
    },

    async checkOverlap(x: number, y: number, w: number, h: number, excludeId?: string): Promise<boolean> {
      const { data, error } = await supabase
        .from('pixels')
        .select('id, x, y, w, h');
      
      if (error || !data) return false;
      
      for (const p of data) {
        if (excludeId && p.id === excludeId) continue;
        
        if (x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y) {
          return true;
        }
      }
      return false;
    },
  },

  activity: {
    async log(
      action: string,
      description: string,
      options: {
        targetType?: string;
        targetId?: string | null;
        adminId?: string | null;
        adminUsername?: string | null;
      } = {}
    ): Promise<void> {
      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          action,
          description,
          target_type: options.targetType || 'system',
          target_id: options.targetId || null,
          admin_id: options.adminId || null,
          admin_username: options.adminUsername || null,
        }]);
      
      if (error) console.error('Activity log error:', error);
    },

    async getAll(filter: {
      action?: string;
      targetType?: string;
      adminId?: string;
      startDate?: string;
      endDate?: string;
    } = {}): Promise<ActivityLog[]> {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (filter.action) query = query.eq('action', filter.action);
      if (filter.targetType) query = query.eq('target_type', filter.targetType);
      if (filter.adminId) query = query.eq('admin_id', filter.adminId);
      if (filter.startDate) query = query.gte('timestamp', filter.startDate);
      if (filter.endDate) query = query.lte('timestamp', filter.endDate);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async exportLogs(filter: {
      action?: string;
      targetType?: string;
      adminId?: string;
      startDate?: string;
      endDate?: string;
    } = {}): Promise<string> {
      const logs = await this.getAll(filter);
      return JSON.stringify(logs, null, 2);
    },
  },

  stats: {
    async get(): Promise<Stats> {
      const { data, error } = await supabase
        .from('pixels')
        .select('w, h');
      
      if (error) throw error;
      
      const pixels = data || [];
      const totalPixels = 1000000;
      const soldPixels = pixels.reduce((acc, p) => acc + (p.w * 10 * p.h * 10), 0);
      const availablePixels = totalPixels - soldPixels;
      const totalRevenue = pixels.reduce((acc, p) => acc + (p.w * p.h * 100), 0);
      
      return {
        totalPixels,
        soldPixels,
        availablePixels,
        totalRevenue,
      };
    },
  },
};
