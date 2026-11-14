import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, ChevronDown, Check, X, AlertCircle, Compass, Wrench, Image as ImageIcon, Upload, Eye } from 'lucide-react';
import { sabdaService, KonselingIndividualBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

const PERMASALAHAN_SISWA_OPTIONS = [
  'Siswa kurang percaya diri',
  'Siswa sering terlambat',
  'Siswa suka menunda tugas',
  'Siswa mengalami konflik teman',
  'Siswa melakukan perundungan',
  'Siswa mengalami kecemasan akademik',
  'Siswa kurang disiplin',
  'Siswa bingung menentukan cita-cita',
] as const;

const PENDEKATAN_OPTIONS = [
  'Person Centered',
  'Behavioristik',
  'Kognitif dan REBT',
  'Person Centered dan Realitas',
  'Realitas dan Behavioristik',
  'Person Centered dan Kognitif',
  'Realitas',
  'Solution Focused',
] as const;

const TEKNIK_KONSELING_OPTIONS = [
  'Empati, refleksi perasaan, penguatan',
  'Kontrak perilaku, reinforcement',
  'Identifikasi pikiran, restrukturisasi kognitif',
  'Active listening, problem solving',
  'Konfrontasi konstruktif, tanggung jawab, kontrak perilaku',
  'Relaksasi, refleksi perasaan, restrukturisasi kognitif',
  'Evaluasi perilaku, perencanaan tindakan',
  'Eksplorasi potensi, goal setting',
] as const;

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

  const [formData, setFormData] = useState({
    siswa_id: '',
    nama_siswa: '',
    kelas: '7A',
    tanggal: defaultDate,
    jam: '09:00 WIB',
    bidang: 'Belajar' as const,
    permasalahan_siswa: '',
    gejala_masalah: '',
    pendekatan: '',
    teknik_konseling: '',
    pendekatan_teknik: '',
    proses_konseling: '',
    rencana_tindak_lanjut: '',
    guru_bk: getDefaultGuruBK(user),
    status: 'Proses' as const,
    foto_url: ''
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
    // 1. Immediately populate from local cache if available
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
      nama_siswa: ''
    }));
  };

  const handleSelectSiswa = (siswaId: string) => {
    const s = siswaList.find(x => x.id === siswaId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        siswa_id: s.id,
        nama_siswa: s.nama,
        kelas: s.kelas || prev.kelas
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        siswa_id: '',
        nama_siswa: ''
      }));
    }
  };

  const filteredSiswa = siswaList.filter(s => {
    if (!formData.kelas) return false;
    return normalizeKelasKey(s.kelas) === normalizeKelasKey(formData.kelas);
  }).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

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
      showNotification('success', 'Foto kegiatan konseling berhasil ditambahkan!');
    } catch (err: any) {
      showNotification('error', err?.message || 'Gagal memproses foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_siswa.trim()) {
      showNotification('error', 'Mohon pilih siswa terlebih dahulu.');
      return;
    }
    if (!formData.permasalahan_siswa.trim()) {
      showNotification('error', 'Mohon pilih Permasalahan Siswa terlebih dahulu.');
      return;
    }
    if (!formData.pendekatan.trim()) {
      showNotification('error', 'Mohon pilih Pendekatan yang digunakan terlebih dahulu.');
      return;
    }
    if (!formData.teknik_konseling.trim()) {
      showNotification('error', 'Mohon pilih Teknik konseling yang digunakan terlebih dahulu.');
      return;
    }

    const combinedPendekatanTeknik = `${formData.pendekatan} / ${formData.teknik_konseling}`;

    const record: KonselingIndividualBK = {
      id: editingId || `ki-${Date.now()}`,
      ...formData,
      pendekatan_teknik: combinedPendekatanTeknik,
      created_at: new Date().toISOString()
    };

    try {
      const updated = await sabdaService.saveKonselingIndividual(record);
      setKonselings(updated);
      showNotification('success', editingId ? 'Rencana konseling individual berhasil diperbarui!' : 'Rencana konseling individual berhasil disimpan!');
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      siswa_id: '',
      nama_siswa: '',
      kelas: '7A',
      tanggal: defaultDate,
      jam: '09:00 WIB',
      bidang: 'Belajar',
      permasalahan_siswa: '',
      gejala_masalah: '',
      pendekatan: '',
      teknik_konseling: '',
      pendekatan_teknik: '',
      proses_konseling: '',
      rencana_tindak_lanjut: '',
      guru_bk: getDefaultGuruBK(user),
      status: 'Proses',
      foto_url: ''
    });
  };

  const handleEdit = (item: KonselingIndividualBK) => {
    setEditingId(item.id);
    const parts = (item.pendekatan_teknik || '').split(' / ').map(p => p.trim());
    const parsedPendekatan = item.pendekatan || parts[0] || '';
    const parsedTeknik = item.teknik_konseling || (parts.length > 1 ? parts.slice(1).join(' / ') : '');
    setFormData({
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      kelas: item.kelas,
      tanggal: item.tanggal,
      jam: item.jam,
      bidang: item.bidang,
      permasalahan_siswa: item.permasalahan_siswa || '',
      gejala_masalah: item.gejala_masalah,
      pendekatan: parsedPendekatan,
      teknik_konseling: parsedTeknik,
      pendekatan_teknik: item.pendekatan_teknik || '',
      proses_konseling: item.proses_konseling,
      rencana_tindak_lanjut: item.rencana_tindak_lanjut,
      guru_bk: item.guru_bk,
      status: item.status,
      foto_url: item.foto_url || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteKonselingIndividual(id);
      setKonselings(updated);
      showNotification('success', 'Rencana konseling individual berhasil dihapus.');
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-sky-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            FORM E
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rencana Konseling Individual</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Layanan konseling tatap muka intensif per siswa SMPN 7 Pasuruan</p>
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
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Konseling Individual' : 'Form Rencana Konseling Individual'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Penyusunan rencana layanan dan rekam proses konseling konseli</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Siswa & Kelas */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Identitas Konseli (Siswa)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Pilih Kelas *</label>
                <select
                  value={formData.kelas}
                  onChange={e => handleSelectKelas(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500 transition-colors"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {CLASSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-500">Pilih Siswa *</label>
                  {formData.kelas && (
                    <span className="text-[10px] font-extrabold text-sky-700 bg-sky-100/70 px-2.5 py-0.5 rounded-full border border-sky-200">
                      {filteredSiswa.length} Siswa di Kelas {formData.kelas}
                    </span>
                  )}
                </div>
                {siswaList.length > 0 ? (
                  <select
                    value={formData.siswa_id}
                    onChange={e => handleSelectSiswa(e.target.value)}
                    disabled={!formData.kelas}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-sky-500 disabled:opacity-50 transition-colors"
                    required
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
                ) : (
                  <input 
                    type="text"
                    placeholder="Nama siswa..."
                    value={formData.nama_siswa}
                    onChange={e => setFormData({ ...formData, nama_siswa: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm"
                    required
                  />
                )}
              </div>
            </div>
          </div>

          {/* Schedule & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TANGGAL KONSELING
              </label>
              <input 
                type="date"
                value={formData.tanggal}
                onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold text-slate-800 transition-all text-sm"
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
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                BIDANG BIMBINGAN
              </label>
              <select
                value={formData.bidang}
                onChange={e => setFormData({ ...formData, bidang: e.target.value as any })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white"
              >
                <option value="Pribadi">Pribadi (Emosi / Karakter / Kepercayaan Diri)</option>
                <option value="Sosial">Sosial (Pertemanan / Penyesuaian Lingkungan)</option>
                <option value="Belajar">Belajar (Motivasi / Kesulitan Belajar)</option>
                <option value="Karir">Karir (Minat / Bakat / Studi Lanjut SMA/SMK)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              PERMASALAHAN SISWA
            </label>
            <button
              type="button"
              onClick={() => setActivePopup('permasalahan')}
              className={`w-full px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-sky-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold transition-all text-sm bg-white flex items-center justify-between gap-2 text-left cursor-pointer ${
                formData.permasalahan_siswa ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              <span className="truncate">
                {formData.permasalahan_siswa || '-- Pilih Permasalahan Siswa --'}
              </span>
              <ChevronDown size={18} className="text-slate-500 shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                PENDEKATAN YANG DIGUNAKAN
              </label>
              <button
                type="button"
                onClick={() => setActivePopup('pendekatan')}
                className={`w-full px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-sky-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold transition-all text-sm bg-white flex items-center justify-between gap-2 text-left cursor-pointer ${
                  formData.pendekatan ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                <span className="truncate">
                  {formData.pendekatan || '-- Pilih Pendekatan Konseling --'}
                </span>
                <ChevronDown size={18} className="text-slate-500 shrink-0" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TEKNIK KONSELING YANG DIGUNAKAN
              </label>
              <button
                type="button"
                onClick={() => setActivePopup('teknik')}
                className={`w-full px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-sky-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold transition-all text-sm bg-white flex items-center justify-between gap-2 text-left cursor-pointer ${
                  formData.teknik_konseling ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                <span className="truncate">
                  {formData.teknik_konseling || '-- Pilih Teknik Konseling --'}
                </span>
                <ChevronDown size={18} className="text-slate-500 shrink-0" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              GEJALA / DESKRIPSI MASALAH KONSELI
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan gambaran masalah yang dihadapi konseli..."
              value={formData.gejala_masalah}
              onChange={e => setFormData({ ...formData, gejala_masalah: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              RINGKASAN PROSES KONSELING
            </label>
            <textarea
              rows={3}
              placeholder="Tahapan konseling, respon konseli, serta eksplorasi solusi alternatif..."
              value={formData.proses_konseling}
              onChange={e => setFormData({ ...formData, proses_konseling: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                RENCANA TINDAK LANJUT / KESEPAKATAN
              </label>
              <textarea
                rows={2}
                placeholder="Komitmen tindakan yang akan dilakukan siswa & evaluasi berikutnya..."
                value={formData.rencana_tindak_lanjut}
                onChange={e => setFormData({ ...formData, rencana_tindak_lanjut: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-medium text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                STATUS LAYANAN
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white mb-3"
              >
                <option value="Proses">Dalam Proses Pemantauan / Konseling Lanjutan</option>
                <option value="Selesai">Selesai (Tujuan Konseling Tercapai)</option>
              </select>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1">
                GURU BK PEMBIMBING
              </label>
              <select 
                value={formData.guru_bk}
                onChange={e => setFormData({ ...formData, guru_bk: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white"
              >
                {GURU_BK_OPTIONS.map((nama, idx) => (
                  <option key={nama} value={nama}>{idx + 1}. {nama}</option>
                ))}
                {!GURU_BK_OPTIONS.includes(formData.guru_bk as any) && formData.guru_bk && !formData.guru_bk.toLowerCase().includes('administrator') && (
                  <option value={formData.guru_bk}>{formData.guru_bk}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              <ImageIcon size={15} className="text-sky-600" />
              <span>FOTO KEGIATAN KONSELING</span>
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

              <div className="h-32 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden group shadow-xs">
                {formData.foto_url ? (
                  <div className="relative w-full h-full">
                    <img
                      src={formData.foto_url}
                      alt="Foto Kegiatan Konseling Individual"
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
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm shadow-lg shadow-sky-200 active:scale-95 transition-all"
            >
              <Save size={18} />
              <span>{editingId ? 'Simpan Perubahan' : 'Simpan Rencana Konseling'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Counseling Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Daftar Rekam Konseling Individual</h3>
            <p className="text-xs text-slate-500 font-medium">Rekap data konseling individual siswa SMPN 7 Pasuruan</p>
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
                <th className="px-6 py-4">Siswa & Kelas</th>
                <th className="px-6 py-4">Tanggal & Jam</th>
                <th className="px-6 py-4">Bidang</th>
                <th className="px-6 py-4">Gejala Masalah</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Memuat data konseling...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Belum ada rekam konseling individual.</td>
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
                          <div className="text-[10px] font-bold text-sky-700 uppercase">Kelas {item.kelas}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-bold text-slate-700">{item.tanggal}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{item.jam}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-sky-50 text-sky-700 border border-sky-100">
                        {item.bidang}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs">
                      {item.permasalahan_siswa && (
                        <div className="font-bold text-slate-800 truncate">{item.permasalahan_siswa}</div>
                      )}
                      <div className="truncate text-slate-500">{item.gejala_masalah}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Cetak Lembar Konseling"
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

      {/* Print Modal for Individual Counseling */}
      {printItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div id="bk-print-area" className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in my-8 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Kop Surat */}
            <BKKopSurat
              subtitle="LEMBAR REKAM LAYANAN KONSELING INDIVIDUAL (FORM E)"
              subtitleClassName="text-sky-700"
            />

            <div className="space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-stretch justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Nama Konseli:</span>
                    <span className="col-span-2 font-black text-slate-900 uppercase">{printItem.nama_siswa} (Kelas {printItem.kelas})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Tanggal / Waktu:</span>
                    <span className="col-span-2 text-slate-800">{printItem.tanggal} ({printItem.jam})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Bidang Bimbingan:</span>
                    <span className="col-span-2 font-bold text-sky-800">{printItem.bidang}</span>
                  </div>
                  {printItem.permasalahan_siswa && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="font-bold text-slate-600">Permasalahan Siswa:</span>
                      <span className="col-span-2 font-bold text-slate-900">{printItem.permasalahan_siswa}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Pendekatan Konseling:</span>
                    <span className="col-span-2 font-bold text-slate-800">
                      {printItem.pendekatan || printItem.pendekatan_teknik?.split(' / ')[0] || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Teknik Konseling:</span>
                    <span className="col-span-2 font-bold text-slate-800">
                      {printItem.teknik_konseling || (printItem.pendekatan_teknik?.includes(' / ') ? printItem.pendekatan_teknik.split(' / ').slice(1).join(' / ') : '-')}
                    </span>
                  </div>
                </div>

                {/* Foto Kegiatan di sisi kanan kotak identitas */}
                <div className="w-36 sm:w-44 shrink-0 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center p-1">
                  {printItem.foto_url ? (
                    <img
                      src={printItem.foto_url}
                      alt="Foto Kegiatan Konseling Individual"
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
                <h4 className="font-black text-slate-800 uppercase mb-1">A. Gejala & Deskripsi Masalah Konseli</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100">{printItem.gejala_masalah}</p>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">B. Ringkasan Proses Konseling</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">{printItem.proses_konseling}</p>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">C. Rencana Tindak Lanjut & Komitmen Siswa</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">{printItem.rencana_tindak_lanjut}</p>
              </div>

              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div />
                <div>
                  <p>Guru Pembimbing BK,</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">{printItem.guru_bk}</p>
                  <p className="text-[10px] text-slate-500">UPT SMPN 7 Pasuruan</p>
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
                onClick={() => printBKReport('bk-print-area', `Konseling Individual - ${printItem.nama_siswa}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black hover:bg-sky-700 shadow-md shadow-sky-200"
              >
                <Printer size={16} />
                <span>Cetak Lembar Konseling</span>
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
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Konseling Individual?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Data rekam konseling individual ini akan dihapus permanen.
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
      {/* Popup Selector Modal */}
      {activePopup && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="absolute inset-0"
            onClick={() => setActivePopup(null)}
          />
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
                    {activePopup === 'permasalahan' && 'Pilih Permasalahan Siswa'}
                    {activePopup === 'pendekatan' && 'Pilih Pendekatan yang Digunakan'}
                    {activePopup === 'teknik' && 'Pilih Teknik Konseling yang Digunakan'}
                  </h4>
                  <p className="text-[11px] text-white/85">Klik salah satu pilihan di bawah ini</p>
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
              {(activePopup === 'permasalahan'
                ? PERMASALAHAN_SISWA_OPTIONS
                : activePopup === 'pendekatan'
                  ? PENDEKATAN_OPTIONS
                  : TEKNIK_KONSELING_OPTIONS
              ).map((option, idx) => {
                const currentVal =
                  activePopup === 'permasalahan'
                    ? formData.permasalahan_siswa
                    : activePopup === 'pendekatan'
                      ? formData.pendekatan
                      : formData.teknik_konseling;
                const isSelected = currentVal === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (activePopup === 'permasalahan') {
                        setFormData(prev => ({ ...prev, permasalahan_siswa: option }));
                      } else if (activePopup === 'pendekatan') {
                        setFormData(prev => ({ ...prev, pendekatan: option }));
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
                    <span>{idx + 1}. {option}</span>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-white/20 shrink-0 ml-2">
                        <Check size={14} className="stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
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
              alt="Pratinjau Foto Kegiatan Konseling Individual"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
