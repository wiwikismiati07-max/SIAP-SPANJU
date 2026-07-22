import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, Search, Plus, Upload, Download, Trash2, Edit, Save, X, 
  FileSpreadsheet, Filter, Calendar, RefreshCw, CheckCircle, AlertCircle,
  Database, GraduationCap, Copy, Code, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface SiswaData {
  id: string;
  nama: string;
  kelas: string;
  periode: string;
  nis?: string;
  jenis_kelamin?: string;
  created_at?: string;
}

const DEFAULT_CLASSES = [
  ...Array.from({ length: 8 }, (_, i) => `7${String.fromCharCode(65 + i)}`),
  ...Array.from({ length: 8 }, (_, i) => `8${String.fromCharCode(65 + i)}`),
  ...Array.from({ length: 8 }, (_, i) => `9${String.fromCharCode(65 + i)}`)
];

export default function ManagementSiswaApp() {
  const [students, setStudents] = useState<SiswaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriode, setSelectedPeriode] = useState<string>('ALL');
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2025']);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<SiswaData>>({
    nama: '',
    kelas: '7A',
    periode: '2025',
    nis: '',
    jenis_kelamin: 'L'
  });
  const [editingStudent, setEditingStudent] = useState<SiswaData | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<SiswaData | null>(null);

  // Upload Excel State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [defaultUploadPeriode, setDefaultUploadPeriode] = useState('2025');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const normalizeKelas = (kls: string = ''): string => {
    if (!kls) return '7A';
    let cleaned = kls.toString().toUpperCase().trim();
    cleaned = cleaned.replace(/^KELAS\s*/i, '');
    cleaned = cleaned.replace(/[\s\-_]+/g, '');
    if (cleaned.startsWith('VII') && !cleaned.startsWith('VIII')) cleaned = cleaned.replace(/^VII/, '7');
    else if (cleaned.startsWith('VIII')) cleaned = cleaned.replace(/^VIII/, '8');
    else if (cleaned.startsWith('IX')) cleaned = cleaned.replace(/^IX/, '9');
    return cleaned || '7A';
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let supaData: SiswaData[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('master_siswa')
          .select('*')
          .order('periode', { ascending: false })
          .order('kelas', { ascending: true })
          .order('nama', { ascending: true });

        if (error) {
          console.warn('Error fetching master_siswa from Supabase, relying on hybrid merge:', error.message);
        } else if (data) {
          supaData = data.map(s => ({
            ...s,
            kelas: normalizeKelas(s.kelas),
            periode: (s.periode || '2025').toString().trim()
          }));
        }
      }

      // Always load local students as well
      const saved = localStorage.getItem('sitelat_siswa');
      let localData: SiswaData[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localData = parsed.map((s: any) => ({
            id: s.id || crypto.randomUUID(),
            nama: (s.nama || '').trim(),
            kelas: normalizeKelas(s.kelas || '7A'),
            periode: (s.periode || '2025').toString().trim(),
            nis: (s.nis || '').toString().trim(),
            jenis_kelamin: (s.jenis_kelamin || '').toString().trim().toUpperCase()
          }));
        } catch (e) {
          console.error('Error parsing local storage:', e);
        }
      }

      // Merge Supabase and Local storage seamlessly by ID or Name+Kelas+Periode
      const map = new Map<string, SiswaData>();
      localData.forEach(s => {
        if (s.nama) {
          const key = s.id ? s.id : `${s.nama.toLowerCase()}_${s.kelas}_${s.periode}`;
          map.set(key, s);
        }
      });
      supaData.forEach(s => {
        if (s.nama) {
          const key = s.id ? s.id : `${s.nama.toLowerCase()}_${s.kelas}_${s.periode}`;
          map.set(key, s);
        }
      });

      const combined = Array.from(map.values());

      // Save combined back to localStorage
      if (combined.length > 0) {
        localStorage.setItem('sitelat_siswa', JSON.stringify(combined));
      }

      setStudents(combined);
      extractPeriodes(combined);
    } catch (err) {
      console.error('Fetch error:', err);
      loadLocalStudents();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalStudents = () => {
    const saved = localStorage.getItem('sitelat_siswa');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized = parsed.map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          nama: (s.nama || '').trim(),
          kelas: normalizeKelas(s.kelas || '7A'),
          periode: (s.periode || '2025').toString().trim(),
          nis: (s.nis || '').toString().trim(),
          jenis_kelamin: (s.jenis_kelamin || '').toString().trim().toUpperCase()
        }));
        setStudents(normalized);
        extractPeriodes(normalized);
      } catch (e) {
        setStudents([]);
      }
    } else {
      setStudents([]);
    }
  };

  const extractPeriodes = (list: SiswaData[]) => {
    const periodsSet = new Set<string>();
    periodsSet.add('2025');
    list.forEach(s => {
      if (s.periode) periodsSet.add(s.periode.toString().trim());
    });
    const sorted = Array.from(periodsSet).sort((a, b) => b.localeCompare(a));
    setAvailablePeriodes(sorted);
  };

  // Filter logic
  const filteredStudents = students.filter(s => {
    const sPeriode = (s.periode || '2025').toString().trim();
    const sKelas = normalizeKelas(s.kelas);

    const matchesPeriode = selectedPeriode === 'ALL' || 
      sPeriode === selectedPeriode.trim() || 
      sPeriode.includes(selectedPeriode) || 
      selectedPeriode.includes(sPeriode);

    const matchesKelas = selectedKelas === 'ALL' || sKelas === normalizeKelas(selectedKelas);

    const matchesSearch = !searchTerm.trim() ||
      s.nama.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase().trim()));

    return matchesPeriode && matchesKelas && matchesSearch;
  });

  // Handle Add Student
  const handleSaveNew = async () => {
    if (!formData.nama?.trim()) {
      alert('Nama siswa harus diisi!');
      return;
    }

    const newStudent: SiswaData = {
      id: crypto.randomUUID(),
      nama: formData.nama.trim(),
      kelas: formData.kelas || '7A',
      periode: formData.periode?.trim() || '2025',
      nis: formData.nis?.trim() || '',
      jenis_kelamin: formData.jenis_kelamin || 'L'
    };

    setLoading(true);
    try {
      if (supabase) {
        const { error } = await supabase.from('master_siswa').upsert([newStudent], { onConflict: 'id' });
        if (error) {
          console.warn('Error saving new student (full payload):', error.message);
          const { error: basicError } = await supabase.from('master_siswa').upsert([{
            id: newStudent.id,
            nama: newStudent.nama,
            kelas: newStudent.kelas,
            periode: newStudent.periode
          }], { onConflict: 'id' });
          if (basicError) {
            console.warn('Error saving new student (basic payload):', basicError.message);
            await supabase.from('master_siswa').insert([{
              nama: newStudent.nama,
              kelas: newStudent.kelas,
              periode: newStudent.periode
            }]);
          }
        }
      }
      
      const updatedList = [newStudent, ...students];
      setStudents(updatedList);
      localStorage.setItem('sitelat_siswa', JSON.stringify(updatedList));
      extractPeriodes(updatedList);

      setShowAddModal(false);
      setFormData({ nama: '', kelas: '7A', periode: '2025', nis: '', jenis_kelamin: 'L' });
      alert('Siswa berhasil ditambahkan!');
    } catch (err: any) {
      alert('Gagal menambah siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit Student
  const handleOpenEdit = (s: SiswaData) => {
    setEditingStudent(s);
    setFormData({
      nama: s.nama,
      kelas: s.kelas,
      periode: s.periode || '2025',
      nis: s.nis || '',
      jenis_kelamin: s.jenis_kelamin || 'L'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent || !formData.nama?.trim()) return;

    const updatedStudent: SiswaData = {
      ...editingStudent,
      nama: formData.nama.trim(),
      kelas: formData.kelas || editingStudent.kelas,
      periode: formData.periode?.trim() || editingStudent.periode || '2025',
      nis: formData.nis?.trim() || '',
      jenis_kelamin: formData.jenis_kelamin || 'L'
    };

    setLoading(true);
    try {
      if (supabase) {
        const { error } = await supabase
          .from('master_siswa')
          .update({
            nama: updatedStudent.nama,
            kelas: updatedStudent.kelas,
            periode: updatedStudent.periode,
            nis: updatedStudent.nis,
            jenis_kelamin: updatedStudent.jenis_kelamin
          })
          .eq('id', editingStudent.id);

        if (error) {
          console.warn('Error updating student (full payload):', error.message);
          await supabase
            .from('master_siswa')
            .update({
              nama: updatedStudent.nama,
              kelas: updatedStudent.kelas,
              periode: updatedStudent.periode
            })
            .eq('id', editingStudent.id);
        }
      }

      const updatedList = students.map(s => s.id === editingStudent.id ? updatedStudent : s);
      setStudents(updatedList);
      localStorage.setItem('sitelat_siswa', JSON.stringify(updatedList));
      extractPeriodes(updatedList);

      setShowEditModal(false);
      setEditingStudent(null);
      alert('Data siswa berhasil diperbarui!');
    } catch (err: any) {
      alert('Gagal memperbarui data siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Student
  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;

    setLoading(true);
    try {
      if (supabase) {
        const { error } = await supabase.from('master_siswa').delete().eq('id', deletingStudent.id);
        if (error) throw error;
      }

      const updatedList = students.filter(s => s.id !== deletingStudent.id);
      setStudents(updatedList);
      localStorage.setItem('sitelat_siswa', JSON.stringify(updatedList));
      extractPeriodes(updatedList);

      setShowDeleteModal(false);
      setDeletingStudent(null);
      alert('Siswa berhasil dihapus!');
    } catch (err: any) {
      alert('Gagal menghapus siswa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Excel Upload Parsing
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 1) {
          alert('File Excel kosong!');
          return;
        }

        // Detect headers by scanning first 10 rows
        let headerRowIdx = -1;
        let idxNama = -1, idxKelas = -1, idxPeriode = -1, idxNis = -1, idxJk = -1;

        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const rowArr = (rows[r] as any[] || []).map(h => (h || '').toString().toLowerCase().trim());
          const namaIdx = rowArr.findIndex(h => h.includes('nama') || h.includes('siswa') || h.includes('student') || h === 'nama');
          const kelasIdx = rowArr.findIndex(h => h.includes('kelas') || h.includes('rombel') || h.includes('kls') || h.includes('class'));

          if (namaIdx !== -1 || kelasIdx !== -1) {
            headerRowIdx = r;
            idxNama = namaIdx;
            idxKelas = kelasIdx;
            idxPeriode = rowArr.findIndex(h => h.includes('periode') || h.includes('tahun') || h.includes('thn') || h.includes('ajaran') || h.includes('tp'));
            idxNis = rowArr.findIndex(h => h.includes('nis') || h.includes('induk') || h.includes('nisn'));
            idxJk = rowArr.findIndex(h => h.includes('jenis') || h.includes('jk') || h.includes('gender') || h.includes('l/p') || h.includes('sex'));
            break;
          }
        }

        // Fallback if header not detected
        if (headerRowIdx === -1) {
          headerRowIdx = 0;
          idxNama = 0;
          idxKelas = 1;
          idxPeriode = 2;
        }

        const parsed: any[] = [];
        const startRow = headerRowIdx + 1;

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (!row || row.length === 0) continue;

          const rawNama = idxNama !== -1 && row[idxNama] !== undefined ? row[idxNama] : row[0];
          const rawKelas = idxKelas !== -1 && row[idxKelas] !== undefined ? row[idxKelas] : row[1];
          const rawPeriode = idxPeriode !== -1 && row[idxPeriode] !== undefined ? row[idxPeriode] : (row[2] || defaultUploadPeriode);
          const rawNis = idxNis !== -1 && row[idxNis] !== undefined ? row[idxNis] : '';
          const rawJk = idxJk !== -1 && row[idxJk] !== undefined ? row[idxJk] : '';

          if (rawNama && rawNama.toString().trim()) {
            const strNama = rawNama.toString().trim();
            // Skip header repetitions
            if (strNama.toLowerCase() === 'nama' || strNama.toLowerCase() === 'nama siswa' || strNama.toLowerCase() === 'no') {
              continue;
            }

            const normKelas = normalizeKelas(rawKelas ? rawKelas.toString() : '7A');
            const normPeriode = rawPeriode ? rawPeriode.toString().trim() : defaultUploadPeriode;

            parsed.push({
              nama: strNama,
              kelas: normKelas,
              periode: normPeriode,
              nis: rawNis ? rawNis.toString().trim() : '',
              jenis_kelamin: rawJk ? rawJk.toString().trim().toUpperCase() : 'L'
            });
          }
        }

        if (parsed.length === 0) {
          alert('Tidak ada data siswa valid yang ditemukan di file Excel ini!');
          return;
        }

        setUploadPreview(parsed);
      } catch (err: any) {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImportExcel = async () => {
    if (uploadPreview.length === 0) {
      alert('Tidak ada data siswa untuk diimport!');
      return;
    }

    setIsProcessingUpload(true);
    setUploadSuccessMsg('');

    try {
      const recordsToInsert = uploadPreview.map(item => ({
        id: crypto.randomUUID(),
        nama: item.nama,
        kelas: item.kelas,
        periode: item.periode || defaultUploadPeriode,
        nis: item.nis || '',
        jenis_kelamin: item.jenis_kelamin || 'L'
      }));

      if (supabase) {
        // Batch upsert to Supabase in chunks of 50 with robust schema fallbacks
        const chunkSize = 50;
        for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
          const chunk = recordsToInsert.slice(i, i + chunkSize);
          
          // 1. Try full payload
          const { error: fullError } = await supabase.from('master_siswa').upsert(chunk, { onConflict: 'id' });
          
          if (fullError) {
            console.warn('Batch insert error (full payload):', fullError.message || fullError);
            
            // 2. Fallback: try basic payload (id, nama, kelas, periode) if nis/jenis_kelamin columns are missing
            const basicChunk = chunk.map(c => ({
              id: c.id,
              nama: c.nama,
              kelas: c.kelas,
              periode: c.periode
            }));
            
            const { error: basicError } = await supabase.from('master_siswa').upsert(basicChunk, { onConflict: 'id' });
            
            if (basicError) {
              console.warn('Batch insert error (basic payload):', basicError.message || basicError);
              
              // 3. Fallback: try insert without ID (auto-gen ID)
              const noIdChunk = chunk.map(c => ({
                nama: c.nama,
                kelas: c.kelas,
                periode: c.periode
              }));
              const { error: noIdError } = await supabase.from('master_siswa').insert(noIdChunk);
              if (noIdError) {
                console.warn('Batch insert error (no-id payload):', noIdError.message || noIdError);
              }
            }
          }
        }
      }

      // Merge into local list without duplicates
      const map = new Map<string, SiswaData>();
      students.forEach(s => {
        const key = `${s.nama.toLowerCase()}_${s.kelas}_${s.periode}`;
        map.set(key, s);
      });
      recordsToInsert.forEach(s => {
        const key = `${s.nama.toLowerCase()}_${s.kelas}_${s.periode}`;
        map.set(key, s);
      });

      const combined = Array.from(map.values());
      setStudents(combined);
      localStorage.setItem('sitelat_siswa', JSON.stringify(combined));
      extractPeriodes(combined);

      // Auto reset filters so newly uploaded students immediately show up
      setSelectedPeriode('ALL');
      setSelectedKelas('ALL');
      setSearchTerm('');

      setUploadSuccessMsg(`Berhasil mengimpor ${recordsToInsert.length} data siswa! Total data siswa tersimpan: ${combined.length}`);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPreview([]);
        setUploadSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      alert('Gagal menyimpan data ke database: ' + err.message);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      { 'Nama Siswa': 'Ahmad Fauzi', 'Kelas': '7A', 'Periode': '2025', 'NIS': '2025001', 'Jenis Kelamin': 'L' },
      { 'Nama Siswa': 'Siti Aminah', 'Kelas': '7B', 'Periode': '2025', 'NIS': '2025002', 'Jenis Kelamin': 'P' },
      { 'Nama Siswa': 'Budi Santoso', 'Kelas': '8A', 'Periode': '2026', 'NIS': '2026001', 'Jenis Kelamin': 'L' }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Nama
      { wch: 10 }, // Kelas
      { wch: 15 }, // Periode
      { wch: 15 }, // NIS
      { wch: 15 }  // Jenis Kelamin
    ];

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Template_Upload_Siswa.xlsx');
  };

  // Export Filtered Student Data to Excel
  const handleExportData = () => {
    if (filteredStudents.length === 0) {
      alert('Tidak ada data siswa untuk diexport!');
      return;
    }

    const exportRows = filteredStudents.map((s, idx) => ({
      'NO': idx + 1,
      'NAMA SISWA': s.nama,
      'KELAS': s.kelas,
      'PERIODE': s.periode || '2025',
      'NIS': s.nis || '-',
      'JENIS KELAMIN': s.jenis_kelamin || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');

    ws['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Data_Siswa_Periode_${selectedPeriode}_Kelas_${selectedKelas}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-8 -translate-y-8">
          <GraduationCap size={280} />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider uppercase mb-3">
            <Database size={14} /> Database Induk Siswa
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
            MANAGEMENT SISWA & PERIODE
          </h1>
          <p className="text-blue-100 max-w-2xl text-sm sm:text-base font-medium">
            Kelola data siswa berdasarkan Tahun Ajaran / Periode (2025, 2026, dst). Data siswa periode lama tidak hilang dan tersimpan aman.
          </p>
        </div>
      </div>

      {/* Stats Quick Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa (Filtered)</p>
            <p className="text-2xl font-black text-slate-800">{filteredStudents.length} <span className="text-xs font-medium text-slate-400">/ {students.length} total</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Periode Terdaftar</p>
            <p className="text-2xl font-black text-slate-800">{availablePeriodes.length} <span className="text-xs font-medium text-slate-400">Tahun Ajaran</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilihan Kelas</p>
            <p className="text-2xl font-black text-slate-800">24 <span className="text-xs font-medium text-slate-400">Rombel (7A - 9H)</span></p>
          </div>
        </div>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Periode Selector */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 pl-2 flex items-center gap-1">
                <Calendar size={14} /> Periode:
              </span>
              <select
                value={selectedPeriode}
                onChange={(e) => setSelectedPeriode(e.target.value)}
                className="bg-white text-slate-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Periode</option>
                {availablePeriodes.map(p => (
                  <option key={p} value={p}>Periode {p}</option>
                ))}
              </select>
            </div>

            {/* Kelas Selector */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 pl-2 flex items-center gap-1">
                <Filter size={14} /> Kelas:
              </span>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="bg-white text-slate-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Kelas (7A-9H)</option>
                {DEFAULT_CLASSES.map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari nama atau NIS siswa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFormData({ nama: '', kelas: '7A', periode: selectedPeriode !== 'ALL' ? selectedPeriode : '2025', nis: '', jenis_kelamin: 'L' });
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus size={16} /> Tambah Siswa
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Upload size={16} /> Upload Excel
            </button>

            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
              title="Export Ke Excel"
            >
              <Download size={16} /> Export
            </button>

            <button
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95"
              title="Lihat Kode SQL Supabase"
            >
              <Code size={16} /> Script SQL
            </button>

            <button
              onClick={fetchStudents}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 w-16">No</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Periode</th>
                <th className="px-6 py-4">NIS</th>
                <th className="px-6 py-4">Jenis Kelamin</th>
                <th className="px-6 py-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-700 text-sm mb-1">
                      Tidak ada data siswa untuk filter Periode [{selectedPeriode}] & Kelas [{selectedKelas}].
                    </p>
                    {students.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs text-slate-500 mb-2">
                          Ada <span className="font-bold text-blue-600">{students.length}</span> data siswa tersimpan di periode/kelas lain.
                        </p>
                        <button
                          onClick={() => { setSelectedPeriode('ALL'); setSelectedKelas('ALL'); setSearchTerm(''); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                        >
                          <RefreshCw size={14} /> Tampilkan Semua Siswa ({students.length} Total Data)
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">
                        Silakan klik tombol <b>Upload Excel</b> atau <b>Tambah Siswa</b> untuk memasukkan data siswa.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-800">{s.nama}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-md text-[11px] border border-blue-100">
                        Kelas {s.kelas}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold rounded-md text-[11px] border border-indigo-100">
                        Periode {s.periode || '2025'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono">{s.nis || '-'}</td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {s.jenis_kelamin === 'L' ? 'Laki-laki' : s.jenis_kelamin === 'P' ? 'Perempuan' : s.jenis_kelamin || '-'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                          title="Edit Siswa"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingStudent(s);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          title="Hapus Siswa"
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

      {/* Modal Tambah Siswa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Plus className="text-blue-600" size={20} /> Tambah Siswa Baru
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Siswa *</label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap siswa"
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas *</label>
                  <select
                    value={formData.kelas || '7A'}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DEFAULT_CLASSES.map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Periode / Tahun *</label>
                  <input
                    type="text"
                    placeholder="Contoh: 2025"
                    value={formData.periode || '2025'}
                    onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIS (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 2025001"
                    value={formData.nis || ''}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin || 'L'}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveNew}
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                Simpan Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Siswa */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Edit className="text-amber-600" size={20} /> Edit Data Siswa
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Siswa *</label>
                <input
                  type="text"
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas *</label>
                  <select
                    value={formData.kelas || '7A'}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {DEFAULT_CLASSES.map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Periode *</label>
                  <input
                    type="text"
                    value={formData.periode || '2025'}
                    onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIS</label>
                  <input
                    type="text"
                    value={formData.nis || ''}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin || 'L'}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {showDeleteModal && deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">Hapus Data Siswa?</h3>
            <p className="text-xs font-medium text-slate-500 mb-6">
              Apakah Anda yakin ingin menghapus <strong className="text-slate-800">{deletingStudent.nama}</strong> (Kelas {deletingStudent.kelas}, Periode {deletingStudent.periode})?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Excel */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Upload className="text-emerald-600" size={20} /> Upload Data Siswa Baru (Excel)
              </h3>
              <button 
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadPreview([]);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 text-xs text-emerald-900 flex items-start gap-3">
              <AlertCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Ketentuan Upload Siswa Baru:</p>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-800 font-medium">
                  <li>Siswa lama dari periode sebelumnya (misal 2025) <strong>TIDAK HILANG</strong> & tersimpan aman.</li>
                  <li>Sertakan kolom wajib di Excel: <strong>Nama Siswa</strong>, <strong>Kelas</strong>, dan <strong>Periode</strong> (misal: 2026).</li>
                  <li>Jika kolom Periode di Excel kosong, sistem otomatis memakai Default Periode.</li>
                </ul>
              </div>
            </div>

            {/* Template Download Button */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-6 text-xs">
              <div>
                <p className="font-bold text-slate-800">Belum punya format Excel?</p>
                <p className="text-slate-500 font-medium">Unduh contoh template .xlsx dengan header yang sesuai.</p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl transition-all shadow-sm shrink-0"
              >
                <Download size={14} /> Download Template
              </button>
            </div>

            {/* File Selector & Default Periode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Periode Upload</label>
                <input
                  type="text"
                  value={defaultUploadPeriode}
                  onChange={(e) => setDefaultUploadPeriode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="2026"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Pilih File Excel (.xlsx / .xls)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelFileSelect}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>

            {/* Upload Messages */}
            {uploadSuccessMsg && (
              <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 mb-6">
                <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                {uploadSuccessMsg}
              </div>
            )}

            {/* Preview Table */}
            {uploadPreview.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700">Preview Data Excel ({uploadPreview.length} Siswa Ditemukan):</h4>
                </div>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 font-bold text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2.5 border-b border-slate-200">No</th>
                        <th className="p-2.5 border-b border-slate-200">Nama Siswa</th>
                        <th className="p-2.5 border-b border-slate-200">Kelas</th>
                        <th className="p-2.5 border-b border-slate-200">Periode</th>
                        <th className="p-2.5 border-b border-slate-200">NIS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {uploadPreview.slice(0, 50).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-800">{item.nama}</td>
                          <td className="p-2.5">{item.kelas}</td>
                          <td className="p-2.5 font-bold text-emerald-700">{item.periode || defaultUploadPeriode}</td>
                          <td className="p-2.5 font-mono">{item.nis || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {uploadPreview.length > 50 && (
                    <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 font-medium">
                      Menampilkan 50 data pertama dari total {uploadPreview.length} data.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadPreview([]);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleImportExcel}
                disabled={uploadPreview.length === 0 || isProcessingUpload}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessingUpload ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Mengimpor Data...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} /> Import {uploadPreview.length} Siswa Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Script Supabase Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Script SQL Database Supabase</h3>
                  <p className="text-xs text-slate-400 font-medium">Jalankan di Supabase SQL Editor untuk menambah/memperbaiki tabel & field yang kurang</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-slate-950">
              <div className="p-3 bg-blue-950/60 border border-blue-800/50 rounded-xl text-blue-200 text-xs flex items-center justify-between">
                <span>Copy & Paste kode di bawah ini ke <b>SQL Editor</b> di Dashboard Supabase Anda:</span>
                <button
                  onClick={() => {
                    const sqlText = `-- Script SQL untuk Menambah & Memperbaiki Tabel/Field Supabase
-- 1. TABEL MASTER SISWA
CREATE TABLE IF NOT EXISTS public.master_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    periode TEXT DEFAULT '2025',
    nis TEXT,
    jenis_kelamin TEXT DEFAULT 'L',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS periode TEXT DEFAULT '2025';
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT DEFAULT 'L';
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TABEL MASTER GURU & MAPEL
CREATE TABLE IF NOT EXISTS public.master_guru (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip TEXT,
    nama_guru TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT,
    nama_mapel TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DISIPLIN & PELANGGARAN
CREATE TABLE IF NOT EXISTS public.master_pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pelanggaran TEXT NOT NULL,
    kategori TEXT DEFAULT 'Ringan',
    poin INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaksi_pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    pelanggaran_id UUID REFERENCES public.master_pelanggaran(id) ON DELETE SET NULL,
    keterangan TEXT,
    poin INTEGER DEFAULT 0,
    foto_bukti TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. KETERLAMBATAN
CREATE TABLE IF NOT EXISTS public.transaksi_terlambat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    jam TIME DEFAULT CURRENT_TIME,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    alasan TEXT,
    tindak_lanjut TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DISPENSASI
CREATE TABLE IF NOT EXISTS public.disp_master_jenis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_jenis TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disp_transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    jam_keluar TIME,
    jam_kembali TIME,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    jenis_id UUID REFERENCES public.disp_master_jenis(id) ON DELETE SET NULL,
    keterangan TEXT,
    status TEXT DEFAULT 'Diproses',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRESTASI SISWA
CREATE TABLE IF NOT EXISTS public.prestasi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    nama_prestasi TEXT NOT NULL,
    tingkat TEXT,
    peringkat TEXT,
    penyelenggara TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BIMBINGAN KONSELING
CREATE TABLE IF NOT EXISTS public.bk_master_kasus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kasus TEXT NOT NULL,
    kategori TEXT DEFAULT 'Sedang',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bk_transaksi_kasus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    kasus_id UUID REFERENCES public.bk_master_kasus(id) ON DELETE SET NULL,
    keterangan TEXT,
    status TEXT DEFAULT 'Diproses',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. UKS & KESEHATAN
CREATE TABLE IF NOT EXISTS public.uks_keluhan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_keluhan TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.uks_obat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_obat TEXT NOT NULL,
    stok INTEGER DEFAULT 0,
    satuan TEXT DEFAULT 'Tablet',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.uks_kunjungan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    jam TIME DEFAULT CURRENT_TIME,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    keluhan_id UUID REFERENCES public.uks_keluhan(id) ON DELETE SET NULL,
    obat_id UUID REFERENCES public.uks_obat(id) ON DELETE SET NULL,
    jumlah_obat INTEGER DEFAULT 1,
    penanganan TEXT,
    suhu NUMERIC,
    tensi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SIPENA PERPUSTAKAAN
CREATE TABLE IF NOT EXISTS public.sipena_buku (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_buku TEXT,
    judul_buku TEXT NOT NULL,
    pengarang TEXT,
    penerbit TEXT,
    tahun TEXT,
    kategori TEXT,
    stok INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sipena_kunjungan_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    tujuan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sipena_peminjaman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal_pinjam DATE DEFAULT CURRENT_DATE,
    tanggal_kembali DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Dipinjam',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sipena_peminjaman_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peminjaman_id UUID REFERENCES public.sipena_peminjaman(id) ON DELETE CASCADE,
    buku_id UUID REFERENCES public.sipena_buku(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. IZIN SISWA & PENGADUAN WALI
CREATE TABLE IF NOT EXISTS public.izin_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    jenis_izin TEXT,
    alasan TEXT,
    status TEXT DEFAULT 'Disetujui',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pengaduan_wali (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    nama_pelapor TEXT NOT NULL,
    hp_pelapor TEXT,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    kategori TEXT,
    isi_pengaduan TEXT NOT NULL,
    status TEXT DEFAULT 'Menunggu',
    tanggapan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;
                    navigator.clipboard.writeText(sqlText);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                >
                  {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                  {copiedSql ? 'Tercopy!' : 'Copy SQL'}
                </button>
              </div>

              <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto selection:bg-blue-600 selection:text-white">
{`-- 1. PERBAIKI TABEL MASTER SISWA (TAMBAH FIELD PERIODE, NIS, JENIS KELAMIN)
CREATE TABLE IF NOT EXISTS public.master_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    periode TEXT DEFAULT '2025',
    nis TEXT,
    jenis_kelamin TEXT DEFAULT 'L',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom jika master_siswa sudah pernah dibuat tanpa field periode / nis / jenis_kelamin
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS periode TEXT DEFAULT '2025';
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT DEFAULT 'L';
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TABEL MASTER GURU & MAPEL
CREATE TABLE IF NOT EXISTS public.master_guru (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip TEXT,
    nama_guru TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT,
    nama_mapel TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DISIPLIN & PELANGGARAN
CREATE TABLE IF NOT EXISTS public.master_pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pelanggaran TEXT NOT NULL,
    kategori TEXT DEFAULT 'Ringan',
    poin INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaksi_pelanggaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    pelanggaran_id UUID REFERENCES public.master_pelanggaran(id) ON DELETE SET NULL,
    keterangan TEXT,
    poin INTEGER DEFAULT 0,
    foto_bukti TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. KETERLAMBATAN
CREATE TABLE IF NOT EXISTS public.transaksi_terlambat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    jam TIME DEFAULT CURRENT_TIME,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    alasan TEXT,
    tindak_lanjut TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DISPENSASI
CREATE TABLE IF NOT EXISTS public.disp_master_jenis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_jenis TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disp_transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    jam_keluar TIME,
    jam_kembali TIME,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    jenis_id UUID REFERENCES public.disp_master_jenis(id) ON DELETE SET NULL,
    keterangan TEXT,
    status TEXT DEFAULT 'Diproses',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRESTASI SISWA
CREATE TABLE IF NOT EXISTS public.prestasi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    nama_prestasi TEXT NOT NULL,
    tingkat TEXT,
    peringkat TEXT,
    penyelenggara TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BIMBINGAN KONSELING
CREATE TABLE IF NOT EXISTS public.bk_master_kasus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kasus TEXT NOT NULL,
    kategori TEXT DEFAULT 'Sedang',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bk_transaksi_kasus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    kasus_id UUID REFERENCES public.bk_master_kasus(id) ON DELETE SET NULL,
    keterangan TEXT,
    status TEXT DEFAULT 'Diproses',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. UKS & KESEHATAN
CREATE TABLE IF NOT EXISTS public.uks_keluhan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_keluhan TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.uks_obat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_obat TEXT NOT NULL,
    stok INTEGER DEFAULT 0,
    satuan TEXT DEFAULT 'Tablet',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.uks_kunjungan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    jam TIME DEFAULT CURRENT_TIME,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    keluhan_id UUID REFERENCES public.uks_keluhan(id) ON DELETE SET NULL,
    obat_id UUID REFERENCES public.uks_obat(id) ON DELETE SET NULL,
    jumlah_obat INTEGER DEFAULT 1,
    penanganan TEXT,
    suhu NUMERIC,
    tensi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SIPENA PERPUSTAKAAN
CREATE TABLE IF NOT EXISTS public.sipena_buku (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_buku TEXT,
    judul_buku TEXT NOT NULL,
    pengarang TEXT,
    penerbit TEXT,
    tahun TEXT,
    kategori TEXT,
    stok INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sipena_kunjungan_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    tujuan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sipena_peminjaman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal_pinjam DATE DEFAULT CURRENT_DATE,
    tanggal_kembali DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Dipinjam',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sipena_peminjaman_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peminjaman_id UUID REFERENCES public.sipena_peminjaman(id) ON DELETE CASCADE,
    buku_id UUID REFERENCES public.sipena_buku(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. IZIN SISWA & PENGADUAN WALI
CREATE TABLE IF NOT EXISTS public.izin_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    jenis_izin TEXT,
    alasan TEXT,
    status TEXT DEFAULT 'Disetujui',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pengaduan_wali (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE DEFAULT CURRENT_DATE,
    nama_pelapor TEXT NOT NULL,
    hp_pelapor TEXT,
    siswa_id UUID REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    kategori TEXT,
    isi_pengaduan TEXT NOT NULL,
    status TEXT DEFAULT 'Menunggu',
    tanggapan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
              </pre>
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
