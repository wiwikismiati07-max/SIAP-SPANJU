import React, { useState, useEffect, useRef } from 'react';
import { Home, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, ChevronDown, Check, X, Users, Image as ImageIcon, Upload, Eye } from 'lucide-react';
import { sabdaService, HomeVisitBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

const ANGGOTA_KELUARGA_OPTIONS = [
  'Ibu Kandung',
  'Ayah Kandung',
  'Wali'
] as const;

type AnggotaKeluargaRelation = (typeof ANGGOTA_KELUARGA_OPTIONS)[number];

const parseAnggotaKeluarga = (raw?: string): { relation: AnggotaKeluargaRelation; name: string } => {
  const val = String(raw || '').trim();
  if (!val) return { relation: 'Ibu Kandung', name: '' };

  const parenMatch = val.match(/^(Ibu Kandung|Ayah Kandung|Wali)\s*\((.+)\)$/i);
  if (parenMatch) {
    const matchedRel = ANGGOTA_KELUARGA_OPTIONS.find(
      opt => opt.toLowerCase() === parenMatch[1].toLowerCase()
    ) || 'Ibu Kandung';
    return { relation: matchedRel, name: parenMatch[2].trim() };
  }

  const dashMatch = val.match(/^(Ibu Kandung|Ayah Kandung|Wali)\s*[-:]\s*(.+)$/i);
  if (dashMatch) {
    const matchedRel = ANGGOTA_KELUARGA_OPTIONS.find(
      opt => opt.toLowerCase() === dashMatch[1].toLowerCase()
    ) || 'Ibu Kandung';
    return { relation: matchedRel, name: dashMatch[2].trim() };
  }

  const lower = val.toLowerCase();
  if (lower === 'ibu kandung' || lower === 'ibu') return { relation: 'Ibu Kandung', name: '' };
  if (lower === 'ayah kandung' || lower === 'ayah') return { relation: 'Ayah Kandung', name: '' };
  if (lower === 'wali') return { relation: 'Wali', name: '' };
  if (lower.includes('ayah')) return { relation: 'Ayah Kandung', name: val };
  if (lower.includes('wali')) return { relation: 'Wali', name: val };
  return { relation: 'Ibu Kandung', name: lower.includes('ibu') ? '' : val };
};

export default function BKHomeVisit({ user }: { user?: any }) {
  const [visits, setVisits] = useState<HomeVisitBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<HomeVisitBK | null>(null);
  const [isAnggotaPopupOpen, setIsAnggotaPopupOpen] = useState(false);
  const [anggotaRelation, setAnggotaRelation] = useState<AnggotaKeluargaRelation>('Ibu Kandung');
  const [anggotaNama, setAnggotaNama] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const namaAnggotaInputRef = useRef<HTMLInputElement | null>(null);
  const fotoInputRef = useRef<HTMLInputElement | null>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    siswa_id: '',
    nama_siswa: '',
    kelas: '7A',
    alamat: '',
    tanggal: defaultDate,
    waktu: '13:30 WIB',
    petugas: `${getDefaultGuruBK(user)} & Wali Kelas`,
    anggota_keluarga: 'Ibu Kandung',
    tujuan: 'Konfirmasi dan pendampingan ketidakhadiran serta pembinaan belajar siswa di rumah',
    hasil: 'Orang tua menyambut baik dan berkomitmen mendampingi jam belajar putra/putri di rumah.',
    foto_url: ''
  });

  useEffect(() => {
    loadData();
    loadSiswa();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getHomeVisit();
      setVisits(data);
    } catch (e: any) {
      console.error('Error loading home visit:', e);
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
        const { data } = await supabase.from('master_siswa').select('id, nama, kelas, alamat, nis').order('nama', { ascending: true });
        if (data && data.length > 0) {
          setSiswaList(data);
        }
      }
    } catch (e) {
      console.warn('Notice loading siswa for home visit:', e);
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
      alamat: ''
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
        alamat: s.alamat || prev.alamat || ''
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

  const formatAnggotaValue = (relation: AnggotaKeluargaRelation, nama: string) => {
    const cleanName = nama.trim();
    return cleanName ? `${relation} (${cleanName})` : relation;
  };

  const handleSelectAnggotaRelation = (relation: AnggotaKeluargaRelation) => {
    setAnggotaRelation(relation);
    setFormData(prev => ({
      ...prev,
      anggota_keluarga: formatAnggotaValue(relation, anggotaNama)
    }));
  };

  const handleAnggotaNamaChange = (val: string) => {
    setAnggotaNama(val);
    setFormData(prev => ({
      ...prev,
      anggota_keluarga: formatAnggotaValue(anggotaRelation, val)
    }));
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
          const path = `home_visit/hv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
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
      showNotification('success', 'Foto kegiatan home visit berhasil ditambahkan!');
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

    const record: HomeVisitBK = {
      id: editingId || `hv-${Date.now()}`,
      ...formData,
      anggota_keluarga: formatAnggotaValue(anggotaRelation, anggotaNama),
      created_at: new Date().toISOString()
    };

    try {
      const updated = await sabdaService.saveHomeVisit(record);
      setVisits(updated);
      showNotification('success', editingId ? 'Laporan home visit berhasil diperbarui!' : 'Laporan home visit berhasil disimpan!');
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setAnggotaRelation('Ibu Kandung');
    setAnggotaNama('');
    setIsAnggotaPopupOpen(false);
    setFormData({
      siswa_id: '',
      nama_siswa: '',
      kelas: '7A',
      alamat: '',
      tanggal: defaultDate,
      waktu: '13:30 WIB',
      petugas: `${getDefaultGuruBK(user)} & Wali Kelas`,
      anggota_keluarga: 'Ibu Kandung',
      tujuan: 'Konfirmasi dan pendampingan ketidakhadiran serta pembinaan belajar siswa di rumah',
      hasil: 'Orang tua menyambut baik dan berkomitmen mendampingi jam belajar putra/putri di rumah.',
      foto_url: ''
    });
  };

  const handleEdit = (item: HomeVisitBK) => {
    const parsed = parseAnggotaKeluarga(item.anggota_keluarga);
    setEditingId(item.id);
    setAnggotaRelation(parsed.relation);
    setAnggotaNama(parsed.name);
    setFormData({
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      kelas: item.kelas,
      alamat: item.alamat,
      tanggal: item.tanggal,
      waktu: item.waktu,
      petugas: item.petugas,
      anggota_keluarga: item.anggota_keluarga,
      tujuan: item.tujuan,
      hasil: item.hasil,
      foto_url: item.foto_url || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteHomeVisit(id);
      setVisits(updated);
      showNotification('success', 'Data home visit berhasil dihapus.');
      setDeleteConfirmId(null);
    } catch (e: any) {
      showNotification('error', 'Gagal menghapus: ' + e.message);
    }
  };

  const filteredVisits = visits.filter(v =>
    v.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.tujuan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.alamat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            FORM C
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Home Visit / Kunjungan Rumah</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Pencatatan pelaksanaan kunjungan ke tempat tinggal siswa SMPN 7 Pasuruan</p>
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

      {/* Main Input Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Home size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Laporan Home Visit' : 'Form Pelaksanaan Home Visit'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Laporan kunjungan rumah bimbingan konseling dan wali kelas</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Siswa & Kelas */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Identitas Siswa yang Dikunjungi
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Pilih Kelas *</label>
                <select
                  value={formData.kelas}
                  onChange={e => handleSelectKelas(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-amber-500 transition-colors"
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
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {filteredSiswa.length} Siswa di Kelas {formData.kelas}
                    </span>
                  )}
                </div>
                {siswaList.length > 0 ? (
                  <select
                    value={formData.siswa_id}
                    onChange={e => handleSelectSiswa(e.target.value)}
                    disabled={!formData.kelas}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white outline-none focus:border-amber-500 disabled:opacity-50 transition-colors"
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

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Alamat Tempat Tinggal Siswa</label>
                <input 
                  type="text"
                  placeholder="Jl... RT/RW... Kelurahan... Pasuruan"
                  value={formData.alamat}
                  onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Schedule & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TANGGAL KUNJUNGAN
              </label>
              <input 
                type="date"
                value={formData.tanggal}
                onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                WAKTU KUNJUNGAN
              </label>
              <input 
                type="text"
                placeholder="13:30 WIB"
                value={formData.waktu}
                onChange={e => setFormData({ ...formData, waktu: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                ANGGOTA KELUARGA DITEMUI
              </label>
              <button
                type="button"
                onClick={() => setIsAnggotaPopupOpen(true)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <span className="truncate">
                  {anggotaNama.trim() ? `${anggotaRelation} — ${anggotaNama.trim()}` : anggotaRelation}
                </span>
                <ChevronDown size={18} className="text-slate-500 shrink-0" />
              </button>

              <div className="mt-2.5">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Nama {anggotaRelation}
                </label>
                <input
                  ref={namaAnggotaInputRef}
                  type="text"
                  placeholder={`Masukkan nama ${anggotaRelation}...`}
                  value={anggotaNama}
                  onChange={e => handleAnggotaNamaChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none font-semibold text-slate-800 text-sm bg-white transition-all"
                  required
                />
              </div>

              {isAnggotaPopupOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                  <div
                    className="absolute inset-0"
                    onClick={() => setIsAnggotaPopupOpen(false)}
                  />
                  <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-white/20">
                          <Users size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black leading-tight">Anggota Keluarga Ditemui</h4>
                          <p className="text-[11px] text-white/85">Pilih hubungan keluarga & isi nama</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAnggotaPopupOpen(false)}
                        className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="space-y-2">
                        {ANGGOTA_KELUARGA_OPTIONS.map((option, idx) => {
                          const isSelected = anggotaRelation === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleSelectAnggotaRelation(option)}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left font-bold text-sm transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200'
                                  : 'bg-slate-50 hover:bg-amber-50/70 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span>{idx + 1}. {option}</span>
                              {isSelected && (
                                <span className="p-1 rounded-full bg-white/20">
                                  <Check size={14} className="stroke-[3]" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <label className="block text-xs font-black text-slate-700 mb-1.5">
                          Nama {anggotaRelation} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder={`Ketik nama ${anggotaRelation}...`}
                          value={anggotaNama}
                          onChange={e => handleAnggotaNamaChange(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 text-sm transition-all"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAnggotaPopupOpen(false);
                            setTimeout(() => namaAnggotaInputRef.current?.focus(), 50);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-200 transition-all cursor-pointer"
                        >
                          Selesai Pilih
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              PETUGAS PELAKSANA KUNJUNGAN
            </label>
            <select 
              value={formData.petugas}
              onChange={e => setFormData({ ...formData, petugas: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white"
              required
            >
              {GURU_BK_OPTIONS.map((nama, idx) => (
                <option key={`${nama}-wk`} value={`${nama} & Wali Kelas`}>{idx + 1}. {nama} & Wali Kelas</option>
              ))}
              {GURU_BK_OPTIONS.map((nama) => (
                <option key={nama} value={nama}>{nama}</option>
              ))}
              {!GURU_BK_OPTIONS.some(n => formData.petugas === n || formData.petugas === `${n} & Wali Kelas`) && formData.petugas && !formData.petugas.toLowerCase().includes('administrator') && (
                <option value={formData.petugas}>{formData.petugas}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              TUJUAN HOME VISIT / PERMASALAHAN
            </label>
            <textarea
              rows={2}
              placeholder="Alasan dan tujuan dilakukannya home visit..."
              value={formData.tujuan}
              onChange={e => setFormData({ ...formData, tujuan: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              HASIL KUNJUNGAN & KESEPAKATAN DENGAN KELUARGA
            </label>
            <textarea
              rows={3}
              placeholder="Fakta yang ditemukan di lapangan, kondisi keluarga, serta komitmen penyelesaian..."
              value={formData.hasil}
              onChange={e => setFormData({ ...formData, hasil: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          {/* FOTO KEGIATAN HOME VISIT */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              <ImageIcon size={15} className="text-amber-600" />
              <span>FOTO KEGIATAN HOME VISIT</span>
            </label>
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Masukkan link foto (URL) atau unggah foto kegiatan..."
                  value={formData.foto_url}
                  onChange={e => setFormData({ ...formData, foto_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-xs sm:text-sm text-slate-800"
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
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
                      alt="Foto Kegiatan Home Visit"
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
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm shadow-lg shadow-amber-200 active:scale-95 transition-all"
            >
              <Save size={18} />
              <span>{editingId ? 'Simpan Perubahan' : 'Simpan Laporan Home Visit'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Riwayat Pelaksanaan Home Visit</h3>
            <p className="text-xs text-slate-500 font-medium">Daftar kunjungan rumah yang telah terlaksana</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari siswa atau alamat..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-xs font-medium w-56 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Siswa & Kelas</th>
                <th className="px-6 py-4">Tanggal & Waktu</th>
                <th className="px-6 py-4">Alamat</th>
                <th className="px-6 py-4">Tujuan / Kasus</th>
                <th className="px-6 py-4">Hasil Kunjungan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Memuat data kunjungan...</td>
                </tr>
              ) : filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Belum ada data home visit.</td>
                </tr>
              ) : (
                filteredVisits.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        {item.foto_url && (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(item.foto_url || null)}
                            className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer"
                            title="Lihat Foto Kegiatan"
                          >
                            <img src={item.foto_url} alt="Foto" className="w-full h-full object-cover" />
                          </button>
                        )}
                        <div>
                          <div className="font-black text-slate-800 text-xs uppercase">{item.nama_siswa}</div>
                          <div className="text-[10px] font-bold text-amber-700 uppercase">Kelas {item.kelas}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-bold text-slate-700">{item.tanggal}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{item.waktu}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {item.alamat}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 max-w-xs truncate">
                      {item.tujuan}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {item.hasil}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Cetak Berita Acara"
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

      {/* Print Modal for Home Visit */}
      {printItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div id="bk-print-area" className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in my-8 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Kop Surat */}
            <BKKopSurat
              subtitle="LAPORAN PELAKSANAAN HOME VISIT / KUNJUNGAN RUMAH"
              subtitleClassName="text-amber-700"
            />

            <div className="space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-stretch justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Nama Siswa:</span>
                    <span className="col-span-2 font-black text-slate-900 uppercase">{printItem.nama_siswa} (Kelas {printItem.kelas})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Alamat Rumah:</span>
                    <span className="col-span-2 text-slate-800">{printItem.alamat}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Hari / Tanggal:</span>
                    <span className="col-span-2 text-slate-800">{printItem.tanggal} ({printItem.waktu})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Ditemui Oleh:</span>
                    <span className="col-span-2 text-slate-800">{printItem.anggota_keluarga}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold text-slate-600">Petugas Kunjungan:</span>
                    <span className="col-span-2 font-bold text-slate-800">{printItem.petugas}</span>
                  </div>
                </div>

                {/* Foto Kegiatan di sisi kanan kotak identitas */}
                <div className="w-36 sm:w-44 shrink-0 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center p-1">
                  {printItem.foto_url ? (
                    <img
                      src={printItem.foto_url}
                      alt="Foto Kegiatan Home Visit"
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
                <h4 className="font-black text-slate-800 uppercase mb-1">A. Tujuan Kunjungan</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100">{printItem.tujuan}</p>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">B. Fakta & Hasil Kunjungan</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">{printItem.hasil}</p>
              </div>

              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div>
                  <p>Orang Tua / Wali Murid,</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">({printItem.anggota_keluarga})</p>
                </div>
                <div>
                  <p>Petugas Guru BK,</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">WIWIK ISMIATI, S.Pd</p>
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
                onClick={() => printBKReport('bk-print-area', `Berita Acara Home Visit - ${printItem.nama_siswa}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 shadow-md shadow-amber-200"
              >
                <Printer size={16} />
                <span>Cetak Berita Acara</span>
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
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Data Kunjungan?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Laporan home visit ini akan dihapus permanen.
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
              alt="Pratinjau Foto Kegiatan Home Visit"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
