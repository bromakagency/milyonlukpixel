import { Router, Request, Response } from 'express';
import { pixelService } from '../services/pixelService.js';
import { validatePixel } from '../middleware/validation.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const pixels = await pixelService.getAll();
    res.json(pixels);
  } catch (error) {
    res.status(500).json({ error: 'Pikseller yüklenemedi' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await pixelService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'İstatistikler yüklenemedi' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pixel = await pixelService.getById(req.params.id);
    if (!pixel) {
      res.status(404).json({ error: 'Pixel bulunamadı' });
      return;
    }
    res.json(pixel);
  } catch (error) {
    res.status(500).json({ error: 'Pixel yüklenemedi' });
  }
});

router.post('/', validatePixel, async (req: Request, res: Response) => {
  try {
    const pixel = await pixelService.create(req.body);
    res.status(201).json(pixel);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pixel oluşturulamadı';
    res.status(400).json({ error: message });
  }
});

router.put('/:id', validatePixel, async (req: Request, res: Response) => {
  try {
    const pixel = await pixelService.update(req.params.id, req.body);
    if (!pixel) {
      res.status(404).json({ error: 'Pixel bulunamadı' });
      return;
    }
    res.json(pixel);
  } catch (error) {
    res.status(500).json({ error: 'Pixel güncellenemedi' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await pixelService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Pixel bulunamadı' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Pixel silinemedi' });
  }
});

export default router;
