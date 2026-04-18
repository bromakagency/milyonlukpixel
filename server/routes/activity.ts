import { Router, Request, Response } from 'express';
import { activityLogService } from '../services/activityLogService.js';
import { blockedContentService } from '../services/blockedContentService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { LogAction, CreateBlockDto } from '../types/activity.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const { action, targetType, adminId, startDate, endDate, search } = req.query;
    
    const filter = {
      action: action as LogAction | undefined,
      targetType: targetType as string | undefined,
      adminId: adminId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      search: search as string | undefined,
    };
    
    const logs = await activityLogService.getAll(filter);
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Loglar yüklenemedi' });
  }
});

router.get('/logs/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await activityLogService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'İstatistikler yüklenemedi' });
  }
});

router.get('/logs/export', async (req: AuthRequest, res: Response) => {
  try {
    const { action, targetType, startDate, endDate } = req.query;
    
    const filter = {
      action: action as LogAction | undefined,
      targetType: targetType as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    };
    
    const data = await activityLogService.exportLogs(filter);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.json`);
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: 'Export başarısız' });
  }
});

router.get('/blocked', async (req: AuthRequest, res: Response) => {
  try {
    const blocked = await blockedContentService.getAll();
    res.json(blocked);
  } catch (error) {
    res.status(500).json({ error: 'Engellenen içerikler yüklenemedi' });
  }
});

router.get('/blocked/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await blockedContentService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'İstatistikler yüklenemedi' });
  }
});

router.post('/blocked', requireRole('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { type, value, reason } = req.body as CreateBlockDto;
    
    if (!type || !value || !reason) {
      res.status(400).json({ error: 'Tüm alanlar gerekli' });
      return;
    }
    
    if (!['domain', 'keyword', 'image_hash'].includes(type)) {
      res.status(400).json({ error: 'Geçersiz engelleme türü' });
      return;
    }
    
    const blocked = await blockedContentService.create(
      { type, value, reason },
      req.admin!.adminId
    );
    
    await activityLogService.log('BLOCK_CREATE', `Engelleme eklendi: ${value}`, {
      targetType: 'block',
      targetId: blocked.id,
      adminId: req.admin!.adminId,
      adminUsername: req.admin!.username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json(blocked);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Engelleme eklenemedi';
    res.status(400).json({ error: message });
  }
});

router.delete('/blocked/:id', requireRole('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await blockedContentService.delete(req.params.id);
    
    if (!deleted) {
      res.status(404).json({ error: 'Engelleme bulunamadı' });
      return;
    }
    
    await activityLogService.log('BLOCK_DELETE', `Engelleme kaldırıldı: ${req.params.id}`, {
      targetType: 'block',
      targetId: req.params.id,
      adminId: req.admin!.adminId,
      adminUsername: req.admin!.username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Engelleme kaldırılamadı' });
  }
});

router.post('/check-content', async (req: AuthRequest, res: Response) => {
  try {
    const { imageUrl, linkUrl, title } = req.body;
    const result = await blockedContentService.checkContent({ imageUrl, linkUrl, title });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Kontrol başarısız' });
  }
});

export default router;