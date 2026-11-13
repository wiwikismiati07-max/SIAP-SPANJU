import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar, 
  Save, 
  Trash2, 
  Edit2, 
  Search, 
  Printer, 
  CheckCircle2, 
  RotateCcw, 
  Users, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Filter, 
  UserCheck,
  Eye
} from 'lucide-react';
import { sabdaService, AgendaKerjaBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa } from '../../lib/supabase';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatKelasDisplay = (k: string = ''): string => {
  if (!k) return '7-A';
  const clean = k.toString().toUpperCase().trim().replace(/^KELAS\s*/i, '').replace(/[\s\-_./\\]+/g, '');
  const match = clean.match(/^(\d)([A-Z])$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return k;
};

interface SiswaItem {
  id: string;
  nama: string;
  kelas: string;
  nis?: string;
  nisn?: string;
  jenis_kelamin?: 'Laki-laki' | 'Perempuan' | 'L' | 'P';
}

export default function BKAgendaKerja({ user }: { user?: any }) {
  const [agendas, setAgendas] = useState<AgendaKerjaBK[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Student search modal state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    tanggal: defaultDate,
    waktu: '07.15-07.55 WIB',
    sasaran: 'Siswa Kelas 7-A',
    sasaranCustom: 'Siswa Kelas 7-A',
    uraian_kegiatan: '',
    foto_url: '',
    hasil: 'Terlaksana',
    guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd',
    siswa_id: ''
  });

  useEffect(() => {
    loadData();
    loadSiswaList();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getAgenda();
      setAgendas(data);
    } catch (e: any) {
      console.error('Error loading agenda:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSiswaList = async () => {
    try {
      // Prioritas 1: Ambil data lengkap seluruh siswa dari database Supabase
      const data = await fetchAllSiswa();
      if (data && data.length > 0) {
        const normalized = data.map((s: any) => ({
          id: s.id || s.siswa_id || `sw-${Math.random()}`,
          nama: (s.nama || s.nama_siswa || '').toUpperCase().trim(),
          kelas: formatKelasDisplay(s.kelas),
          nis: s.nis || s.nisn || '',
          nisn: s.nisn || s.nis || '',
          jenis_kelamin: s.jenis_kelamin === 'P' || s.gender === 'P' || s.jenis_kelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki'
        }));
        setSiswaList(normalized as SiswaItem[]);
        return;
      }
    } catch (err) {
      console.warn('[SABDA BK] Gagal memuat siswa dari Supabase fetchAllSiswa:', err);
    }

    // Fallback ke cache local
    const local = localStorage.getItem('master_siswa') || localStorage.getItem('sitelat_siswa');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.length > 0) {
          const normalized = parsed.map((s: any) => ({
            id: s.id || `sw-${Math.random()}`,
            nama: (s.nama || '').toUpperCase().trim(),
            kelas: formatKelasDisplay(s.kelas),
            nis: s.nis || s.nisn || '',
            nisn: s.nisn || s.nis || '',
            jenis_kelamin: s.jenis_kelamin === 'P' || s.gender === 'P' ? 'Perempuan' : 'Laki-laki'
          }));
          setSiswaList(normalized);
          return;
        }
      } catch {}
    }

    // Default mock jika database kosong
    setSiswaList([
      { id: 'sw-101', nama: 'ADITYA PRATAMA', kelas: '7-A', nis: '10201', jenis_kelamin: 'Laki-laki' },
      { id: 'sw-102', nama: 'AISYAH PUTRI NURAINI', kelas: '7-A', nis: '10202', jenis_kelamin: 'Perempuan' },
      { id: 'sw-103', nama: 'BAGAS ALDIANSYAH', kelas: '7-B', nis: '10235', jenis_kelamin: 'Laki-laki' },
      { id: 'sw-104', nama: 'CITRA LESTARI DEWI', kelas: '7-B', nis: '10236', jenis_kelamin: 'Perempuan' },
      { id: 'sw-105', nama: 'DIMAS ANGGARA', kelas: '8-A', nis: '09812', jenis_kelamin: 'Laki-laki' },
      { id: 'sw-106', nama: 'FATHUR ROHMAN', kelas: '8-A', nis: '09813', jenis_kelamin: 'Laki-laki' },
      { id: 'sw-107', nama: 'GILANG RAMADHAN', kelas: '9-A', nis: '08711', jenis_kelamin: 'Laki-laki' },
      { id: 'sw-108', nama: 'HANA NABILA', kelas: '9-A', nis: '08712', jenis_kelamin: 'Perempuan' },
      { id: 'sw-109', nama: 'RIZKY RAMADHANI', kelas: '8-B', nis: '09855', jenis_kelamin: 'Laki-laki' },
      { id: 'sw-110', nama: 'MUHAMMAD FARHAN', kelas: '9-C', nis: '08799', jenis_kelamin: 'Laki-laki' }
    ]);
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Helper for live date info badges
  const getDateInfo = (dateStr: string) => {
    if (!dateStr) return { hari: '-', bulan: '-', tahun: '-' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { hari: '-', bulan: '-', tahun: '-' };
    return {
      hari: NAMA_HARI[d.getDay()],
      bulan: NAMA_BULAN[d.getMonth()],
      tahun: d.getFullYear().toString()
    };
  };

  const dateInfo = getDateInfo(formData.tanggal);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Hanya file gambar (JPG/PNG/WEBP) yang diperbolehkan!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Ukuran foto maksimal 5 MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, foto_url: base64 }));
      showNotification('success', 'Foto dokumentasi berhasil diunggah!');
    };
    reader.readAsDataURL(file);
  };

  // Select student from modal
  const handleSelectStudent = (siswa: SiswaItem) => {
    const targetLabel = `${siswa.nama} (${siswa.kelas})`;
    setFormData(prev => ({
      ...prev,
      sasaran: `Siswa Kelas ${siswa.kelas}`,
      sasaranCustom: targetLabel,
      siswa_id: siswa.id
    }));
    setIsStudentModalOpen(false);
    showNotification('success', `Sasaran terpilih: ${targetLabel}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.uraian_kegiatan.trim()) {
      showNotification('error', 'Mohon isi uraian kegiatan agenda kerja.');
      return;
    }

    const finalSasaran = formData.sasaranCustom.trim() || formData.sasaran;

    const record: AgendaKerjaBK = {
      id: editingId || `ag-${Date.now()}`,
      tanggal: formData.tanggal,
      waktu: formData.waktu || '07.15-07.55 WIB',
      sasaran: finalSasaran,
      uraian_kegiatan: formData.uraian_kegiatan,
      hasil: formData.hasil || 'Terlaksana',
      guru_bk: formData.guru_bk,
      foto_url: formData.foto_url,
      siswa_id: formData.siswa_id,
      created_at: new Date().toISOString()
    };

    try {
      const updated = await sabdaService.saveAgenda(record);
      setAgendas(updated);
      const isCloud = (updated as any).isSavedToSupabase;
      if (isCloud) {
        showNotification('success', editingId ? 'Agenda kerja berhasil diperbarui di database Supabase!' : 'Agenda kerja baru berhasil disimpan ke database Supabase!');
      } else {
        showNotification('success', editingId ? 'Agenda kerja diperbarui (tersimpan di lokal & siap sinkron).' : 'Agenda kerja berhasil disimpan (tersimpan di lokal & siap sinkron Supabase).');
      }
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan agenda: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      tanggal: defaultDate,
      waktu: '07.15-07.55 WIB',
      sasaran: 'Siswa Kelas 7-A',
      sasaranCustom: 'Siswa Kelas 7-A',
      uraian_kegiatan: '',
      foto_url: '',
      hasil: 'Terlaksana',
      guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd',
      siswa_id: ''
    });
  };

  const handleEdit = (item: AgendaKerjaBK) => {
    setEditingId(item.id);
    setFormData({
      tanggal: item.tanggal,
      waktu: item.waktu || '07.15-07.55 WIB',
      sasaran: item.sasaran.includes('Kelas') ? item.sasaran : 'Siswa Kelas 7-A',
      sasaranCustom: item.sasaran,
      uraian_kegiatan: item.uraian_kegiatan,
      foto_url: item.foto_url || '',
      hasil: item.hasil || 'Terlaksana',
      guru_bk: item.guru_bk || 'Wiwik Ismiati, S.Pd',
      siswa_id: item.siswa_id || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteAgenda(id);
      setAgendas(updated);
      showNotification('success', 'Agenda kerja berhasil dihapus.');
      setDeleteConfirmId(null);
    } catch (e: any) {
      showNotification('error', 'Gagal menghapus: ' + e.message);
    }
  };

  // Filter agendas
  const filteredAgendas = agendas.filter(a => 
    a.uraian_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.sasaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.hasil || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.tanggal.includes(searchTerm)
  );

  // Available classes for modal filter buttons - merged dynamically with any classes from Supabase
  const allClasses = useMemo(() => {
    const baseClasses = [
      '7-A', '7-B', '7-C', '7-D', '7-E', '7-F', '7-G', '7-H',
      '8-A', '8-B', '8-C', '8-D', '8-E', '8-F', '8-G', '8-H',
      '9-A', '9-B', '9-C', '9-D', '9-E', '9-F', '9-G', '9-H'
    ];
    const fromData = Array.from(new Set(siswaList.map(s => s.kelas).filter(Boolean)));
    const merged = Array.from(new Set([...baseClasses, ...fromData])) as string[];
    return merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [siswaList]);

  // Class counts map
  const classCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    siswaList.forEach(s => {
      const k = s.kelas;
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [siswaList]);

  // Filtered students for modal
  const filteredStudents = useMemo(() => {
    return siswaList.filter(s => {
      const matchSearch = 
        s.nama.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        (s.nis && s.nis.includes(modalSearchTerm)) ||
        (s.nisn && s.nisn.includes(modalSearchTerm));
      
      if (selectedClassFilter === 'Semua') return matchSearch;
      return matchSearch && s.kelas === selectedClassFilter;
    });
  }, [siswaList, modalSearchTerm, selectedClassFilter]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            FORM A
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Agenda Kerja BK SMPN 7</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Pencatatan agenda kerja harian bimbingan dan konseling</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            title="Cetak Agenda Kerja"
          >
            <Printer size={16} />
            <span>Cetak / Laporan Agenda</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold border animate-in fade-in ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className={statusMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Main Form Input Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Agenda Kerja BK' : 'Form Input Agenda Kerja BK'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Pencatatan kegiatan harian bimbingan konseling</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TANGGAL PELAKSANAAN & WAKTU KEGIATAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TANGGAL PELAKSANAAN
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="date"
                  value={formData.tanggal}
                  onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tanggal: defaultDate })}
                  className="px-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shrink-0 transition-colors"
                  title="Atur ke Hari Ini"
                >
                  Hari Ini
                </button>
              </div>
              {/* Live Computed Day-Month-Year Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-black border border-blue-200/60 shadow-xs">
                  Hari: <span className="text-blue-900">{dateInfo.hari}</span> • Bulan: <span className="text-blue-900">{dateInfo.bulan}</span> • Tahun: <span className="text-blue-900">{dateInfo.tahun}</span>
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                  WAKTU KEGIATAN
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const mins = String(now.getMinutes()).padStart(2, '0');
                    setFormData(prev => ({ ...prev, waktu: `${hours}.${mins} WIB` }));
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Gunakan Jam Sekarang</span>
                </button>
              </div>
              <div className="space-y-2">
                <select
                  value={[
                    '07.15-07.55 WIB',
                    '07.55-08.35 WIB',
                    '08.35-09.15 WIB',
                    '09.15-09.55 WIB',
                    '10.35-11.15 WIB',
                    '11.15-11.55 WIB',
                    '11.55-12.35 WIB',
                    '12.35-13.15 WIB'
                  ].includes(formData.waktu || '') ? formData.waktu : 'Waktu Lainnya / Kustom'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val !== 'Waktu Lainnya / Kustom') {
                      setFormData(prev => ({ ...prev, waktu: val }));
                    } else {
                      setFormData(prev => ({ ...prev, waktu: '07.15-07.55 WIB' }));
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white"
                >
                  <option value="07.15-07.55 WIB">07.15-07.55 WIB (Jam Pelajaran 1)</option>
                  <option value="07.55-08.35 WIB">07.55-08.35 WIB (Jam Pelajaran 2)</option>
                  <option value="08.35-09.15 WIB">08.35-09.15 WIB (Jam Pelajaran 3)</option>
                  <option value="09.15-09.55 WIB">09.15-09.55 WIB (Jam Pelajaran 4)</option>
                  <option value="10.35-11.15 WIB">10.35-11.15 WIB (Jam Pelajaran 5)</option>
                  <option value="11.15-11.55 WIB">11.15-11.55 WIB (Jam Pelajaran 6)</option>
                  <option value="11.55-12.35 WIB">11.55-12.35 WIB (Jam Pelajaran 7)</option>
                  <option value="12.35-13.15 WIB">12.35-13.15 WIB (Jam Pelajaran 8)</option>
                  <option value="Waktu Lainnya / Kustom">Waktu Lainnya / Kustom</option>
                </select>

                <input
                  type="text"
                  placeholder="Ketik waktu kustom (misal: 13.30-14.15 WIB)..."
                  value={formData.waktu || ''}
                  onChange={e => setFormData(prev => ({ ...prev, waktu: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:border-blue-500 outline-none bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* SASARAN KEGIATAN: Dropdown + Custom Input + "Cari Siswa" Button */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              SASARAN KEGIATAN
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              {/* Dropdown Options */}
              <select
                value={formData.sasaran}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    sasaran: val,
                    sasaranCustom: val
                  });
                }}
                className="w-full sm:w-56 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 transition-all text-sm appearance-none bg-white shrink-0"
              >
                <optgroup label="Tingkat Sekolah">
                  <option value="Seluruh Siswa SMPN 7">Seluruh Siswa SMPN 7</option>
                  <option value="Seluruh Siswa Kelas 7">Seluruh Siswa Kelas 7</option>
                  <option value="Seluruh Siswa Kelas 8">Seluruh Siswa Kelas 8</option>
                  <option value="Seluruh Siswa Kelas 9">Seluruh Siswa Kelas 9</option>
                </optgroup>
                <optgroup label="Kelas 7">
                  {['7-A', '7-B', '7-C', '7-D', '7-E', '7-F', '7-G', '7-H'].map(k => (
                    <option key={k} value={`Siswa Kelas ${k}`}>Siswa Kelas {k}</option>
                  ))}
                </optgroup>
                <optgroup label="Kelas 8">
                  {['8-A', '8-B', '8-C', '8-D', '8-E', '8-F', '8-G', '8-H'].map(k => (
                    <option key={k} value={`Siswa Kelas ${k}`}>Siswa Kelas {k}</option>
                  ))}
                </optgroup>
                <optgroup label="Kelas 9">
                  {['9-A', '9-B', '9-C', '9-D', '9-E', '9-F', '9-G', '9-H'].map(k => (
                    <option key={k} value={`Siswa Kelas ${k}`}>Siswa Kelas {k}</option>
                  ))}
                </optgroup>
              </select>

              {/* Editable Input */}
              <input 
                type="text"
                placeholder="Sasaran kegiatan atau nama siswa..."
                value={formData.sasaranCustom}
                onChange={e => setFormData({ ...formData, sasaranCustom: e.target.value })}
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white"
                required
              />

              {/* "Cari Siswa" Button */}
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(true)}
                className="px-4 py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-xs"
                title="Pilih nama siswa dari database"
              >
                <Users size={16} />
                <span>Cari Siswa</span>
              </button>
            </div>
          </div>

          {/* URAIAN KEGIATAN */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              URAIAN KEGIATAN
            </label>
            <textarea
              rows={4}
              placeholder="Tuliskan uraian detail kegiatan bimbingan dan konseling yang dilaksanakan..."
              value={formData.uraian_kegiatan}
              onChange={e => setFormData({ ...formData, uraian_kegiatan: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-medium text-slate-800 transition-all text-sm leading-relaxed"
              required
            />
          </div>

          {/* FOTO DOKUMENTASI KEGIATAN */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              <ImageIcon size={15} className="text-blue-600" />
              <span>FOTO DOKUMENTASI KEGIATAN</span>
            </label>
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/60 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Left Column: Input URL & Upload button */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Masukkan link foto (Google Drive / URL web) atau upload di bawah..."
                  value={formData.foto_url}
                  onChange={e => setFormData({ ...formData, foto_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs sm:text-sm text-slate-800"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    <Upload size={14} />
                    <span>Upload Foto</span>
                  </button>
                  {formData.foto_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, foto_url: '' })}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Preview Box */}
              <div className="h-32 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden group shadow-xs">
                {formData.foto_url ? (
                  <div className="relative w-full h-full">
                    <img
                      src={formData.foto_url}
                      alt="Dokumentasi Kegiatan"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewPhotoUrl(formData.foto_url)}
                        className="p-1.5 bg-white/90 text-slate-800 rounded-lg text-xs font-bold hover:bg-white"
                        title="Lihat Penuh"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, foto_url: '' })}
                        className="p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                        title="Hapus"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Belum ada foto dokumentasi</span>
                )}
              </div>
            </div>
          </div>

          {/* KETERANGAN / HASIL */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              KETERANGAN / HASIL
            </label>
            <input 
              type="text"
              placeholder="Terlaksana"
              value={formData.hasil}
              onChange={e => setFormData({ ...formData, hasil: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-medium text-slate-800 transition-all text-sm bg-white"
            />
          </div>

          {/* GURU BK */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              GURU BIMBINGAN KONSELING
            </label>
            <input 
              type="text"
              value={formData.guru_bk}
              onChange={e => setFormData({ ...formData, guru_bk: e.target.value })}
              className="w-full sm:w-80 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 transition-all text-sm bg-slate-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all"
              >
                <RotateCcw size={16} />
                <span>Batal Edit</span>
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              <Save size={18} />
              <span>{editingId ? 'Simpan Perubahan' : 'Simpan Agenda Kerja'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Riwayat Agenda Kerja Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Daftar Riwayat Agenda Kerja BK</h3>
            <p className="text-xs text-slate-500 font-medium">Rekapitulasi seluruh agenda harian yang telah tersimpan</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari agenda atau sasaran..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium w-56 sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4 w-12 text-center">No</th>
                <th className="px-6 py-4">Tanggal & Hari</th>
                <th className="px-6 py-4">Sasaran</th>
                <th className="px-6 py-4">Uraian Kegiatan</th>
                <th className="px-6 py-4 text-center">Dokumentasi</th>
                <th className="px-6 py-4">Hasil / Evaluasi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Memuat agenda kerja...</td>
                </tr>
              ) : filteredAgendas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Belum ada agenda kerja yang tersimpan.</td>
                </tr>
              ) : (
                filteredAgendas.map((item, idx) => {
                  const d = getDateInfo(item.tanggal);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-center text-xs font-black text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-black text-slate-800 text-xs">{item.tanggal}</div>
                        <div className="text-[10px] text-blue-600 font-bold uppercase">{d.hari}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 inline-block">
                          {item.sasaran}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 max-w-xs sm:max-w-md">
                        {item.uraian_kegiatan}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.foto_url ? (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(item.foto_url || null)}
                            className="inline-block relative group"
                            title="Klik untuk melihat foto"
                          >
                            <img
                              src={item.foto_url}
                              alt="Foto Kegiatan"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs group-hover:scale-105 transition-transform"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs font-medium">
                        {item.hasil || 'Terlaksana'}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT SELECTION MODAL - Exactly matching the screenshot */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users size={20} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Pilih Nama Siswa dari Database
                </h3>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Class Pill Filters */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Filter size={14} />
                <span>Kelas:</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap max-h-32 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedClassFilter('Semua')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedClassFilter === 'Semua'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({siswaList.length})
                </button>

                {allClasses.map(k => {
                  const count = classCountMap[k] || 0;
                  const isSelected = selectedClassFilter === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedClassFilter(k)}
                      className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {k} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={modalSearchTerm}
                onChange={e => setModalSearchTerm(e.target.value)}
                placeholder="Ketik nama siswa atau NIS..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all"
                autoFocus
              />
            </div>

            {/* Student List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada data siswa ditemukan untuk kriteria pencarian ini.
                </div>
              ) : (
                filteredStudents.map(siswa => (
                  <div
                    key={siswa.id}
                    className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm uppercase">
                          {siswa.nama}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {siswa.kelas}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        NIS: {siswa.nis || siswa.nisn || '-'} • {siswa.jenis_kelamin || 'Siswa'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectStudent(siswa)}
                      className="px-4 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0"
                    >
                      Pilih
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Modal */}
      {viewPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl p-4 shadow-2xl">
            <button
              onClick={() => setViewPhotoUrl(null)}
              className="absolute top-2 right-2 p-1.5 bg-slate-900/60 hover:bg-slate-900 text-white rounded-xl"
            >
              <X size={18} />
            </button>
            <img
              src={viewPhotoUrl}
              alt="Dokumentasi Penuh"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Agenda Kerja?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Data agenda kerja ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteConfirmId)}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Print Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in my-8 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Kop Surat */}
            <div className="text-center border-b-4 border-double border-slate-800 pb-4 mb-6">
              <div className="flex items-center justify-center gap-4 mb-2">
                <img src="https://iili.io/KDFk4fI.png" alt="Logo SMPN 7" className="w-16 h-16 object-contain" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">PEMERINTAH KOTA PASURUAN • DINAS PENDIDIKAN DAN KEBUDAYAAN</h4>
                  <h2 className="text-lg font-black uppercase text-slate-900">UPT SMP NEGERI 7 PASURUAN</h2>
                  <p className="text-[10px] text-slate-600 font-medium">Jl. Ki Hajar Dewantara No. 27, Pasuruan, Jawa Timur • Telp: (0343) 424355</p>
                  <p className="text-[9px] font-bold text-blue-800 uppercase tracking-widest">LAPORAN AGENDA KERJA HARIAN BIMBINGAN DAN KONSELING (BK)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-800">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p><span className="font-bold">Guru BK:</span> {formData.guru_bk}</p>
                  <p><span className="font-bold">Satuan Pendidikan:</span> UPT SMP Negeri 7 Pasuruan</p>
                </div>
                <div className="text-right">
                  <p>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                  <p><span className="font-bold">Total Agenda:</span> {agendas.length} Kegiatan</p>
                </div>
              </div>

              {/* Table of Agendas */}
              <table className="w-full border-collapse border border-slate-300 text-xs text-slate-800">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold text-center">
                    <th className="border border-slate-300 p-2 w-10">No</th>
                    <th className="border border-slate-300 p-2 w-28">Tanggal & Waktu</th>
                    <th className="border border-slate-300 p-2 w-32">Sasaran</th>
                    <th className="border border-slate-300 p-2">Uraian Kegiatan</th>
                    <th className="border border-slate-300 p-2 w-28">Hasil / Evaluasi</th>
                  </tr>
                </thead>
                <tbody>
                  {agendas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-slate-300 p-4 text-center text-slate-400 italic">Belum ada agenda kerja.</td>
                    </tr>
                  ) : (
                    agendas.map((item, idx) => {
                      const d = getDateInfo(item.tanggal);
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold">{item.tanggal}</div>
                            <div className="text-[10px] text-slate-500">{d.hari} • {item.waktu || '07.15 WIB'}</div>
                          </td>
                          <td className="border border-slate-300 p-2 font-bold text-blue-900">{item.sasaran}</td>
                          <td className="border border-slate-300 p-2 leading-relaxed">{item.uraian_kegiatan}</td>
                          <td className="border border-slate-300 p-2">{item.hasil || 'Terlaksana'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 pt-10 text-xs text-center page-break-inside-avoid">
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala UPT SMPN 7 Pasuruan</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">NUR FADILAH, S.Pd</p>
                  <p className="text-[10px] text-slate-500">NIP. 19860410 201001 2 030</p>
                </div>
                <div>
                  <p>Pasuruan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Guru Bimbingan Konseling,</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">WIWIK ISMIATI, S.Pd</p>
                  <p className="text-[10px] text-slate-500">NIP. 19831116 200904 2 003</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-200"
              >
                <Printer size={16} />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
