import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Save,
  Trash2,
  Edit2,
  Search,
  Printer,
  CheckCircle2,
  RotateCcw,
  Check,
  CheckSquare,
  X,
  Image as ImageIcon,
  Upload,
  Eye,
  ChevronDown,
  AlertCircle,
  Compass,
  Wrench,
} from 'lucide-react';
import { sabdaService, KonselingKelompokBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import { printBKReport } from './BKKopSurat';

const CLASSES = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H',
];

const TOPIK_PERMASALAHAN_OPTIONS = [
  'Salah paham atau miss komunikasi antar teman',
  'Konflik atau perselisihan antar teman sekelas',
  'Kurangnya kepatuhan terhadap tata tertib sekolah',
  'Rendahnya motivasi belajar kelompok',
  'Perundungan / ejekan verbal antar teman',
  'Manajemen emosi dan komunikasi asertif kelompok',
] as const;

interface PendekatanKelompokPreset {
  pendekatan: string;
  teknik_utama: string;
  fokus_utama: string;
  kasus_efektif: string;
}

const PENDEKATAN_KELOMPOK_PRESETS: readonly PendekatanKelompokPreset[] = [
  {
    pendekatan: 'Reality Therapy (Kelompok WDEP)',
    teknik_utama: 'Group WDEP (Wants, Direction, Evaluation, Plan), Kontrak Perilaku Kelompok',
    fokus_utama: 'Mendorong setiap anggota kelompok untuk mengevaluasi tindakan mereka dan berkomitmen pada perubahan nyata.',
    kasus_efektif: 'Kenakalan remaja, masalah kepatuhan tata tertib sekolah, rendahnya motivasi belajar kelompok.',
  },
  {
    pendekatan: 'Person-Centered (Kelompok Empati)',
    teknik_utama: 'Active Listening, Refleksi Perasaan Kelompok, Penguatan Empati Sebaya',
    fokus_utama: 'Membangun suasana kelompok yang saling menerima, terbuka, dan aman untuk mengekspresikan perasaan.',
    kasus_efektif: 'Salah paham antar teman, masalah penyesuaian diri, kurang percaya diri dalam kelompok.',
  },
  {
    pendekatan: 'Behavioristik (Kelompok Kontrak Perilaku)',
    teknik_utama: 'Kontrak Perilaku Kelompok, Reinforcement Sosial, Peer Modeling',
    fokus_utama: 'Membentuk kebiasaan perilaku positif bersama melalui kesepakatan aturan dan pemantauan kelompok.',
    kasus_efektif: 'Keterlambatan bersama, pelanggaran tata tertib, kebiasaan menunda tugas.',
  },
  {
    pendekatan: 'Cognitive Behavioral Group Therapy (CBGT)',
    teknik_utama: 'Restrukturisasi Kognitif Kelompok, Latihan Asertif, Problem Solving',
    fokus_utama: 'Mengubah cara pandang negatif antar anggota menjadi pola pikir kolaboratif dan solusi konstruktif.',
    kasus_efektif: 'Konflik sebaya berulang, kecemasan ujian kelompok, prasangka antar siswa.',
  },
  {
    pendekatan: 'Solution-Focused Brief Group Therapy (SFBGT)',
    teknik_utama: 'Miracle Question, Scaling Question, Eksplorasi Kekuatan Kelompok',
    fokus_utama: 'Memfokuskan diskusi kelompok pada langkah solusi praktis yang dapat segera diterapkan bersama.',
    kasus_efektif: 'Penurunan semangat belajar, kebingungan kerja sama tim, konflik komunikasi ringan.',
  },
];

const TEKNIK_KELOMPOK_OPTIONS = [
  'Group WDEP (Wants, Direction, Evaluation, Plan), Kontrak Perilaku Kelompok',
  'Active Listening, Refleksi Perasaan Kelompok, Penguatan Empati',
  'Restrukturisasi Kognitif Kelompok, Latihan Asertif, Problem Solving',
  'Kontrak Perilaku Kelompok, Peer Modeling, Reinforcement Sosial',
  'Miracle Question, Scaling Question, Kesepakatan Tindakan Nyata',
] as const;

const MEDIA_QUICK_OPTIONS = [
  '-',
  'daftar presensi kelas',
  'kartu komitmen kelompok',
  'buku catatan konseling BK',
] as const;

