import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService.js';
import { AuthTokenPayload } from '../types/admin.js';

export interface AuthRequest extends Request {
  admin?: AuthTokenPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkilendirme token bulunamadı' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Token bulunamadı' });
    return;
  }
  
  const payload = adminService.verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    return;
  }
  
  req.admin = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: 'Yetkilendirme gerekli' });
      return;
    }
    
    if (!roles.includes(req.admin.role)) {
      res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      return;
    }
    
    next();
  };
}