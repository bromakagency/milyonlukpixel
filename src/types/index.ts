export interface PixelBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
  createdAt?: string;
  status?: string;
}

export interface PixelFormData {
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Stats {
  totalPixels: number;
  soldPixels: number;
  availablePixels: number;
  totalRevenue: number;
  soldPercent?: number;
  recentBlocksSold24h?: number;
}

export interface AdminInfo {
  adminId: string;
  username: string;
  role: string;
}

export interface Order {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}
