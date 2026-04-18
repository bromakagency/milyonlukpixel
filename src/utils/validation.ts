import { isValidURL } from './helpers';

export function validatePixelForm(data: {
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
}): string[] {
  const errors: string[] = [];

  if (data.x < 0 || data.x > 99) errors.push('X koordinatı 0-99 arasında olmalı');
  if (data.y < 0 || data.y > 99) errors.push('Y koordinatı 0-99 arasında olmalı');
  if (data.w < 1 || data.w > 100) errors.push('Genişlik 1-100 arasında olmalı');
  if (data.h < 1 || data.h > 100) errors.push('Yükseklik 1-100 arasında olmalı');
  if (data.x + data.w > 100) errors.push('Seçilen alan grid sınırlarını aşıyor');
  if (data.y + data.h > 100) errors.push('Seçilen alan grid sınırlarını aşıyor');
  if (!isValidURL(data.imageUrl)) errors.push('Geçerli bir görsel URL girin');
  if (!isValidURL(data.linkUrl)) errors.push("Geçerli bir link URL'i girin");
  if (data.title.length < 1 || data.title.length > 100) errors.push('Başlık 1-100 karakter olmalı');

  return errors;
}
