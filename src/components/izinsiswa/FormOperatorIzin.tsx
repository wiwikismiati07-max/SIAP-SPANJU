import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa, Siswa, Guru } from '../../types/izinsiswa';
import { Check, X, Clock, Plus, Search, Calendar, User, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

const ALASAN_OPTIONS = [
  "Sakit",
  "Acara Keluarga",
  "Keperluan Mendesak",
  "Alpa",
  "Lainnya"
];

const KELAS_OPTIONS = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

export default function FormOperatorIzin() {
  const [pendingIzin, setPendingIzin] = useState<IzinWithSiswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Input State
  const [showManualInput, setShowManualInput] = useState(false);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [selectedGuru, setSelectedGuru] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tanggalSelesai, setTanggalSelesai] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [alasan, setAlasan] = useState('');
  const [alasanLainnya, setAlasanLainnya] = useState('');
  const [lampiranFile, setLampiranFile] = useState<File | null>(null);
  const [lampiranPreview, setLampiranPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchPending();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      if (supabase) {
        const { data: sData } = await supabase.from('master_siswa').select('*');
        if (sData) setSiswaList(sData);
        const { data: gData } = await supabase.from('master_guru').select('*');
        if (gData) setGuruList(gData);
      } else {
        setSiswaList(JSON.parse(localStorage.getItem('sitelat_siswa') || '[]'));
        setGuruList(JSON.parse(localStorage.getItem('master_guru') || '[]'));
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file maksimal 2MB');
        return;
      }
      setLampiranFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLampiranPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchPending = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (supabase) {
        const fetchPromise = supabase
          .from('izin_siswa')
          .select('*')
          .eq('status', 'Menunggu')
          .order('created_at', { ascending: false });
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const { data: iData, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (error) throw error;
          
        if (iData) {
          const { data: sData, error: sError } = await supabase.from('master_siswa').select('*');
          if (sError) throw sError;
          
          const joinedData = iData.map((i: any) => ({
            ...i,
            siswa: sData?.find((s: any) => s.id === i.siswa_id) || { id: i.siswa_id, nama: 'Unknown', kelas: '-' }
          }));
          setPendingIzin(joinedData as IzinWithSiswa[]);
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        
        const pending = localData
          .filter((d: any) => d.status === 'Menunggu')
          .map((d: any) => ({
            ...d,
            siswa: localSiswa.find((s: any) => s.id === d.siswa_id) || { id: d.siswa_id, nama: 'Unknown', kelas: '-' }
          }))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
        setPendingIzin(pending);
      }
    } catch (error: any) {
      console.error('Error fetching pending:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Disetujui' | 'Ditolak') => {
    if (!confirm(`Apakah Anda yakin ingin ${status.toLowerCase()} izin ini?`)) return;
    
    try {
      if (supabase) {
        const { error } = await supabase
          .from('izin_siswa')
          .update({ status })
          .eq('id', id);
        if (error) throw error;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const updated = localData.map((d: any) => d.id === id ? { ...d, status } : d);
        localStorage.setItem('izinsiswa_data', JSON.stringify(updated));
      }
      
      alert(`Izin berhasil ${status.toLowerCase()}`);
      fetchPending();
    } catch (error: any) {
      alert(`Gagal update status: ${error.message}`);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !alasan || !selectedGuru) {
      alert('Mohon lengkapi semua data');
      return;
    }

    const finalAlasan = alasan === 'Lainnya' ? alasanLainnya : alasan;
    if (alasan === 'Lainnya' && !alasanLainnya) {
      alert('Mohon ketik alasan lainnya');
      return;
    }

    setSubmitting(true);
    
    let lampiranUrl = '';
    try {
      if (lampiranFile && supabase) {
        const fileExt = lampiranFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('lampiran_izin')
          .upload(fileName, lampiranFile);
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('lampiran_izin')
            .getPublicUrl(fileName);
          lampiranUrl = urlData.publicUrl;
        }
      } else if (lampiranPreview) {
        lampiranUrl = lampiranPreview; // Local base64
      }

      const newRecord = {
        id: crypto.randomUUID(),
        siswa_id: selectedSiswa.id,
        guru_id: selectedGuru,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: finalAlasan,
        lampiran_url: lampiranUrl,
        status: 'Disetujui',
        diajukan_oleh: 'Guru',
        created_at: new Date().toISOString()
      };

      if (supabase) {
        const { error } = await supabase.from('izin_siswa').insert([newRecord]);
        if (error) throw error;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        localData.push(newRecord);
        localStorage.setItem('izinsiswa_data', JSON.stringify(localData));
      }
      
      alert('Absensi manual berhasil ditambahkan.');
      setShowManualInput(false);
      setSelectedSiswa(null);
      setAlasan('');
      setAlasanLainnya('');
      setSearchTerm('');
      setSelectedGuru('');
      setLampiranFile(null);
      setLampiranPreview(null);
      fetchPending();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(`Gagal menyimpan absensi: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSiswa = siswaList.filter(s => {
    const matchKelas = selectedKelas ? s.kelas === selectedKelas : true;
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase());
    return matchKelas && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Absensi Siswa</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {showManualInput ? <X size={18} /> : <Plus size={18} />}
            {showManualInput ? 'Batal Input' : 'Input Absensi Siswa'}
          </button>
          <button 
            onClick={fetchPending}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {showManualInput && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Input Manual Izin</h3>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Kelas <span className="text-rose-500">*</span></label>
                <select
                  value={selectedKelas}
                  onChange={(e) => {
                    setSelectedKelas(e.target.value);
                    setSelectedSiswa(null);
                    setSearchTerm('');
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none"
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
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
                
                {isDropdownOpen && !selectedSiswa && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white absolute z-10 w-full max-w-md max-h-60 overflow-y-auto">
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Guru <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select
                    value={selectedGuru}
                    onChange={(e) => setSelectedGuru(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none"
                    required
                  >
                    <option value="">Pilih Guru...</option>
                    {guruList.map(g => (
                      <option key={g.id} value={g.id}>{g.nama_guru}</option>
                    ))}
                  </select>
                </div>
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
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alasan Izin <span className="text-rose-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {ALASAN_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAlasan(opt)}
                      className={`py-2 px-4 rounded-xl border text-sm font-medium transition-all ${
                        alasan === opt 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                
                {alasan === 'Lainnya' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={alasanLainnya}
                      onChange={(e) => setAlasanLainnya(e.target.value)}
                      placeholder="Tuliskan alasan..."
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lampiran Foto Bukti</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all"
                />
                {lampiranPreview && (
                  <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                    <img src={lampiranPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setLampiranFile(null); setLampiranPreview(null); }}
                      className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl-lg"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedSiswa || !alasan || !selectedGuru}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Izin Manual'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {errorMsg && (
          <div className="p-4 m-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
            <X size={20} />
            <p>{errorMsg}</p>
          </div>
        )}
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : pendingIzin.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Clock size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Tidak ada pengajuan baru</h3>
            <p className="text-slate-500 mt-1">Semua pengajuan izin telah diproses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Siswa</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Tanggal Izin</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Alasan</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Diajukan Oleh</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Lampiran</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingIzin.map((izin) => (
                  <tr key={izin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{izin.siswa?.nama}</div>
                      <div className="text-xs text-slate-500">Kelas {izin.siswa?.kelas}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">
                        {izin.tanggal_mulai === izin.tanggal_selesai 
                          ? format(new Date(izin.tanggal_mulai), 'dd MMM yyyy')
                          : `${format(new Date(izin.tanggal_mulai), 'dd MMM')} - ${format(new Date(izin.tanggal_selesai), 'dd MMM yyyy')}`
                        }
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{izin.alasan}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                          {izin.diajukan_oleh}
                        </span>
                        {izin.nama_wali && <span className="text-xs text-slate-500">Wali: {izin.nama_wali}</span>}
                        {izin.no_telp_wali && <span className="text-xs text-slate-500">Telp: {izin.no_telp_wali}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      {izin.lampiran_url ? (
                        <a href={izin.lampiran_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                          Lihat Surat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(izin.id, 'Disetujui')}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                        title="Setujui"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(izin.id, 'Ditolak')}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                        title="Tolak"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
