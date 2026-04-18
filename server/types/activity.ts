export interface ActivityLog {
  id: string;
  action: LogAction;
  targetType: 'pixel' | 'admin' | 'system' | 'block';
  targetId: string | null;
  description: string;
  adminId: string | null;
  adminUsername: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  details: Record<string, any> | null;
}

export type LogAction = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PIXEL_CREATE'
  | 'PIXEL_UPDATE'
  | 'PIXEL_DELETE'
  | 'ADMIN_CREATE'
  | 'ADMIN_DELETE'
  | 'BLOCK_CREATE'
  | 'BLOCK_DELETE'
  | 'SYSTEM_ERROR';

export interface BlockedContent {
  id: string;
  type: 'domain' | 'keyword' | 'image_hash';
  value: string;
  reason: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface CreateBlockDto {
  type: 'domain' | 'keyword' | 'image_hash';
  value: string;
  reason: string;
}

export interface LogFilter {
  action?: LogAction;
  targetType?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}