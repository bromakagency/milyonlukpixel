import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { Admin, AdminSession, LoginDto, AuthTokenPayload } from '../types/admin.js';

const ADMINS_FILE = path.join(process.cwd(), 'data', 'admins.json');
const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;
const SALT_ROUNDS = 12;

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set in environment variables!');
}

async function ensureAdminsDir(): Promise<void> {
  const dir = path.dirname(ADMINS_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readAdmins(): Promise<Admin[]> {
  try {
    await ensureAdminsDir();
    const data = await fs.readFile(ADMINS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeAdmins(admins: Admin[]): Promise<void> {
  await ensureAdminsDir();
  await fs.writeFile(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

function generateToken(admin: Admin): string {
  const secret = JWT_SECRET || 'fallback-secret-change-in-production';
  return jwt.sign(
    { adminId: admin.id, username: admin.username, role: admin.role },
    secret,
    { expiresIn: '24h' }
  );
}

function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const secret = JWT_SECRET || 'fallback-secret-change-in-production';
    return jwt.verify(token, secret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export const adminService = {
  async initializeDefaultAdmin(): Promise<void> {
    const admins = await readAdmins();
    
    if (admins.length === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_PASSWORD;
      
      if (!defaultPassword) {
        console.warn('WARNING: ADMIN_PASSWORD not set! Admin panel will not be accessible.');
        return;
      }
      
      const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
      const defaultAdmin: Admin = {
        id: '1',
        username: defaultUsername,
        passwordHash,
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };
      
      await writeAdmins([defaultAdmin]);
      console.log(`Default admin created: ${defaultUsername}`);
    }
  },

  async login(dto: LoginDto): Promise<{ token: string } | { error: string }> {
    const admins = await readAdmins();
    const admin = admins.find(a => a.username === dto.username);
    
    if (!admin) {
      return { error: 'Geçersiz kullanıcı adı veya şifre' };
    }
    
    const isValid = await bcrypt.compare(dto.password, admin.passwordHash);
    
    if (!isValid) {
      return { error: 'Geçersiz kullanıcı adı veya şifre' };
    }
    
    admin.lastLogin = new Date().toISOString();
    await writeAdmins(admins);
    
    const token = generateToken(admin);
    return { token };
  },

  verifyToken,

  async createAdmin(username: string, password: string, role: 'admin' | 'superadmin' = 'admin'): Promise<Admin | { error: string }> {
    const admins = await readAdmins();
    
    if (admins.some(a => a.username === username)) {
      return { error: 'Bu kullanıcı adı zaten var' };
    }
    
    if (password.length < 8) {
      return { error: 'Şifre en az 8 karakter olmalı' };
    }
    
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newAdmin: Admin = {
      id: Date.now().toString(),
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };
    
    admins.push(newAdmin);
    await writeAdmins(admins);
    
    return newAdmin;
  },

  async getAll(): Promise<Omit<Admin, 'passwordHash'>[]> {
    const admins = await readAdmins();
    return admins.map(({ passwordHash, ...rest }) => rest);
  },

  async delete(id: string): Promise<boolean> {
    const admins = await readAdmins();
    const filtered = admins.filter(a => a.id !== id);
    
    if (filtered.length === admins.length) return false;
    
    await writeAdmins(filtered);
    return true;
  },
};