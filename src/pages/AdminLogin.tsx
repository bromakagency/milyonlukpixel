import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import { Lock, User, AlertCircle } from 'lucide-react';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await adminApi.login(username, password);
      navigate('/ers-admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-4 border-black brutal-shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 text-white mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight">
              Admin<br />Girişi
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-600 text-white font-mono text-sm border-2 border-black brutal-shadow-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full border-2 border-black p-3 pl-10 font-mono focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border-2 border-black p-3 pl-10 font-mono focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-800 text-white font-display font-bold text-xl py-4 border-2 border-black brutal-shadow transition-all active:translate-y-1 active:translate-x-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'GİRİŞ YAPILIYOR...' : 'GİRİŞ YAP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="font-mono text-sm text-gray-500 hover:text-black underline">
              ← Ana Sayfaya Dön
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}