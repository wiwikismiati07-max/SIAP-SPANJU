import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Calendar, Clock, Users, FileText, Check, CheckSquare, X, Camera, Upload, Eye, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
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
      // Do not store large base64 data URLs in localStorage to prevent mobile QuotaExceededError
      if (url.startsWith('data:') && url.length > 40000) {
        return;
      }
      map[id] = url;
    } else {
      delete map[id];
    }
    const keys = Object.keys(map);
    if (keys.length > 25) {
      keys.slice(0, keys.length - 25).forEach(k => delete map[k]);
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
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [jenisList, setJenisList] = useState<MasterJenisDispensasi[]>([]);
  const [allSiswa, setAllSiswa] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [recentData, setRecentData] = useState<TransaksiDispensasi[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [periodeFilter, setPeriodeFilter] = useState('2026');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2026', '2025']);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-student picker modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerClassFilter, setPickerClassFilter] = useState('Semua');
  const [tempSelectedMap, setTempSelectedMap] = useState<Map<string, any>>(new Map());

  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
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

  const fetchInitialData = async () => {
    try {
      if (supabase) {
        const { data: jData } = await supabase.from('disp_master_jenis').select('*').order('nama_jenis');
        setJenisList(jData || []);
      }
      const sAll = await fetchAllSiswa();
      if (sAll && sAll.length > 0) {
        const normalized = sAll
          .filter((s: any) => !String(s.id || '').startsWith('pad-'))
          .map((s: any) => ({
            ...s,
            kelas: normalizeKelasKey(s.kelas || ''),
            periode: (s.periode || '2026').toString().trim()
          }));
        setAllSiswa(normalized.length > 0 ? normalized : sAll);

        const pList = Array.from(new Set(['2026', '2025', ...sAll.map((s: any) => s.periode || '2026')])).sort((a, b) => b.localeCompare(a));
        setAvailablePeriodes(pList);
      }
      fetchRecentData();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  // Students available for the selected periode
  const periodeStudents = useMemo(() => {
    return allSiswa
      .filter((s: any) => periodeFilter === 'ALL' || (s.periode || '2026').toString().trim() === periodeFilter)
      .sort((a: any, b: any) => {
        const kDiff = (a.kelas || '').localeCompare(b.kelas || '', undefined, { numeric: true });
        if (kDiff !== 0) return kDiff;
        return (a.nama || '').localeCompare(b.nama || '');
      });
  }, [allSiswa, periodeFilter]);

  // Filtered students inside modal
  const filteredModalStudents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return periodeStudents.filter((s: any) => {
      const matchClass = pickerClassFilter === 'Semua' || normalizeKelasKey(s.kelas || '') === pickerClassFilter;
      if (!matchClass) return false;
      if (!q) return true;
      const nama = String(s.nama || '').toLowerCase();
      const nis = String(s.nisn || s.nis || '').toLowerCase();
      const kls = String(s.kelas || '').toLowerCase();
      return nama.includes(q) || nis.includes(q) || kls.includes(q);
    });
  }, [periodeStudents, pickerClassFilter, pickerSearch]);

  const allFilteredSelected = filteredModalStudents.length > 0 && filteredModalStudents.every(s => tempSelectedMap.has(String(s.id)));

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
    setSelectedStudents(Array.from(tempSelectedMap.values()));
    setIsPickerOpen(false);
  };

  const removeSelectedStudent = (sid: string) => {
    setSelectedStudents(prev => prev.filter(s => String(s.id) !== sid));
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

    const isImg = (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|heic|bmp)$/i.test(file.name);
    if (!isImg) {
      setStatusMsg({ type: 'error', text: 'Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Ukuran file foto maksimal 15 MB.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingPhoto(true);
    setStatusMsg(null);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      setPhotoFile(file);
      setFormData(prev => ({ ...prev, foto_kegiatan: compressedDataUrl }));
    } catch (err) {
      console.error('Error processing photo:', err);
      setStatusMsg({ type: 'error', text: 'Gagal memproses file foto. Silakan coba file lain.' });
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

  const insertDispensasiBatch = async (rows: any[], photoValue: string): Promise<string[]> => {
    if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
    if (rows.length === 0) return [];

    const isColumnError = (err: any) => {
      const msg = String(err?.message || err?.details || '').toLowerCase();
      return err?.code === 'PGRST204' || err?.code === '42703' || msg.includes('column') || msg.includes('schema cache');
    };

    const runInsert = async (payloadRows: any[]) => {
      return await supabase.from('disp_transaksi').insert(payloadRows).select('id');
    };

    let res = await runInsert(photoValue ? rows.map(r => ({ ...r, bukti_url: photoValue })) : rows);

    if (res.error && photoValue && isColumnError(res.error)) {
      res = await runInsert(rows.map(r => ({ ...r, foto_kegiatan: photoValue })));
    }

    if (res.error && photoValue && isColumnError(res.error)) {
      res = await runInsert(rows);
    }

    if (res.error) throw res.error;
    return (res.data || []).map((d: any) => String(d.id));
  };

  const updateSingleDispensasi = async (id: string, basePayload: any, photoValue: string) => {
    if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');

    const isColumnError = (err: any) => {
      const msg = String(err?.message || err?.details || '').toLowerCase();
      return err?.code === 'PGRST204' || err?.code === '42703' || msg.includes('column') || msg.includes('schema cache');
    };

    const runUpdate = async (payload: any) => {
      return await supabase.from('disp_transaksi').update(payload).eq('id', id).select('id').single();
    };

    let res = await runUpdate(photoValue ? { ...basePayload, bukti_url: photoValue } : basePayload);
    if (res.error && photoValue && isColumnError(res.error)) {
      res = await runUpdate({ ...basePayload, foto_kegiatan: photoValue });
    }
    if (res.error && photoValue && isColumnError(res.error)) {
      res = await runUpdate(basePayload);
    }
    if (res.error) throw res.error;
    return res.data?.id || id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0 || !formData.jenis_id) {
      setStatusMsg({ type: 'error', text: 'Pilih minimal 1 siswa dan jenis dispensasi!' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      let finalPhotoUrl = formData.foto_kegiatan.trim();
      if (photoFile && finalPhotoUrl.startsWith('data:')) {
        const uploadedUrl = await uploadPhotoToStorageIfAvailable(photoFile);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
        }
      }

      // Sanitize jam to HH:mm (guarantee colons, remove dot separators)
      const cleanJam = (formData.jam || '07:00').replace(/\./g, ':').trim();

      const buildRow = (s: any) => ({
        tanggal: formData.tanggal,
        jam: cleanJam,
        kelas: normalizeKelasKey(s.kelas || ''),
        siswa_id: s.id,
        jenis_id: formData.jenis_id,
        alasan: formData.alasan,
        tindak_lanjut: formData.tindak_lanjut
      });

      const savedIds: string[] = [];
      if (editingId) {
        const firstId = await updateSingleDispensasi(editingId, buildRow(selectedStudents[0]), finalPhotoUrl);
        if (firstId) savedIds.push(String(firstId));

        if (selectedStudents.length > 1) {
          const extraIds = await insertDispensasiBatch(selectedStudents.slice(1).map(buildRow), finalPhotoUrl);
          savedIds.push(...extraIds);
        }
      } else {
        const insertedIds = await insertDispensasiBatch(selectedStudents.map(buildRow), finalPhotoUrl);
        savedIds.push(...insertedIds);
      }

      savedIds.forEach(id => {
        saveLocalFoto(id, finalPhotoUrl);
      });

      setStatusMsg({
        type: 'success',
        text: editingId
          ? 'Data dispensasi berhasil diperbarui!'
          : `Berhasil menyimpan ${selectedStudents.length} data dispensasi siswa!`
      });

      setFormData({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        jam: format(new Date(), 'HH:mm'),
        jenis_id: '',
        alasan: '',
        tindak_lanjut: '',
        foto_kegiatan: ''
      });
      setSelectedStudents([]);
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setEditingId(null);
      fetchRecentData();
    } catch (error: any) {
      console.error('Error saving data:', error);
      setStatusMsg({ type: 'error', text: `Gagal menyimpan data: ${error?.message || 'Periksa koneksi database'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: TransaksiDispensasi) => {
    setEditingId(item.id);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const matchedStudent = allSiswa.find(s => String(s.id) === String(item.siswa_id));
    setSelectedStudents([
      matchedStudent || {
        id: item.siswa_id,
        nama: item.siswa?.nama || 'Siswa',
        kelas: item.kelas || item.siswa?.kelas || '-'
      }
    ]);
    setFormData({
      tanggal: item.tanggal,
      jam: item.jam,
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
          <p className="text-sm text-slate-500">Catat dispensasi siswa (bisa pilih banyak kelas & siswa sekaligus)</p>
        </div>
        {editingId && (
          <button 
            onClick={() => {
              setEditingId(null);
              setSelectedStudents([]);
              setPhotoFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
              setFormData({
                tanggal: format(new Date(), 'yyyy-MM-dd'),
                jam: format(new Date(), 'HH:mm'),
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

      {statusMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm animate-in fade-in ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{statusMsg.text}</span>
          <button 
            type="button" 
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-60 hover:opacity-100 font-normal underline"
          >
            Tutup
          </button>
        </div>
      )}

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
                setSelectedStudents([]);
              }}
            >
              <option value="ALL">Semua Periode</option>
              {availablePeriodes.map(p => <option key={p} value={p}>Periode {p}</option>)}
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

          {/* Multi-Select Kelas & Siswa Section */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                <Users size={14} className="text-emerald-600" />
                <span>Pilih Kelas & Nama Siswa (Multi Siswa)</span>
              </label>
              <div className="flex items-center gap-2">
                {selectedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudents([])}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                  >
                    Kosongkan ({selectedStudents.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={openPickerModal}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <Users size={14} />
                  <span>{selectedStudents.length > 0 ? `Ubah / Tambah Siswa (${selectedStudents.length} Dipilih)` : 'Pilih Kelas & Siswa'}</span>
                </button>
              </div>
            </div>

            <div
              onClick={openPickerModal}
              className="w-full min-h-[64px] p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl transition-colors cursor-pointer"
            >
              {selectedStudents.length === 0 ? (
                <div className="flex items-center justify-between text-slate-400 text-sm">
                  <span>Klik untuk memilih satu atau banyak siswa lintas kelas...</span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">
                    Multi Pilih
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {selectedStudents.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-white border border-emerald-200 shadow-xs text-xs font-bold text-slate-800"
                    >
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black">
                        {s.kelas}
                      </span>
                      <span className="uppercase">{s.nama}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedStudent(String(s.id))}
                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                        title="Hapus siswa"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
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

      {/* Multi-Student & Multi-Class Picker Modal */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
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
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all shrink-0 ${
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
                {['Semua', ...classes].map((cls) => {
                  const isActive = pickerClassFilter === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setPickerClassFilter(cls)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
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
                filteredModalStudents.map((s) => {
                  const isChecked = tempSelectedMap.has(String(s.id));
                  const nisDisplay = s.nisn || s.nis || '-';
                  const jkDisplay = s.jenis_kelamin || '-';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleTempStudent(s)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
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
                Total <span className="font-bold text-slate-900">{tempSelectedMap.size} anggota</span> siap dimasukkan ke Dispensasi.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applySelectedStudents}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  <Check size={15} />
                  <span>Gunakan {tempSelectedMap.size} Siswa Terpilih</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
