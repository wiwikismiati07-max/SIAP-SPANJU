import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  User, 
  Users, 
  Camera, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckCheck, 
  AlertCircle, 
  Sparkles,
  Search,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  UserCheck
} from 'lucide-react';
import { 
  JurnalPembelajaran, 
  SiswaJurnalItem, 
  DAFTAR_KELAS, 
  JAM_PELAJARAN_OPTIONS 
} from '../../types/jurnalpembelajaran';
import { 
  fetchGuruList, 
  fetchMapelList, 
  fetchAvailablePeriodes,
  fetchSiswaByKelas, 
  saveJurnal,
  generateUUID,
  isValidUUID
} from '../../lib/jurnalService';
import { compressImage } from '../../lib/imageCompressor';

interface JurnalFormProps {
  initialData?: JurnalPembelajaran | null;
  onSaved: () => void;
  onCancel?: () => void;
}

export const JurnalForm: React.FC<JurnalFormProps> = ({ initialData, onSaved, onCancel }) => {
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [jamKe, setJamKe] = useState<string>('1 - 2');
  const [jamMulai, setJamMulai] = useState<string>('07:00');
  const [jamSelesai, setJamSelesai] = useState<string>('08:20');
  
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>([]);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('');

  const [mapelList, setMapelList] = useState<{ id: string; nama_mapel: string }[]>([]);
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [customMapel, setCustomMapel] = useState<string>('');
  const [isCustomMapel, setIsCustomMapel] = useState<boolean>(false);

  const [guruList, setGuruList] = useState<{ id: string; nama_guru: string }[]>([]);
  const [selectedGuru, setSelectedGuru] = useState<string>('');
  const [customGuru, setCustomGuru] = useState<string>('');
  const [isCustomGuru, setIsCustomGuru] = useState<boolean>(false);

  const [kelas, setKelas] = useState<string>('7A');
  const [materi, setMateri] = useState<string>('');
  const [kegiatan, setKegiatan] = useState<string>('');

  const [fotoKegiatan, setFotoKegiatan] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [siswaList, setSiswaList] = useState<SiswaJurnalItem[]>([]);
  const [isLoadingSiswa, setIsLoadingSiswa] = useState<boolean>(false);
  const [searchSiswa, setSearchSiswa] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load masters on mount
  useEffect(() => {
    const loadMasters = async () => {
      const [gurus, mapels, periodes] = await Promise.all([
        fetchGuruList(),
        fetchMapelList(),
        fetchAvailablePeriodes()
      ]);
      setGuruList(gurus);
      setMapelList(mapels);
      setAvailablePeriodes(periodes);

      const defPeriode = initialData?.periode || periodes[0] || '2026';
      setSelectedPeriode(defPeriode);

      if (initialData) {
        setTanggal(initialData.tanggal);
        setJamKe(initialData.jam_ke);
        setJamMulai(initialData.jam_mulai);
        setJamSelesai(initialData.jam_selesai);
        setKelas(initialData.kelas);
        setMateri(initialData.materi);
        setKegiatan(initialData.kegiatan || '');
        setFotoKegiatan(initialData.foto_kegiatan || []);
        setSiswaList(initialData.siswa_list || []);

        const mapelExists = mapels.some(m => m.nama_mapel === initialData.nama_mapel);
        if (mapelExists) {
          setSelectedMapel(initialData.nama_mapel);
        } else {
          setIsCustomMapel(true);
          setCustomMapel(initialData.nama_mapel);
        }

        const guruExists = gurus.some(g => g.nama_guru === initialData.nama_guru);
        if (guruExists) {
          setSelectedGuru(initialData.nama_guru);
        } else {
          setIsCustomGuru(true);
          setCustomGuru(initialData.nama_guru);
        }
      } else {
        if (mapels.length > 0) setSelectedMapel(mapels[0].nama_mapel);
        if (gurus.length > 0) setSelectedGuru(gurus[0].nama_guru);
      }
    };

    loadMasters();
  }, [initialData]);

  // When class, period, or date changes, fetch students if not editing initialData
  useEffect(() => {
    if (initialData && initialData.kelas === kelas && (initialData.periode === selectedPeriode || !initialData.periode) && siswaList.length > 0) {
      return;
    }
    if (!selectedPeriode) return;

    const loadSiswa = async () => {
      setIsLoadingSiswa(true);
      const list = await fetchSiswaByKelas(kelas, selectedPeriode, tanggal);
      setSiswaList(list);
      setIsLoadingSiswa(false);
    };

    loadSiswa();
  }, [kelas, selectedPeriode, tanggal]);

  // Handle Jam Ke change
  const handleJamKeChange = (val: string) => {
    setJamKe(val);
    const opt = JAM_PELAJARAN_OPTIONS.find(o => o.value === val);
    if (opt && opt.value !== 'custom') {
      setJamMulai(opt.mulai);
      setJamSelesai(opt.selesai);
    }
  };

  // Set all students to Hadir
  const handleSetAllHadir = () => {
    setSiswaList(prev => prev.map(s => ({ ...s, absensi: 'Hadir' })));
  };

  // Update specific student field
  const handleUpdateStudent = (index: number, field: keyof SiswaJurnalItem, value: any) => {
    setSiswaList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Add a new student manually
  const handleAddManualStudent = () => {
    const nama = prompt('Masukkan nama siswa baru:');
    if (!nama || !nama.trim()) return;

    const newStudent: SiswaJurnalItem = {
      siswa_id: `manual-${Date.now()}`,
      nama: nama.trim(),
      kelas,
      absensi: 'Hadir',
      nilai: '',
      catatan_siswa: '',
      tindakan: ''
    };

    setSiswaList(prev => [...prev, newStudent]);
  };

  // Remove student from list
  const handleRemoveStudent = (index: number) => {
    if (confirm('Hapus siswa ini dari daftar jurnal kelas ini?')) {
      setSiswaList(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Photo upload handler with automatic client-side compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    const fileArray = Array.from(files) as File[];

    try {
      // Compress each photo down to max 1024x1024 web quality JPEG (~60-100KB)
      const compressedPhotos = await Promise.all(
        fileArray.map((file: File) => compressImage(file, 1024, 1024, 0.72))
      );
      setFotoKegiatan(prev => [...prev, ...compressedPhotos]);
    } catch (err) {
      console.warn('Gagal memproses foto:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove photo
  const handleRemovePhoto = (photoIdx: number) => {
    setFotoKegiatan(prev => prev.filter((_, i) => i !== photoIdx));
  };

  // Add photo via URL
  const handleAddPhotoUrl = () => {
    const url = prompt('Masukkan tautan URL foto kegiatan:');
    if (url && url.trim()) {
      setFotoKegiatan(prev => [...prev, url.trim()]);
    }
  };

  // Calculate stats
  const totalSiswa = siswaList.length;
  const countHadir = siswaList.filter(s => s.absensi === 'Hadir').length;
  const countSakit = siswaList.filter(s => s.absensi === 'Sakit').length;
  const countIzin = siswaList.filter(s => s.absensi === 'Izin').length;
  const countAlpa = siswaList.filter(s => s.absensi === 'Alpa').length;

  // Save Jurnal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const finalMapel = isCustomMapel ? customMapel.trim() : selectedMapel;
    const finalGuru = isCustomGuru ? customGuru.trim() : selectedGuru;

    if (!tanggal) {
      alert('Pilih tanggal pembelajaran!');
      return;
    }
    if (!finalMapel) {
      alert('Pilih atau isi nama mata pelajaran!');
      return;
    }
    if (!finalGuru) {
      alert('Pilih atau isi nama guru pengajar!');
      return;
    }
    if (!materi.trim()) {
      alert('Isi materi pembelajaran yang diajarkan!');
      return;
    }
    if (siswaList.length === 0) {
      alert('Daftar siswa tidak boleh kosong! Anda dapat menambahkan siswa menggunakan tombol "+ Tambah Siswa Manual" di bawah tabel absensi.');
      return;
    }

    setIsSaving(true);

    const safeId = isValidUUID(initialData?.id) ? initialData!.id : generateUUID();

    const jurnalData: JurnalPembelajaran = {
      id: safeId,
      tanggal,
      jam_ke: jamKe,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      periode: selectedPeriode || '2026',
      nama_mapel: finalMapel,
      nama_guru: finalGuru,
      kelas,
      materi: materi.trim(),
      kegiatan: kegiatan.trim(),
      foto_kegiatan: fotoKegiatan,
      siswa_list: siswaList,
      created_at: initialData?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const res = await saveJurnal(jurnalData);
    setIsSaving(false);

    if (res.success) {
      const successText = res.savedLocally 
        ? 'Jurnal pembelajaran berhasil disimpan di memori perangkat (offline)!' 
        : 'Jurnal pembelajaran berhasil disimpan!';
      setStatusMessage({ type: 'success', text: successText });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        onSaved();
      }, 700);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Gagal menyimpan jurnal pembelajaran!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert(res.error || 'Gagal menyimpan jurnal! Silakan periksa kembali isian Anda.');
    }
  };

  const filteredSiswa = siswaList.filter(s => 
    s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) || 
    (s.nis && s.nis.includes(searchSiswa))
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300">
      {/* Alert status */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{statusMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: HEADER & IDENTITAS PEMBELAJARAN */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-800">
                {initialData ? 'Edit Jurnal Pembelajaran' : 'Input Jurnal Pembelajaran Baru'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Catat agenda belajar mengajar, materi, presensi, dan evaluasi siswa</p>
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Tanggal */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <Calendar size={14} className="inline mr-1 text-amber-500" /> Tanggal Pembelajaran
            </label>
            <input
              type="date"
              required
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
            />
          </div>

          {/* Periode / Tahun Ajaran */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <Calendar size={14} className="inline mr-1 text-amber-500" /> Periode / Thn Ajaran
            </label>
            <select
              value={selectedPeriode}
              onChange={e => setSelectedPeriode(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-amber-200 bg-amber-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-bold text-amber-800 transition-all cursor-pointer"
            >
              {availablePeriodes.map((p, idx) => (
                <option key={p} value={p}>
                  {p} {idx === 0 ? '(Periode Baru)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Jam Ke */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <Clock size={14} className="inline mr-1 text-amber-500" /> Jam Ke
            </label>
            <select
              value={jamKe}
              onChange={e => handleJamKeChange(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
            >
              {JAM_PELAJARAN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Jam Mulai & Selesai */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Mulai
              </label>
              <input
                type="time"
                value={jamMulai}
                onChange={e => setJamMulai(e.target.value)}
                className="w-full px-2 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs font-semibold transition-all text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Selesai
              </label>
              <input
                type="time"
                value={jamSelesai}
                onChange={e => setJamSelesai(e.target.value)}
                className="w-full px-2 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs font-semibold transition-all text-center"
              />
            </div>
          </div>

          {/* Kelas (7A - 9H) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <Users size={14} className="inline mr-1 text-amber-500" /> Kelas
            </label>
            <select
              value={kelas}
              onChange={e => setKelas(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-bold text-amber-700 transition-all"
            >
              {DAFTAR_KELAS.map(k => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mata Pelajaran & Pengajar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mata Pelajaran */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                <BookOpen size={14} className="inline mr-1 text-amber-500" /> Mata Pelajaran
              </label>
              <button
                type="button"
                onClick={() => setIsCustomMapel(!isCustomMapel)}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
              >
                {isCustomMapel ? 'Pilih dari List' : '+ Ketik Mapel Kustom'}
              </button>
            </div>

            {isCustomMapel ? (
              <input
                type="text"
                placeholder="Ketik nama mata pelajaran..."
                value={customMapel}
                onChange={e => setCustomMapel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
              />
            ) : (
              <select
                value={selectedMapel}
                onChange={e => setSelectedMapel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
              >
                {mapelList.map(m => (
                  <option key={m.id} value={m.nama_mapel}>{m.nama_mapel}</option>
                ))}
              </select>
            )}
          </div>

          {/* Guru Pengajar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                <User size={14} className="inline mr-1 text-amber-500" /> Pengajar (Guru)
              </label>
              <button
                type="button"
                onClick={() => setIsCustomGuru(!isCustomGuru)}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
              >
                {isCustomGuru ? 'Pilih dari List' : '+ Ketik Nama Guru'}
              </button>
            </div>

            {isCustomGuru ? (
              <input
                type="text"
                placeholder="Ketik nama lengkap guru & gelar..."
                value={customGuru}
                onChange={e => setCustomGuru(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
              />
            ) : (
              <select
                value={selectedGuru}
                onChange={e => setSelectedGuru(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
              >
                {guruList.map(g => (
                  <option key={g.id} value={g.nama_guru}>{g.nama_guru}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Materi Pembelajaran */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Materi / Topik Pembelajaran *
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Bab 3 - Persamaan Linier Satu Variabel / Diskusi Kelompok Ekosistem"
            value={materi}
            onChange={e => setMateri(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-semibold transition-all"
          />
        </div>

        {/* Ringkasan Kegiatan Pembelajaran */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Uraian Kegiatan / Metode / Catatan Guru (Opsional)
          </label>
          <textarea
            rows={2}
            placeholder="Tuliskan ringkasan aktivitas siswa, metode pembelajaran, atau tugas yang diberikan..."
            value={kegiatan}
            onChange={e => setKegiatan(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-sm font-medium transition-all"
          />
        </div>
      </div>

      {/* SECTION 2: FOTO KEGIATAN */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Foto Dokumentasi Kegiatan</h3>
              <p className="text-xs text-slate-400">Unggah bukti visual kegiatan belajar mengajar di kelas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Upload size={15} /> {isUploadingPhoto ? 'Memproses...' : 'Upload Foto'}
            </button>
            <button
              type="button"
              onClick={handleAddPhotoUrl}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              + Link URL
            </button>
          </div>
        </div>

        {fotoKegiatan.length === 0 ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/20"
          >
            <ImageIcon size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">Belum ada foto kegiatan diunggah</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Klik untuk memilih foto dari galeri atau kamera</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {fotoKegiatan.map((foto, idx) => (
              <div key={idx} className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-sm">
                <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center shadow-md opacity-90 hover:opacity-100 hover:scale-105 transition-all"
                  title="Hapus foto"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: LIST SISWA (NILAI, ABSENSI, CATATAN SISWA, TINDAKAN) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center flex-wrap gap-2">
                  <span>Daftar Siswa Kelas {kelas}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                    Periode {selectedPeriode || 'Terbaru'}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">({totalSiswa} Siswa)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan siswa periode baru ({selectedPeriode || 'Aktif'}) saja agar data tidak ganda antar tahun ajaran.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSetAllHadir}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck size={16} /> Set Semua Hadir
            </button>
            <button
              type="button"
              onClick={handleAddManualStudent}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus size={16} /> Tambah Siswa
            </button>
          </div>
        </div>

        {/* Live Attendance Stats Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100/80 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Hadir (H)</span>
            <span className="text-base font-black text-emerald-700">{countHadir}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100/80 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Sakit (S)</span>
            <span className="text-base font-black text-amber-700">{countSakit}</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100/80 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">Izin (I)</span>
            <span className="text-base font-black text-blue-700">{countIzin}</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100/80 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Alpa (A)</span>
            <span className="text-base font-black text-rose-700">{countAlpa}</span>
          </div>
        </div>

        {/* Filter / Search within students */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa di kelas..."
            value={searchSiswa}
            onChange={e => setSearchSiswa(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Table of Students */}
        {isLoadingSiswa ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Memuat daftar siswa kelas {kelas}...
          </div>
        ) : siswaList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Tidak ada siswa terdaftar untuk kelas {kelas}. Klik "Tambah Siswa" untuk menambahkan.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-10">No</th>
                  <th className="p-3 min-w-[160px]">Nama Siswa</th>
                  <th className="p-3 text-center min-w-[200px]">Absensi</th>
                  <th className="p-3 text-center w-20">Nilai</th>
                  <th className="p-3 min-w-[180px]">Catatan Siswa</th>
                  <th className="p-3 min-w-[180px]">Tindakan Guru</th>
                  <th className="p-3 text-center w-10">#</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSiswa.map((siswa) => {
                  const actualIdx = siswaList.findIndex(s => s.siswa_id === siswa.siswa_id);
                  return (
                    <tr key={siswa.siswa_id || actualIdx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center font-medium text-slate-400">{actualIdx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 flex items-center flex-wrap gap-1.5">
                          <span>{siswa.nama}</span>
                          {siswa.sudah_izin && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300"
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

                      {/* Absensi Buttons */}
                      <td className="p-3 text-center">
                        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 gap-1">
                          {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((status) => {
                            const isSelected = siswa.absensi === status;
                            let activeClass = '';
                            if (isSelected) {
                              if (status === 'Hadir') activeClass = 'bg-emerald-600 text-white shadow-sm';
                              else if (status === 'Sakit') activeClass = 'bg-amber-500 text-white shadow-sm';
                              else if (status === 'Izin') activeClass = 'bg-blue-600 text-white shadow-sm';
                              else if (status === 'Alpa') activeClass = 'bg-rose-600 text-white shadow-sm';
                            } else {
                              activeClass = 'text-slate-500 hover:text-slate-800 hover:bg-white/60';
                            }

                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleUpdateStudent(actualIdx, 'absensi', status)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${activeClass}`}
                              >
                                {status[0]}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Nilai */}
                      <td className="p-3 text-center">
                        <input
                          type="text"
                          placeholder="Nilai"
                          value={siswa.nilai}
                          onChange={e => handleUpdateStudent(actualIdx, 'nilai', e.target.value)}
                          className="w-16 px-2 py-1.5 text-center font-bold text-slate-800 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none text-xs"
                        />
                      </td>

                      {/* Catatan Siswa */}
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Catatan perilaku/keaktifan/kendala..."
                          value={siswa.catatan_siswa}
                          onChange={e => handleUpdateStudent(actualIdx, 'catatan_siswa', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none text-xs"
                        />
                      </td>

                      {/* Tindakan Guru */}
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Tindakan/solusi guru..."
                          value={siswa.tindakan}
                          onChange={e => handleUpdateStudent(actualIdx, 'tindakan', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none text-xs"
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUBMIT BUTTON BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-xs font-semibold text-slate-500">
          {statusMessage && (
            <span className={statusMessage.type === 'success' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {statusMessage.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={18} />
            {isSaving ? 'Menyimpan...' : initialData ? 'Update Jurnal Pembelajaran' : 'Simpan Jurnal Pembelajaran'}
          </button>
        </div>
      </div>
    </form>
  );
};
