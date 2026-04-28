import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa } from '../../types/izinsiswa';
import { format } from 'date-fns';
import { Search, Calendar, FileText, Upload, User, Phone } from 'lucide-react';

const ALASAN_OPTIONS = [
  "Sakit",
  "Izin",
  "Alpa",
  "Lainnya"
];

const KELAS_OPTIONS = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

export default function FormWaliMurid() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [namaWali, setNamaWali] = useState('');
  const [noTelpWali, setNoTelpWali] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tanggalSelesai, setTanggalSelesai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [alasan, setAlasan] = useState('');
  const [alasanLainnya, setAlasanLainnya] = useState('');
  const [lampiran, setLampiran] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('Ukuran file maksimal 1 MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLampiran(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !alasan || !namaWali || !noTelpWali || !lampiran) {
      alert('Mohon lengkapi semua data, termasuk Nama Wali, No. Telp, dan Lampiran Surat Izin.');
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
      nama_wali: namaWali,
      no_telp_wali: noTelpWali,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      alasan: finalAlasan,
      lampiran_url: lampiran,
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
      setNamaWali('');
      setNoTelpWali('');
      setAlasan('');
      setAlasanLainnya('');
      setSearchTerm('');
      setLampiran('');
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(`Gagal mengirim pengajuan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSiswa = siswaList.filter(s => {
    const matchKelas = selectedKelas ? s.kelas === selectedKelas : true;
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase());
    return matchKelas && matchSearch;
  });

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Form Pengajuan Izin (Wali Murid)</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Wali Murid <span className="text-rose-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={namaWali}
                onChange={(e) => setNamaWali(e.target.value)}
                placeholder="Masukkan nama lengkap Anda..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">No. Telp / WhatsApp Wali <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="tel"
                value={noTelpWali}
                onChange={(e) => setNoTelpWali(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Kelas <span className="text-rose-500">*</span></label>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value);
                setSelectedSiswa(null);
                setSearchTerm('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none"
            >
              <option value="">Semua Kelas</option>
              {KELAS_OPTIONS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Cari Nama Siswa <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedSiswa(null);
                  setIsDropdownOpen(true);
                }}
                placeholder={selectedKelas ? "Ketik nama siswa..." : "Pilih kelas dulu atau ketik nama..."}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
            
            {isDropdownOpen && !selectedSiswa && (
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white absolute z-10 w-full max-w-2xl max-h-60 overflow-y-auto">
                {filteredSiswa.length > 0 ? (
                  filteredSiswa.map(siswa => (
                    <button
                      key={siswa.id}
                      type="button"
                      onClick={() => {
                        setSelectedSiswa(siswa);
                        setSearchTerm(`${siswa.nama} - ${siswa.kelas}`);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <div className="font-medium text-slate-800">{siswa.nama}</div>
                      <div className="text-sm text-slate-500">Kelas {siswa.kelas}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-500 text-sm">Siswa tidak ditemukan</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Mulai <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Selesai <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                min={tanggalMulai}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Alasan Izin <span className="text-rose-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            {ALASAN_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAlasan(opt)}
                className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                  alasan === opt 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          
          {alasan === 'Lainnya' && (
            <div className="mt-3 relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={20} />
              <textarea
                value={alasanLainnya}
                onChange={(e) => setAlasanLainnya(e.target.value)}
                placeholder="Tuliskan alasan secara detail..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all min-h-[100px]"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Lampiran Surat Izin (Max 1MB) <span className="text-rose-500">*</span></label>
          <div className="relative">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="lampiran-upload"
              required
            />
            <label 
              htmlFor="lampiran-upload"
              className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors text-slate-600"
            >
              <Upload size={20} />
              <span className="font-medium">{lampiran ? 'File Terpilih (Klik untuk mengganti)' : 'Pilih File Surat Izin'}</span>
            </label>
            {lampiran && <p className="text-xs text-emerald-600 mt-2 text-center font-medium">✓ File berhasil dilampirkan</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Mengirim...' : 'Kirim Pengajuan Izin'}
        </button>
      </form>
    </div>
  );
}
