import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        // Fallback for local development
        if (username === 'admin' && password === 'admin123') {
          const mockUser = { username: 'admin', role: 'full', nama_lengkap: 'Admin Local' };
          localStorage.setItem('app_user', JSON.stringify(mockUser));
          onLoginSuccess(mockUser);
          return;
        }
        throw new Error('Supabase tidak terhubung.');
      }

      // Login kustom menggunakan tabel users_app
      const { data, error: queryError } = await supabase
        .from('users_app')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (queryError || !data) {
        throw new Error('Username atau Password salah.');
      }

      localStorage.setItem('app_user', JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-emerald-600 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold">Izin Siswa App</h1>
          <p className="text-emerald-100 mt-1">Login Staff & Administrator</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama User</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Masukkan username..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Masuk ke Aplikasi'}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-bold">Atau</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('showPublicForm'));
            }}
            className="w-full py-3 bg-white text-emerald-600 border-2 border-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-all"
          >
            Form Pengajuan Izin (Wali Murid)
          </button>
        </form>
      </div>
    </div>
  );
}