const GURU_BK_NIP_MAP: Record<string, string> = {
  'WIWIK ISMIATI, S.Pd': '19831116 200904 2 003',
  'Wiwik Ismiati, S.Pd': '19831116 200904 2 003',
  'EKI FEBRIANI, S.Pd': '19940214 202221 2 014',
  'Eki Febriani, S.Pd': '19940214 202221 2 014',
};

const getGuruBkNip = (nama?: string): string => {
  if (!nama) return '19831116 200904 2 003';
  const trimmed = nama.trim();
  if (GURU_BK_NIP_MAP[trimmed]) return GURU_BK_NIP_MAP[trimmed];
  const upper = trimmed.toUpperCase();
  if (upper.includes('EKI')) return '19940214 202221 2 014';
  if (upper.includes('WIWIK')) return '19831116 200904 2 003';
  return '-';
};

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const parseLocalDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
};

const formatTanggalIndo = (dateStr?: string): string => {
  const dt = parseLocalDate(dateStr);
  if (!dt) return dateStr || '-';
  return `${dt.getDate()} ${BULAN_ID[dt.getMonth()]} ${dt.getFullYear()}`;
};

const formatHariTanggalIndo = (dateStr?: string): string => {
  const dt = parseLocalDate(dateStr);
  if (!dt) return dateStr || '-';
  return `${HARI_ID[dt.getDay()]}, ${dt.getDate()} ${BULAN_ID[dt.getMonth()]} ${dt.getFullYear()}`;
};

const formatKelasDisplay = (kelas?: string): string => {
  const clean = (kelas || '').trim().replace(/^kelas\s+/i, '');
  if (!clean) return '-';
  const formattedParts = clean
    .split(',')
    .map(part => {
      const p = part.trim().replace(/^kelas\s+/i, '');
      const match = p.match(/^([789])\s*-?\s*([A-Za-z]+)$/);
      if (match) return `${match[1]}-${match[2].toUpperCase()}`;
      return p;
    })
    .filter(Boolean);
  if (formattedParts.length === 0) return '-';
  return `Kelas ${formattedParts.join(', ')}`;
};

