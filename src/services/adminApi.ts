import { db, supabase } from './supabase';
import { adminService } from './adminService';
import type { AdminInfo } from '../types';

export interface ActivityLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  description: string;
  adminId: string | null;
  adminUsername: string | null;
  timestamp: string;
}

export interface AdminOrder {
  id: string;
  merchantOid: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
  email: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'rejected';
  createdAt: string;
  updatedAt: string | null;
}

export const adminApi = {
  async login(email: string, password: string): Promise<{ token: string }> {
    const result = await adminService.login(email, password);
    
    if ('error' in result) {
      throw new Error(result.error);
    }
    
    return { token: result.token };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getMe(): Promise<AdminInfo> {
    const session = await adminService.getMe();
    if (!session) throw new Error('Geçersiz oturum');
    
    return {
      adminId: session.adminId,
      username: session.email, // Geriye dönük uyumluluk için e-postayı username olarak veriyoruz
      role: session.role as 'admin' | 'superadmin',
    };
  },

  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async getToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  },

  async getOrders(): Promise<AdminOrder[]> {
    const token = await this.getToken();
    if (!token) throw new Error('Geçersiz oturum');

    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Siparişler yüklenemedi');
    return json.orders || [];
  },
};

export interface LogFilter {
  action?: string;
  targetType?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
}

export const activityApi = {
  async getLogs(filter: LogFilter = {}): Promise<ActivityLog[]> {
    const logs = await db.activity.getAll(filter);
    return logs.map(log => ({
      id: log.id,
      action: log.action,
      targetType: log.target_type,
      targetId: log.target_id,
      description: log.description,
      adminId: log.admin_id,
      adminUsername: log.admin_username,
      timestamp: log.timestamp,
    }));
  },

  async exportLogs(filter: LogFilter = {}): Promise<void> {
    const data = await db.activity.exportLogs(filter);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  },
};
