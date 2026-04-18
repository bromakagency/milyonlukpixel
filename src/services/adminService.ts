import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dqkwiyoqibutvpaeyeax.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxa3dpeW9xaWJ1dHZwYWV5ZWF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE3Mjg0MCwiZXhwIjoyMDkxNzQ4ODQwfQ.GHU935nW3KBKglsvpTY79Ua_L1oq3ubsuUPoy8aje8I';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface AdminSession {
  adminId: string;
  username: string;
  role: string;
}

export const adminService = {
  async login(username: string, password: string): Promise<{ token: string } | { error: string }> {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) {
      await this.logActivity('LOGIN_FAILED', `Giriş denemesi: ${username}`, null, null);
      return { error: 'Geçersiz kullanıcı adı veya şifre' };
    }
    
    if (data.password_hash !== password) {
      await this.logActivity('LOGIN_FAILED', `Yanlış şifre: ${username}`, null, null);
      return { error: 'Geçersiz kullanıcı adı veya şifre' };
    }
    
    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id);
    
    const session: AdminSession = {
      adminId: data.id,
      username: data.username,
      role: data.role
    };
    
    const token = btoa(JSON.stringify(session));
    
    await this.logActivity('LOGIN_SUCCESS', `Giriş başarılı: ${username}`, data.id, data.username);
    
    return { token };
  },

  async getMe(token: string): Promise<AdminSession | null> {
    try {
      const session = JSON.parse(atob(token));
      return session;
    } catch {
      return null;
    }
  },

  async logActivity(action: string, description: string, adminId: string | null, adminUsername: string | null): Promise<void> {
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          action,
          description,
          admin_id: adminId,
          admin_username: adminUsername,
          target_type: 'admin'
        }]);
    } catch (e) {
      console.error('Log activity failed:', e);
    }
  }
};

export function getAdminFromToken(token: string): AdminSession | null {
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}