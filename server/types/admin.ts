export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'superadmin';
  createdAt: string;
  lastLogin: string | null;
}

export interface AdminSession {
  adminId: string;
  username: string;
  role: string;
  exp: number;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AuthTokenPayload {
  adminId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}