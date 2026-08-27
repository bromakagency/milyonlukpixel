import { supabase } from './supabase';

export interface AdminSession {
  adminId: string;
  email: string;
  role: string;
}

export const adminService = {
  async login(email: string, password: string): Promise<{ token: string } | { error: string }> {
    try {
      // 1. Backend üzerinden güvenli giriş ve allowlist kontrolü
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Giriş başarısız' };
      }

      // 2. Supabase istemcisini de senkronize et
      if (supabase) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
      }

      return { token: data.token };
    } catch {
      // Fallback: Doğrudan Supabase ile giriş yap ve ardından /api/admin/me ile doğrula
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        return { error: error?.message || 'Geçersiz e-posta veya şifre' };
      }

      const verifyRes = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });

      if (!verifyRes.ok) {
        await supabase.auth.signOut().catch(() => {});
        return { error: 'Bu hesap admin yetkisine sahip değil' };
      }

      return { token: data.session.access_token };
    }
  },

  async getMe(): Promise<AdminSession | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Backend üzerinden admin yetkisi kontrolü
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        // Yetkisiz kullanıcı oturumunu temizle
        await supabase.auth.signOut().catch(() => {});
        return null;
      }

      const info = await res.json();
      return {
        adminId: info.adminId || session.user.id,
        email: info.email || session.user.email || '',
        role: info.role || 'admin',
      };
    } catch {
      return null;
    }
  },

  async logActivity(action: string, description: string, adminId: string | null, adminUsername: string | null): Promise<void> {
    void action;
    void description;
    void adminId;
    void adminUsername;
  }
};
