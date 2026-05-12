import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  GraduationCap, 
  School, 
  BookOpen, 
  MessageSquare, 
  Send, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { AlumniTracing } from './types';

interface AlumniTracingAppProps {
  onBack: () => void;
}

export default function AlumniTracingApp({ onBack }: AlumniTracingAppProps) {
  const [formData, setFormData] = useState<AlumniTracing>({
    nama_lengkap: '',
    jenis_kelamin: '',
    tahun_lulus: '',
    wa_number: '',
    alamat: '',
    lanjut_ke: '',
    nama_sekolah_lanjutan: '',
    jurusan: '',
    alasan: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error('Database tidak terhubung.');

      // Prepare data for upsert
      const dataToSubmit = {
        ...formData,
        tahun_lulus: parseInt(formData.tahun_lulus)
      };

      const { error: submitError } = await supabase
        .from('alumni_tracing')
        .upsert(dataToSubmit, { onConflict: 'wa_number' });

      if (submitError) {
        if (submitError.message.includes('relation "public.alumni_tracing" does not exist') || submitError.message.includes('schema cache')) {
          throw new Error('Tabel "alumni_tracing" belum dibuat di Supabase. Silakan hubungi admin untuk menjalankan script SQL setup.');
        }
        throw submitError;
      }

      setSuccess(true);
      // Reset form or scroll to top is handled by success state UI
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border border-white text-center space-y-8"
        >
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 size={56} />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Data Terkirim!</h2>
            <p className="text-slate-500 font-bold leading-relaxed">
              Terima kasih telah berpartisipasi dalam program Tracing Alumni SMPN 7 Pasuruan. Data Anda telah berhasil disimpan.
            </p>
          </div>
          <button 
            onClick={onBack}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-emerald-200 transition-all active:scale-95"
          >
            Kembali ke Menu
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-3 bg-white shadow-md rounded-2xl text-slate-600 hover:text-slate-900 transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Tracing Alumni</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SMP Negeri 7 Pasuruan</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
          {/* Section A: Identitas */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">A. Identitas Alumni</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informasi Dasar Anda</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      required
                      value={formData.nama_lengkap}
                      onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value.toUpperCase()})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                      placeholder="NAMA LENGKAP"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['Laki-laki', 'Perempuan'].map(jk => (
                      <button
                        key={jk}
                        type="button"
                        onClick={() => setFormData({...formData, jenis_kelamin: jk})}
                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${
                          formData.jenis_kelamin === jk 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                            : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        {jk}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tahun Lulus</label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number"
                      required
                      min="1990"
                      max="2030"
                      value={formData.tahun_lulus}
                      onChange={(e) => setFormData({...formData, tahun_lulus: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                      placeholder="CONTOH: 2024"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">No. HP / WhatsApp Active</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="tel"
                      required
                      value={formData.wa_number}
                      onChange={(e) => setFormData({...formData, wa_number: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                      placeholder="0812XXXXXXXX"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 italic mt-1">* Digunakan untuk memvalidasi update data Anda</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Alamat Tempat Tinggal</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-4 text-slate-400" />
                    <textarea 
                      required
                      rows={3}
                      value={formData.alamat}
                      onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold resize-none"
                      placeholder="ALAMAT LENGKAP SAAT INI"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section B: Pendidikan Lanjutan */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">B. Pendidikan Lanjutan</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informasi Setelah Lulus SMP</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Kategori Kelanjutan Studi</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['SMA', 'SMK', 'MA', 'Pondok Pesantren', 'Tidak Melanjutkan'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({...formData, lanjut_ke: opt})}
                        className={`py-4 px-2 rounded-2xl font-black text-[10px] uppercase tracking-wider border transition-all text-center leading-tight ${
                          formData.lanjut_ke === opt 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200' 
                            : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.lanjut_ke && formData.lanjut_ke !== 'Tidak Melanjutkan' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nama Sekolah Lanjutan</label>
                      <div className="relative">
                        <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          required
                          value={formData.nama_sekolah_lanjutan}
                          onChange={(e) => setFormData({...formData, nama_sekolah_lanjutan: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                          placeholder="NAMA SMA/SMK/MA/PONDOK"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Jurusan / Program Pilihan</label>
                      <div className="relative">
                        <GraduationCap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          required
                          value={formData.jurusan}
                          onChange={(e) => setFormData({...formData, jurusan: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                          placeholder="PROG. KEAHLIAN / JURUSAN"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Alasan Memilih Sekolah Tersebut</label>
                      <div className="relative">
                        <MessageSquare size={18} className="absolute left-4 top-4 text-slate-400" />
                        <textarea 
                          required
                          rows={3}
                          value={formData.alasan}
                          onChange={(e) => setFormData({...formData, alasan: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold resize-none"
                          placeholder="MENGAPA ANDA MEMILIH SEKOLAH TERSEBUT?"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600">
                <AlertCircle size={24} className="shrink-0" />
                <p className="font-bold text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? (
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={24} />
                Simpan & Terbitkan Data
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
