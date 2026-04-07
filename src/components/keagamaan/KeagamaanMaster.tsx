import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AgamaProgram } from '../../types/keagamaan';

const KeagamaanMaster: React.FC = () => {
  const [programs, setPrograms] = useState<AgamaProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama_kegiatan: '',
    waktu: ''
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agama_program')
        .select('*')
        .order('nama_kegiatan');
      
      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('agama_program')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agama_program')
          .insert([formData]);
        if (error) throw error;
      }
      
      setFormData({ nama_kegiatan: '', waktu: '' });
      setEditingId(null);
      fetchPrograms();
      alert('Berhasil menyimpan program');
    } catch (error: any) {
      console.error('Error saving program:', error);
      alert(`Gagal menyimpan program: ${error.message || 'Pastikan tabel agama_program sudah dibuat di Supabase'}`);
    }
  };

  const handleEdit = (program: AgamaProgram) => {
    setEditingId(program.id);
    setFormData({
      nama_kegiatan: program.nama_kegiatan,
      waktu: program.waktu
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus program ini?')) return;
    try {
      const { error } = await supabase
        .from('agama_program')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Gagal menghapus program');
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Calendar size={20} className="text-emerald-600" />
          {editingId ? 'Edit Program Keagamaan' : 'Tambah Program Keagamaan'}
        </h3>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Kegiatan</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Contoh: Sholat Dhuha Berjamaah"
              value={formData.nama_kegiatan}
              onChange={e => setFormData({ ...formData, nama_kegiatan: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Waktu Pelaksanaan</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Contoh: 07.00 - 07.30"
              value={formData.waktu}
              onChange={e => setFormData({ ...formData, waktu: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ nama_kegiatan: '', waktu: '' });
                }}
                className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <X size={18} /> Batal
              </button>
            )}
            <button
              type="submit"
              className="px-8 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
            >
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {editingId ? 'Simpan Perubahan' : 'Tambah Program'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Daftar Program Keagamaan</h3>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase">
            {programs.length} Program
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Kegiatan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">Memuat data...</td>
                </tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">Belum ada program keagamaan.</td>
                </tr>
              ) : (
                programs.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700">{p.nama_kegiatan}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{p.waktu}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KeagamaanMaster;
