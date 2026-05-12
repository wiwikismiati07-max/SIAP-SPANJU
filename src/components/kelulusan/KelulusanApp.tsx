import React, { useState } from 'react';
import { Search, MapPin, User, GraduationCap, ChevronLeft, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { StudentGraduation } from './types';

interface KelulusanAppProps {
  onBack: () => void;
}

export default function KelulusanApp({ onBack }: KelulusanAppProps) {
  const [nis, setNis] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentGraduation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!supabase) throw new Error('Database tidak terhubung.');

      const { data, error: queryError } = await supabase
        .from('kelulusan')
        .select('*')
        .eq('nis', nis.trim())
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          throw new Error('Data NIS tidak ditemukan. Pastikan NIS yang Anda masukkan benar.');
        }
        throw queryError;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mencari data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="p-3 bg-white shadow-md rounded-2xl text-slate-600 hover:text-slate-900 transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Cek Kelulusan</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Siswa Kelas 9 SPANJU</p>
          </div>
        </div>

        {/* Search Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
          
          <div className="relative z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Cari Data Kelulusan</h2>
              <p className="text-slate-500 text-sm font-medium">Masukkan Nomor Induk Siswa (NIS) Anda</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative group">
                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 8758"
                  className="w-full pl-12 pr-4 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-black text-lg"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search size={20} />
                    Cek Status Kelulusan
                  </>
                )}
              </button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-4"
                >
                  <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                  <p className="text-rose-700 text-sm font-bold">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-8 rounded-[2.5rem] border border-white shadow-2xl relative overflow-hidden ${
                result.keterangan.toLowerCase().includes('lulus') && !result.keterangan.toLowerCase().includes('tidak')
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
                  : 'bg-rose-50 text-rose-900 border-rose-100'
              }`}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 blur-3xl -mr-20 -mt-20 opacity-50" />
              
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
                  result.keterangan.toLowerCase().includes('lulus') && !result.keterangan.toLowerCase().includes('tidak')
                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                    : 'bg-rose-500 text-white shadow-rose-200'
                }`}>
                  {result.keterangan.toLowerCase().includes('lulus') && !result.keterangan.toLowerCase().includes('tidak')
                    ? <CheckCircle2 size={56} />
                    : <XCircle size={56} />
                  }
                </div>

                <div className="space-y-1">
                  <h3 className="text-4xl font-black tracking-tight uppercase">{result.keterangan}</h3>
                  <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Informasi Kelulusan Siswa</p>
                </div>

                <div className="w-full bg-white/50 backdrop-blur-md rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left border border-white/50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Nama Lengkap</p>
                    <p className="font-black text-slate-800 text-lg uppercase leading-tight">{result.nama}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">NIS</p>
                    <p className="font-black text-slate-800 text-lg">{result.nis}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Kelas</p>
                    <p className="font-black text-slate-800 text-lg">{result.kelas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">No. Peserta</p>
                    <p className="font-black text-slate-800 text-lg">{result.no_peserta}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Ruang Ujian</p>
                    <p className="font-black text-slate-800 text-lg">{result.ruang}</p>
                  </div>
                </div>

                <div className="pt-4 w-full space-y-4">
                  {result.keterangan.toLowerCase().includes('lulus') && !result.keterangan.toLowerCase().includes('tidak') && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-emerald-600/10 border border-emerald-600/20 p-4 rounded-2xl"
                    >
                      <p className="text-emerald-700 font-black text-sm uppercase tracking-tight">
                        📢 Ambil SKL tanggal 3 di Sekolah
                      </p>
                    </motion.div>
                  )}
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] leading-relaxed">
                    SMP NEGERI 7 PASURUAN - TAHUN PELAJARAN 2025/2026
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            &copy; 2026 SMP NEGERI 7 PASURUAN
          </p>
        </div>
      </div>
    </div>
  );
}
