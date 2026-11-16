import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Save,
  Trash2,
  Edit2,
  Search,
  Printer,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Compass,
  Wrench,
  Image as ImageIcon,
  Upload,
  Eye,
} from 'lucide-react';
import { sabdaService, KonselingIndividualBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import { printBKReport } from './BKKopSurat';

const CLASSES = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H',
];

const PERMASALAHAN_SISWA_OPTIONS = [
  'Siswa beberapa kali bolos tanpa izin orang tua',
  'Siswa kurang percaya diri',
  'Siswa sering terlambat datang ke sekolah',
  'Siswa suka menunda tugas pelajaran',
  'Siswa mengalami konflik dengan teman sebaya',
  'Siswa melakukan perundungan / bullying',
  'Siswa mengalami kecemasan akademik',
  'Siswa kurang disiplin dalam tata tertib sekolah',
  'Siswa bingung menentukan minat dan cita-cita',
] as const;

interface PendekatanPreset {
  pendekatan: string;
  teknik_utama: string;
  fokus: string;
  kasus_efektif: string;
}

const PENDEKATAN_PRESETS: readonly PendekatanPreset[] = [
  {
    pendekatan: 'Person-Centered',
    teknik_utama: 'Empati Akurat, Refleksi Perasaan, Penerimaan Tanpa Syarat',
    fokus: 'Membantu konseli menemukan potensi dirinya melalui ruang yang aman dan empati.',
    kasus_efektif: 'Masalah konsep diri, pencarian jati diri, eksplorasi emosi.',
  },
  {
    pendekatan: 'Behavioristik',
    teknik_utama: 'Kontrak Perilaku, Reinforcement Positif, Self-Management',
    fokus: 'Mengubah perilaku maladaptif menjadi perilaku adaptif yang terukur dan konsisten.',
    kasus_efektif: 'Sering terlambat, membolos, ketidakdisiplinan tata tertib.',
  },
  {
    pendekatan: 'Cognitive Behavioral Therapy (CBT)',
    teknik_utama: 'Identifikasi Pikiran Otomatis, Restrukturisasi Kognitif, Relaksasi',
    fokus: 'Mengidentifikasi serta mengubah pola pikir irasional agar berdampak positif pada emosi dan perilaku.',
    kasus_efektif: 'Kecemasan akademik, kurang percaya diri, ketakutan sosial.',
  },
  {
    pendekatan: 'Realitas (Reality Therapy)',
    teknik_utama: 'WDEP (Want, Doing, Evaluation, Plan), Konfrontasi Konstruktif',
    fokus: 'Mendorong konseli bertanggung jawab penuh atas pilihan hidupnya dan menyusun rencana nyata.',
    kasus_efektif: 'Tanggung jawab belajar, manajemen waktu, perilaku melanggar aturan.',
  },
  {
    pendekatan: 'Solution-Focused Brief Therapy (SFBT)',
    teknik_utama: 'Miracle Question, Scaling Question, Eksplorasi Kekuatan (Exception)',
    fokus: 'Berorientasi pada solusi praktis masa depan dan keberhasilan kecil yang sudah dimiliki konseli.',
    kasus_efektif: 'Kebingungan tujuan belajar, motivasi menurun, masalah ringan hingga sedang.',
  },
  {
    pendekatan: 'REBT (Rational Emotive Behavior Therapy)',
    teknik_utama: 'Disputing Keyakinan Irasional, Reframing, Tugas Rumah Perilaku',
    fokus: 'Mengganti keyakinan irasional yang merusak diri menjadi keyakinan rasional yang sehat.',
    kasus_efektif: 'Emosi meledak, konflik teman sebaya, mudah menyerah.',
  },
];

const TEKNIK_KONSELING_OPTIONS = [
  'Empati Akurat, Refleksi Perasaan, Penerimaan Tanpa Syarat',
  'Empati, refleksi perasaan, penguatan positif',
  'Kontrak perilaku, reinforcement positif, pemantauan diri',
  'Identifikasi pikiran negatif, restrukturisasi kognitif',
  'Active listening, WDEP, problem solving',
  'Konfrontasi konstruktif, tanggung jawab, kontrak perilaku',
  'Relaksasi, refleksi perasaan, restrukturisasi kognitif',
  'Miracle question, scaling question, goal setting',
] as const;

