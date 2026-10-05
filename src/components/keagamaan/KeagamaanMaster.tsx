import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Calendar, UserPlus, Users, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AgamaProgram } from '../../types/keagamaan';
import { fetchGuruList, addMasterGuru, deduplicateGuruList, isExcludedGuru } from '../../lib/jurnalService';

const KeagamaanMaster: React.FC = () => {
  const [programs, setPrograms] = useState<AgamaProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama_kegiatan: '',
    waktu: ''
  });

  // Master Guru States
  const [guruList, setGuruList] = useState<{ id: string; nama_guru: string; nip?: string }[]>([]);
  const [loadingGuru, setLoadingGuru] = useState(true);
  const [guruFormData, setGuruFormData] = useState({
    nama_guru: '',
    nip: ''
  });
  const [savingGuru, setSavingGuru] = useState(false);
  const [searchGuru, setSearchGuru] = useState('');

  useEffect(() => {
    fetchPrograms();
    loadGurus();
  }, []);

  const loadGurus = async () => {
    try {
      setLoadingGuru(true);
      const list = await fetchGuruList();
      setGuruList(deduplicateGuruList(list.filter(g => !isExcludedGuru(g.nama_guru))));
    } catch (error) {
      console.error('Error fetching gurus:', error);
    } finally {
      setLoadingGuru(false);
    }
  };

  const handleAddGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guruFormData.nama_guru.trim();
    if (!trimmed) return;
    try {
      setSavingGuru(true);
      const res = await addMasterGuru(trimmed, guruFormData.nip);
      if (res.success) {
        setGuruList(deduplicateGuruList(res.list.filter(g => !isExcludedGuru(g.nama_guru))));
        setGuruFormData({ nama_guru: '', nip: '' });
      } else {
        alert(res.error || 'Gagal menambahkan guru');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan guru');
    } finally {
      setSavingGuru(false);
    }
  };

  const handleDeleteGuru = async (guru: { id: string; nama_guru: string }) => {
    if (!confirm(`Hapus guru "${guru.nama_guru}" dari daftar?`)) return;
    try {
      const updated = guruList.filter(g => g.id !== guru.id && g.nama_guru !== guru.nama_guru);
      setGuruList(updated);
      localStorage.setItem('master_guru', JSON.stringify(updated));
      localStorage.setItem('sitelat_guru', JSON.stringify(updated));
      if (supabase && guru.id) {
        await supabase.from('master_guru').delete().eq('id', guru.id);
      }
    } catch (error) {
      console.error('Error deleting guru:', error);
    }
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        setPrograms([
          { id: 'prog-dhuha', nama_kegiatan: 'Sholat Dhuha Berjamaah', waktu: '06:45 - 07:15' },
          { id: 'prog-dhuhur', nama_kegiatan: 'Sholat Dhuhur Berjamaah', waktu: '12:00 - 12:35' },
          { id: 'prog-tadarus', nama_kegiatan: "Tadarus & Literasi Al-Qur'an", waktu: '06:30 - 07:00' },
          { id: 'prog-keputrian', nama_kegiatan: 'Kajian Keputrian', waktu: '11:45 - 12:30' },
          { id: 'prog-istighosah', nama_kegiatan: 'Istighosah & Doa Bersama', waktu: '06:30 - 07:15' }
        ]);
        return;
      }
      const { data, error } = await supabase
        .from('agama_program')
        .select('*')
        .order('nama_kegiatan');
      
      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setPrograms([
        { id: 'prog-dhuha', nama_kegiatan: 'Sholat Dhuha Berjamaah', waktu: '06:45 - 07:15' },
        { id: 'prog-dhuhur', nama_kegiatan: 'Sholat Dhuhur Berjamaah', waktu: '12:00 - 12:35' }
      ]);
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

      {/* SECTION: INPUT TAMBAH GURU & DAFTAR GURU */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <UserPlus size={20} className="text-emerald-600" />
          Input Tambah Guru
        </h3>

        <form onSubmit={handleAddGuru} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Nama Lengkap Guru & Gelar *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
              value={guruFormData.nama_guru}
              onChange={e => setGuruFormData({ ...guruFormData, nama_guru: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              NIP Guru (Opsional)
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Contoh: 19750812 200501 2 004"
              value={guruFormData.nip}
              onChange={e => setGuruFormData({ ...guruFormData, nip: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="submit"
              disabled={savingGuru || !guruFormData.nama_guru.trim()}
              className="px-8 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Plus size={18} />
              {savingGuru ? 'Menyimpan...' : 'Tambah Guru'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800">Daftar Guru Pengampu / Wali Kelas</h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase">
              {guruList.length} Guru
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru / NIP..."
              value={searchGuru}
              onChange={e => setSearchGuru(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Guru</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">NIP</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingGuru ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">Memuat data guru...</td>
                </tr>
              ) : guruList.filter(g =>
                g.nama_guru.toLowerCase().includes(searchGuru.toLowerCase()) ||
                (g.nip || '').toLowerCase().includes(searchGuru.toLowerCase())
              ).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">Data guru tidak ditemukan.</td>
                </tr>
              ) : (
                guruList
                  .filter(g =>
                    g.nama_guru.toLowerCase().includes(searchGuru.toLowerCase()) ||
                    (g.nip || '').toLowerCase().includes(searchGuru.toLowerCase())
                  )
                  .map((g, idx) => (
                    <tr key={`${g.id || 'guru'}-${idx}`} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-700 text-sm">{g.nama_guru}</span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs font-medium">{g.nip || '-'}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteGuru(g)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                          title="Hapus Guru"
                        >
                          <Trash2 size={15} />
                        </button>
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
