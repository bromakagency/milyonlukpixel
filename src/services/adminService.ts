import { supabase } from './supabase';

export interface AdminSession {
  adminId: string;
  email: string;
  role: string;
}

export const adminService = {
  async login(email: string, password: string): Promise<{ token: string } | { error: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error || !data.session) {
      await this.logActivity('LOGIN_FAILED', `Giriş denemesi: ${email}`, null, null);
      return { error: 'Geçersiz e-posta veya şifre' };
    }
    
    const session: AdminSession = {
      adminId: data.user.id,
      email: data.user.email || '',
      role: 'superadmin'
    };
    
    // Auth işlemini Supabase SDK devralıyor, sadece geriye dönük uyumluluk için bir token objesi dönüyoruz.
    const token = data.session.access_token;
    
    await this.logActivity('LOGIN_SUCCESS', `Giriş başarılı: ${email}`, data.user.id, email);
    
    return { token };
  },

  async getMe(): Promise<AdminSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    return {
      adminId: session.user.id,
      email: session.user.email || '',
      role: 'superadmin'
    };
  },

  async logActivity(action: string, description: string, adminId: string | null, adminUsername: string | null): Promise<void> {
    void action;
    void description;
    void adminId;
    void adminUsername;
  }
};
