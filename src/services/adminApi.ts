import { db } from './supabase';
import { adminService } from './adminService';
import type { AdminInfo } from '../types';

function getToken(): string | null {
  return localStorage.getItem('adminToken');
}

function setToken(token: string): void {
  localStorage.setItem('adminToken', token);
}

function removeToken(): void {
  localStorage.removeItem('adminToken');
}

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

export const adminApi = {
  async login(username: string, password: string): Promise<{ token: string }> {
    const result = await adminService.login(username, password);
    
    if ('error' in result) {
      throw new Error(result.error);
    }
    
    setToken(result.token);
    return { token: result.token };
  },

  async logout(): Promise<void> {
    removeToken();
  },

  async getMe(): Promise<AdminInfo> {
    const token = getToken();
    if (!token) throw new Error('Token bulunamadı');
    
    const session = await adminService.getMe(token);
    if (!session) throw new Error('Geçersiz token');
    
    return {
      adminId: session.adminId,
      username: session.username,
      role: session.role,
    };
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },

  getToken(): string | null {
    return getToken();
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