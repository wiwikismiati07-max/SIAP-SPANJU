import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ClipboardList, AlertCircle, CheckCircle2, Search, User, Clock, Pill, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UksKeluhan, UksObat, UksKunjungan } from '../../types/uks';
import { format } from 'date-fns';

const UksPeriksa: React.FC = () => {
  const [keluhan, setKeluhan] = useState<UksKeluhan[]>([]);
  const [obat, setObat] = useState<UksObat[]>([]);
  const [siswa, setSiswa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
    keluhan_id: '',
    penanganan: 'Istirahat' as 'Minum Obat' | 'Pulang' | 'Istirahat',
    catatan: ''
  });

  const [selectedObat, setSelectedObat] = useState<{ obat_id: string, jumlah: number }[]>([]);

  const classes = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [keluhanRes, obatRes, siswaRes] = await Promise.all([
        supabase.from('uks_keluhan').select('*').order('nama_keluhan'),
        supabase.from('uks_obat').select('*').order('nama_obat'),
        supabase.from('master_siswa').select('id, nama, kelas').order('nama')
      ]);

      setKeluhan(keluhanRes.data || []);
      setObat(obatRes.data || []);
      setSiswa(siswaRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddObat = () => {
    setSelectedObat([...selectedObat, { obat_id: '', jumlah: 1 }]);
  };

  const handleRemoveObat = (index: number) => {
    setSelectedObat(selectedObat.filter((_, i) => i !== index));
  };

  const handleObatChange = (index: number, field: string, value: any) => {
    const newSelected = [...selectedObat];
    newSelected[index] = { ...newSelected[index], [field]: value };
    setSelectedObat(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswaId || !formData.keluhan_id) {
      setMessage({ type: 'error', text: 'Mohon lengkapi data siswa dan keluhan.' });
      return;
    }

    try {
      // 1. Insert Kunjungan
      const { data: kunjunganData, error: kunjunganError } = await supabase
        .from('uks_kunjungan')
        .insert([{
          ...formData,
          siswa_id: selectedSiswaId
        }])
        .select()
        .single();

      if (kunjunganError) throw kunjunganError;

      // 2. Insert Obat Usage if any
      if (formData.penanganan === 'Minum Obat' && selectedObat.length > 0) {
        const validObat = selectedObat.filter(o => o.obat_id && o.jumlah > 0);
        if (validObat.length > 0) {
          const { error: usageError } = await supabase
            .from('uks_kunjungan_obat')
            .insert(validObat.map(o => ({
              kunjungan_id: kunjunganData.id,
              obat_id: o.obat_id,
              jumlah: o.jumlah
            })));

          if (usageError) throw usageError;

          // Update Stock
          for (const o of validObat) {
            const currentObat = obat.find(item => item.id === o.obat_id);
            if (currentObat) {
              await supabase
                .from('uks_obat')
                .update({ stok: currentObat.stok - o.jumlah })
                .eq('id', o.obat_id);
            }
          }
        }
      }

      setMessage({ type: 'success', text: 'Data pemeriksaan berhasil disimpan!' });
      resetForm();
      fetchInitialData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menyimpan data pemeriksaan' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      jam: format(new Date(), 'HH:mm'),
      keluhan_id: '',
      penanganan: 'Istirahat',
      catatan: ''
    });
    setSelectedSiswaId('');
    setSelectedClass('');
    setSelectedObat([]);
  };

  const filteredSiswa = siswa.filter(s => s.kelas === selectedClass);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Form Pemeriksaan Siswa</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Catat hasil pemeriksaan kesehatan siswa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Tanggal</label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Jam</label>
              <input
                type="time"
                value={formData.jam}
                onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedSiswaId(''); }}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Siswa</label>
              <select
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 disabled:opacity-50"
              >
                <option value="">-- Pilih Siswa --</option>
                {filteredSiswa.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Keluhan</label>
              <select
                value={formData.keluhan_id}
                onChange={(e) => setFormData({ ...formData, keluhan_id: e.target.value })}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              >
                <option value="">-- Pilih Keluhan --</option>
                {keluhan.map(k => <option key={k.id} value={k.id}>{k.nama_keluhan}</option>)}
              </select>
            </div>
          </div>

          {/* Penanganan */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Penanganan</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Minum Obat', 'Pulang', 'Istirahat'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, penanganan: p as any })}
                  className={`px-8 py-5 rounded-3xl font-black transition-all duration-300 flex items-center justify-center gap-3 ${
                    formData.penanganan === p 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 scale-105' 
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {p === 'Minum Obat' && <Pill size={20} />}
                  {p === 'Pulang' && <User size={20} />}
                  {p === 'Istirahat' && <Clock size={20} />}
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine Usage Form */}
          {formData.penanganan === 'Minum Obat' && (
            <div className="bg-rose-50/50 p-8 rounded-[32px] border border-rose-100 space-y-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-rose-800 flex items-center gap-2">
                  <Pill size={18} />
                  Penggunaan Obat
                </h4>
                <button
                  type="button"
                  onClick={handleAddObat}
                  className="px-6 py-2 bg-rose-600 text-white rounded-full text-xs font-black hover:bg-rose-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  Tambah Obat
                </button>
              </div>

              {selectedObat.length === 0 ? (
                <p className="text-sm text-rose-400 italic text-center py-4">Klik "Tambah Obat" untuk mencatat obat yang diberikan.</p>
              ) : (
                <div className="space-y-4">
                  {selectedObat.map((o, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Obat</label>
                        <select
                          value={o.obat_id}
                          onChange={(e) => handleObatChange(index, 'obat_id', e.target.value)}
                          className="w-full px-6 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                        >
                          <option value="">-- Pilih Obat --</option>
                          {obat.map(item => (
                            <option key={item.id} value={item.id} disabled={item.stok <= 0}>
                              {item.nama_obat} (Stok: {item.stok})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah</label>
                        <input
                          type="number"
                          value={o.jumlah}
                          onChange={(e) => handleObatChange(index, 'jumlah', parseInt(e.target.value) || 0)}
                          className="w-full px-6 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Satuan</label>
                          <div className="px-6 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-sm">
                            {obat.find(item => item.id === o.obat_id)?.satuan || '-'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveObat(index)}
                          className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Catatan Tambahan</label>
            <textarea
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
              placeholder="Catatan hasil pemeriksaan atau keterangan tambahan..."
              rows={4}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300 resize-none"
            />
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              className="px-12 py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-[32px] font-black flex items-center gap-4 transition-all duration-300 shadow-xl shadow-rose-600/20 hover:scale-105 active:scale-95"
            >
              <Save size={24} />
              Simpan Hasil Pemeriksaan
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-10 p-8 rounded-[32px] flex items-center gap-6 animate-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            <div>
              <p className="font-black text-lg">{message.type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan'}</p>
              <p className="font-bold opacity-80">{message.text}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UksPeriksa;
