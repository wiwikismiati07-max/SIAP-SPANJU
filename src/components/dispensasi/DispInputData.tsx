import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Calendar, Clock, User, FileText, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MasterJenisDispensasi, TransaksiDispensasi } from '../../types/dispensasi';
import { format } from 'date-fns';

const DispInputData: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [jenisList, setJenisList] = useState<MasterJenisDispensasi[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [recentData, setRecentData] = useState<TransaksiDispensasi[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
    kelas: '',
    siswa_id: '',
    jenis_id: '',
    alasan: '',
    tindak_lanjut: ''
  });

  const classes = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.kelas) {
      fetchSiswaByKelas(formData.kelas);
    } else {
      setSiswaList([]);
    }
  }, [formData.kelas]);

  const fetchInitialData = async () => {
    try {
      const { data: jData } = await supabase.from('disp_master_jenis').select('*').order('nama_jenis');
      setJenisList(jData || []);
      fetchRecentData();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchSiswaByKelas = async (kelas: string) => {
    try {
      const { data: sData } = await supabase
        .from('master_siswa')
        .select('id, nama, kelas')
        .eq('kelas', kelas)
        .order('nama');
      setSiswaList(sData || []);
    } catch (error) {
      console.error('Error fetching siswa:', error);
    }
  };

  const fetchRecentData = async () => {
    try {
      const { data: rData } = await supabase
        .from('disp_transaksi')
        .select(`
          *,
          siswa:master_siswa(nama, kelas),
          jenis:disp_master_jenis(nama_jenis)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentData(rData || []);
    } catch (error) {
      console.error('Error fetching recent data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.jenis_id) {
      alert('Pilih siswa dan jenis dispensasi!');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('disp_transaksi')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        alert('Data berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('disp_transaksi')
          .insert([formData]);
        if (error) throw error;
        alert('Data berhasil disimpan');
      }
      
      setFormData({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        jam: format(new Date(), 'HH:mm'),
        kelas: '',
        siswa_id: '',
        jenis_id: '',
        alasan: '',
        tindak_lanjut: ''
      });
      setEditingId(null);
      fetchRecentData();
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: TransaksiDispensasi) => {
    setEditingId(item.id);
    setFormData({
      tanggal: item.tanggal,
      jam: item.jam,
      kelas: item.kelas,
      siswa_id: item.siswa_id,
      jenis_id: item.jenis_id,
      alasan: item.alasan || '',
      tindak_lanjut: item.tindak_lanjut || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data dispensasi ini?')) return;
    try {
      const { error } = await supabase.from('disp_transaksi').delete().eq('id', id);
      if (error) throw error;
      fetchRecentData();
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Input Transaksi Dispensasi</h2>
          <p className="text-sm text-slate-500">Catat dispensasi siswa dengan lengkap dan akurat</p>
        </div>
        {editingId && (
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                tanggal: format(new Date(), 'yyyy-MM-dd'),
                jam: format(new Date(), 'HH:mm'),
                kelas: '',
                siswa_id: '',
                jenis_id: '',
                alasan: '',
                tindak_lanjut: ''
              });
            }}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-sm font-bold flex items-center space-x-2"
          >
            <X size={16} />
            <span>Batal Edit</span>
          </button>
        )}
      </div>

      {/* Form Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50 rounded-full -mr-32 -mt-32 opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mb-32 opacity-50" />
        
        <form onSubmit={handleSubmit} className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Calendar size={14} className="text-pink-500" />
              <span>Tanggal</span>
            </label>
            <input 
              type="date" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={formData.tanggal}
              onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Clock size={14} className="text-blue-500" />
              <span>Jam</span>
            </label>
            <input 
              type="time" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.jam}
              onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Search size={14} className="text-pink-500" />
              <span>Pilih Kelas</span>
            </label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={formData.kelas}
              onChange={(e) => setFormData({ ...formData, kelas: e.target.value, siswa_id: '' })}
            >
              <option value="">Pilih Kelas...</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <User size={14} className="text-blue-500" />
              <span>Pilih Siswa</span>
            </label>
            <select 
              required
              disabled={!formData.kelas}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              value={formData.siswa_id}
              onChange={(e) => setFormData({ ...formData, siswa_id: e.target.value })}
            >
              <option value="">{formData.kelas ? 'Pilih Siswa...' : 'Pilih Kelas Terlebih Dahulu'}</option>
              {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <FileText size={14} className="text-pink-500" />
              <span>Jenis Dispensasi</span>
            </label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={formData.jenis_id}
              onChange={(e) => setFormData({ ...formData, jenis_id: e.target.value })}
            >
              <option value="">Pilih Jenis...</option>
              {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama_jenis}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <FileText size={14} className="text-blue-500" />
              <span>Alasan / Keterangan</span>
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Contoh: Sakit perut, Izin Lomba..."
              value={formData.alasan}
              onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Check size={14} className="text-emerald-500" />
              <span>Tindak Lanjut</span>
            </label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[80px]"
              placeholder="Contoh: Diizinkan pulang, Menunggu di UKS..."
              value={formData.tindak_lanjut}
              onChange={(e) => setFormData({ ...formData, tindak_lanjut: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 flex justify-end pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-blue-600 text-white rounded-2xl hover:from-pink-700 hover:to-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Plus size={20} />}
              <span className="font-bold">{editingId ? 'Perbarui Data' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Riwayat Transaksi</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maks. 5 baris (Scroll kebawah)</span>
        </div>
        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-50">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentData.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-700">{format(new Date(item.tanggal), 'dd/MM/yyyy')}</div>
                    <div className="text-[10px] text-slate-400">{item.jam}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-700">{item.siswa?.nama}</div>
                    <div className="text-[10px] uppercase font-black text-blue-500">{item.kelas}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-pink-50 text-pink-600 rounded-md text-[10px] font-bold uppercase">
                      {item.jenis?.nama_jenis}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500 line-clamp-1">{item.alasan || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {recentData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm italic">Belum ada data transaksi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispInputData;
