import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Users, Activity, Save, X, Edit2, Trash2, Search, Upload, Download, Check, Plus, UserCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AgamaAbsensi, AgamaProgram } from '../../types/keagamaan';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

interface SiswaKeagamaanItem {
  siswa_id: string;
  nama: string;
  nis?: string;
  kelas: string;
  periode?: string;
  absensi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Haid' | 'Pulang sebelum waktunya';
  nilai?: string;
  catatan_siswa?: string;
  tindakan?: string;
  sudah_izin?: boolean;
  keterangan_izin?: string;
}

const KeagamaanAbsensi: React.FC<{ user?: any }> = ({ user }) => {
  const canDelete = user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const [absensiList, setAbsensiList] = useState<AgamaAbsensi[]>([]);
  const [programs, setPrograms] = useState<AgamaProgram[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaKeagamaanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterKeterangan, setFilterKeterangan] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('2026');

  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH.mm'),
    kegiatan_id: '',
    wali_kelas_id: '',
    alasan: 'Hadir' as any,
    kelas: '7A'
  });

  const classes = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  const reasons = [
    { id: 'Hadir', label: 'Hadir', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'Izin', label: 'Izin', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'Sakit', label: 'Sakit', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { id: 'Alpa', label: 'Alpa', color: 'bg-slate-50 text-slate-600 border-slate-200' },
    { id: 'Haid', label: 'Haid', color: 'bg-rose-50 text-rose-600 border-rose-200' },
    { id: 'Pulang sebelum waktunya', label: 'Pulang sebelum waktunya', color: 'bg-purple-50 text-purple-600 border-purple-200' }
  ];

  useEffect(() => {
    fetchInitialData();
    fetchAbsensi();
  }, []);

  const fetchAllMasterSiswa = async () => {
    if (!supabase) return [];
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let keepGoing = true;

    while (keepGoing) {
      const start = page * pageSize;
      const end = (page + 1) * pageSize - 1;
      const { data, error } = await supabase
        .from('master_siswa')
        .select('*')
        .range(start, end)
        .order('nama', { ascending: true });

      if (error || !data || data.length === 0) {
        keepGoing = false;
      } else {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          keepGoing = false;
        } else {
          page++;
        }
      }
    }
    return allData;
  };

  const fetchInitialData = async () => {
    try {
      const [pRes, tRes, sData] = await Promise.all([
        supabase ? supabase.from('agama_program').select('*').order('nama_kegiatan') : Promise.resolve({ data: [] }),
        supabase ? supabase.from('master_guru').select('*').order('nama_guru') : Promise.resolve({ data: [] }),
        fetchAllMasterSiswa()
      ]);

      const programList = pRes.data || [];
      const teacherList = tRes.data || [];
      setPrograms(programList);
      setTeachers(teacherList);
      setStudents(sData || []);

      setFormData(prev => ({
        ...prev,
        kegiatan_id: prev.kegiatan_id || (programList.length > 0 ? programList[0].id : ''),
        wali_kelas_id: prev.wali_kelas_id || (teacherList.length > 0 ? teacherList[0].id : '')
      }));
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchAbsensi = async () => {
    try {
      setLoading(true);
      if (!supabase) return;
      const { data, error } = await supabase
        .from('agama_absensi')
        .select(`
          *,
          siswa:master_siswa(nama, kelas),
          kegiatan:agama_program(nama_kegiatan),
          wali_kelas:master_guru(nama_guru)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setAbsensiList(data || []);
    } catch (error) {
      console.error('Error fetching absensi:', error);
    } finally {
      setLoading(false);
    }
  };

  const availablePeriodes = Array.from(
    new Set(['2026', '2025', ...students.map(s => s.periode || '2026')])
  ).sort((a, b) => b.localeCompare(a));

  // Load students for the selected class & periode
  useEffect(() => {
    if (!formData.kelas) {
      setSiswaList([]);
      return;
    }

    const loadClassStudents = async () => {
      // 1. Filter students from master_siswa
      const matched = students.filter(s => {
        const sPeriode = s.periode || '2026';
        const matchPeriode = filterPeriode === 'ALL' ? true : sPeriode === filterPeriode;
        return s.kelas === formData.kelas && matchPeriode;
      }).sort((a, b) => a.nama.localeCompare(b.nama));

      // 2. Check existing records in agama_absensi for this class on this date & program
      let existingAbsensiMap: Record<string, any> = {};
      if (formData.tanggal && formData.kegiatan_id && supabase && matched.length > 0) {
        try {
          const studentIds = matched.map(m => m.id);
          const { data: existingData } = await supabase
            .from('agama_absensi')
            .select('*')
            .in('siswa_id', studentIds)
            .eq('tanggal', formData.tanggal)
            .eq('kegiatan_id', formData.kegiatan_id);

          if (existingData) {
            existingData.forEach((item: any) => {
              existingAbsensiMap[item.siswa_id] = item;
            });
          }
        } catch (e) {
          console.warn('Error fetching existing class attendance:', e);
        }
      }

      // 3. Check active izin for this date from izin_siswa
      let activeIzinByStudent: Record<string, any> = {};
      if (formData.tanggal && supabase) {
        try {
          const { data: izinData } = await supabase
            .from('izin_siswa')
            .select('*')
            .neq('status', 'Ditolak');
          if (izinData) {
            izinData.forEach((iz: any) => {
              const start = iz.tanggal_mulai;
              const end = iz.tanggal_selesai || iz.tanggal_mulai;
              if (start <= formData.tanggal && end >= formData.tanggal) {
                activeIzinByStudent[iz.siswa_id] = iz;
              }
            });
          }
        } catch (err) {}
      }

      const list: SiswaKeagamaanItem[] = matched.map((s, idx) => {
        const existingRecord = existingAbsensiMap[s.id];
        const existingIzin = activeIzinByStudent[s.id];

        let defaultAbsensi: any = 'Hadir';
        let sudahIzin = false;
        let keteranganIzin = '';
        let defaultCatatan = '';

        if (existingRecord) {
          defaultAbsensi = existingRecord.alasan;
        } else if (existingIzin) {
          sudahIzin = true;
          defaultAbsensi = existingIzin.jenis_izin === 'Sakit' ? 'Sakit' : 'Izin';
          keteranganIzin = `Sudah Izin (${existingIzin.jenis_izin})`;
          defaultCatatan = `Izin via Form Wali Murid (${existingIzin.jenis_izin})`;
        }

        return {
          siswa_id: s.id,
          nama: s.nama,
          nis: s.nis || `24${formData.kelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
          kelas: s.kelas || formData.kelas,
          periode: s.periode || (filterPeriode === 'ALL' ? '2026' : filterPeriode),
          absensi: defaultAbsensi,
          nilai: '',
          catatan_siswa: defaultCatatan,
          tindakan: '',
          sudah_izin: sudahIzin,
          keterangan_izin: keteranganIzin
        };
      });

      setSiswaList(list);
    };

    loadClassStudents();
  }, [formData.kelas, filterPeriode, formData.tanggal, formData.kegiatan_id, students]);

  // Set all students to Hadir
  const handleSetAllHadir = () => {
    setSiswaList(prev => prev.map(s => ({ ...s, absensi: 'Hadir' })));
  };

  // Update specific student field
  const handleUpdateStudent = (index: number, field: keyof SiswaKeagamaanItem, value: any) => {
    setSiswaList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Add manual student
  const handleAddManualStudent = () => {
    const nama = prompt('Masukkan nama siswa baru:');
    if (!nama || !nama.trim()) return;

    const newStudent: SiswaKeagamaanItem = {
      siswa_id: `manual-${Date.now()}`,
      nama: nama.trim().toUpperCase(),
      nis: `24${(formData.kelas || '7A').replace(/[^0-9]/g, '')}${String(siswaList.length + 1).padStart(3, '0')}`,
      kelas: formData.kelas || '7A',
      periode: filterPeriode === 'ALL' ? '2026' : filterPeriode,
      absensi: 'Hadir',
      nilai: '',
      catatan_siswa: '',
      tindakan: ''
    };

    setSiswaList(prev => [...prev, newStudent]);
  };

  // Remove student from list
  const handleRemoveStudent = (index: number) => {
    if (confirm('Hapus siswa ini dari daftar absensi kegiatan ini?')) {
      setSiswaList(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Counters
  const countHadir = siswaList.filter(s => s.absensi === 'Hadir').length;
  const countSakit = siswaList.filter(s => s.absensi === 'Sakit').length;
  const countIzin = siswaList.filter(s => s.absensi === 'Izin').length;
  const countAlpa = siswaList.filter(s => s.absensi === 'Alpa').length;
  const countHaid = siswaList.filter(s => s.absensi === 'Haid').length;

  // Filtered rows
  const filteredSiswaTable = siswaList.filter(s =>
    s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) ||
    (s.nis && s.nis.includes(searchSiswa))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kegiatan_id || !formData.wali_kelas_id) {
      alert('Mohon pilih Nama Kegiatan dan Wali Kelas terlebih dahulu');
      return;
    }

    if (siswaList.length === 0) {
      alert('Daftar siswa untuk kelas ini kosong. Silakan pilih kelas lain atau klik Tambah Siswa.');
      return;
    }

    try {
      setSubmitting(true);

      const studentIds = siswaList.map(s => s.siswa_id);
      let existingRecords: any[] = [];
      if (supabase) {
        const { data: exData } = await supabase
          .from('agama_absensi')
          .select('id, siswa_id, tanggal, kegiatan_id')
          .in('siswa_id', studentIds)
          .eq('tanggal', formData.tanggal)
          .eq('kegiatan_id', formData.kegiatan_id);
        if (exData) existingRecords = exData;
      }

      const toUpsert = siswaList.map(s => {
        const existing = existingRecords.find(ex => ex.siswa_id === s.siswa_id);
        const payload: any = {
          siswa_id: s.siswa_id,
          tanggal: formData.tanggal,
          jam: formData.jam,
          kegiatan_id: formData.kegiatan_id,
          wali_kelas_id: formData.wali_kelas_id,
          alasan: s.absensi
        };
        if (existing) {
          payload.id = existing.id;
        }
        return payload;
      });

      if (supabase) {
        const { error } = await supabase
          .from('agama_absensi')
          .upsert(toUpsert);
        if (error) throw error;
      }

      alert(`Berhasil menyimpan presensi kegiatan keagamaan untuk ${toUpsert.length} siswa kelas ${formData.kelas}`);
      setEditingId(null);
      setEditingStudentName('');
      fetchAbsensi();
    } catch (error: any) {
      console.error('Error saving absensi:', error);
      alert(`Gagal menyimpan absensi: ${error.message || 'Pastikan tabel agama_absensi sudah dibuat di Supabase'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (abs: AgamaAbsensi) => {
    setEditingId(abs.id);
    setEditingStudentName(abs.siswa?.nama || 'Siswa');
    setFormData(prev => ({
      ...prev,
      siswa_id: abs.siswa_id,
      tanggal: abs.tanggal,
      jam: abs.jam,
      kegiatan_id: abs.kegiatan_id,
      wali_kelas_id: abs.wali_kelas_id,
      alasan: abs.alasan,
      kelas: abs.siswa?.kelas || prev.kelas
    }));
    setSearchSiswa(abs.siswa?.nama || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSingleUpdate = async () => {
    if (!editingId) return;
    try {
      setSubmitting(true);
      if (!supabase) return;
      const { error } = await supabase
        .from('agama_absensi')
        .update({
          tanggal: formData.tanggal,
          jam: formData.jam,
          kegiatan_id: formData.kegiatan_id,
          wali_kelas_id: formData.wali_kelas_id,
          alasan: formData.alasan
        })
        .eq('id', editingId);

      if (error) throw error;
      alert(`Berhasil memperbarui data presensi untuk ${editingStudentName}`);
      setEditingId(null);
      setEditingStudentName('');
      fetchAbsensi();
    } catch (err: any) {
      alert(`Gagal memperbarui data: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data absensi ini?')) return;
    try {
      const { error } = await supabase
        .from('agama_absensi')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchAbsensi();
    } catch (error) {
      console.error('Error deleting absensi:', error);
      alert('Gagal menghapus absensi');
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const failedRows: string[] = [];
        const mappedData = data.map((row: any, index: number) => {
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim());
              if (foundKey) return String(row[foundKey]).trim();
            }
            return '';
          };

          const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();

          const namaSiswa = getValue(['nama', 'nama siswa', 'siswa']);
          const kelasSiswa = getValue(['kelas']);
          const namaKegiatan = getValue(['kegiatan', 'nama kegiatan']);
          const namaGuru = getValue(['wali kelas', 'guru', 'wali']);
          const tanggal = getValue(['tanggal']);
          const jam = getValue(['jam']);
          let alasan = getValue(['alasan', 'keterangan']) || 'Hadir';

          if (!namaSiswa && !kelasSiswa) return null; // Skip empty rows

          // Handle common variations/typos
          if (alasan.toLowerCase() === 'alpha') alasan = 'Alpa';

          const student = students.find(s => 
            normalize(s.nama) === normalize(namaSiswa) && 
            normalize(String(s.kelas)) === normalize(String(kelasSiswa))
          );
          const program = programs.find(p => normalize(p.nama_kegiatan) === normalize(namaKegiatan));
          const teacher = teachers.find(t => normalize(t.nama_guru) === normalize(namaGuru));

          if (!student || !program || !teacher) {
            const missing = [];
            if (!student) missing.push(`Siswa "${namaSiswa}" Kelas "${kelasSiswa}"`);
            if (!program) missing.push(`Kegiatan "${namaKegiatan}"`);
            if (!teacher) missing.push(`Wali Kelas "${namaGuru}"`);
            
            failedRows.push(`Baris ${index + 2}: ${missing.join(', ')} tidak ditemukan di data master.`);
            return null;
          }

          let formattedDate = format(new Date(), 'yyyy-MM-dd');
          if (tanggal) {
            try {
              const d = new Date(tanggal);
              if (!isNaN(d.getTime())) {
                formattedDate = format(d, 'yyyy-MM-dd');
              } else if (typeof tanggal === 'number') {
                const excelDate = new Date((tanggal - 25569) * 86400 * 1000);
                formattedDate = format(excelDate, 'yyyy-MM-dd');
              }
            } catch (e) {}
          }

          return {
            siswa_id: student.id,
            kegiatan_id: program.id,
            wali_kelas_id: teacher.id,
            tanggal: formattedDate,
            jam: jam || format(new Date(), 'HH.mm'),
            alasan: reasons.find(r => normalize(r.label) === normalize(alasan))?.id || 
                    reasons.find(r => normalize(r.id) === normalize(alasan))?.id || 
                    'Hadir'
          };
        }).filter(Boolean);

        if (mappedData.length === 0) {
          let errorMsg = 'Tidak ada data valid untuk diupload.\n\nBeberapa masalah yang ditemukan:\n';
          errorMsg += failedRows.slice(0, 5).join('\n');
          if (failedRows.length > 5) errorMsg += `\n...dan ${failedRows.length - 5} baris lainnya.`;
          errorMsg += '\n\nPastikan penulisan Nama, Kelas, Kegiatan, dan Wali Kelas sama persis dengan yang ada di Data Master.';
          alert(errorMsg);
          return;
        }

        if (failedRows.length > 0) {
          const proceed = confirm(`${mappedData.length} data valid ditemukan, tetapi ${failedRows.length} baris bermasalah.\n\nContoh masalah:\n${failedRows.slice(0, 3).join('\n')}\n\nLanjutkan upload data yang valid saja?`);
          if (!proceed) return;
        }

        // Implement "Tindih" (Overwrite) logic
        // We'll process in chunks to avoid payload limits and handle upsert manually if needed
        // But Supabase upsert with onConflict is best if we have a unique constraint.
        // Since we might not have one, we'll do it by checking existing records.
        
        setSubmitting(true);
        let successCount = 0;
        let errorCount = 0;

        // Fetch existing records for the students and dates to check for duplicates
        const studentIds = [...new Set(mappedData.map(d => d.siswa_id))];
        const dates = [...new Set(mappedData.map(d => d.tanggal))];

        const { data: existingRecords } = await supabase
          .from('agama_absensi')
          .select('id, siswa_id, tanggal, kegiatan_id')
          .in('siswa_id', studentIds)
          .in('tanggal', dates);

        const toUpsert = mappedData.map(newItem => {
          const existing = existingRecords?.find(ex => 
            ex.siswa_id === newItem.siswa_id && 
            ex.tanggal === newItem.tanggal && 
            ex.kegiatan_id === newItem.kegiatan_id
          );
          if (existing) {
            return { ...newItem, id: existing.id }; // Include ID to trigger update
          }
          return newItem;
        });

        // Perform upsert
        const { error: upsertError } = await supabase
          .from('agama_absensi')
          .upsert(toUpsert);

        if (upsertError) throw upsertError;

        alert(`Berhasil memproses ${toUpsert.length} data (Termasuk update data yang sudah ada).`);
        fetchAbsensi();
      } catch (error: any) {
        console.error('Upload error:', error);
        alert('Error processing upload: ' + error.message);
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredAbsensi = absensiList.filter(abs => {
    const matchesSearch = abs.siswa?.nama.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKelas = filterKelas ? abs.siswa?.kelas === filterKelas : true;
    const matchesKeterangan = filterKeterangan ? abs.alasan === filterKeterangan : true;
    return matchesSearch && matchesKelas && matchesKeterangan;
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Form Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[40px] p-2 shadow-xl shadow-emerald-900/10">
        <div className="p-8 sm:p-10 text-white">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">Formulir Presensi Kegiatan Keagamaan</h2>
          <p className="text-emerald-100/80 font-medium tracking-wide">
            Kelola presensi, absensi, dan nilai kegiatan keagamaan siswa secara terpadu per kelas
          </p>
        </div>
        
        <div className="bg-white m-2 rounded-[32px] p-6 sm:p-10">
          {editingId && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={20} />
                <span className="text-xs sm:text-sm font-bold text-amber-800">
                  Mode Edit Riwayat: Mengubah presensi untuk <strong>{editingStudentName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSingleUpdate}
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Perbarui Baris Ini Saja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditingStudentName('');
                    setSearchSiswa('');
                  }}
                  className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1"
                >
                  <X size={14} /> Batal
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tanggal Kegiatan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tanggal Kegiatan</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="date"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  />
                </div>
              </div>

              {/* Jam Pelaksanaan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Jam Pelaksanaan</label>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    placeholder="Contoh: 07.30"
                    value={formData.jam}
                    onChange={e => setFormData({ ...formData, jam: e.target.value })}
                  />
                </div>
              </div>

              {/* Pilih Periode */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Periode</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={filterPeriode}
                    onChange={e => setFilterPeriode(e.target.value)}
                  >
                    <option value="ALL">Semua Periode</option>
                    {availablePeriodes.map(p => <option key={p} value={p}>Periode {p}</option>)}
                  </select>
                </div>
              </div>

              {/* Pilih Kelas */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Kelas</label>
                <div className="relative group">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={formData.kelas}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Nama Kegiatan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nama Kegiatan</label>
                <div className="relative group">
                  <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={formData.kegiatan_id}
                    onChange={e => setFormData({ ...formData, kegiatan_id: e.target.value })}
                  >
                    <option value="">-- Pilih Kegiatan --</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nama_kegiatan}</option>)}
                  </select>
                </div>
              </div>

              {/* Wali Kelas */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Wali Kelas / Guru Pengampu</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white text-sm"
                    value={formData.wali_kelas_id}
                    onChange={e => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                  >
                    <option value="">-- Pilih Wali Kelas / Guru --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.nama_guru}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* DAFTAR SISWA SECTION (SESUAI GAMBAR TERLAMPIR) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {/* Header Box */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
                    <Users size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                        Daftar Siswa Kelas {formData.kelas || '7A'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                        Periode {filterPeriode === 'ALL' ? '2026' : filterPeriode}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({siswaList.length} Siswa)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Menampilkan siswa periode baru ({filterPeriode === 'ALL' ? '2026' : filterPeriode}) saja agar data tidak ganda antar tahun ajaran.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={handleSetAllHadir}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Check size={16} className="text-emerald-600" /> Set Semua Hadir
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualStudent}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={16} /> Tambah Siswa
                  </button>
                </div>
              </div>

              {/* 4 Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Hadir (H)</span>
                  <span className="text-xl font-black text-emerald-700">{countHadir}</span>
                </div>
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">Sakit (S)</span>
                  <span className="text-xl font-black text-amber-700">{countSakit}</span>
                </div>
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800">Izin (I)</span>
                  <span className="text-xl font-black text-blue-700">{countIzin}</span>
                </div>
                <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-100/90 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">Alpa (A)</span>
                  <span className="text-xl font-black text-rose-700">{countAlpa}</span>
                </div>
              </div>

              {countHaid > 0 && (
                <div className="p-2.5 bg-pink-50 rounded-xl border border-pink-200 flex items-center gap-2 text-xs text-pink-700 font-bold">
                  <span>Haid (Tidak Sholat):</span>
                  <span className="px-2 py-0.5 bg-pink-200 text-pink-800 rounded-lg">{countHaid} Siswi</span>
                </div>
              )}

              {/* Search in student list */}
              <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa di kelas..."
                  value={searchSiswa}
                  onChange={e => setSearchSiswa(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
                />
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3 min-w-[180px]">Nama Siswa</th>
                      <th className="p-3 text-center min-w-[210px]">Absensi</th>
                      <th className="p-3 text-center w-20">Nilai</th>
                      <th className="p-3 min-w-[180px]">Catatan Siswa</th>
                      <th className="p-3 min-w-[180px]">Tindakan Guru</th>
                      <th className="p-3 text-center w-10">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSiswaTable.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          {siswaList.length === 0
                            ? `Tidak ada siswa untuk Kelas ${formData.kelas} (${filterPeriode === 'ALL' ? 'Semua Periode' : `Periode ${filterPeriode}`}). Klik "+ Tambah Siswa" untuk menambahkan secara manual.`
                            : `Tidak ditemukan siswa yang cocok dengan pencarian "${searchSiswa}".`}
                        </td>
                      </tr>
                    ) : (
                      filteredSiswaTable.map((siswa) => {
                        const actualIdx = siswaList.findIndex(item => item.siswa_id === siswa.siswa_id);

                        return (
                          <tr key={siswa.siswa_id || actualIdx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 text-center font-medium text-slate-400">{actualIdx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 uppercase tracking-tight flex items-center flex-wrap gap-1.5">
                                <span>{siswa.nama}</span>
                                {siswa.sudah_izin && (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300 normal-case"
                                    title={siswa.keterangan_izin || 'Izin Form Wali Murid'}
                                  >
                                    <UserCheck size={11} /> {siswa.keterangan_izin || 'Izin Form Wali Murid'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                                {siswa.nis && <span>NIS: {siswa.nis}</span>}
                                {siswa.periode && (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200/60">
                                    Periode {siswa.periode}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Absensi Segmented Buttons */}
                            <td className="p-3 text-center">
                              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 gap-1 items-center">
                                {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((status) => {
                                  const isSelected = siswa.absensi === status;
                                  let activeClass = '';
                                  if (isSelected) {
                                    if (status === 'Hadir') activeClass = 'bg-emerald-600 text-white shadow-xs';
                                    else if (status === 'Sakit') activeClass = 'bg-amber-500 text-white shadow-xs';
                                    else if (status === 'Izin') activeClass = 'bg-blue-600 text-white shadow-xs';
                                    else if (status === 'Alpa') activeClass = 'bg-rose-600 text-white shadow-xs';
                                  } else {
                                    activeClass = 'text-slate-500 hover:text-slate-800 hover:bg-white/60';
                                  }

                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => handleUpdateStudent(actualIdx, 'absensi', status)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${activeClass}`}
                                      title={status}
                                    >
                                      {status[0]}
                                    </button>
                                  );
                                })}

                                {/* Optional Haid button for religious screening */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStudent(actualIdx, 'absensi', siswa.absensi === 'Haid' ? 'Hadir' : 'Haid')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    siswa.absensi === 'Haid'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-rose-400 hover:text-rose-700 hover:bg-rose-50'
                                  }`}
                                  title="Haid (Tidak Sholat)"
                                >
                                  Haid
                                </button>
                              </div>
                            </td>

                            {/* Nilai */}
                            <td className="p-3 text-center">
                              <input
                                type="text"
                                placeholder="Nilai"
                                value={siswa.nilai || ''}
                                onChange={e => handleUpdateStudent(actualIdx, 'nilai', e.target.value)}
                                className="w-16 px-2 py-1.5 text-center font-bold text-slate-800 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs"
                              />
                            </td>

                            {/* Catatan Siswa */}
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Catatan perilaku/keaktifan"
                                value={siswa.catatan_siswa || ''}
                                onChange={e => handleUpdateStudent(actualIdx, 'catatan_siswa', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs"
                              />
                            </td>

                            {/* Tindakan Guru */}
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Tindakan/solusi guru..."
                                value={siswa.tindakan || ''}
                                onChange={e => handleUpdateStudent(actualIdx, 'tindakan', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs"
                              />
                            </td>

                            {/* Hapus Baris */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(actualIdx)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                title="Hapus siswa dari daftar ini"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditingStudentName('');
                  }}
                  className="px-8 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <X size={20} /> Batal
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-10 py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={20} />
                )}
                {editingId ? 'Simpan Seluruh Kelas' : `Simpan Presensi Kelas (${siswaList.length} Siswa)`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800">Riwayat Absensi Terbaru</h3>
            <p className="text-sm text-slate-400">Menampilkan 50 data terakhir</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Template Absensi');
                worksheet.columns = [
                  { header: 'Nama Siswa', key: 'nama', width: 30 },
                  { header: 'Kelas', key: 'kelas', width: 10 },
                  { header: 'Kegiatan', key: 'kegiatan', width: 25 },
                  { header: 'Wali Kelas', key: 'wali_kelas', width: 30 },
                  { header: 'Tanggal', key: 'tanggal', width: 15 },
                  { header: 'Jam', key: 'jam', width: 10 },
                  { header: 'Alasan', key: 'alasan', width: 15 }
                ];
                
                // Add example row
                worksheet.addRow({
                  nama: 'Contoh Nama Siswa',
                  kelas: '7A',
                  kegiatan: 'Pondok Ramadhan',
                  wali_kelas: 'Nama Guru Wali Kelas',
                  tanggal: '2026-04-11',
                  jam: '07.30',
                  alasan: 'Hadir'
                });

                workbook.xlsx.writeBuffer().then(buffer => {
                  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Template_Upload_Keagamaan.xlsx';
                  a.click();
                  window.URL.revokeObjectURL(url);
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
            >
              <Download size={16} />
              <span>Template</span>
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold cursor-pointer hover:bg-emerald-100 transition-all">
              <Upload size={16} />
              <span>Upload Data</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
            <div className="flex items-center gap-2">
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-bold text-slate-600"
              >
                <option value="">Semua Kelas</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterKeterangan}
                onChange={(e) => setFilterKeterangan(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-bold text-slate-600"
              >
                <option value="">Semua Keterangan</option>
                {reasons.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari nama..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Siswa</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kegiatan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keterangan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Memuat data...</td>
                </tr>
              ) : filteredAbsensi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Data tidak ditemukan.</td>
                </tr>
              ) : (
                filteredAbsensi.map(abs => (
                  <tr key={abs.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                          {abs.siswa?.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{abs.siswa?.nama}</p>
                          <p className="text-xs text-slate-400">Kelas {abs.siswa?.kelas}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">
                        {abs.kegiatan?.nama_kegiatan}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-600">{format(new Date(abs.tanggal), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-slate-400">{abs.jam}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        abs.alasan === 'Hadir' ? 'bg-emerald-50 text-emerald-600' :
                        abs.alasan === 'Haid' ? 'bg-rose-50 text-rose-600' :
                        abs.alasan === 'Alpa' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {abs.alasan}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(abs)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(abs.id)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
};

export default KeagamaanAbsensi;
