import fs from 'fs/promises';
import path from 'path';
import { ActivityLog, LogAction, LogFilter } from '../types/activity.js';

const LOGS_FILE = path.join(process.cwd(), 'data', 'activityLogs.json');

async function ensureLogsDir(): Promise<void> {
  const dir = path.dirname(LOGS_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readLogs(): Promise<ActivityLog[]> {
  try {
    await ensureLogsDir();
    const data = await fs.readFile(LOGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLogs(logs: ActivityLog[]): Promise<void> {
  await ensureLogsDir();
  await fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2));
}

export const activityLogService = {
  async log(
    action: LogAction,
    description: string,
    options: {
      targetType?: 'pixel' | 'admin' | 'system' | 'block';
      targetId?: string | null;
      adminId?: string | null;
      adminUsername?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      details?: Record<string, any> | null;
    } = {}
  ): Promise<ActivityLog> {
    const logs = await readLogs();
    
    const newLog: ActivityLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      action,
      targetType: options.targetType || 'system',
      targetId: options.targetId || null,
      description,
      adminId: options.adminId || null,
      adminUsername: options.adminUsername || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      timestamp: new Date().toISOString(),
      details: options.details || null,
    };
    
    logs.unshift(newLog);
    
    const maxLogs = 10000;
    const trimmedLogs = logs.slice(0, maxLogs);
    
    await writeLogs(trimmedLogs);
    
    return newLog;
  },

  async getAll(filter: LogFilter = {}): Promise<ActivityLog[]> {
    let logs = await readLogs();
    
    if (filter.action) {
      logs = logs.filter(l => l.action === filter.action);
    }
    
    if (filter.targetType) {
      logs = logs.filter(l => l.targetType === filter.targetType);
    }
    
    if (filter.adminId) {
      logs = logs.filter(l => l.adminId === filter.adminId);
    }
    
    if (filter.startDate) {
      const start = new Date(filter.startDate);
      logs = logs.filter(l => new Date(l.timestamp) >= start);
    }
    
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      logs = logs.filter(l => new Date(l.timestamp) <= end);
    }
    
    if (filter.search) {
      const search = filter.search.toLowerCase();
      logs = logs.filter(l => 
        l.description.toLowerCase().includes(search) ||
        l.adminUsername?.toLowerCase().includes(search) ||
        l.action.toLowerCase().includes(search)
      );
    }
    
    return logs;
  },

  async exportLogs(filter: LogFilter = {}): Promise<string> {
    const logs = await this.getAll(filter);
    return JSON.stringify(logs, null, 2);
  },

  async getStats(): Promise<{
    totalLogs: number;
    todayLogs: number;
    loginAttempts: number;
    failedLogins: number;
  }> {
    const logs = await readLogs();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalLogs: logs.length,
      todayLogs: logs.filter(l => new Date(l.timestamp) >= today).length,
      loginAttempts: logs.filter(l => l.action === 'LOGIN_SUCCESS' || l.action === 'LOGIN_FAILED').length,
      failedLogins: logs.filter(l => l.action === 'LOGIN_FAILED').length,
    };
  },
};