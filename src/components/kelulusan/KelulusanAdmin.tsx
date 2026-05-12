import React, { useState, useEffect } from 'react';
import { Search, Table as TableIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { StudentGraduation } from './types';

export default function KelulusanAdmin() {
  const [data, setData] = useState<StudentGraduation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Database tidak terhubung.');
      const { data: students, error: queryError } = await supabase
        .from('kelulusan')
        .select('*')
        .order('nama', { ascending: true });
      
      if (queryError) {
        if (queryError.message.includes('relation "public.kelulusan" does not exist') || queryError.message.includes('schema cache')) {
          throw new Error('Tabel "kelulusan" tidak ditemukan. Pastikan data sudah diupload melalui menu Setup Kelulusan.');
        }
        throw queryError;
      }
      setData(students || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(s => 
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nis.includes(searchTerm)
  );

  return (
    <div className="p-6 md:p-12 space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Database Kelulusan</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Daftar kelulusan siswa kelas 9</p>
        </div>
        
        <button 
          onClick={fetchData}
          className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Segarkan Data
        </button>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative group">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama atau NIS..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold"
          />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <TableIcon size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Data</p>
            <p className="text-2xl font-black text-slate-800">{data.length}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
            <AlertCircle size={20} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-200 text-center sticky top-0 z-10">
                <th className="px-6 py-4">NIS</th>
                <th className="px-6 py-4 text-left">Nama Lengkap</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">L/P</th>
                <th className="px-6 py-4">No. Peserta</th>
                <th className="px-6 py-4">Ruang</th>
                <th className="px-6 py-4">Keterangan</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 w-[100px]"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 w-[250px]"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 w-[80px]"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 w-[80px]"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 w-[120px]"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 w-[80px]"><div className="h-4 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : filteredData.length > 0 ? (
                filteredData.map((student) => (
                  <tr key={student.nis} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-800 w-[100px]">{student.nis}</td>
                    <td className="px-6 py-4 font-black text-slate-800 uppercase text-xs w-[250px]">{student.nama}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold w-[80px]">{student.kelas}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold w-[80px]">{student.jenis_kelamin}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold font-mono tracking-tight w-[120px]">{student.no_peserta}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold w-[80px]">{student.ruang}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        student.keterangan.toLowerCase().includes('lulus') && !student.keterangan.toLowerCase().includes('tidak')
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-rose-100 text-rose-600'
                      }`}>
                        {student.keterangan}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
