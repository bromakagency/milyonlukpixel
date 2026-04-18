import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Çok fazla giriş denemesi. Lütfen 15 dakika bekleyin.',
      retryAfter: Math.ceil((req as any).rateLimit.resetTime / 1000)
    });
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});