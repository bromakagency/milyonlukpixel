import { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

export function validatePixel(req: Request, res: Response, next: NextFunction): void {
  const { x, y, w, h, imageUrl, linkUrl, title } = req.body;
  const errors: ValidationError[] = [];

  if (typeof x !== 'number' || x < 0 || x > 99) {
    errors.push({ field: 'x', message: 'X koordinatı 0-99 arasında olmalı' });
  }

  if (typeof y !== 'number' || y < 0 || y > 99) {
    errors.push({ field: 'y', message: 'Y koordinatı 0-99 arasında olmalı' });
  }

  if (typeof w !== 'number' || w < 1 || w > 100) {
    errors.push({ field: 'w', message: 'Genişlik 1-100 arasında olmalı' });
  }

  if (typeof h !== 'number' || h < 1 || h > 100) {
    errors.push({ field: 'h', message: 'Yükseklik 1-100 arasında olmalı' });
  }

  if (x + w > 100) {
    errors.push({ field: 'x', message: 'Seçilen alan grid sınırlarını aşıyor (X)' });
  }

  if (y + h > 100) {
    errors.push({ field: 'y', message: 'Seçilen alan grid sınırlarını aşıyor (Y)' });
  }

  if (!imageUrl || typeof imageUrl !== 'string') {
    errors.push({ field: 'imageUrl', message: 'Görsel URL zorunludir' });
  } else {
    try {
      new URL(imageUrl);
    } catch {
      errors.push({ field: 'imageUrl', message: 'Geçerli bir URL girin' });
    }
  }

  if (!linkUrl || typeof linkUrl !== 'string') {
    errors.push({ field: 'linkUrl', message: 'Link URL zorunludir' });
  } else {
    try {
      new URL(linkUrl);
    } catch {
      errors.push({ field: 'linkUrl', message: 'Geçerli bir URL girin' });
    }
  }

  if (!title || typeof title !== 'string' || title.length < 1 || title.length > 100) {
    errors.push({ field: 'title', message: 'Başlık 1-100 karakter olmalı' });
  }

  if (errors.length > 0) {
    res.status(400).json({ error: 'Validasyon hatası', details: errors });
    return;
  }

  next();
}
