import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa } from '../../types/izinsiswa';
import { format } from 'date-fns';

const ALASAN_OPTIONS = [
  "Sakit",
  "Acara Keluarga",
  "Keperluan Mendesak",
  "Lainnya"
];

export default function FormWaliMurid() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [tanggalMulai, setTanggalMulai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tanggalSelesai, setTanggalSelesai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [alasan, setAlasan] = useState('');
  const [alasanLainnya, setAlasanLainnya] = useState('');

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    try {
      if (supabase) {
        const { data } = await supabase.from('master_siswa').select('*');
        if (data) setSiswaList(data);
      } else {
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        setSiswaList(localSiswa);
      }
    } catch (error) {
      console.error('Error fetching siswa:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !alasan) {
      alert('Mohon lengkapi semua data');
      return;
    }

    const finalAlasan = alasan === 'Lainnya' ? alasanLainnya : alasan;
    if (alasan === 'Lainnya' && !alasanLainnya) {
      alert('Mohon ketik alasan lainnya');
      return;
    }

    setLoading(true);
    const newRecord = {
      id: crypto.randomUUID(),
      siswa_id: selectedSiswa.id,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      alasan: finalAlasan,
      status: 'Menunggu',
      diajukan_oleh: 'Wali Murid',
      created_at: new Date().toISOString()
    };

    try {
      if (supabase) {
        const { error } = await supabase.from('izin_siswa').insert([newRecord]);
        if (error) throw error;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        localData.push(newRecord);
        localStorage.setItem('izinsiswa_data', JSON.stringify(localData));
      }
      
      alert('Pengajuan izin berhasil dikirim dan menunggu persetujuan.');
      setSelectedSiswa(null);
      setAlasan('');
      setAlasanLainnya('');
      setSearchTerm('');
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(`Gagal mengirim pengajuan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSiswa = siswaList.filter(s => 
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.kelas.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Form Pengajuan Izin (Wali Murid)</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Cari Siswa</label>
          <input
            type="text"
            placeholder="Ketik nama atau kelas..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedSiswa(null);
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          />
          
          {searchTerm && !selectedSiswa && (
            <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
              {filteredSiswa.map(s => (
                <div 
                  key={s.id}
                  onClick={() => {
                    setSelectedSiswa(s);
                    setSearchTerm(`${s.nama} - Kelas ${s.kelas}`);
                  }}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <div className="font-medium text-slate-800">{s.nama}</div>
                  <div className="text-xs text-slate-500">Kelas {s.kelas}</div>
                </div>
              ))}
              {filteredSiswa.length === 0 && (
                <div className="px-4 py-3 text-slate-500 text-sm">Siswa tidak ditemukan</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Mulai</label>
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Selesai</label>
            <input
              type="date"
              value={tanggalSelesai}
              min={tanggalMulai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Alasan Izin</label>
          <div className="grid grid-cols-2 gap-3">
            {ALASAN_OPTIONS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setAlasan(a)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  alasan === a 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-100 text-slate-600 hover:border-emerald-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {alasan === 'Lainnya' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Detail Alasan</label>
            <textarea
              value={alasanLainnya}
              onChange={(e) => setAlasanLainnya(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none min-h-[100px]"
              placeholder="Jelaskan alasan izin..."
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedSiswa || !alasan}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Mengirim...' : 'Kirim Pengajuan Izin'}
        </button>
      </form>
    </div>
  );
}