const MEDIA_QUICK_OPTIONS = [
  'daftar presensi kelas',
  'buku catatan konseling BK',
  'buku tata tertib siswa',
  'surat izin / kartu kendali siswa',
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
  const match = clean.match(/^([789])\s*-?\s*([A-Za-z]+)$/);
  if (match) return `Kelas ${match[1]}-${match[2].toUpperCase()}`;
  return `Kelas ${clean}`;
};

type PopupFieldType = 'permasalahan' | 'pendekatan' | 'teknik' | null;

export default function BKKonselingIndividual({ user }: { user?: any }) {
  const [konselings, setKonselings] = useState<KonselingIndividualBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<KonselingIndividualBK | null>(null);
  const [activePopup, setActivePopup] = useState<PopupFieldType>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const defaultDate = new Date().toISOString().split('T')[0];
  const initialGuruBk = getDefaultGuruBK(user);

  const [formData, setFormData] = useState({
    siswa_id: '',
    nama_siswa: '',
    kelas: '7A',
    tanggal: defaultDate,
    jam: '09:00 WIB',
    bidang: 'Belajar' as 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir',
    permasalahan_siswa: '',
    media_diperlukan: 'daftar presensi kelas',
    gejala_masalah: '',
    pendekatan: '',
    teknik_konseling: '',
    fokus_konseling: '',
    kasus_efektif: '',
    pendekatan_teknik: '',
    proses_konseling: '',
    rencana_tindak_lanjut: '',
    keterangan: 'Rencana Pelaksanaan Konseling Individu',
    guru_bk: initialGuruBk,
    guru_bk_nip: getGuruBkNip(initialGuruBk),
    status: 'Proses' as 'Proses' | 'Selesai',
    foto_url: '',
  });

  useEffect(() => {
    loadData();
    loadSiswa();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getKonselingIndividual();
      setKonselings(data);
    } catch (e: any) {
      console.error('Error loading konseling individual:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSiswa = async () => {
    try {
      const saved = localStorage.getItem('sitelat_siswa') || localStorage.getItem('master_siswa');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSiswaList(parsed);
        }
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
        const { data } = await supabase.from('master_siswa').select('id, nama, kelas').order('nama', { ascending: true });
        if (data && data.length > 0) setSiswaList(data);
      }
    } catch (e) {
      console.warn('Notice loading siswa for individual counseling:', e);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleSelectKelas = (newKelas: string) => {
    setFormData(prev => ({
      ...prev,
      kelas: newKelas,
      siswa_id: '',
      nama_siswa: '',
    }));
  };

  const handleSelectSiswa = (siswaId: string) => {
    const s = siswaList.find(x => x.id === siswaId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        siswa_id: s.id,
        nama_siswa: s.nama,
        kelas: s.kelas || prev.kelas,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        siswa_id: '',
        nama_siswa: '',
      }));
    }
  };

  const filteredSiswa = siswaList
    .filter(s => {
      if (!formData.kelas) return false;
      return normalizeKelasKey(s.kelas) === normalizeKelasKey(formData.kelas);
    })
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

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
          const path = `konseling_individual/ki_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
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
      showNotification('success', 'Dokumentasi foto kegiatan konseling berhasil ditambahkan!');
    } catch (err: any) {
      showNotification('error', err?.message || 'Gagal memproses foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSelectPendekatanPreset = (preset: PendekatanPreset) => {
    setFormData(prev => ({
      ...prev,
      pendekatan: preset.pendekatan,
      teknik_konseling: preset.teknik_utama,
      fokus_konseling: preset.fokus,
      kasus_efektif: preset.kasus_efektif,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_siswa.trim()) {
      showNotification('error', 'Mohon pilih atau isi Nama Siswa terlebih dahulu.');
      return;
    }
    if (!formData.permasalahan_siswa.trim()) {
      showNotification('error', 'Mohon isi Topik Permasalahan terlebih dahulu.');
      return;
    }
    if (!formData.pendekatan.trim()) {
      showNotification('error', 'Mohon isi Pendekatan Konseling terlebih dahulu.');
      return;
    }
    if (!formData.teknik_konseling.trim()) {
      showNotification('error', 'Mohon isi Teknik Utama Konseling terlebih dahulu.');
      return;
    }

    const combinedPendekatanTeknik = `${formData.pendekatan} / ${formData.teknik_konseling}`;

    const record: KonselingIndividualBK = {
      id: editingId || `ki-${Date.now()}`,
      ...formData,
      pendekatan_teknik: combinedPendekatanTeknik,
      rencana_tindak_lanjut: formData.rencana_tindak_lanjut || formData.proses_konseling,
      keterangan: formData.keterangan.trim() || 'Rencana Pelaksanaan Konseling Individu',
      guru_bk_nip: formData.guru_bk_nip.trim() || getGuruBkNip(formData.guru_bk),
      created_at: new Date().toISOString(),
    };

    try {
      const updated = await sabdaService.saveKonselingIndividual(record);
      setKonselings(updated);
      showNotification(
        'success',
        editingId ? 'Rencana konseling individu berhasil diperbarui!' : 'Rencana konseling individu berhasil disimpan!'
      );
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + err.message);
    }
  };

  const resetForm = () => {
    const gBk = getDefaultGuruBK(user);
    setEditingId(null);
    setFormData({
      siswa_id: '',
      nama_siswa: '',
      kelas: '7A',
      tanggal: defaultDate,
      jam: '09:00 WIB',
      bidang: 'Belajar',
      permasalahan_siswa: '',
      media_diperlukan: 'daftar presensi kelas',
      gejala_masalah: '',
      pendekatan: '',
      teknik_konseling: '',
      fokus_konseling: '',
      kasus_efektif: '',
      pendekatan_teknik: '',
      proses_konseling: '',
      rencana_tindak_lanjut: '',
      keterangan: 'Rencana Pelaksanaan Konseling Individu',
      guru_bk: gBk,
      guru_bk_nip: getGuruBkNip(gBk),
      status: 'Proses',
      foto_url: '',
    });
  };

  const handleEdit = (item: KonselingIndividualBK) => {
    setEditingId(item.id);
    const parts = (item.pendekatan_teknik || '').split(' / ').map(p => p.trim());
    const parsedPendekatan = item.pendekatan || parts[0] || '';
    const parsedTeknik = item.teknik_konseling || (parts.length > 1 ? parts.slice(1).join(' / ') : '');
    const matchedPreset = PENDEKATAN_PRESETS.find(
      p => p.pendekatan.toLowerCase() === parsedPendekatan.toLowerCase()
    );

    setFormData({
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      kelas: item.kelas,
      tanggal: item.tanggal,
      jam: item.jam,
      bidang: item.bidang,
      permasalahan_siswa: item.permasalahan_siswa || '',
      media_diperlukan: item.media_diperlukan || '',
      gejala_masalah: item.gejala_masalah || '',
      pendekatan: parsedPendekatan,
      teknik_konseling: parsedTeknik,
      fokus_konseling: item.fokus_konseling || matchedPreset?.fokus || '',
      kasus_efektif: item.kasus_efektif || matchedPreset?.kasus_efektif || '',
      pendekatan_teknik: item.pendekatan_teknik || '',
      proses_konseling: item.proses_konseling || '',
      rencana_tindak_lanjut: item.rencana_tindak_lanjut || '',
      keterangan: item.keterangan || 'Rencana Pelaksanaan Konseling Individu',
      guru_bk: item.guru_bk,
      guru_bk_nip: item.guru_bk_nip || getGuruBkNip(item.guru_bk),
      status: item.status,
      foto_url: item.foto_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteKonselingIndividual(id);
      setKonselings(updated);
      showNotification('success', 'Rencana konseling individu berhasil dihapus.');
      setDeleteConfirmId(null);
    } catch (e: any) {
      showNotification('error', 'Gagal menghapus: ' + e.message);
    }
  };

  const filtered = konselings.filter(k =>
    k.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (k.permasalahan_siswa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (k.pendekatan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (k.teknik_konseling || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.gejala_masalah.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.bidang.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to resolve structured fields when printing older or newly created items
  const getPrintPendekatanDetails = (item: KonselingIndividualBK) => {
    const parts = (item.pendekatan_teknik || '').split(' / ').map(p => p.trim());
    const pendekatan = item.pendekatan || parts[0] || '-';
    const teknik =
      item.teknik_konseling || (parts.length > 1 ? parts.slice(1).join(' / ') : '-');
    const matchedPreset = PENDEKATAN_PRESETS.find(
      p => p.pendekatan.toLowerCase() === pendekatan.toLowerCase()
    );
    const fokus = item.fokus_konseling || matchedPreset?.fokus || '';
    const kasusEfektif = item.kasus_efektif || matchedPreset?.kasus_efektif || '';
    return { pendekatan, teknik, fokus, kasusEfektif };
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-sky-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            FORM E
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rencana Konseling Individu</h2>
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
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Rencana Konseling Individu' : 'Formulir Rencana Konseling Individu'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Lengkapi 10 komponen rencana pelaksanaan konseling individu sesuai format resmi BK
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Hari / Tanggal / Waktu */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                1. Hari / Tanggal / Waktu &amp; Bidang
              </span>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                Format Cetak: {formatHariTanggalIndo(formData.tanggal)} ({formData.jam || '09:00 WIB'})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal *</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Waktu (WIB) *</label>
                <input
                  type="text"
                  placeholder="cth: 09:21 WIB"
                  value={formData.jam}
                  onChange={e => setFormData({ ...formData, jam: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Bidang Bimbingan</label>
                <select
                  value={formData.bidang}
                  onChange={e => setFormData({ ...formData, bidang: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
                >
                  <option value="Pribadi">Pribadi</option>
                  <option value="Sosial">Sosial</option>
                  <option value="Belajar">Belajar</option>
                  <option value="Karir">Karir</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Status Layanan</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
                >
                  <option value="Proses">Proses</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2 & 3. Kelas & Nama Siswa */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                2 &amp; 3. Kelas dan Nama Siswa
              </span>
              {formData.kelas && (
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  {formatKelasDisplay(formData.kelas)} · {filteredSiswa.length} Siswa
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">2. Kelas *</label>
                <select
                  value={formData.kelas}
                  onChange={e => handleSelectKelas(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {CLASSES.map(c => (
                    <option key={c} value={c}>
                      Kelas {c[0]}-{c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[11px] font-bold text-slate-500">3. Nama Siswa *</label>
                {siswaList.length > 0 && (
                  <select
                    value={formData.siswa_id}
                    onChange={e => handleSelectSiswa(e.target.value)}
                    disabled={!formData.kelas}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500 disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.kelas
                        ? '-- Pilih Kelas Terlebih Dahulu --'
                        : filteredSiswa.length === 0
                        ? '-- Tidak Ada Siswa di Kelas Ini --'
                        : `-- Pilih Siswa (${filteredSiswa.length} Siswa) --`}
                    </option>
                    {filteredSiswa.map((s, idx) => (
                      <option key={s.id || `${s.nama}-${idx}`} value={s.id}>
                        {idx + 1}. {s.nama} {s.nis ? `(NIS: ${s.nis})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder="Nama lengkap siswa (terisi otomatis atau ketik manual)..."
                  value={formData.nama_siswa}
                  onChange={e => setFormData({ ...formData, nama_siswa: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500 uppercase"
                  required
                />
              </div>
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
                  onClick={() => setActivePopup('permasalahan')}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Pilih Contoh</span>
                  <ChevronDown size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder="cth: Siswa beberapa kali bolos tanpa izin orang tua"
                value={formData.permasalahan_siswa}
                onChange={e => setFormData({ ...formData, permasalahan_siswa: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                5. Media yang Diperlukan
              </label>
              <input
                type="text"
                placeholder="cth: daftar presensi kelas"
                value={formData.media_diperlukan}
                onChange={e => setFormData({ ...formData, media_diperlukan: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-medium text-slate-800 transition-all text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {MEDIA_QUICK_OPTIONS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, media_diperlukan: m }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                      formData.media_diperlukan === m
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50'
                    }`}
                  >
                    {m}
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
              placeholder={
                'cth:\nSetelah diadakan konseling individu, di dapat hasil:\nsiswa tidak masuk / bolos tanpa izin orang tua, di karenakan :\n1. ...\n2. ...'
              }
              value={formData.gejala_masalah}
              onChange={e => setFormData({ ...formData, gejala_masalah: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          {/* 7. Pendekatan dan Teknik Konseling */}
          <div className="p-4 sm:p-5 bg-sky-50/40 rounded-2xl border border-sky-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                7. Pendekatan dan Teknik Konseling
              </span>
              <button
                type="button"
                onClick={() => setActivePopup('pendekatan')}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                  placeholder="cth: Person-Centered"
                  value={formData.pendekatan}
                  onChange={e => setFormData({ ...formData, pendekatan: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-sm outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">Teknik Utama *</label>
                  <button
                    type="button"
                    onClick={() => setActivePopup('teknik')}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Template Teknik</span>
                    <ChevronDown size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="cth: Empati Akurat, Refleksi Perasaan, Penerimaan Tanpa Syarat"
                  value={formData.teknik_konseling}
                  onChange={e => setFormData({ ...formData, teknik_konseling: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-sm outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Fokus</label>
                <textarea
                  rows={2}
                  placeholder="cth: Membantu konseli menemukan potensi dirinya melalui ruang yang aman dan empati."
                  value={formData.fokus_konseling}
                  onChange={e => setFormData({ ...formData, fokus_konseling: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs sm:text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kasus Efektif</label>
                <textarea
                  rows={2}
                  placeholder="cth: Masalah konsep diri, pencarian jati diri, eksplorasi emosi."
                  value={formData.kasus_efektif}
                  onChange={e => setFormData({ ...formData, kasus_efektif: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs sm:text-sm outline-none focus:border-sky-500"
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
              placeholder="cth: Setelah diadakan konseling individu, siswa memahami permasalahannya dan berjanji tidak akan mengulangi kembali."
              value={formData.proses_konseling}
              onChange={e => setFormData({ ...formData, proses_konseling: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          {/* 9. Dokumentasi / Foto Kegiatan */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              <ImageIcon size={15} className="text-sky-600" />
              <span>9. Dokumentasi / Foto Kegiatan</span>
            </label>
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Masukkan link foto (URL) atau unggah foto kegiatan..."
                  value={formData.foto_url}
                  onChange={e => setFormData({ ...formData, foto_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none text-xs sm:text-sm text-slate-800"
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
                    className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
                      alt="Dokumentasi Foto Kegiatan"
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
                placeholder="Rencana Pelaksanaan Konseling Individu"
                value={formData.keterangan}
                onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-sm bg-white outline-none focus:border-sky-500"
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
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm shadow-lg shadow-sky-200 active:scale-95 transition-all cursor-pointer"
            >
              <Save size={18} />
              <span>{editingId ? 'Simpan Perubahan' : 'Simpan Rencana Konseling'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Counseling History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Daftar Rekam Konseling Individu</h3>
            <p className="text-xs text-slate-500 font-medium">Rekap data rencana konseling individu siswa SMPN 7 Pasuruan</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa atau masalah..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none text-xs font-medium w-56 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Siswa &amp; Kelas</th>
                <th className="px-6 py-4">Hari / Tanggal / Waktu</th>
                <th className="px-6 py-4">Topik Permasalahan</th>
                <th className="px-6 py-4">Pendekatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Memuat data konseling...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Belum ada rekam konseling individu.
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
                            className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:ring-2 hover:ring-sky-400 transition-all cursor-pointer"
                            title="Lihat Foto Kegiatan"
                          >
                            <img src={item.foto_url} alt="Foto" className="w-full h-full object-cover" />
                          </button>
                        )}
                        <div>
                          <div className="font-black text-slate-800 text-xs uppercase">{item.nama_siswa}</div>
                          <div className="text-[10px] font-bold text-sky-700 uppercase">
                            {formatKelasDisplay(item.kelas)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-bold text-slate-700">{formatHariTanggalIndo(item.tanggal)}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{item.jam}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs">
                      {item.permasalahan_siswa && (
                        <div className="font-bold text-slate-800 truncate">{item.permasalahan_siswa}</div>
                      )}
                      <div className="truncate text-slate-500">{item.gejala_masalah}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 inline-block max-w-[160px] truncate">
                        {item.pendekatan || item.pendekatan_teknik?.split(' / ')[0] || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Cetak Rencana Konseling Individu"
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
            {/* Title Header matching template */}
            <div className="text-center mb-5">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-black">
                RENCANA KONSELING INDIVIDU
              </h2>
              <p className="text-xs sm:text-sm font-bold uppercase text-black mt-0.5">
                BIMBINGAN DAN KONSELING UPT SMP NEGERI 7 PASURUAN
              </p>
            </div>

            {(() => {
              const { pendekatan, teknik, fokus, kasusEfektif } = getPrintPendekatanDetails(printItem);
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
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Nama Siswa</td>
                      <td className="border border-black px-2.5 py-2 font-bold uppercase align-top">
                        {printItem.nama_siswa}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">4</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Topik Permasalahan</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">
                        {printItem.permasalahan_siswa || '-'}
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
                        {printItem.gejala_masalah || '-'}
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
                        {fokus && <div>Fokus: {fokus}</div>}
                        {kasusEfektif && <div>Kasus Efektif: {kasusEfektif}</div>}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold align-top">8</td>
                      <td className="border border-black px-2.5 py-2 font-bold align-top">Hasil yang Dicapai</td>
                      <td className="border border-black px-2.5 py-2 whitespace-pre-line align-top">
                        {printItem.proses_konseling || '-'}
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
                            alt="Dokumentasi Kegiatan Konseling Individu"
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
                        {printItem.keterangan || 'Rencana Pelaksanaan Konseling Individu'}
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
                onClick={() => printBKReport('bk-print-area', `Rencana Konseling Individu - ${printItem.nama_siswa}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black hover:bg-sky-700 shadow-md shadow-sky-200 cursor-pointer"
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
              Data rekam rencana konseling individu ini akan dihapus permanen.
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

      {/* Popup Selector Modal */}
      {activePopup && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setActivePopup(null)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  {activePopup === 'permasalahan' && <AlertCircle size={18} />}
                  {activePopup === 'pendekatan' && <Compass size={18} />}
                  {activePopup === 'teknik' && <Wrench size={18} />}
                </div>
                <div>
                  <h4 className="text-sm font-black leading-tight">
                    {activePopup === 'permasalahan' && 'Pilih Contoh Topik Permasalahan'}
                    {activePopup === 'pendekatan' && 'Pilih Preset Pendekatan Konseling'}
                    {activePopup === 'teknik' && 'Pilih Template Teknik Konseling'}
                  </h4>
                  <p className="text-[11px] text-white/85">
                    {activePopup === 'pendekatan'
                      ? 'Mengisi Pendekatan, Teknik Utama, Fokus & Kasus Efektif secara otomatis'
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
                ? PENDEKATAN_PRESETS.map((preset, idx) => {
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
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-200'
                            : 'bg-slate-50 hover:bg-sky-50/70 text-slate-700 border-slate-200'
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
                : (activePopup === 'permasalahan' ? PERMASALAHAN_SISWA_OPTIONS : TEKNIK_KONSELING_OPTIONS).map(
                    (option, idx) => {
                      const currentVal =
                        activePopup === 'permasalahan' ? formData.permasalahan_siswa : formData.teknik_konseling;
                      const isSelected = currentVal === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            if (activePopup === 'permasalahan') {
                              setFormData(prev => ({ ...prev, permasalahan_siswa: option }));
                            } else {
                              setFormData(prev => ({ ...prev, teknik_konseling: option }));
                            }
                            setActivePopup(null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left font-bold text-sm transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-200'
                              : 'bg-slate-50 hover:bg-sky-50/70 text-slate-700 border-slate-200'
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
              alt="Pratinjau Foto Kegiatan Konseling Individu"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
