import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Database, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UksKeluhan } from '../../types/uks';

const UksMaster: React.FC = () => {
  const [keluhan, setKeluhan] = useState<UksKeluhan[]>([]);
  const [newKeluhan, setNewKeluhan] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchKeluhan();
  }, []);

  const fetchKeluhan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('uks_keluhan')
        .select('*')
        .order('nama_keluhan', { ascending: true });
      
      if (error) {
        console.error('Error fetching keluhan:', error);
        setMessage({ type: 'error', text: `Gagal mengambil data: ${error.message}` });
        return;
      }
      setKeluhan(data || []);
    } catch (error: any) {
      console.error('Exception fetching keluhan:', error);
      setMessage({ type: 'error', text: 'Terjadi kesalahan koneksi ke database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeluhan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeluhan.trim()) return;

    try {
      const { error } = await supabase
        .from('uks_keluhan')
        .insert([{ nama_keluhan: newKeluhan.trim() }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Keluhan berhasil ditambahkan!' });
      setNewKeluhan('');
      fetchKeluhan();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menambahkan keluhan' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteKeluhan = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus keluhan ini?')) return;

    try {
      const { error } = await supabase
        .from('uks_keluhan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Keluhan berhasil dihapus!' });
      fetchKeluhan();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Gagal menghapus keluhan. Mungkin sedang digunakan dalam data kunjungan.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredKeluhan = keluhan.filter(k => 
    k.nama_keluhan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Form Section */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Tambah Master Keluhan</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Input manual jenis keluhan kesehatan siswa</p>
          </div>
        </div>

        <form onSubmit={handleAddKeluhan} className="flex gap-4">
          <div className="flex-1 relative group">
            <input
              type="text"
              value={newKeluhan}
              onChange={(e) => setNewKeluhan(e.target.value)}
              placeholder="Contoh: Pusing, Sakit Gigi, dll"
              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={!newKeluhan.trim()}
            className="px-10 py-5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white rounded-3xl font-black flex items-center gap-3 transition-all duration-300 shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            Tambah
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="font-bold">{message.text}</p>
          </div>
        )}
      </div>

      {/* List Section */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Daftar Keluhan</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">Total {keluhan.length} jenis keluhan terdaftar</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari keluhan..."
              className="pl-14 pr-8 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 w-full md:w-80"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
          </div>
        ) : filteredKeluhan.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">Tidak ada data keluhan ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKeluhan.map((k) => (
              <div key={k.id} className="group p-6 bg-slate-50 hover:bg-white rounded-[32px] border-2 border-transparent hover:border-rose-100 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-500 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                    {k.nama_keluhan.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-700">{k.nama_keluhan}</span>
                </div>
                <button
                  onClick={() => handleDeleteKeluhan(k.id)}
                  className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UksMaster;
