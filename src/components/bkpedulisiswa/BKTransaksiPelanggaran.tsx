import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa } from '../../types/izinsiswa';
import { MasterPelanggaran, TransaksiPelanggaran } from '../../types/bkpedulisiswa';
import { Save, Search, User, AlertCircle, Clock, Calendar, BookOpen, ShieldAlert, CheckCircle2, Trash2, Edit2, X, ClipboardList } from 'lucide-react';

export default function BKTransaksiPelanggaran() {
  const [loading, setLoading] = useState(false);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [pelanggaran, setPelanggaran] = useState<MasterPelanggaran[]>([]);
  const [guru, setGuru] = useState<any[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiPelanggaran[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormData = {
    tanggal: new Date().toISOString().split('T')[0],
    jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
    kelas: '',
    siswa_id: '',
    pelanggaran_id: '',
    alasan: '',
    penanganan: 'Kedisiplinan',
    konsekuensi: 'Surat pernyataan Siswa',
    tindak_lanjut: 'Konseling Individu',
    wali_kelas: '',
    guru_bk: 'Wiwik Ismiati S.pd',
    status: 'Proses'
  };

  const [formData, setFormData] = useState(initialFormData);

  const KELAS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  const PENANGANAN_OPTIONS = ['Akademik', 'Bullying', 'Etika', 'Kedisiplinan', 'Lainnya'];
  const KONSEKUENSI_OPTIONS = ['Surat pernyataan orang tua', 'Surat pernyataan Siswa'];
  const TINDAK_LANJUT_OPTIONS = [
    'Konseling Individu', 'Konseling Kelompok', 'Bimbingan Kelompok', 
    'Kunjungan Rumah/Home Visit', 'Tangan alih kasus/Referral', 
    'Konferensi Kasus', 'Mediasi'
  ];
  const GURU_BK_OPTIONS = ['Wiwik Ismiati S.pd', 'Ekik Febriani S.pd'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      if (supabase) {
        const { data: sData } = await supabase.from('master_siswa').select('*').order('nama', { ascending: true });
        const { data: pData } = await supabase.from('master_pelanggaran').select('*').order('nama_pelanggaran', { ascending: true });
        const { data: gData } = await supabase.from('master_guru').select('*').order('nama_guru', { ascending: true });
        
        setSiswa(sData || []);
        setPelanggaran(pData || []);
        setGuru(gData || []);
        fetchTransaksi();
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTransaksi = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('transaksi_pelanggaran')
          .select(`
            *,
            siswa:master_siswa(*),
            pelanggaran:master_pelanggaran(*)
          `)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        setTransaksi(data || []);
      }
    } catch (error) {
      console.error('Error fetching transaksi:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.pelanggaran_id) {
      alert('Pilih siswa dan jenis pelanggaran!');
      return;
    }

    setLoading(true);
    try {
      if (supabase) {
        if (editingId) {
          const { error } = await supabase
            .from('transaksi_pelanggaran')
            .update(formData)
            .eq('id', editingId);
          if (error) throw error;
          setSuccessMsg('Data pelanggaran berhasil diperbarui!');
        } else {
          const { error } = await supabase.from('transaksi_pelanggaran').insert([formData]);
          if (error) throw error;
          setSuccessMsg('Data pelanggaran berhasil disimpan!');
        }
        
        setFormData(initialFormData);
        setEditingId(null);
        setSelectedSiswa(null);
        setSearchTerm('');
        fetchTransaksi();
        
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data transaksi ini?')) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('transaksi_pelanggaran').delete().eq('id', id);
        if (error) throw error;
        fetchTransaksi();
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (t: TransaksiPelanggaran) => {
    setEditingId(t.id);
    setFormData({
      tanggal: t.tanggal,
      jam: t.jam,
      kelas: t.siswa?.kelas || '',
      siswa_id: t.siswa_id,
      pelanggaran_id: t.pelanggaran_id,
      alasan: t.alasan || '',
      penanganan: t.penanganan || 'Kedisiplinan',
      konsekuensi: t.konsekuensi || 'Surat pernyataan Siswa',
      tindak_lanjut: t.tindak_lanjut || 'Konseling Individu',
      wali_kelas: t.wali_kelas || '',
      guru_bk: t.guru_bk || 'Wiwik Ismiati S.pd',
      status: t.status || 'Proses'
    });
    setSelectedSiswa(t.siswa || null);
    setSearchTerm(t.siswa?.nama || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSiswa = siswa.filter(s => 
    (formData.kelas ? s.kelas === formData.kelas : true) &&
    (s.nama.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Input Pelanggaran Siswa</h2>
          <p className="text-sm text-slate-500">Catat pelanggaran dan tindak lanjut konseling</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={20} />
          <p className="font-bold">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Siswa Selection */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <User size={16} /> Data Siswa
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Kelas</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                value={formData.kelas}
                onChange={e => {
                  setFormData({...formData, kelas: e.target.value, siswa_id: ''});
                  setSelectedSiswa(null);
                  setSearchTerm('');
                }}
              >
                <option value="">Semua Kelas</option>
                {KELAS_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Siswa</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                value={formData.siswa_id}
                onChange={e => {
                  const s = siswa.find(item => item.id === e.target.value);
                  if (s) {
                    setSelectedSiswa(s);
                    setFormData({...formData, siswa_id: s.id, kelas: s.kelas});
                    setSearchTerm(s.nama);
                  } else {
                    setSelectedSiswa(null);
                    setFormData({...formData, siswa_id: ''});
                    setSearchTerm('');
                  }
                }}
              >
                <option value="">{formData.kelas ? `Pilih Siswa Kelas ${formData.kelas}...` : 'Pilih Siswa (Pilih Kelas Dulu)...'}</option>
                {filteredSiswa.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedSiswa && (
            <div className="p-4 bg-pink-50 rounded-2xl border border-pink-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-pink-600 uppercase">Siswa Terpilih</p>
                <p className="font-bold text-slate-800">{selectedSiswa.nama}</p>
                <p className="text-xs text-slate-500">Kelas {selectedSiswa.kelas}</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSelectedSiswa(null);
                  setSearchTerm('');
                  setFormData({...formData, siswa_id: ''});
                }}
                className="text-pink-600 hover:text-pink-800 text-xs font-bold"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Violation Details */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={16} /> Detail Pelanggaran
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                  value={formData.tanggal}
                  onChange={e => setFormData({...formData, tanggal: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jam</label>
              <div className="relative">
                <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="time" 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                  value={formData.jam}
                  onChange={e => setFormData({...formData, jam: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenis Pelanggaran</label>
            <select 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
              value={formData.pelanggaran_id}
              onChange={e => setFormData({...formData, pelanggaran_id: e.target.value})}
            >
              <option value="">Pilih Pelanggaran</option>
              {pelanggaran.map(p => (
                <option key={p.id} value={p.id}>{p.nama_pelanggaran} ({p.kategori})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alasan Pelanggaran</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none h-24 resize-none"
              placeholder="Jelaskan alasan siswa melanggar..."
              value={formData.alasan}
              onChange={e => setFormData({...formData, alasan: e.target.value})}
            />
          </div>
        </div>

        {/* Step 3: Handling & Follow Up */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={16} /> Penanganan & Tindak Lanjut
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Penanganan Siswa</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.penanganan}
                onChange={e => setFormData({...formData, penanganan: e.target.value as any})}
              >
                {PENANGANAN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Konsekuensi</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.konsekuensi}
                onChange={e => setFormData({...formData, konsekuensi: e.target.value as any})}
              >
                {KONSEKUENSI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tindak Lanjut</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.tindak_lanjut}
                onChange={e => setFormData({...formData, tindak_lanjut: e.target.value as any})}
              >
                {TINDAK_LANJUT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Guru BK</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.guru_bk}
                onChange={e => setFormData({...formData, guru_bk: e.target.value})}
              >
                {GURU_BK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wali Kelas</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.wali_kelas}
                onChange={e => setFormData({...formData, wali_kelas: e.target.value})}
              >
                <option value="">Pilih Wali Kelas</option>
                {guru.map(g => <option key={g.id} value={g.nama_guru}>{g.nama_guru}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-3xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
            editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-pink-600 hover:bg-pink-700 shadow-pink-100'
          } text-white`}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {editingId ? <Edit2 size={24} /> : <Save size={24} />}
              {editingId ? 'Update Data Pelanggaran' : 'Simpan Data Pelanggaran'}
            </>
          )}
        </button>
        {editingId && (
          <button 
            type="button"
            onClick={() => {
              setEditingId(null);
              setFormData(initialFormData);
              setSelectedSiswa(null);
              setSearchTerm('');
            }}
            className="w-full py-3 text-slate-500 font-bold flex items-center justify-center gap-2"
          >
            <X size={18} /> Batal Edit
          </button>
        )}
      </form>

      {/* Transaction List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-pink-600" size={20} />
            Riwayat Input Terakhir
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Pelanggaran</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaksi.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">Belum ada data transaksi</td>
                </tr>
              ) : (
                transaksi.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{t.siswa?.nama}</p>
                      <p className="text-xs text-slate-500">Kelas {t.siswa?.kelas}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{t.pelanggaran?.nama_pelanggaran}</p>
                      <span className="text-[10px] font-bold text-pink-600 uppercase">{t.pelanggaran?.kategori}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{t.tanggal}</p>
                      <p className="text-[10px] text-slate-400">{t.jam}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus"
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
}
