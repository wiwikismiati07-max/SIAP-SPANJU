import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa, Siswa, Guru } from '../../types/izinsiswa';
import { Check, X, Clock, Plus, Search, Calendar, User, BookOpen, Upload, FileDown, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState({ total: 0, valid: 0, invalid: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (siswaList.length === 0) {
      alert('Data siswa belum dimuat. Mohon tunggu sebentar atau refresh halaman.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('File Excel kosong atau format tidak didukung');
          return;
        }

        // Validate and map data
        const processed = data.map((row: any) => {
          const nama = (row['Nama Siswa'] || row['nama_siswa'] || '').toString().trim();
          const kelas = (row['Kelas'] || row['kelas'] || '').toString().trim();
          const tglMulai = (row['Tanggal Mulai'] || row['tanggal_mulai'] || '').toString().trim();
          const tglSelesai = (row['Tanggal Selesai'] || row['tanggal_selesai'] || tglMulai).toString().trim();
          const alasanRow = (row['Alasan'] || row['alasan'] || '').toString().trim();
          const namaGuru = (row['Nama Guru'] || row['nama_guru'] || '').toString().trim();

          const student = siswaList.find(s => 
            s.nama.toLowerCase() === nama.toLowerCase() && 
            s.kelas.toString().toUpperCase() === kelas.toUpperCase()
          );

          const teacher = guruList.find(g => 
            g.nama_guru.toLowerCase().includes(namaGuru.toLowerCase())
          );

          let error = '';
          if (!nama) error = 'Nama siswa kosong';
          else if (!kelas) error = 'Kelas kosong';
          else if (!student) error = 'Siswa tidak ditemukan di data master';
          else if (!tglMulai) error = 'Tanggal mulai kosong';
          else if (!alasanRow) error = 'Alasan kosong';

          return {
            nama_siswa: nama,
            kelas: kelas,
            siswa_id: student?.id,
            guru_id: teacher?.id || guruList[0]?.id, // Default to first guru if not found
            tanggal_mulai: tglMulai,
            tanggal_selesai: tglSelesai,
            alasan: alasanRow,
            error
          };
        });

        setUploadData(processed);
        setUploadStats({
          total: processed.length,
          valid: processed.filter(p => !p.error).length,
          invalid: processed.filter(p => p.error).length
        });
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('Gagal membaca file Excel. Pastikan format benar.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nama Siswa': 'Contoh Nama Siswa',
        'Kelas': '7A',
        'Tanggal Mulai': format(new Date(), 'yyyy-MM-dd'),
        'Tanggal Selesai': format(new Date(), 'yyyy-MM-dd'),
        'Alasan': 'Sakit',
        'Nama Guru': guruList[0]?.nama_guru || 'Nama Guru'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'Template_Upload_Izin.xlsx');
  };

  const processImport = async () => {
    const validData = uploadData.filter(d => !d.error);
    if (validData.length === 0) return;

    if (!supabase) {
      const confirmOffline = confirm('Koneksi database (Supabase) tidak terdeteksi. Data akan disimpan di penyimpanan lokal browser saja. Lanjutkan?');
      if (!confirmOffline) return;
    }

    setIsUploading(true);
    try {
      let records = [];
      
      if (supabase) {
        // Fetch existing records to check for "tindih" (overwrite)
        const studentIds = [...new Set(validData.map(d => d.siswa_id))];
        const { data: existingRecords } = await supabase
          .from('izin_siswa')
          .select('id, siswa_id, tanggal_mulai, tanggal_selesai, created_at')
          .in('siswa_id', studentIds);

        records = validData.map(d => {
          const existing = existingRecords?.find(ex => 
            ex.siswa_id === d.siswa_id && 
            ex.tanggal_mulai === d.tanggal_mulai && 
            ex.tanggal_selesai === d.tanggal_selesai
          );

          return {
            id: existing ? existing.id : crypto.randomUUID(),
            siswa_id: d.siswa_id,
            guru_id: d.guru_id,
            tanggal_mulai: d.tanggal_mulai,
            tanggal_selesai: d.tanggal_selesai,
            alasan: d.alasan,
            status: 'Disetujui', // Set to Disetujui for historical data
            diajukan_oleh: 'Wiwik Ismiati, S.Pd',
            created_at: existing ? existing.created_at : new Date().toISOString()
          };
        });

        const chunkSize = 50;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const { error } = await supabase.from('izin_siswa').upsert(chunk);
          if (error) throw error;
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const updated = [...localData];
        
        validData.forEach(d => {
          const existingIdx = updated.findIndex(ex => 
            ex.siswa_id === d.siswa_id && 
            ex.tanggal_mulai === d.tanggal_mulai && 
            ex.tanggal_selesai === d.tanggal_selesai
          );

          const newRecord = {
            id: existingIdx >= 0 ? updated[existingIdx].id : crypto.randomUUID(),
            siswa_id: d.siswa_id,
            guru_id: d.guru_id,
            tanggal_mulai: d.tanggal_mulai,
            tanggal_selesai: d.tanggal_selesai,
            alasan: d.alasan,
            status: 'Disetujui',
            diajukan_oleh: 'Wiwik Ismiati, S.Pd',
            created_at: existingIdx >= 0 ? updated[existingIdx].created_at : new Date().toISOString()
          };

          if (existingIdx >= 0) {
            updated[existingIdx] = newRecord;
          } else {
            updated.push(newRecord);
          }
        });
        localStorage.setItem('izinsiswa_data', JSON.stringify(updated));
      }

      alert(`Berhasil mengimport ${validData.length} data. Data lama yang sama telah ditindih (diupdate).`);
      setShowUploadModal(false);
      setUploadData([]);
      fetchPending();
    } catch (error: any) {
      console.error('Error importing:', error);
      alert(`Gagal import data: ${error.message || 'Terjadi kesalahan jaringan atau database'}`);
    } finally {
      setIsUploading(false);
    }
  };

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
        diajukan_oleh: 'Wiwik Ismiati, S.Pd',
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
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Upload size={18} />
            <span className="hidden sm:inline">Upload Data Lama</span>
            <span className="sm:hidden">Upload</span>
          </button>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isUploading && setShowUploadModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Upload Data Izin Lama</h3>
                  <p className="text-xs text-emerald-100">Import data dari file Excel (.xlsx, .xls)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {!uploadData.length ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-blue-600 shrink-0" size={20} />
                    <div className="text-sm text-blue-800">
                      <p className="font-bold mb-1">Petunjuk Penggunaan:</p>
                      <ul className="list-disc list-inside space-y-1 opacity-90">
                        <li>Gunakan format file Excel (.xlsx atau .xls)</li>
                        <li>Pastikan kolom sesuai dengan template</li>
                        <li>Nama siswa dan kelas harus sesuai dengan data master</li>
                        <li>Format tanggal: YYYY-MM-DD (contoh: 2024-04-10)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-10 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={32} />
                    </div>
                    <p className="font-bold text-slate-800">Klik atau seret file ke sini</p>
                    <p className="text-sm text-slate-500 mt-1">Maksimal ukuran file 5MB</p>
                  </div>

                  <button 
                    onClick={downloadTemplate}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                  >
                    <FileDown size={20} />
                    Download Template Excel
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Baris</p>
                      <p className="text-2xl font-black text-slate-800">{uploadStats.total}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Valid</p>
                      <p className="text-2xl font-black text-emerald-700">{uploadStats.valid}</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Invalid</p>
                      <p className="text-2xl font-black text-rose-700">{uploadStats.invalid}</p>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="p-3 font-bold text-slate-600">Siswa</th>
                          <th className="p-3 font-bold text-slate-600">Tanggal</th>
                          <th className="p-3 font-bold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {uploadData.slice(0, 50).map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{row.nama_siswa}</div>
                              <div className="text-[10px] text-slate-500">Kelas {row.kelas}</div>
                            </td>
                            <td className="p-3 text-slate-600">{row.tanggal_mulai}</td>
                            <td className="p-3">
                              {row.error ? (
                                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">{row.error}</span>
                              ) : (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap Import</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadData.length > 50 && (
                      <div className="p-3 text-center text-xs text-slate-500 bg-slate-50">
                        Menampilkan 50 dari {uploadData.length} baris...
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => { setUploadData([]); setUploadStats({ total: 0, valid: 0, invalid: 0 }); }}
                      disabled={isUploading}
                      className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                      Ganti File
                    </button>
                    <button 
                      onClick={processImport}
                      disabled={isUploading || uploadStats.valid === 0}
                      className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Mengimport...
                        </>
                      ) : (
                        `Import ${uploadStats.valid} Data`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                        <a 
                          href={izin.lampiran_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all border border-blue-100"
                        >
                          <ExternalLink size={14} />
                          Lihat Surat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
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
