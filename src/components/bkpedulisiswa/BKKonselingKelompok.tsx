import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, Check, CheckSquare, X, Image as ImageIcon, Upload, Eye } from 'lucide-react';
import { sabdaService, KonselingKelompokBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

export default function BKKonselingKelompok({ user }: { user?: any }) {
  const [kelompoks, setKelompoks] = useState<KonselingKelompokBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerClassFilter, setPickerClassFilter] = useState<string>('Semua');
  const [tempSelectedMap, setTempSelectedMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<KonselingKelompokBK | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    topik: '',
    anggota_siswa: '',
    kelas: '8A',
    tanggal: defaultDate,
    jam: '10:00 WIB',
    tempat: 'Ruang Bimbingan Kelompok BK',
    tujuan: 'Membangun komunikasi asertif, rasa percaya diri, dan resolusi konflik sebaya',
    dinamika_kelompok: '',
    kesepakatan: '',
    evaluasi: 'Anggota kelompok aktif memberikan masukan dan saling berkomitmen rukun.',
    guru_bk: getDefaultGuruBK(user),
    foto_url: ''
  });

  useEffect(() => {
    loadData();
    loadSiswa();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getKonselingKelompok();
      setKelompoks(data);
    } catch (e: any) {
      console.error('Error loading konseling kelompok:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSiswa = async () => {
    try {
      const saved = localStorage.getItem('sitelat_siswa') || localStorage.getItem('master_siswa');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setSiswaList(parsed);
      }
    } catch (_) {}

    try {
      const allSiswa = await fetchAllSiswa();
      if (allSiswa && allSiswa.length > 0) {
        setSiswaList(allSiswa);
        try {
          localStorage.setItem('sitelat_siswa', JSON.stringify(allSiswa));
          localStorage.setItem('master_siswa', JSON.stringify(allSiswa));
        } catch (_) {}
      } else if (supabase) {
        const { data } = await supabase.from('master_siswa').select('id, nama, kelas, nis').order('nama', { ascending: true });
        if (data && data.length > 0) setSiswaList(data);
      }
    } catch (e) {
      console.warn('Notice loading siswa for group counseling:', e);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const sortedSiswa = useMemo(() => {
    return siswaList
      .filter((s: any) => !String(s.id || '').startsWith('pad-'))
      .map((s: any) => ({
        ...s,
        kelas: normalizeKelasKey(s.kelas || '') || s.kelas || '-'
      }))
      .sort((a: any, b: any) => {
        const kDiff = (a.kelas || '').localeCompare(b.kelas || '', undefined, { numeric: true });
        if (kDiff !== 0) return kDiff;
        return (a.nama || '').localeCompare(b.nama || '');
      });
  }, [siswaList]);

  const filteredModalStudents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return sortedSiswa.filter((s: any) => {
      const matchClass = pickerClassFilter === 'Semua' || normalizeKelasKey(s.kelas || '') === pickerClassFilter;
      if (!matchClass) return false;
      if (!q) return true;
      const nama = String(s.nama || '').toLowerCase();
      const nis = String(s.nisn || s.nis || '').toLowerCase();
      const kls = String(s.kelas || '').toLowerCase();
      return nama.includes(q) || nis.includes(q) || kls.includes(q);
    });
  }, [sortedSiswa, pickerClassFilter, pickerSearch]);

  const allFilteredSelected =
    filteredModalStudents.length > 0 &&
    filteredModalStudents.every(s => tempSelectedMap.has(String(s.id)));

  const syncSelectedToForm = (students: any[]) => {
    setSelectedStudents(students);
    const uniqueClasses = Array.from(
      new Set(students.map(s => normalizeKelasKey(s.kelas || '') || s.kelas).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

    const textFormatted = students
      .map((item, idx) => `${idx + 1}. ${item.nama} (${item.kelas})`)
      .join('\n');

    setFormData(prev => ({
      ...prev,
      kelas: uniqueClasses.length > 0 ? uniqueClasses.join(', ') : prev.kelas,
      anggota_siswa: textFormatted
    }));
  };

  const openPickerModal = () => {
    const nextMap = new Map<string, any>();
    selectedStudents.forEach(s => {
      nextMap.set(String(s.id), s);
    });
    setTempSelectedMap(nextMap);
    setPickerSearch('');
    setPickerClassFilter('Semua');
    setIsPickerOpen(true);
  };

  const toggleTempStudent = (student: any) => {
    const sid = String(student.id);
    setTempSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(sid)) {
        next.delete(sid);
      } else {
        next.set(sid, student);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    setTempSelectedMap(prev => {
      const next = new Map(prev);
      if (allFilteredSelected) {
        filteredModalStudents.forEach(s => next.delete(String(s.id)));
      } else {
        filteredModalStudents.forEach(s => next.set(String(s.id), s));
      }
      return next;
    });
  };

  const applySelectedStudents = () => {
    const list = Array.from(tempSelectedMap.values()).sort((a: any, b: any) => {
      const kDiff = (a.kelas || '').localeCompare(b.kelas || '', undefined, { numeric: true });
      if (kDiff !== 0) return kDiff;
      return (a.nama || '').localeCompare(b.nama || '');
    });
    syncSelectedToForm(list);
    setIsPickerOpen(false);
  };

  const removeSelectedStudent = (sid: string) => {
    const nextList = selectedStudents.filter(s => String(s.id) !== sid);
    syncSelectedToForm(nextList);
  };

  const clearAllSelected = () => {
    setSelectedStudents([]);
    setFormData(prev => ({ ...prev, anggota_siswa: '', kelas: '' }));
  };

  const compressImageFile = (file: File, maxDim = 960, quality = 0.8): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.onload = () => {
        const rawDataUrl = String(reader.result || '');
        const img = new Image();
        img.onerror = () => reject(new Error('Format gambar tidak valid.'));
        img.onload = () => {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ blob: file, dataUrl: rawDataUrl });
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(
            blob => resolve({ blob: blob || file, dataUrl }),
            'image/jpeg',
            quality
          );
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Hanya file gambar (JPG/PNG/WEBP) yang diperbolehkan!');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('error', 'Ukuran foto maksimal 10 MB!');
      return;
    }

    try {
      setUploadingPhoto(true);
      const { blob, dataUrl } = await compressImageFile(file);

      let uploadedUrl = '';
      if (supabase) {
        try {
          const path = `konseling_kelompok/kk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('bukti_fisik')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
          if (!upErr) {
            const { data: pub } = supabase.storage.from('bukti_fisik').getPublicUrl(path);
            if (pub?.publicUrl) {
              uploadedUrl = pub.publicUrl;
            }
          }
        } catch {
          // fallback to dataUrl
        }
      }

      setFormData(prev => ({ ...prev, foto_url: uploadedUrl || dataUrl }));
      showNotification('success', 'Dokumentasi foto kegiatan berhasil ditambahkan!');
    } catch (err: any) {
      showNotification('error', err?.message || 'Gagal memproses foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topik.trim() || !formData.anggota_siswa.trim()) {
      showNotification('error', 'Mohon lengkapi topik dan anggota kelompok siswa.');
      return;
    }

    const derivedKelas =
      formData.kelas.trim() ||
      Array.from(
        new Set(selectedStudents.map(s => normalizeKelasKey(s.kelas || '') || s.kelas).filter(Boolean))
      ).join(', ') ||
      '-';

    const record: KonselingKelompokBK = {
      id: editingId || `kk-${Date.now()}`,
      ...formData,
      kelas: derivedKelas,
      created_at: new Date().toISOString()
    };

    try {
      const updated = await sabdaService.saveKonselingKelompok(record);
      setKelompoks(updated);
      showNotification('success', editingId ? 'Rencana konseling kelompok berhasil diperbarui!' : 'Rencana konseling kelompok berhasil disimpan!');
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedStudents([]);
    setPickerSearch('');
    setFormData({
      topik: '',
      anggota_siswa: '',
      kelas: '',
      tanggal: defaultDate,
      jam: '10:00 WIB',
      tempat: 'Ruang Bimbingan Kelompok BK',
      tujuan: 'Membangun komunikasi asertif, rasa percaya diri, dan resolusi konflik sebaya',
      dinamika_kelompok: '',
      kesepakatan: '',
      evaluasi: 'Anggota kelompok aktif memberikan masukan dan saling berkomitmen rukun.',
      guru_bk: getDefaultGuruBK(user),
      foto_url: ''
    });
  };

  const handleEdit = (item: KonselingKelompokBK) => {
    setEditingId(item.id);
    setFormData({
      topik: item.topik,
      anggota_siswa: item.anggota_siswa,
      kelas: item.kelas,
      tanggal: item.tanggal,
      jam: item.jam,
      tempat: item.tempat,
      tujuan: item.tujuan,
      dinamika_kelompok: item.dinamika_kelompok,
      kesepakatan: item.kesepakatan,
      evaluasi: item.evaluasi,
      guru_bk: item.guru_bk && !item.guru_bk.toLowerCase().includes('administrator') ? item.guru_bk : getDefaultGuruBK(user),
      foto_url: item.foto_url || ''
    });
    const names = (item.anggota_siswa || '').toLowerCase();
    const matched = sortedSiswa.filter(s => names.includes((s.nama || '').toLowerCase()));
    setSelectedStudents(matched);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteKonselingKelompok(id);
      setKelompoks(updated);
      showNotification('success', 'Rencana konseling kelompok berhasil dihapus.');
      setDeleteConfirmId(null);
    } catch (e: any) {
      showNotification('error', 'Gagal menghapus: ' + e.message);
    }
  };

  const filtered = kelompoks.filter(k =>
    k.topik.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.anggota_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            FORM F
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rencana Konseling Kelompok</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Layanan konseling dan dinamika kelompok siswa SMPN 7 Pasuruan</p>
          </div>
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

      {/* Main Input Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Konseling Kelompok' : 'Form Rencana Konseling Kelompok'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Layanan penanganan masalah bersama dan dinamika interaksi kelompok</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              TOPIK / TEMA PERMASALAHAN KELOMPOK *
            </label>
            <input 
              type="text"
              placeholder="Contoh: Manajemen Emosi, Solidaritas Kelas, Motivasi Belajar Ujian..."
              value={formData.topik}
              onChange={e => setFormData({ ...formData, topik: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
              required
            />
          </div>

          {/* Multi-Select Kelas & Siswa Anggota Kelompok */}
          <div className="p-4 sm:p-5 bg-purple-50/40 rounded-2xl border-2 border-purple-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <Users size={15} className="text-purple-600" />
                <span>PILIH KELAS & NAMA ANGGOTA KELOMPOK (MULTI KELAS & SISWA) *</span>
              </label>
              <div className="flex items-center gap-2">
                {selectedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllSelected}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Kosongkan ({selectedStudents.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={openPickerModal}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Users size={14} />
                  <span>
                    {selectedStudents.length > 0
                      ? `Ubah / Tambah Siswa (${selectedStudents.length} Dipilih)`
                      : 'Pilih Kelas & Siswa'}
                  </span>
                </button>
              </div>
            </div>

            <div
              onClick={openPickerModal}
              className="w-full min-h-[64px] p-4 bg-white hover:bg-purple-50/30 border border-purple-200 rounded-2xl transition-colors cursor-pointer"
            >
              {selectedStudents.length === 0 ? (
                <div className="flex items-center justify-between text-slate-400 text-sm">
                  <span>Klik untuk memilih satu atau banyak siswa lintas kelas...</span>
                  <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold shrink-0 ml-2">
                    Multi Pilih
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                  {selectedStudents.map(s => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-purple-50/60 border border-purple-200 shadow-xs text-xs font-bold text-slate-800"
                    >
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black">
                        {s.kelas}
                      </span>
                      <span className="uppercase">{s.nama}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedStudent(String(s.id))}
                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus siswa"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Daftar Nama Siswa Kelompok (Tersinkronisasi Otomatis):
              </label>
              <textarea
                rows={2}
                placeholder="Daftar nama siswa akan otomatis tersusun saat siswa dipilih..."
                value={formData.anggota_siswa}
                onChange={e => setFormData({ ...formData, anggota_siswa: e.target.value })}
                className="w-full p-3 bg-white rounded-xl border border-purple-200 text-xs font-medium text-slate-800 outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          {/* Schedule & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TANGGAL PELAKSANAAN
              </label>
              <input 
                type="date"
                value={formData.tanggal}
                onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                JAM / WAKTU
              </label>
              <input 
                type="text"
                value={formData.jam}
                onChange={e => setFormData({ ...formData, jam: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TEMPAT PERTEMUAN
              </label>
              <input 
                type="text"
                value={formData.tempat}
                onChange={e => setFormData({ ...formData, tempat: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              TUJUAN LAYANAN KELOMPOK
            </label>
            <input 
              type="text"
              placeholder="Tujuan yang diharapkan dicapai melalui dinamika kelompok..."
              value={formData.tujuan}
              onChange={e => setFormData({ ...formData, tujuan: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              DINAMIKA KELOMPOK & PROSES DISKUSI
            </label>
            <textarea
              rows={3}
              placeholder="Bagaimana interaksi antar anggota, keterbukaan anggota dalam mengemukakan pendapat, dan jalannya dinamika kelompok..."
              value={formData.dinamika_kelompok}
              onChange={e => setFormData({ ...formData, dinamika_kelompok: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                KESEPAKATAN / KOMITMEN KELOMPOK
              </label>
              <textarea
                rows={2}
                placeholder="Kesepakatan bersama antar anggota kelompok..."
                value={formData.kesepakatan}
                onChange={e => setFormData({ ...formData, kesepakatan: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                EVALUASI HASIL
              </label>
              <textarea
                rows={2}
                placeholder="Evaluasi ketercapaian tujuan konseling kelompok..."
                value={formData.evaluasi}
                onChange={e => setFormData({ ...formData, evaluasi: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              GURU BK PEMBIMBING *
            </label>
            <select
              value={formData.guru_bk}
              onChange={e => setFormData({ ...formData, guru_bk: e.target.value })}
              className="w-full sm:w-80 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white"
            >
              {GURU_BK_OPTIONS.map((nama, idx) => (
                <option key={nama} value={nama}>{idx + 1}. {nama}</option>
              ))}
              {!GURU_BK_OPTIONS.includes(formData.guru_bk as any) && formData.guru_bk && !formData.guru_bk.toLowerCase().includes('administrator') && (
                <option value={formData.guru_bk}>{formData.guru_bk}</option>
              )}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              <ImageIcon size={15} className="text-purple-600" />
              <span>DOKUMENTASI FOTO KEGIATAN</span>
            </label>
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Masukkan link foto (URL) atau unggah foto kegiatan..."
                  value={formData.foto_url}
                  onChange={e => setFormData({ ...formData, foto_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none text-xs sm:text-sm text-slate-800"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fotoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>{uploadingPhoto ? 'Mengunggah...' : 'Upload Foto Kegiatan'}</span>
                  </button>
                  {formData.foto_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, foto_url: '' })}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              <div className="h-32 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden group shadow-xs">
                {formData.foto_url ? (
                  <div className="relative w-full h-full">
                    <img
                      src={formData.foto_url}
                      alt="Dokumentasi Foto Kegiatan Konseling Kelompok"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewPhotoUrl(formData.foto_url)}
                        className="p-1.5 bg-white/90 text-slate-800 rounded-lg text-xs font-bold hover:bg-white cursor-pointer"
                        title="Lihat Penuh"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, foto_url: '' })}
                        className="p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer"
                        title="Hapus"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center px-3">
                    <ImageIcon size={22} className="text-slate-300 mx-auto mb-1" />
                    <span className="text-xs text-slate-400 italic block">Belum ada foto kegiatan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all"
              >
                <RotateCcw size={16} />
                <span>Batal</span>
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-lg shadow-purple-200 active:scale-95 transition-all"
            >
              <Save size={18} />
              <span>{editingId ? 'Simpan Perubahan' : 'Simpan Rencana Kelompok'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Group Counseling List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Daftar Rekam Konseling Kelompok</h3>
            <p className="text-xs text-slate-500 font-medium">Rekapitulasi pelaksanaan konseling kelompok peserta didik</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari topik atau nama anggota..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none text-xs font-medium w-56 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Topik & Kelas</th>
                <th className="px-6 py-4">Tanggal & Waktu</th>
                <th className="px-6 py-4">Anggota Siswa</th>
                <th className="px-6 py-4">Kesepakatan Bersama</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Memuat data konseling kelompok...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Belum ada rekam konseling kelompok.</td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        {item.foto_url && (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(item.foto_url || null)}
                            className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer"
                            title="Lihat Dokumentasi Foto"
                          >
                            <img src={item.foto_url} alt="Foto" className="w-full h-full object-cover" />
                          </button>
                        )}
                        <div>
                          <div className="font-black text-slate-800 text-xs">{item.topik}</div>
                          <div className="text-[10px] font-bold text-purple-700 uppercase">Kelas {item.kelas} • {item.tempat}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-bold text-slate-700">{item.tanggal}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{item.jam}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 max-w-xs truncate">
                      {item.anggota_siswa}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {item.kesepakatan}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Cetak Lembar Konseling Kelompok"
                        >
                          <Printer size={16} />
                        </button>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Modal for Group Counseling */}
      {printItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div id="bk-print-area" className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in my-8 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Kop Surat */}
            <BKKopSurat
              subtitle="LEMBAR LAPORAN LAYANAN KONSELING KELOMPOK (FORM F)"
              subtitleClassName="text-purple-700"
            />

            <div className="space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-stretch justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Topik Layanan:</span>
                    <span className="col-span-2 font-black text-slate-900 uppercase">{printItem.topik}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Kelas / Tempat:</span>
                    <span className="col-span-2 text-slate-800">Kelas {printItem.kelas} • {printItem.tempat}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Hari / Tanggal:</span>
                    <span className="col-span-2 text-slate-800">{printItem.tanggal} ({printItem.jam})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Tujuan Layanan:</span>
                    <span className="col-span-2 text-slate-800">{printItem.tujuan}</span>
                  </div>
                </div>

                {/* Dokumentasi Foto Kegiatan di sisi kanan kotak identitas */}
                <div className="w-36 sm:w-44 shrink-0 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center p-1">
                  {printItem.foto_url ? (
                    <img
                      src={printItem.foto_url}
                      alt="Dokumentasi Foto Kegiatan Konseling Kelompok"
                      className="w-full h-28 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-28 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[10px] text-center px-2">
                      <ImageIcon size={18} className="mb-1 opacity-60" />
                      <span>Foto Kegiatan</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">A. Anggota Kelompok Siswa</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium whitespace-pre-line">{printItem.anggota_siswa}</p>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">B. Ringkasan Dinamika Kelompok</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">{printItem.dinamika_kelompok}</p>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">C. Kesepakatan Bersama</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">{printItem.kesepakatan}</p>
              </div>

              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala UPT SMPN 7 Pasuruan</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">NUR FADILAH, S.Pd</p>
                  <p className="text-[10px] text-slate-500">NIP. 19860410 201001 2 030</p>
                </div>
                <div>
                  <p>Guru Pembimbing BK,</p>
                  <p>UPT SMPN 7 Pasuruan</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">{printItem.guru_bk}</p>
                  <p className="text-[10px] text-slate-500">NIP. 19831116 200904 2 003</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setPrintItem(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => printBKReport('bk-print-area', `Konseling Kelompok - ${printItem.topik}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 shadow-md shadow-purple-200"
              >
                <Printer size={16} />
                <span>Cetak Lembar Laporan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Konseling Kelompok?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Data rekam konseling kelompok ini akan dihapus permanen.
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
      {/* Multi-Student & Multi-Class Picker Modal */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Search & Pilih Semua */}
            <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa, NISN, atau kelas..."
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all shrink-0 cursor-pointer ${
                    allFilteredSelected
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckSquare size={16} />
                  <span>{allFilteredSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
                </button>
              </div>

              {/* Horizontal Class Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {['Semua', ...CLASSES].map(cls => {
                  const isActive = pickerClassFilter === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setPickerClassFilter(cls)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Count Status Strip */}
            <div className="px-5 py-2.5 bg-emerald-50/60 border-b border-emerald-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="font-bold text-emerald-800">{tempSelectedMap.size} Siswa Terpilih</span>
              <span className="text-slate-500">(Klik nama siswa untuk menambah / mengurangi)</span>
            </div>

            {/* Student Cards List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-slate-50/40">
              {filteredModalStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm italic">
                  Tidak ada siswa yang sesuai dengan filter.
                </div>
              ) : (
                filteredModalStudents.map(s => {
                  const isChecked = tempSelectedMap.has(String(s.id));
                  const nisDisplay = s.nisn || s.nis || '-';
                  const jkDisplay = s.jenis_kelamin || '-';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleTempStudent(s)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        {isChecked && <Check size={14} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-800 text-sm uppercase truncate">
                          {s.nama}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[11px] font-bold">
                            Kelas {s.kelas}
                          </span>
                          <span className="text-xs text-slate-500">
                            NISN: {nisDisplay} • JK: {jkDisplay}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                Total <span className="font-bold text-slate-900">{tempSelectedMap.size} anggota</span> siap dimasukkan ke Konseling Kelompok.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applySelectedStudents}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Check size={15} />
                  <span>Gunakan {tempSelectedMap.size} Siswa Terpilih</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox View Photo */}
      {viewPhotoUrl && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewPhotoUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-3xl p-3 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewPhotoUrl(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-700 cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={viewPhotoUrl}
              alt="Pratinjau Dokumentasi Foto Kegiatan"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