type PopupFieldType = 'topik' | 'pendekatan' | 'teknik' | null;

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
  const [activePopup, setActivePopup] = useState<PopupFieldType>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const defaultDate = new Date().toISOString().split('T')[0];
  const initialGuruBk = getDefaultGuruBK(user);

  const [formData, setFormData] = useState({
    topik: '',
    anggota_siswa: '',
    kelas: '',
    tanggal: defaultDate,
    jam: '10:30 WIB',
    tempat: 'Ruang Konseling Kelompok BK',
    tujuan: '',
    media_diperlukan: '-',
    dinamika_kelompok: '',
    pendekatan: PENDEKATAN_KELOMPOK_PRESETS[0].pendekatan,
    teknik_konseling: PENDEKATAN_KELOMPOK_PRESETS[0].teknik_utama,
    fokus_utama: PENDEKATAN_KELOMPOK_PRESETS[0].fokus_utama,
    kasus_efektif: PENDEKATAN_KELOMPOK_PRESETS[0].kasus_efektif,
    kesepakatan: '',
    evaluasi: '',
    keterangan: 'Rencana Pelaksanaan Konseling Kelompok',
    guru_bk: initialGuruBk,
    guru_bk_nip: getGuruBkNip(initialGuruBk),
    foto_url: '',
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
        kelas: normalizeKelasKey(s.kelas || '') || s.kelas || '-',
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

    const isMultiClass = uniqueClasses.length > 1;
    const textFormatted = students
      .map((item, idx) =>
        isMultiClass
          ? `${idx + 1}. ${String(item.nama || '').toUpperCase()} (${item.kelas})`
          : `${idx + 1}. ${String(item.nama || '').toUpperCase()}`
      )
      .join('\n');

    setFormData(prev => ({
      ...prev,
      kelas: uniqueClasses.length > 0 ? uniqueClasses.join(', ') : prev.kelas,
      anggota_siswa: textFormatted,
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

  const handleSelectPendekatanPreset = (preset: PendekatanKelompokPreset) => {
    setFormData(prev => ({
      ...prev,
      pendekatan: preset.pendekatan,
      teknik_konseling: preset.teknik_utama,
      fokus_utama: preset.fokus_utama,
      kasus_efektif: preset.kasus_efektif,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topik.trim() || !formData.anggota_siswa.trim()) {
      showNotification('error', 'Mohon lengkapi Topik Permasalahan dan Nama Siswa / Anggota Kelompok.');
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
      media_diperlukan: formData.media_diperlukan.trim() || '-',
      tujuan: formData.tujuan.trim() || formData.topik.trim(),
      evaluasi: formData.evaluasi.trim() || formData.kesepakatan.trim(),
      keterangan: formData.keterangan.trim() || 'Rencana Pelaksanaan Konseling Kelompok',
      guru_bk_nip: formData.guru_bk_nip.trim() || getGuruBkNip(formData.guru_bk),
      created_at: new Date().toISOString(),
    };

    try {
      const updated = await sabdaService.saveKonselingKelompok(record);
      setKelompoks(updated);
      showNotification(
        'success',
        editingId ? 'Rencana konseling kelompok berhasil diperbarui!' : 'Rencana konseling kelompok berhasil disimpan!'
      );
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + err.message);
    }
  };

  const resetForm = () => {
    const gBk = getDefaultGuruBK(user);
    setEditingId(null);
    setSelectedStudents([]);
    setPickerSearch('');
    setFormData({
      topik: '',
      anggota_siswa: '',
      kelas: '',
      tanggal: defaultDate,
      jam: '10:30 WIB',
      tempat: 'Ruang Konseling Kelompok BK',
      tujuan: '',
      media_diperlukan: '-',
      dinamika_kelompok: '',
      pendekatan: PENDEKATAN_KELOMPOK_PRESETS[0].pendekatan,
      teknik_konseling: PENDEKATAN_KELOMPOK_PRESETS[0].teknik_utama,
      fokus_utama: PENDEKATAN_KELOMPOK_PRESETS[0].fokus_utama,
      kasus_efektif: PENDEKATAN_KELOMPOK_PRESETS[0].kasus_efektif,
      kesepakatan: '',
      evaluasi: '',
      keterangan: 'Rencana Pelaksanaan Konseling Kelompok',
      guru_bk: gBk,
      guru_bk_nip: getGuruBkNip(gBk),
      foto_url: '',
    });
  };

  const handleEdit = (item: KonselingKelompokBK) => {
    setEditingId(item.id);
    const matchedPreset = PENDEKATAN_KELOMPOK_PRESETS.find(
      p => item.pendekatan && p.pendekatan.toLowerCase() === item.pendekatan.toLowerCase()
    );
    const resolvedGuruBk =
      item.guru_bk && !item.guru_bk.toLowerCase().includes('administrator') ? item.guru_bk : getDefaultGuruBK(user);

    setFormData({
      topik: item.topik,
      anggota_siswa: item.anggota_siswa,
      kelas: item.kelas,
      tanggal: item.tanggal,
      jam: item.jam,
      tempat: item.tempat || 'Ruang Konseling Kelompok BK',
      tujuan: item.tujuan || '',
      media_diperlukan: item.media_diperlukan || '-',
      dinamika_kelompok: item.dinamika_kelompok || '',
      pendekatan: item.pendekatan || PENDEKATAN_KELOMPOK_PRESETS[0].pendekatan,
      teknik_konseling: item.teknik_konseling || PENDEKATAN_KELOMPOK_PRESETS[0].teknik_utama,
      fokus_utama: item.fokus_utama || matchedPreset?.fokus_utama || PENDEKATAN_KELOMPOK_PRESETS[0].fokus_utama,
      kasus_efektif: item.kasus_efektif || matchedPreset?.kasus_efektif || PENDEKATAN_KELOMPOK_PRESETS[0].kasus_efektif,
      kesepakatan: item.kesepakatan || '',
      evaluasi: item.evaluasi || '',
      keterangan: item.keterangan || 'Rencana Pelaksanaan Konseling Kelompok',
      guru_bk: resolvedGuruBk,
      guru_bk_nip: item.guru_bk_nip || getGuruBkNip(resolvedGuruBk),
      foto_url: item.foto_url || '',
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
    k.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (k.pendekatan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrintPendekatanDetails = (item: KonselingKelompokBK) => {
    const pendekatan = item.pendekatan || PENDEKATAN_KELOMPOK_PRESETS[0].pendekatan;
    const matchedPreset = PENDEKATAN_KELOMPOK_PRESETS.find(
      p => p.pendekatan.toLowerCase() === pendekatan.toLowerCase()
    );
    const teknik = item.teknik_konseling || matchedPreset?.teknik_utama || '-';
    const fokusUtama = item.fokus_utama || matchedPreset?.fokus_utama || '';
    const kasusEfektif = item.kasus_efektif || matchedPreset?.kasus_efektif || '';
    return { pendekatan, teknik, fokusUtama, kasusEfektif };
  };

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
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Bimbingan dan Konseling UPT SMP Negeri 7 Pasuruan
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold border animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className={statusMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Main Input Card matching 10-point structure */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Rencana Konseling Kelompok' : 'Formulir Rencana Konseling Kelompok'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Lengkapi 10 komponen rencana pelaksanaan konseling kelompok sesuai format resmi BK
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Hari / Tanggal / Waktu */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                1. Hari / Tanggal / Waktu
              </span>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                Format Cetak: {formatHariTanggalIndo(formData.tanggal)} ({formData.jam || '10:30 WIB'})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal *</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Waktu (WIB) *</label>
                <input
                  type="text"
                  placeholder="cth: 10:30 WIB"
                  value={formData.jam}
                  onChange={e => setFormData({ ...formData, jam: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tempat (Opsional)</label>
                <input
                  type="text"
                  placeholder="Ruang Konseling Kelompok BK"
                  value={formData.tempat}
                  onChange={e => setFormData({ ...formData, tempat: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-sm bg-white outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 2 & 3. Kelas & Nama Siswa / Anggota Kelompok */}
          <div className="p-4 sm:p-5 bg-purple-50/40 rounded-2xl border-2 border-purple-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <Users size={15} className="text-purple-600" />
                <span>2 &amp; 3. Kelas dan Nama Siswa / Anggota Kelompok *</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">2. Kelas *</label>
                <input
                  type="text"
                  placeholder="cth: 7A atau 7A, 7B"
                  value={formData.kelas}
                  onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-white font-bold text-slate-800 text-sm outline-none focus:border-purple-500"
                  required
                />
                {formData.kelas && (
                  <p className="text-[10px] font-bold text-purple-700 mt-1">
                    Tampilan Cetak: {formatKelasDisplay(formData.kelas)}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Pilihan Cepat Anggota Kelompok (Klik untuk Multi Pilih):
                </label>
                <div
                  onClick={openPickerModal}
                  className="w-full min-h-[46px] p-3 bg-white hover:bg-purple-50/30 border border-purple-200 rounded-xl transition-colors cursor-pointer"
                >
                  {selectedStudents.length === 0 ? (
                    <div className="flex items-center justify-between text-slate-400 text-xs sm:text-sm">
                      <span>Klik untuk memilih anggota kelompok lintas kelas...</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-bold shrink-0 ml-2">
                        Multi Pilih
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
                      {selectedStudents.map(s => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-xs font-bold text-slate-800"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-black">
                            {s.kelas}
                          </span>
                          <span className="uppercase">{s.nama}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedStudent(String(s.id))}
                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus siswa"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                3. Nama Siswa / Anggota Kelompok (Format Daftar Bernomor):
              </label>
              <textarea
                rows={3}
                placeholder={'cth:\n1. DEVANDRA ALVARO HIMAWAN\n2. RAMADHAN EKA PUTRA'}
                value={formData.anggota_siswa}
                onChange={e => setFormData({ ...formData, anggota_siswa: e.target.value })}
                className="w-full p-3 bg-white rounded-xl border border-purple-200 text-xs sm:text-sm font-bold uppercase text-slate-800 outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          {/* 4 & 5. Topik Permasalahan & Media yang Diperlukan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                  4. Topik Permasalahan *
                </label>
                <button
                  type="button"
                  onClick={() => setActivePopup('topik')}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Pilih Contoh</span>
                  <ChevronDown size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder="cth: Salah paham atau miss komunikasi antar teman"
                value={formData.topik}
                onChange={e => setFormData({ ...formData, topik: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                5. Media yang Diperlukan
              </label>
              <input
                type="text"
                placeholder="cth: - atau daftar presensi kelas"
                value={formData.media_diperlukan}
                onChange={e => setFormData({ ...formData, media_diperlukan: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {MEDIA_QUICK_OPTIONS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, media_diperlukan: m }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                      formData.media_diperlukan === m
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50'
                    }`}
                  >
                    {m === '-' ? 'Tidak ada (-)' : m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6. Ringkasan Uraian Permasalahan Siswa */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
              6. Ringkasan Uraian Permasalahan Siswa *
            </label>
            <textarea
              rows={4}
              placeholder="Jelaskan kronologi / uraian permasalahan yang dialami anggota kelompok..."
              value={formData.dinamika_kelompok}
              onChange={e => setFormData({ ...formData, dinamika_kelompok: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          {/* 7. Pendekatan dan Teknik Konseling */}
          <div className="p-4 sm:p-5 bg-purple-50/40 rounded-2xl border border-purple-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                7. Pendekatan dan Teknik Konseling
              </span>
              <button
                type="button"
                onClick={() => setActivePopup('pendekatan')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Compass size={13} />
                <span>Pilih Preset Pendekatan</span>
                <ChevronDown size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Pendekatan *</label>
                <input
                  type="text"
                  placeholder="cth: Reality Therapy (Kelompok WDEP)"
                  value={formData.pendekatan}
                  onChange={e => setFormData({ ...formData, pendekatan: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-sm outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">Teknik Utama *</label>
                  <button
                    type="button"
                    onClick={() => setActivePopup('teknik')}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Template Teknik</span>
                    <ChevronDown size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="cth: Group WDEP (Wants, Direction, Evaluation, Plan), Kontrak Perilaku Kelompok"
                  value={formData.teknik_konseling}
                  onChange={e => setFormData({ ...formData, teknik_konseling: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-sm outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fokus Utama</label>
                <textarea
                  rows={2}
                  placeholder="cth: Mendorong setiap anggota kelompok untuk mengevaluasi tindakan mereka dan berkomitmen pada perubahan nyata."
                  value={formData.fokus_utama}
                  onChange={e => setFormData({ ...formData, fokus_utama: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs sm:text-sm outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kasus Efektif</label>
                <textarea
                  rows={2}
                  placeholder="cth: Kenakalan remaja, masalah kepatuhan tata tertib sekolah, rendahnya motivasi belajar kelompok."
                  value={formData.kasus_efektif}
                  onChange={e => setFormData({ ...formData, kasus_efektif: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs sm:text-sm outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 8. Hasil yang Dicapai */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
              8. Hasil yang Dicapai *
            </label>
            <textarea
              rows={3}
              placeholder="cth: Setelah diadakan konseling kelompok dan identifikasi permasalahan, keduanya berkomitmen dan sepakat untuk tidak mengulangi kembali kesalahannya, dibuktikan berdamai saling memaafkan."
              value={formData.kesepakatan}
              onChange={e => setFormData({ ...formData, kesepakatan: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          {/* 9. Dokumentasi / Foto Kegiatan */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              <ImageIcon size={15} className="text-purple-600" />
              <span>9. Dokumentasi / Foto Kegiatan</span>
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

              <div className="h-36 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden group shadow-xs">
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

          {/* 10. Keterangan & Guru BK Penandatangan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                10. Keterangan
              </label>
              <input
                type="text"
                placeholder="Rencana Pelaksanaan Konseling Kelompok"
                value={formData.keterangan}
                onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-sm bg-white outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Guru Bimbingan dan Konseling
              </label>
              <select
                value={formData.guru_bk}
                onChange={e => {
                  const nama = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    guru_bk: nama,
                    guru_bk_nip: getGuruBkNip(nama),
                  }));
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-purple-500"
              >
                {GURU_BK_OPTIONS.map((nama, idx) => (
                  <option key={nama} value={nama}>
                    {idx + 1}. {nama}
                  </option>
                ))}
                {!GURU_BK_OPTIONS.includes(formData.guru_bk as any) &&
                  formData.guru_bk &&
                  !formData.guru_bk.toLowerCase().includes('administrator') && (
                    <option value={formData.guru_bk}>{formData.guru_bk}</option>
                  )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                NIP Guru BK
              </label>
              <input
                type="text"
                placeholder="19831116 200904 2 003"
                value={formData.guru_bk_nip}
                onChange={e => setFormData({ ...formData, guru_bk_nip: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-sm bg-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Batal</span>
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-lg shadow-purple-200 active:scale-95 transition-all cursor-pointer"
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
            <p className="text-xs text-slate-500 font-medium">Rekapitulasi rencana konseling kelompok peserta didik</p>
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
                <th className="px-6 py-4">Topik &amp; Kelas</th>
                <th className="px-6 py-4">Hari / Tanggal / Waktu</th>
                <th className="px-6 py-4">Anggota Kelompok</th>
                <th className="px-6 py-4">Hasil yang Dicapai</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Memuat data konseling kelompok...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Belum ada rekam konseling kelompok.
                  </td>
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
                          <div className="text-[10px] font-bold text-purple-700 uppercase">
                            {formatKelasDisplay(item.kelas)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-bold text-slate-700">{formatHariTanggalIndo(item.tanggal)}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{item.jam}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 max-w-xs whitespace-pre-line line-clamp-3">
                      {item.anggota_siswa}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {item.kesepakatan}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Cetak Rencana Konseling Kelompok"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Print Modal - Exact 10-Row Official Table Format */}
      {printItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div
            id="bk-print-area"
            className="bg-white rounded-3xl max-w-3xl w-full p-8 sm:p-10 shadow-2xl border border-slate-200 animate-in fade-in my-6 print:m-0 print:p-0 print:shadow-none print:border-none font-serif text-black"
          >
            {/* Title Header matching attached image */}
            <div className="text-center mb-5">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-black">
                RENCANA KONSELING KELOMPOK
              </h2>
              <p className="text-xs sm:text-sm font-bold uppercase text-black mt-0.5">
                BIMBINGAN DAN KONSELING UPT SMP NEGERI 7 PASURUAN
              </p>
            </div>

            {(() => {
              const { pendekatan, teknik, fokusUtama, kasusEfektif } = getPrintPendekatanDetails(printItem);
              return (
                <table className="w-full border-collapse border border-black text-[12px] leading-snug text-black">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold w-9 align-top">1</td>
                      <td className="border border-black px-2.5 py-2 font-bold w-[31%] align-top">
                        Hari / Tanggal / Waktu
                      </td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        {formatHariTanggalIndo(printItem.tanggal)} ({printItem.jam})
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">2</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Kelas</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        {formatKelasDisplay(printItem.kelas)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">3</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        Nama Siswa / Anggota Kelompok
                      </td>
                      <td className="border border-black px-2.5 py-2 font-bold uppercase whitespace-pre-line align-top">
                        {printItem.anggota_siswa}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">4</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Topik Permasalahan</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        {printItem.topik}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">5</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Media yang Diperlukan</td>
                      <td className="border border-black px-2.5 py-2 align-top">
                        {printItem.media_diperlukan || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">6</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        Ringkasan Uraian Permasalahan Siswa
                      </td>
                      <td className="border border-black px-2.5 py-2 whitespace-pre-line align-top">
                        {printItem.dinamika_kelompok || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">7</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        Pendekatan dan Teknik Konseling
                      </td>
                      <td className="border border-black px-2.5 py-2 space-y-0.5 align-top">
                        <div>Pendekatan: {pendekatan}</div>
                        <div>Teknik Utama: {teknik}</div>
                        {fokusUtama && <div>Fokus Utama: {fokusUtama}</div>}
                        {kasusEfektif && <div>Kasus Efektif: {kasusEfektif}</div>}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">8</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Hasil yang Dicapai</td>
                      <td className="border border-black px-2.5 py-2 whitespace-pre-line align-top">
                        {printItem.kesepakatan || printItem.evaluasi || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">9</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        Dokumentasi / Foto Kegiatan
                      </td>
                      <td className="border border-black px-2.5 py-2.5 align-top">
                        {printItem.foto_url ? (
                          <img
                            src={printItem.foto_url}
                            alt="Dokumentasi Foto Kegiatan Konseling Kelompok"
                            className="w-60 h-44 object-cover rounded-lg border border-slate-300"
                          />
                        ) : (
                          <span className="italic text-slate-500">Belum ada foto dokumentasi</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">10</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Keterangan</td>
                      <td className="border border-black px-2.5 py-2 align-top">
                        {printItem.keterangan || 'Rencana Pelaksanaan Konseling Kelompok'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}

            {/* Dual Signature Block matching attached image */}
            <div className="avoid-break grid grid-cols-2 gap-8 mt-8 text-center text-[12px] text-black leading-snug">
              <div>
                <p>Mengetahui,</p>
                <p>Kepala SMP Negeri 7 Pasuruan</p>
                <div className="h-16" />
                <p className="font-bold underline uppercase">NUR FADILAH, S.Pd., M.Pd</p>
                <p>NIP. 19860410 201001 2 030</p>
              </div>
              <div>
                <p>Pasuruan, {formatTanggalIndo(printItem.tanggal)}</p>
                <p>Guru Bimbingan dan Konseling</p>
                <div className="h-16" />
                <p className="font-bold underline uppercase">{printItem.guru_bk || 'WIWIK ISMIATI, S.Pd'}</p>
                <p>NIP. {printItem.guru_bk_nip || getGuruBkNip(printItem.guru_bk)}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-200 print:hidden font-sans">
              <button
                type="button"
                onClick={() => setPrintItem(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => printBKReport('bk-print-area', `Rencana Konseling Kelompok - ${printItem.topik}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 shadow-md shadow-purple-200 cursor-pointer"
              >
                <Printer size={16} />
                <span>Cetak / Simpan PDF</span>
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
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Rencana Konseling?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Data rekam konseling kelompok ini akan dihapus permanen.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteConfirmId)}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 cursor-pointer"
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
                        <p className="font-extrabold text-slate-800 text-sm uppercase truncate">{s.nama}</p>
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
                Total <span className="font-bold text-slate-900">{tempSelectedMap.size} anggota</span> siap dimasukkan
                ke Konseling Kelompok.
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

      {/* Popup Selector Modal for Topik / Pendekatan / Teknik */}
      {activePopup && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setActivePopup(null)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  {activePopup === 'topik' && <AlertCircle size={18} />}
                  {activePopup === 'pendekatan' && <Compass size={18} />}
                  {activePopup === 'teknik' && <Wrench size={18} />}
                </div>
                <div>
                  <h4 className="text-sm font-black leading-tight">
                    {activePopup === 'topik' && 'Pilih Contoh Topik Permasalahan'}
                    {activePopup === 'pendekatan' && 'Pilih Preset Pendekatan Kelompok'}
                    {activePopup === 'teknik' && 'Pilih Template Teknik Konseling'}
                  </h4>
                  <p className="text-[11px] text-white/85">
                    {activePopup === 'pendekatan'
                      ? 'Mengisi Pendekatan, Teknik Utama, Fokus Utama & Kasus Efektif secara otomatis'
                      : 'Klik salah satu pilihan di bawah (dapat diedit manual setelah dipilih)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopup(null)}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2">
              {activePopup === 'pendekatan'
                ? PENDEKATAN_KELOMPOK_PRESETS.map((preset, idx) => {
                    const isSelected = formData.pendekatan === preset.pendekatan;
                    return (
                      <button
                        key={preset.pendekatan}
                        type="button"
                        onClick={() => {
                          handleSelectPendekatanPreset(preset);
                          setActivePopup(null);
                        }}
                        className={`w-full flex flex-col gap-1 px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                            : 'bg-slate-50 hover:bg-purple-50/70 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-black text-sm">
                          <span>
                            {idx + 1}. {preset.pendekatan}
                          </span>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-white/20 shrink-0 ml-2">
                              <Check size={14} className="stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                          Teknik: {preset.teknik_utama}
                        </div>
                      </button>
                    );
                  })
                : (activePopup === 'topik' ? TOPIK_PERMASALAHAN_OPTIONS : TEKNIK_KELOMPOK_OPTIONS).map(
                    (option, idx) => {
                      const currentVal = activePopup === 'topik' ? formData.topik : formData.teknik_konseling;
                      const isSelected = currentVal === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            if (activePopup === 'topik') {
                              setFormData(prev => ({ ...prev, topik: option }));
                            } else {
                              setFormData(prev => ({ ...prev, teknik_konseling: option }));
                            }
                            setActivePopup(null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left font-bold text-sm transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                              : 'bg-slate-50 hover:bg-purple-50/70 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span>
                            {idx + 1}. {option}
                          </span>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-white/20 shrink-0 ml-2">
                              <Check size={14} className="stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
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
