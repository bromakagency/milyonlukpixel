import { Router, Request, Response } from 'express';
import { adminService } from '../services/adminService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
      return;
    }
    
    const result = await adminService.login({ username, password });
    
    if ('error' in result) {
      res.status(401).json({ error: result.error });
      return;
    }
    
    res.json({ success: true, token: result.token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      adminId: req.admin!.adminId,
      username: req.admin!.username,
      role: req.admin!.role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/admins', authMiddleware, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
      return;
    }
    
    const result = await adminService.createAdmin(username, password, role || 'admin');
    
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    
    const { passwordHash, ...adminWithoutPassword } = result;
    res.status(201).json(adminWithoutPassword);
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/admins', authMiddleware, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const admins = await adminService.getAll();
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/admins/:id', authMiddleware, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const deleted = await adminService.delete(req.params.id);
    
    if (!deleted) {
      res.status(404).json({ error: 'Admin bulunamadı' });
      return;
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;