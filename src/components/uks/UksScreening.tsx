import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Search, User, CheckCircle2, AlertCircle, HeartPulse, FileText, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UksScreening } from '../../types/uks';
import { format } from 'date-fns';

const UksScreeningView: React.FC = () => {
  const [siswa, setSiswa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    evaluasi: 'Sehat' as 'Sehat' | 'Pemantauan' | 'Perlu Rujukan',
    catatan: '',
    petugas: ''
  });

  const classes = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('master_siswa')
        .select('id, nama, kelas')
        .order('nama');
      
      if (error) throw error;
      setSiswa(data || []);
    } catch (error) {
      console.error('Error fetching siswa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswaId || !formData.petugas) {
      setMessage({ type: 'error', text: 'Mohon lengkapi data siswa dan petugas pemeriksa.' });
      return;
    }

    try {
      const { error } = await supabase
        .from('uks_screening')
        .insert([{
          ...formData,
          siswa_id: selectedSiswaId
        }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Data screening berhasil disimpan!' });
      resetForm();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menyimpan data screening' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      evaluasi: 'Sehat',
      catatan: '',
      petugas: ''
    });
    setSelectedSiswaId('');
    setSelectedClass('');
  };

  const filteredSiswa = siswa.filter(s => s.kelas === selectedClass);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <HeartPulse size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Form Screening Kesehatan</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Evaluasi kesehatan berkala siswa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Tanggal Screening</label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-emerald-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedSiswaId(''); }}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-emerald-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Siswa</label>
              <select
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-emerald-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 disabled:opacity-50"
              >
                <option value="">-- Pilih Siswa --</option>
                {filteredSiswa.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Evaluasi Hasil</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'Sehat', icon: CheckCircle2, color: 'emerald' },
                { id: 'Pemantauan', icon: Search, color: 'amber' },
                { id: 'Perlu Rujukan', icon: AlertCircle, color: 'rose' }
              ].map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, evaluasi: ev.id as any })}
                  className={`px-8 py-5 rounded-3xl font-black transition-all duration-300 flex items-center justify-center gap-3 ${
                    formData.evaluasi === ev.id 
                      ? `bg-${ev.color}-600 text-white shadow-lg shadow-${ev.color}-600/20 scale-105` 
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <ev.icon size={20} />
                  {ev.id}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Petugas Pemeriksa</label>
              <div className="relative group">
                <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input
                  type="text"
                  value={formData.petugas}
                  onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                  placeholder="Nama Petugas / Dokter / Perawat"
                  className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-emerald-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Catatan Screening</label>
              <div className="relative group">
                <FileText className="absolute left-6 top-6 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <textarea
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Keterangan hasil screening..."
                  rows={1}
                  className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-emerald-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              className="px-12 py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[32px] font-black flex items-center gap-4 transition-all duration-300 shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95"
            >
              <Save size={24} />
              Simpan Data Screening
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

export default UksScreeningView;
