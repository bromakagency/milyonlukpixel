export interface Pixel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
  createdAt: string;
}

export interface CreatePixelDto {
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
}

export interface UpdatePixelDto {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  imageUrl?: string;
  linkUrl?: string;
  title?: string;
}

export interface Stats {
  totalPixels: number;
  soldPixels: number;
  availablePixels: number;
  totalRevenue: number;
}
