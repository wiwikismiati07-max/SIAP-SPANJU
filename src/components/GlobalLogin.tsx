import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, User, Lock, AlertCircle, ShieldCheck, Users, BookOpen } from 'lucide-react';

interface GlobalLoginProps {
  onLoginSuccess: (userData: any) => void;
  onShowKelulusan: () => void;
  onShowTracing: () => void;
  onShowInfografis?: () => void;
}

export default function GlobalLogin({ onLoginSuccess, onShowKelulusan, onShowTracing, onShowInfografis }: GlobalLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      // 1. Akses Khusus Wali Murid / Orang Tua / Tamu (Username = Tamu, Password = Tamu)
      if (
        (cleanUsername.toLowerCase() === 'tamu' && (cleanPassword.toLowerCase() === 'tamu' || cleanPassword === 'Tamu')) ||
        (cleanUsername === 'Tamu' && cleanPassword === 'Tamu')
      ) {
        const tamuUser = {
          id: 'user_tamu_walimurid',
          username: 'Tamu',
          role: 'view',
          nama_lengkap: 'Wali Murid / Tamu',
          keterangan: 'Akses Wali Murid & Orang Tua Siswa SMP Negeri 7 Pasuruan'
        };
        localStorage.setItem('app_user', JSON.stringify(tamuUser));
        onLoginSuccess(tamuUser);
        return;
      }

      // 2. Fallback untuk admin default
      if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
        const mockAdmin = { 
          id: 'user_admin', 
          username: 'admin', 
          role: 'full', 
          nama_lengkap: 'Administrator SPANJU' 
        };
        localStorage.setItem('app_user', JSON.stringify(mockAdmin));
        onLoginSuccess(mockAdmin);
        return;
      }

      if (!supabase) {
        throw new Error('Username atau Password salah. Gunakan Username: Tamu & Password: Tamu untuk akses Wali Murid.');
      }

      // 3. Login kustom menggunakan tabel users_app
      const { data, error: queryError } = await supabase
        .from('users_app')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', cleanPassword)
        .single();

      if (queryError || !data) {
        throw new Error('Username atau Password salah. (Wali Murid dapat login dengan Username: Tamu & Password: Tamu)');
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

      <div className="max-w-md w-full relative z-10 my-4">
        <div className="bg-white/85 backdrop-blur-2xl rounded-3xl sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden">
          <div className="p-6 sm:p-10 bg-gradient-to-br from-slate-800 to-black text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl p-2 rotate-3">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1.5">SIAP SPANJU</h1>
            <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">Sistem Integrasi Aplikasi Pembinaan SISWA</p>
          </div>

          <form onSubmit={handleLogin} autoComplete="off" className="p-6 sm:p-10 space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Akses Terpusat</h2>
              <p className="text-slate-500 text-[11px] sm:text-xs font-bold mt-1 uppercase tracking-widest">Silakan login untuk melanjutkan</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={20} />
                  <input
                    type="text"
                    name="spanju_login_user"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm"
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
                    name="spanju_login_pass"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3.5 sm:space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 sm:py-5 bg-gradient-to-r from-slate-800 to-black text-white rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.2em] text-xs disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
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

              {/* Quick Fill Tamu (Wali Murid) */}
              <button
                type="button"
                onClick={() => {
                  setUsername('Tamu');
                  setPassword('Tamu');
                }}
                className="w-full py-2.5 px-3 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-2 border border-pink-200/80 cursor-pointer"
              >
                <Users size={14} />
                <span>Isi Cepat Akses Wali Murid (Tamu / Tamu)</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={onShowKelulusan}
                  className="py-3.5 sm:py-4 bg-blue-50 text-blue-700 rounded-2xl font-black hover:bg-blue-100 transition-all uppercase tracking-[0.1em] text-[10px] flex flex-col items-center justify-center gap-1.5 border border-blue-100 shadow-sm shadow-blue-100/50 cursor-pointer"
                >
                  <LogIn size={16} className="rotate-90" />
                  Cek Kelulusan
                </button>
                <button
                  type="button"
                  onClick={onShowTracing}
                  className="py-3.5 sm:py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-black hover:bg-indigo-100 transition-all uppercase tracking-[0.1em] text-[10px] flex flex-col items-center justify-center gap-1.5 border border-indigo-100 shadow-sm shadow-indigo-100/50 cursor-pointer"
                >
                  <Users size={16} />
                  Tracing Alumni
                </button>
              </div>

              {onShowInfografis && (
                <button
                  type="button"
                  onClick={onShowInfografis}
                  className="w-full py-3 bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 text-slate-800 rounded-2xl font-bold hover:from-amber-100 hover:to-pink-100 transition-all text-xs flex items-center justify-center gap-2 border border-amber-200/60 shadow-xs cursor-pointer"
                >
                  <BookOpen size={16} className="text-amber-600" />
                  <span>Lihat Infografis SIAP SPANJU</span>
                </button>
              )}
              
              <div className="text-center pt-1">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-600 tracking-wide">
                  Akses Wali Murid / Orang Tua: <span className="font-black text-slate-900">Username = Tamu</span> & <span className="font-black text-slate-900">Password = Tamu</span>
                </p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Gunakan satu akun untuk mengakses seluruh ekosistem aplikasi SIAP SPANJU
              </p>
            </div>
          </form>
        </div>
        
        <p className="text-center mt-6 sm:mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
          &copy; 2026 SMP NEGERI 7 PASURUAN
        </p>
      </div>
    </div>
  );
}
