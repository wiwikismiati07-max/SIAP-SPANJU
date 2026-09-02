import React, { useState, useEffect, useRef } from 'react';
import { supabase, fetchAllSiswa } from '../../lib/supabase';
import { Siswa } from '../../types/izinsiswa';
import { format } from 'date-fns';
import { 
  Search, 
  Calendar, 
  FileText, 
  Upload, 
  User, 
  Phone, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  X, 
  CheckCircle2, 
  Eye, 
  Loader2,
  ExternalLink,
  Info,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ALASAN_OPTIONS = [
  "Sakit",
  "Izin",
  "Alpa",
  "Dispensasi"
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
  
  // Lampiran State
  const [lampiranUrlInput, setLampiranUrlInput] = useState('');
  const [lampiranPreview, setLampiranPreview] = useState<string>('');
  const [lampiranFile, setLampiranFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIzinMap, setActiveIzinMap] = useState<Record<string, any>>({});
  const [conflictIzin, setConflictIzin] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchActiveIzinForDateRange = async (startDate: string, endDate: string) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('izin_siswa')
          .select('*')
          .neq('status', 'Ditolak');

        if (!error && data) {
          const map: Record<string, any> = {};
          data.forEach((item: any) => {
            const iStart = item.tanggal_mulai;
            const iEnd = item.tanggal_selesai || item.tanggal_mulai;
            if (iStart <= endDate && iEnd >= startDate) {
              map[item.siswa_id] = item;
            }
          });
          setActiveIzinMap(map);
          return map;
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const map: Record<string, any> = {};
        localData.forEach((item: any) => {
          if (item.status === 'Ditolak') return;
          const iStart = item.tanggal_mulai;
          const iEnd = item.tanggal_selesai || item.tanggal_mulai;
          if (iStart <= endDate && iEnd >= startDate) {
            map[item.siswa_id] = item;
          }
        });
        setActiveIzinMap(map);
        return map;
      }
    } catch (err) {
      console.error('Error fetching active izin:', err);
    }
    return {};
  };

  useEffect(() => {
    fetchActiveIzinForDateRange(tanggalMulai, tanggalSelesai);
  }, [tanggalMulai, tanggalSelesai]);

  useEffect(() => {
    if (selectedSiswa) {
      const existing = activeIzinMap[selectedSiswa.id];
      setConflictIzin(existing || null);
    } else {
      setConflictIzin(null);
    }
  }, [selectedSiswa, activeIzinMap]);

  const checkStudentDuplicate = async (siswaId: string, startDate: string, endDate: string) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('izin_siswa')
          .select('*')
          .eq('siswa_id', siswaId)
          .neq('status', 'Ditolak');

        if (!error && data) {
          const match = data.find((item: any) => {
            const iStart = item.tanggal_mulai;
            const iEnd = item.tanggal_selesai || item.tanggal_mulai;
            return iStart <= endDate && iEnd >= startDate;
          });
          return match || null;
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const match = localData.find((item: any) => {
          if (item.siswa_id !== siswaId || item.status === 'Ditolak') return false;
          const iStart = item.tanggal_mulai;
          const iEnd = item.tanggal_selesai || item.tanggal_mulai;
          return iStart <= endDate && iEnd >= startDate;
        });
        return match || null;
      }
    } catch (err) {
      console.error('Error checking duplicate:', err);
    }
    return null;
  };

  const fetchSiswa = async () => {
    try {
      if (supabase) {
        const data = await fetchAllSiswa();
        if (data && data.length > 0) {
          setSiswaList(data);
        }
      } else {
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        setSiswaList(localSiswa);
      }
    } catch (error) {
      console.error('Error fetching siswa:', error);
    }
  };

  // Helper to convert Google Drive URL to embeddable / direct URL
  const formatGoogleDriveUrl = (url: string) => {
    if (!url) return url;
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    return url;
  };

  // Compress image file to reduce storage footprint while keeping text sharp
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1600;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        const fallbackReader = new FileReader();
        fallbackReader.onload = () => resolve(fallbackReader.result as string);
        fallbackReader.onerror = reject;
        fallbackReader.readAsDataURL(file);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file maksimal 10 MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingFile(true);
    try {
      setLampiranFile(file);
      const previewDataUrl = await compressImage(file);
      setLampiranPreview(previewDataUrl);
      setLampiranUrlInput(''); // clear text input if file uploaded
    } catch (err) {
      console.error('Error reading/compressing file:', err);
      alert('Gagal memproses file foto. Silakan coba kembali.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLampiranUrlInput(val);
    setLampiranFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    if (val.trim()) {
      setLampiranPreview(formatGoogleDriveUrl(val.trim()));
    } else {
      setLampiranPreview('');
    }
  };

  const handleRemovePhoto = () => {
    setLampiranPreview('');
    setLampiranFile(null);
    setLampiranUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !alasan || !namaWali || !noTelpWali || !lampiranPreview) {
      alert('Mohon lengkapi semua data, termasuk Nama Wali, No. Telp, dan Lampiran Foto Surat Izin.');
      return;
    }

    const isDispensasi = alasan === 'Dispensasi';
    const finalAlasan = isDispensasi ? 'Dispensasi' : alasan;
    const finalKeterangan = isDispensasi ? alasanLainnya : '';

    if (isDispensasi && !alasanLainnya) {
      alert('Mohon ketik keterangan dispensasi secara lengkap.');
      return;
    }

    // Check duplicate attendance / permission
    const existingConflict = await checkStudentDuplicate(selectedSiswa.id, tanggalMulai, tanggalSelesai);
    if (existingConflict) {
      alert(`❌ Data Ganda Terdeteksi!\n\nSiswa "${selectedSiswa.nama}" sudah terdaftar izin (${existingConflict.alasan}) untuk tanggal ${existingConflict.tanggal_mulai} s/d ${existingConflict.tanggal_selesai || existingConflict.tanggal_mulai} melalui ${existingConflict.diajukan_oleh || 'Form Wali Murid'} (Status: ${existingConflict.status}).\n\nData tidak dapat diinput kembali pada hari/tanggal yang sama agar tidak terjadi data ganda.`);
      setConflictIzin(existingConflict);
      return;
    }

    setLoading(true);

    try {
      let finalLampiranUrl = lampiranPreview;

      // If user uploaded a physical file and Supabase is connected, try uploading to Supabase Storage
      if (lampiranFile && supabase) {
        try {
          const fileExt = lampiranFile.name.split('.').pop() || 'jpg';
          const cleanFileName = `izin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          
          let bucketName = 'lampiran_izin';
          let { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(cleanFileName, lampiranFile, { cacheControl: '3600', upsert: true });

          if (uploadError) {
            // Try 'bukti_fisik' bucket fallback
            bucketName = 'bukti_fisik';
            const { error: secondUploadError } = await supabase.storage
              .from(bucketName)
              .upload(cleanFileName, lampiranFile, { cacheControl: '3600', upsert: true });

            if (!secondUploadError) {
              const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(cleanFileName);
              if (publicUrlData?.publicUrl) {
                finalLampiranUrl = publicUrlData.publicUrl;
              }
            }
          } else {
            const { data: publicUrlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(cleanFileName);
            if (publicUrlData?.publicUrl) {
              finalLampiranUrl = publicUrlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Storage upload error, using compressed base64 fallback:', storageErr);
          // finalLampiranUrl remains base64 string
        }
      }

      const newRecord = {
        id: crypto.randomUUID(),
        siswa_id: selectedSiswa.id,
        nama_wali: namaWali,
        no_telp_wali: noTelpWali,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: finalAlasan,
        keterangan: finalKeterangan,
        lampiran_url: finalLampiranUrl,
        status: 'Menunggu',
        diajukan_oleh: 'Wali Murid',
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
      
      alert('Pengajuan izin beserta foto surat berhasil dikirim dan tersimpan dengan baik.');
      
      // Reset form
      setSelectedSiswa(null);
      setNamaWali('');
      setNoTelpWali('');
      setAlasan('');
      setAlasanLainnya('');
      setSearchTerm('');
      setLampiranPreview('');
      setLampiranFile(null);
      setLampiranUrlInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchActiveIzinForDateRange(tanggalMulai, tanggalSelesai);
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(`Gagal mengirim pengajuan: ${error.message || 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSiswa = siswaList.filter(s => {
    const sKelas = (s.kelas || '').toString().trim().toUpperCase();
    const fKelas = (selectedKelas || '').toString().trim().toUpperCase();
    const matchKelas = !selectedKelas || sKelas === fKelas;
    const matchSearch = !searchTerm || (s.nama || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchKelas && matchSearch;
  });

  const isPdf = lampiranPreview && (lampiranPreview.startsWith('data:application/pdf') || lampiranPreview.toLowerCase().endsWith('.pdf'));

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Form Pengajuan Izin (Wali Murid)</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Lengkapi data siswa dan lampiran surat izin dokter / surat keterangan wali murid</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Nama Wali Murid <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={namaWali}
                onChange={(e) => setNamaWali(e.target.value)}
                placeholder="Masukkan nama lengkap Anda..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              No. Telp / WhatsApp Wali <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="tel"
                value={noTelpWali}
                onChange={(e) => setNoTelpWali(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Pilih Kelas <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value);
                setSelectedSiswa(null);
                setSearchTerm('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer outline-none"
            >
              <option value="">Semua Kelas</option>
              {KELAS_OPTIONS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Cari Nama Siswa <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedSiswa(null);
                  setIsDropdownOpen(true);
                }}
                placeholder={selectedKelas ? `Cari nama siswa kelas ${selectedKelas}...` : "Pilih kelas dulu atau ketik nama..."}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              />
            </div>
            
            {isDropdownOpen && !selectedSiswa && (
              <div className="mt-2 border border-slate-200 rounded-2xl overflow-hidden shadow-xl bg-white absolute z-30 w-full max-h-60 overflow-y-auto">
                {filteredSiswa.length > 0 ? (
                  filteredSiswa.slice(0, 50).map(siswa => {
                    const existing = activeIzinMap[siswa.id];
                    return (
                      <button
                        key={siswa.id}
                        type="button"
                        onClick={() => {
                          setSelectedSiswa(siswa);
                          setSearchTerm(`${siswa.nama} - Kelas ${siswa.kelas}`);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800 group-hover:text-emerald-700 text-sm">{siswa.nama}</div>
                          <div className="text-xs text-slate-500 font-semibold">Kelas {siswa.kelas}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {existing && (
                            <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <AlertTriangle size={10} className="text-rose-500" />
                              {existing.alasan} ({existing.status})
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            PILIH
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-slate-500 text-xs text-center font-medium">Siswa tidak ditemukan</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Tanggal Mulai <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Tanggal Selesai <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                min={tanggalMulai}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
            Alasan Izin <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALASAN_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAlasan(opt)}
                className={`py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  alasan === opt 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/30 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          
          {alasan === 'Dispensasi' && (
            <div className="mt-3 relative">
              <FileText className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <textarea
                value={alasanLainnya}
                onChange={(e) => setAlasanLainnya(e.target.value)}
                placeholder="Tuliskan keterangan dispensasi secara detail (lomba, acara keluarga, dll)..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all min-h-[90px] outline-none"
                required
              />
            </div>
          )}
        </div>

        {/* SECTION: LAMPIRAN FOTO SURAT IZIN (Sesuai Desain Terlampir) */}
        <div className="space-y-2">
          {/* Header Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex items-center gap-2 text-blue-600">
              <ImageIcon size={18} className="text-blue-600 stroke-[2.2]" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                LINK FOTO SURAT IZIN / DOKUMENTASI
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              Bisa Input Link URL atau Upload Foto
            </span>
          </div>

          {/* Main Card Container */}
          <div className="p-4 md:p-5 bg-gradient-to-br from-slate-50/80 via-blue-50/30 to-slate-50/80 border border-blue-100/90 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              
              {/* Left Column: Link Input & Upload Button */}
              <div className="md:col-span-2 space-y-3">
                {/* URL Input */}
                <div className="relative">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="url"
                    value={lampiranUrlInput}
                    onChange={handleUrlChange}
                    placeholder="https://... (URL foto Google Drive / Imgur / web)"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 shadow-xs"
                  />
                  {lampiranUrlInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setLampiranUrlInput('');
                        if (!lampiranFile) setLampiranPreview('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Upload Button + Supported Format Text */}
                <div className="flex items-center flex-wrap gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="upload-surat-file"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-4 py-2.5 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isProcessingFile ? (
                      <Loader2 size={15} className="animate-spin text-blue-600" />
                    ) : (
                      <Upload size={15} className="text-blue-600" />
                    )}
                    <span>{isProcessingFile ? 'Memproses...' : 'Upload Foto dari Perangkat'}</span>
                  </button>
                  
                  <span className="text-[11px] text-slate-400 font-medium">
                    Format JPG, PNG, WEBP, PDF
                  </span>
                </div>

                {lampiranPreview && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    <span>Foto / lampiran surat izin siap dikirim</span>
                  </div>
                )}
              </div>

              {/* Right Column: Preview Thumbnail Box */}
              <div className="w-full flex justify-center md:justify-end">
                <div className="w-full max-w-[200px] h-32 md:h-34 bg-white border border-slate-200/90 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-xs group">
                  {lampiranPreview ? (
                    <>
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center p-3 text-center">
                          <FileText size={36} className="text-rose-500 mb-1" />
                          <span className="text-[11px] font-bold text-slate-700">Dokumen PDF</span>
                          <span className="text-[9px] text-slate-400 font-medium">Siap Dikirim</span>
                        </div>
                      ) : (
                        <img 
                          src={lampiranPreview} 
                          alt="Preview Surat Izin" 
                          className="w-full h-full object-cover rounded-2xl"
                          onError={(e) => {
                            // If direct image load fails (e.g. google drive link requiring proxy)
                            (e.target as any).style.display = 'none';
                          }}
                        />
                      )}

                      {/* Action buttons on hover/overlay */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setShowPreviewModal(true)}
                          className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors shadow cursor-pointer"
                          title="Lihat Gambar Penuh"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow cursor-pointer"
                          title="Hapus / Ganti Foto"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Remove Button Mobile Indicator */}
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="md:hidden absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <ImageIcon size={30} className="text-slate-300 stroke-[1.5] mb-1.5" />
                      <span className="text-xs text-slate-400 font-semibold tracking-tight">Belum ada foto</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {conflictIzin && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start gap-3 mt-4">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Data Ganda Terdeteksi!</p>
              <p className="text-xs mt-1 leading-relaxed">
                Siswa <strong>{selectedSiswa?.nama}</strong> sudah terdaftar izin ({conflictIzin.alasan}) untuk tanggal {conflictIzin.tanggal_mulai} s/d {conflictIzin.tanggal_selesai || conflictIzin.tanggal_mulai} melalui {conflictIzin.diajukan_oleh || 'Form Wali Murid'} (Status: {conflictIzin.status}).
              </p>
              <p className="text-xs mt-1 font-semibold text-rose-600">Data tidak dapat diinput kembali pada hari/tanggal yang sama.</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || isProcessingFile || !!conflictIzin}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Menyimpan Pengajuan...</span>
            </>
          ) : (
            <span>Kirim Pengajuan Izin</span>
          )}
        </button>
      </form>

      {/* Photo Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && lampiranPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-blue-400" />
                  <h3 className="text-sm font-bold">Preview Lampiran Surat Izin</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
                {isPdf ? (
                  <iframe src={lampiranPreview} className="w-full h-[500px] rounded-xl border border-slate-200" title="PDF Preview" />
                ) : (
                  <img 
                    src={lampiranPreview} 
                    alt="Lampiran Surat Izin" 
                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-md"
                  />
                )}
              </div>

              <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Pastikan teks dan stempel pada surat terlihat jelas</span>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
