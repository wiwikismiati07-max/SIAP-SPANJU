import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, User, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

interface GlobalLoginProps {
  onLoginSuccess: (userData: any) => void;
}

export default function GlobalLogin({ onLoginSuccess }: GlobalLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-pink-300/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-300/20 rounded-full blur-[100px]" />

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden">
          <div className="p-10 bg-gradient-to-br from-slate-800 to-black text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl p-2 rotate-3">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">SIAP SPANJU</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Sistem Integrasi Aplikasi Pembinaan SISWA</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-8">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Akses Terpusat</h2>
              <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Silakan login untuk melanjutkan</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={20} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all font-bold text-slate-800"
                    placeholder="Masukkan username..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all font-bold text-slate-800"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-slate-800 to-black text-white rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.2em] text-xs disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Masuk Aplikasi
                  </>
                )}
              </button>
              
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  (Username = Tamu Pasword = Tamu)
                </p>
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Gunakan satu akun untuk mengakses seluruh ekosistem aplikasi SIAP SPANJU
              </p>
            </div>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
          &copy; 2026 SMP NEGERI 7 PASURUAN
        </p>
      </div>
    </div>
  );
}
