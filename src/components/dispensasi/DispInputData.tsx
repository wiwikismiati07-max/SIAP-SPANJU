import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Calendar, Clock, User, FileText, Check, X, Camera, Upload, Eye, Image as ImageIcon } from 'lucide-react';
import { supabase, fetchAllSiswa } from '../../lib/supabase';
import { MasterJenisDispensasi, TransaksiDispensasi } from '../../types/dispensasi';
import { format } from 'date-fns';

const LOCAL_DISP_FOTO_KEY = 'disp_foto_kegiatan_map';

const getLocalFotoMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(LOCAL_DISP_FOTO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalFoto = (id: string, url: string) => {
  if (!id) return;
  try {
    const map = getLocalFotoMap();
    if (url) {
      map[id] = url;
    } else {
      delete map[id];
    }
    localStorage.setItem(LOCAL_DISP_FOTO_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Gagal menyimpan cache foto lokal:', e);
  }
};

const compressImageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (ev) => {
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_DIM = 1000;

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
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };

    img.onerror = () => {
      const fallback = new FileReader();
      fallback.onload = () => resolve(fallback.result as string);
      fallback.onerror = reject;
      fallback.readAsDataURL(file);
    };

    reader.readAsDataURL(file);
  });
};

const DispInputData: React.FC<{ user?: any }> = ({ user }) => {
  const canDelete = user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const [loading, setLoading] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [jenisList, setJenisList] = useState<MasterJenisDispensasi[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [recentData, setRecentData] = useState<TransaksiDispensasi[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [periodeFilter, setPeriodeFilter] = useState('2026');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2026', '2025']);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
    kelas: '',
    siswa_id: '',
    jenis_id: '',
    alasan: '',
    tindak_lanjut: '',
    foto_kegiatan: ''
  });

  const classes = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.kelas) {
      fetchSiswaByKelas(formData.kelas, periodeFilter);
    } else {
      setSiswaList([]);
    }
  }, [formData.kelas, periodeFilter]);

  const fetchInitialData = async () => {
    try {
      if (supabase) {
        const { data: jData } = await supabase.from('disp_master_jenis').select('*').order('nama_jenis');
        setJenisList(jData || []);
      }
      const sAll = await fetchAllSiswa();
      if (sAll && sAll.length > 0) {
        const pList = Array.from(new Set(['2026', '2025', ...sAll.map((s: any) => s.periode || '2026')])).sort((a,b) => b.localeCompare(a));
        setAvailablePeriodes(pList);
      }
      fetchRecentData();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchSiswaByKelas = async (kelas: string, periode: string) => {
    try {
      const allValidSiswa = await fetchAllSiswa();
      const filtered = allValidSiswa.filter((s: any) => 
        s.kelas === kelas && 
        (periode === 'ALL' || (s.periode || '2026').toString().trim() === periode)
      );

      filtered.sort((a: any, b: any) => (a.nama || '').localeCompare(b.nama || ''));
      setSiswaList(filtered);
    } catch (error) {
      console.error('Error fetching siswa:', error);
    }
  };

  const fetchRecentData = async () => {
    try {
      if (!supabase) return;
      const { data: rData } = await supabase
        .from('disp_transaksi')
        .select(`
          *,
          siswa:master_siswa(nama, kelas),
          jenis:disp_master_jenis(nama_jenis)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const localFotos = getLocalFotoMap();
      const enriched = (rData || []).map((item: any) => ({
        ...item,
        foto_kegiatan: item.foto_kegiatan || item.bukti_url || localFotos[item.id] || ''
      }));
      setRecentData(enriched);
    } catch (error) {
      console.error('Error fetching recent data:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file foto maksimal 10 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingPhoto(true);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      setPhotoFile(file);
      setFormData(prev => ({ ...prev, foto_kegiatan: compressedDataUrl }));
    } catch (err) {
      console.error('Error processing photo:', err);
      alert('Gagal memproses file foto. Silakan coba lagi.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const uploadPhotoToStorageIfAvailable = async (file: File): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `dispensasi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const buckets = ['dokumentasi', 'images', 'public'];
      for (const bucket of buckets) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filename, file, { cacheControl: '3600', upsert: true });
        if (!error && data) {
          const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filename);
          if (pubData?.publicUrl) return pubData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Storage upload unavailable, using compressed data URL:', err);
    }
    return null;
  };

  const persistDispensasiRecord = async (basePayload: any, photoValue: string) => {
    if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');

    const isColumnError = (err: any) => {
      const msg = String(err?.message || err?.details || '').toLowerCase();
      return err?.code === 'PGRST204' || err?.code === '42703' || msg.includes('column') || msg.includes('schema cache');
    };

    const runMutation = async (payload: any) => {
      if (editingId) {
        return await supabase.from('disp_transaksi').update(payload).eq('id', editingId).select('id').single();
      }
      return await supabase.from('disp_transaksi').insert([payload]).select('id').single();
    };

    // 1. Try with bukti_url (declared in TransaksiDispensasi)
    let res = await runMutation(photoValue ? { ...basePayload, bukti_url: photoValue } : basePayload);

    // 2. Fallback to foto_kegiatan column if bukti_url column does not exist
    if (res.error && photoValue && isColumnError(res.error)) {
      res = await runMutation({ ...basePayload, foto_kegiatan: photoValue });
    }

    // 3. Fallback to base payload without photo column if DB table lacks both columns
    if (res.error && photoValue && isColumnError(res.error)) {
      res = await runMutation(basePayload);
    }

    if (res.error) throw res.error;
    return res.data?.id || editingId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.jenis_id) {
      alert('Pilih siswa dan jenis dispensasi!');
      return;
    }

    setLoading(true);
    try {
      let finalPhotoUrl = formData.foto_kegiatan.trim();
      if (photoFile && finalPhotoUrl.startsWith('data:')) {
        const uploadedUrl = await uploadPhotoToStorageIfAvailable(photoFile);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
        }
      }

      const basePayload = {
        tanggal: formData.tanggal,
        jam: formData.jam,
        kelas: formData.kelas,
        siswa_id: formData.siswa_id,
        jenis_id: formData.jenis_id,
        alasan: formData.alasan,
        tindak_lanjut: formData.tindak_lanjut
      };

      const savedId = await persistDispensasiRecord(basePayload, finalPhotoUrl);
      if (savedId) {
        saveLocalFoto(String(savedId), finalPhotoUrl);
      }

      alert(editingId ? 'Data berhasil diperbarui' : 'Data berhasil disimpan');

      setFormData({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        jam: format(new Date(), 'HH:mm'),
        kelas: '',
        siswa_id: '',
        jenis_id: '',
        alasan: '',
        tindak_lanjut: '',
        foto_kegiatan: ''
      });
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setEditingId(null);
      fetchRecentData();
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: TransaksiDispensasi) => {
    setEditingId(item.id);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormData({
      tanggal: item.tanggal,
      jam: item.jam,
      kelas: item.kelas,
      siswa_id: item.siswa_id,
      jenis_id: item.jenis_id,
      alasan: item.alasan || '',
      tindak_lanjut: item.tindak_lanjut || '',
      foto_kegiatan: item.foto_kegiatan || item.bukti_url || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data dispensasi ini?')) return;
    try {
      if (!supabase) return;
      const { error } = await supabase.from('disp_transaksi').delete().eq('id', id);
      if (error) throw error;
      saveLocalFoto(id, '');
      fetchRecentData();
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Input Transaksi Dispensasi</h2>
          <p className="text-sm text-slate-500">Catat dispensasi siswa dengan lengkap dan akurat</p>
        </div>
        {editingId && (
          <button 
            onClick={() => {
              setEditingId(null);
              setPhotoFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
              setFormData({
                tanggal: format(new Date(), 'yyyy-MM-dd'),
                jam: format(new Date(), 'HH:mm'),
                kelas: '',
                siswa_id: '',
                jenis_id: '',
                alasan: '',
                tindak_lanjut: '',
                foto_kegiatan: ''
              });
            }}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-sm font-bold flex items-center space-x-2"
          >
            <X size={16} />
            <span>Batal Edit</span>
          </button>
        )}
      </div>

      {/* Form Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50 rounded-full -mr-32 -mt-32 opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mb-32 opacity-50" />
        
        <form onSubmit={handleSubmit} className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Calendar size={14} className="text-pink-500" />
              <span>Tanggal</span>
            </label>
            <input 
              type="date" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={formData.tanggal}
              onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Clock size={14} className="text-blue-500" />
              <span>Jam</span>
            </label>
            <input 
              type="time" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.jam}
              onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Calendar size={14} className="text-indigo-500" />
              <span>Pilih Periode</span>
            </label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              value={periodeFilter}
              onChange={(e) => {
                setPeriodeFilter(e.target.value);
                setFormData({ ...formData, siswa_id: '' });
              }}
            >
              <option value="ALL">Semua Periode</option>
              {availablePeriodes.map(p => <option key={p} value={p}>Periode {p}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Search size={14} className="text-pink-500" />
              <span>Pilih Kelas</span>
            </label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={formData.kelas}
              onChange={(e) => setFormData({ ...formData, kelas: e.target.value, siswa_id: '' })}
            >
              <option value="">Pilih Kelas...</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <User size={14} className="text-blue-500" />
              <span>Pilih Siswa</span>
            </label>
            <select 
              required
              disabled={!formData.kelas}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              value={formData.siswa_id}
              onChange={(e) => setFormData({ ...formData, siswa_id: e.target.value })}
            >
              <option value="">{formData.kelas ? 'Pilih Siswa...' : 'Pilih Kelas Terlebih Dahulu'}</option>
              {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <FileText size={14} className="text-pink-500" />
              <span>Jenis Dispensasi</span>
            </label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={formData.jenis_id}
              onChange={(e) => setFormData({ ...formData, jenis_id: e.target.value })}
            >
              <option value="">Pilih Jenis...</option>
              {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama_jenis}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <FileText size={14} className="text-blue-500" />
              <span>Alasan / Keterangan</span>
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Contoh: Sakit perut, Izin Lomba..."
              value={formData.alasan}
              onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Check size={14} className="text-emerald-500" />
              <span>Tindak Lanjut</span>
            </label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[80px]"
              placeholder="Contoh: Diizinkan pulang, Menunggu di UKS..."
              value={formData.tindak_lanjut}
              onChange={(e) => setFormData({ ...formData, tindak_lanjut: e.target.value })}
            />
          </div>

          {/* Foto Kegiatan Upload Section */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
              <Camera size={14} className="text-pink-500" />
              <span>Foto Kegiatan / Dokumentasi Dispensasi</span>
            </label>
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Masukkan link foto (URL) atau unggah file di bawah..."
                  value={formData.foto_kegiatan.startsWith('data:') ? '' : formData.foto_kegiatan}
                  onChange={(e) => {
                    setPhotoFile(null);
                    setFormData({ ...formData, foto_kegiatan: e.target.value });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm text-slate-800"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Upload size={14} />
                    <span>{isProcessingPhoto ? 'Memproses Foto...' : 'Upload Foto Kegiatan'}</span>
                  </button>
                  {formData.foto_kegiatan && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        setFormData({ ...formData, foto_kegiatan: '' });
                      }}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Format JPG, PNG, atau WEBP (maks. 10 MB, otomatis dikompres).
                </p>
              </div>

              <div className="h-32 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center relative overflow-hidden group">
                {formData.foto_kegiatan ? (
                  <div className="relative w-full h-full">
                    <img
                      src={formData.foto_kegiatan}
                      alt="Foto Kegiatan Dispensasi"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewPhotoUrl(formData.foto_kegiatan)}
                        className="p-1.5 bg-white/90 text-slate-800 rounded-lg hover:bg-white"
                        title="Lihat Penuh"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          setFormData({ ...formData, foto_kegiatan: '' });
                        }}
                        className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                        title="Hapus Foto"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <ImageIcon size={20} className="opacity-60" />
                    <span className="text-xs italic">Belum ada foto kegiatan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end pt-4">
            <button 
              type="submit"
              disabled={loading || isProcessingPhoto}
              className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-blue-600 text-white rounded-2xl hover:from-pink-700 hover:to-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Plus size={20} />}
              <span className="font-bold">{editingId ? 'Perbarui Data' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Riwayat Transaksi</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maks. 10 baris terbaru</span>
        </div>
        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-50">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Foto Kegiatan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentData.map((item) => {
                const fotoSrc = item.foto_kegiatan || item.bukti_url;
                return (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-700">{format(new Date(item.tanggal), 'dd/MM/yyyy')}</div>
                      <div className="text-[10px] text-slate-400">{item.jam}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">{item.siswa?.nama}</div>
                      <div className="text-[10px] uppercase font-black text-blue-500">{item.kelas}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-pink-50 text-pink-600 rounded-md text-[10px] font-bold uppercase">
                        {item.jenis?.nama_jenis}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 line-clamp-1">{item.alasan || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {fotoSrc ? (
                        <button
                          type="button"
                          onClick={() => setViewPhotoUrl(fotoSrc)}
                          className="group/thumb relative w-12 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-xs hover:ring-2 hover:ring-pink-400 transition-all"
                          title="Klik untuk memperbesar foto"
                        >
                          <img src={fotoSrc} alt="Foto Kegiatan" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {canEdit && (
                          <button 
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {recentData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm italic">Belum ada data transaksi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Photo Lightbox Modal */}
      {viewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewPhotoUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-3xl p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewPhotoUrl(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-700 transition-colors"
              title="Tutup"
            >
              <X size={18} />
            </button>
            <img
              src={viewPhotoUrl}
              alt="Foto Kegiatan Dispensasi"
              className="w-full max-h-[80vh] object-contain rounded-2xl bg-slate-50"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DispInputData;
