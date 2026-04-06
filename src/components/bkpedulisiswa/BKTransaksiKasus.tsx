import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa } from '../../types/izinsiswa';
import { MasterKasus, TransaksiKasus, TindakLanjutKasus } from '../../types/bkpedulisiswa';
import { Save, Search, User, AlertCircle, Clock, Calendar, BookOpen, ShieldAlert, CheckCircle2, Trash2, Edit2, X, ClipboardList, Plus, Paperclip, FileText as FileIcon } from 'lucide-react';

export default function BKTransaksiKasus() {
  const [loading, setLoading] = useState(false);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [kasus, setKasus] = useState<MasterKasus[]>([]);
  const [guru, setGuru] = useState<any[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiKasus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showOtherKasus, setShowOtherKasus] = useState(false);

  const initialFormData = {
    tanggal: new Date().toISOString().split('T')[0],
    jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
    kelas: '',
    siswa_id: '',
    kasus_id: '',
    kasus_kategori: 'Kedisiplinan',
    kasus_kategori_lain: '',
    kronologi: '',
    bukti_fisik: [] as string[],
    wali_kelas: '',
    guru_bk: 'Wiwik Ismiati S.pd',
    status: 'Proses'
  };

  const [formData, setFormData] = useState(initialFormData);
  const [tindakLanjuts, setTindakLanjuts] = useState<Partial<TindakLanjutKasus>[]>([]);

  const KELAS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  const KASUS_OPTIONS = ['Kedisiplinan', 'Etika', 'Akademi', 'Bullying', 'Perkelahian', 'merokok', 'Narkoba', 'Lain-Lain'];
  const TINDAK_LANJUT_OPTIONS = [
    'Konseling Individu', 'Konseling Kelompok', 'Panggilan Orang Tua', 
    'Mediasi', 'Home visit', 'Skorsing', 'Lain-lain'
  ];
  const GURU_BK_OPTIONS = ['Wiwik Ismiati S.pd', 'Eki Febriani S.pd'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      if (supabase) {
        const { data: sData } = await supabase.from('master_siswa').select('*').order('nama', { ascending: true });
        const { data: kData } = await supabase.from('bk_master_kasus').select('*').order('nama_kasus', { ascending: true });
        const { data: gData } = await supabase.from('master_guru').select('*').order('nama_guru', { ascending: true });
        
        setSiswa(sData || []);
        setKasus(kData || []);
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
          .from('bk_transaksi_kasus')
          .select(`
            *,
            siswa:master_siswa(*),
            kasus:bk_master_kasus(*),
            tindak_lanjuts:bk_tindak_lanjut(*)
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

  const handleAddTindakLanjut = () => {
    setTindakLanjuts([...tindakLanjuts, { 
      tanggal: new Date().toISOString().split('T')[0], 
      tindak_lanjut: 'Konseling Individu',
      keterangan: ''
    }]);
  };

  const handleRemoveTindakLanjut = (index: number) => {
    setTindakLanjuts(tindakLanjuts.filter((_, i) => i !== index));
  };

  const handleTindakLanjutChange = (index: number, field: string, value: string) => {
    const updated = [...tindakLanjuts];
    updated[index] = { ...updated[index], [field]: value };
    setTindakLanjuts(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setLoading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `bukti_fisik/${fileName}`;

        if (supabase) {
          // Using 'bukti_fisik' bucket
          const { error: uploadError } = await supabase.storage
            .from('bukti_fisik')
            .upload(filePath, file);

          if (uploadError) {
            if (uploadError.message.includes('Bucket not found')) {
              throw new Error('Bucket storage "bukti_fisik" belum dibuat di Supabase. Silakan buat bucket bernama "bukti_fisik" dan set ke Public.');
            }
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('bukti_fisik')
            .getPublicUrl(filePath);
          
          newUrls.push(publicUrl);
        }
      }
      setFormData(prev => ({ ...prev, bukti_fisik: [...prev.bukti_fisik, ...newUrls] }));
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.kasus_id) {
      alert('Pilih siswa dan jenis kasus!');
      return;
    }

    setLoading(true);
    try {
      if (supabase) {
        const { kasus_kategori_lain, ...dataToSave } = formData;
        if (formData.kasus_kategori === 'Lain-Lain') {
          dataToSave.kasus_kategori = kasus_kategori_lain as any;
        }

        let transaksiId = editingId;

        if (editingId) {
          const { error } = await supabase
            .from('bk_transaksi_kasus')
            .update(dataToSave)
            .eq('id', editingId);
          if (error) throw error;
          
          await supabase.from('bk_tindak_lanjut').delete().eq('transaksi_id', editingId);
          
          setSuccessMsg('Data kasus berhasil diperbarui!');
        } else {
          const { data, error } = await supabase.from('bk_transaksi_kasus').insert([dataToSave]).select();
          if (error) throw error;
          transaksiId = data[0].id;
          setSuccessMsg('Data kasus berhasil disimpan!');
        }

        if (transaksiId && tindakLanjuts.length > 0) {
          const followUpsToSave = tindakLanjuts.map(tl => ({
            ...tl,
            transaksi_id: transaksiId
          }));
          const { error: tlError } = await supabase.from('bk_tindak_lanjut').insert(followUpsToSave);
          if (tlError) throw tlError;
        }
        
        setFormData(initialFormData);
        setTindakLanjuts([]);
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
    if (!confirm('Hapus data transaksi ini? Semua tindak lanjut terkait juga akan terhapus.')) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('bk_transaksi_kasus').delete().eq('id', id);
        if (error) throw error;
        fetchTransaksi();
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (t: TransaksiKasus) => {
    setEditingId(t.id);
    const isOtherKasus = !KASUS_OPTIONS.includes(t.kasus_kategori || '');
    setFormData({
      tanggal: t.tanggal,
      jam: t.jam,
      kelas: t.kelas || '',
      siswa_id: t.siswa_id,
      kasus_id: t.kasus_id,
      kasus_kategori: (isOtherKasus ? 'Lain-Lain' : t.kasus_kategori) as any,
      kasus_kategori_lain: isOtherKasus ? t.kasus_kategori : '',
      kronologi: t.kronologi || '',
      bukti_fisik: t.bukti_fisik || [],
      wali_kelas: t.wali_kelas || '',
      guru_bk: t.guru_bk || 'Wiwik Ismiati S.pd',
      status: t.status || 'Proses'
    });
    setShowOtherKasus(isOtherKasus);
    setTindakLanjuts(t.tindak_lanjuts || []);
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
          <h2 className="text-2xl font-bold text-slate-800">Input Kasus Siswa (BK)</h2>
          <p className="text-sm text-slate-500">Catat kasus berat dan tindak lanjut konseling</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={20} />
          <p className="font-bold">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={16} /> Detail Kasus
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenis Kasus (Master)</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.kasus_id}
                onChange={e => setFormData({...formData, kasus_id: e.target.value})}
              >
                <option value="">Pilih Kasus</option>
                {kasus.map(k => (
                  <option key={k.id} value={k.id}>{k.nama_kasus} ({k.kategori})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori Kasus</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.kasus_kategori}
                onChange={e => {
                  setFormData({...formData, kasus_kategori: e.target.value as any});
                  setShowOtherKasus(e.target.value === 'Lain-Lain');
                }}
              >
                {KASUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {showOtherKasus && (
                <input 
                  type="text"
                  placeholder="Sebutkan kategori kasus lainnya..."
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none animate-in slide-in-from-top-1"
                  value={formData.kasus_kategori_lain}
                  onChange={e => setFormData({...formData, kasus_kategori_lain: e.target.value})}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kronologi Kejadian (Maks. 500 Kata)</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none h-40 resize-none"
              placeholder="Jelaskan kronologi kejadian secara detail..."
              value={formData.kronologi}
              onChange={e => setFormData({...formData, kronologi: e.target.value})}
            />
            <p className="text-[10px] text-right text-slate-400 mt-1">
              {formData.kronologi.split(/\s+/).filter(Boolean).length} / 500 kata
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bukti Fisik (Multi Attachment)</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {formData.bukti_fisik.map((url, idx) => (
                <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                  <img src={url} alt="Bukti" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bukti_fisik: prev.bukti_fisik.filter((_, i) => i !== idx) }))}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-pink-500 hover:text-pink-500 transition-all cursor-pointer">
                <Paperclip size={20} />
                <span className="text-[10px] font-bold mt-1">Upload</span>
                <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={16} /> Penanganan & Tindak Lanjut
            </h3>
            <button 
              type="button"
              onClick={handleAddTindakLanjut}
              className="flex items-center gap-1 px-3 py-1 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold border border-pink-100 hover:bg-pink-100 transition-colors"
            >
              <Plus size={14} /> Tambah Tindak Lanjut
            </button>
          </div>

          {tindakLanjuts.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-sm italic">
              Belum ada tindak lanjut yang ditambahkan.
            </div>
          ) : (
            <div className="space-y-4">
              {tindakLanjuts.map((tl, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 relative group animate-in slide-in-from-right-2">
                  <button 
                    type="button"
                    onClick={() => handleRemoveTindakLanjut(idx)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal TL</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                        value={tl.tanggal}
                        onChange={e => handleTindakLanjutChange(idx, 'tanggal', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tindak Lanjut</label>
                      <select 
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                        value={tl.tindak_lanjut}
                        onChange={e => handleTindakLanjutChange(idx, 'tindak_lanjut', e.target.value)}
                      >
                        {TINDAK_LANJUT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Keterangan / Hasil</label>
                    <textarea 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-pink-500 h-16 resize-none"
                      placeholder="Catat hasil tindak lanjut..."
                      value={tl.keterangan}
                      onChange={e => handleTindakLanjutChange(idx, 'keterangan', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
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
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Kasus</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="Proses">Proses</option>
                <option value="Selesai">Selesai</option>
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
              {editingId ? 'Update Data Kasus' : 'Simpan Data Kasus'}
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

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-pink-600" size={20} />
            Riwayat Kasus Terakhir
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Kasus</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaksi.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">Belum ada data kasus</td>
                </tr>
              ) : (
                transaksi.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{t.siswa?.nama}</p>
                      <p className="text-xs text-slate-500">Kelas {t.siswa?.kelas}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{t.kasus?.nama_kasus}</p>
                      <span className="text-[10px] font-bold text-pink-600 uppercase">{t.kasus?.kategori}</span>
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
