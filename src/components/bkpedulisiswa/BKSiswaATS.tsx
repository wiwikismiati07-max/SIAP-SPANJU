import React, { useState, useEffect } from 'react';
import { UserX, Plus, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, AlertTriangle, UserCheck, HeartHandshake, Phone, MapPin, X } from 'lucide-react';
import { sabdaService, SiswaATSBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = ['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'];

export default function BKSiswaATS({ user }: { user?: any }) {
  const [atsList, setAtsList] = useState<SiswaATSBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<SiswaATSBK | null>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    tanggal_identifikasi: defaultDate,
    siswa_id: '',
    nama_siswa: '',
    nisn: '',
    kelas: '8E',
    jenis_kelamin: 'L' as 'L' | 'P',
    alamat: '',
    nama_ortu: '',
    no_telp: '',
    kategori_ats: 'Rentan Putus Sekolah' as const,
    faktor_penyebab: 'Faktor Ekonomi & Membantu Orang Tua',
    lama_tidak_sekolah: '10 Hari (Alpha berturut-turut)',
    upaya_penanganan: 'Kunjungan rumah (Home Visit), advokasi bantuan perlengkapan sekolah & koordinasi wali kelas.',
    status_penanganan: 'Pendampingan' as const,
    catatan_hasil: 'Orang tua menyepakati siswa dijadwalkan kembali bersekolah mulai pekan depan.',
    petugas_pendamping: `${getDefaultGuruBK(user)} & Tim Satgas ATS`
  });

  useEffect(() => {
    loadData();
    loadSiswaList();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getATS();
      setAtsList(data);
    } catch (e: any) {
      console.error('Error loading data ATS:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSiswaList = async () => {
    try {
      const local = localStorage.getItem('sitelat_siswa') || localStorage.getItem('master_siswa');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSiswaList(parsed);
        }
      }
    } catch (_) {}

    try {
      const data = await fetchAllSiswa();
      if (data && data.length > 0) {
        setSiswaList(data);
        try {
          localStorage.setItem('sitelat_siswa', JSON.stringify(data));
          localStorage.setItem('master_siswa', JSON.stringify(data));
        } catch (_) {}
        return;
      } else if (supabase) {
        const { data: sbData } = await supabase.from('master_siswa').select('id, nama, kelas, nisn, jenis_kelamin, nama_ortu, alamat, no_telp').order('nama', { ascending: true });
        if (sbData && sbData.length > 0) {
          setSiswaList(sbData);
          return;
        }
      }
    } catch {
      // fallback
    }

    const local = localStorage.getItem('master_siswa');
    if (local) {
      try {
        setSiswaList(JSON.parse(local));
        return;
      } catch {}
    }

    setSiswaList([
      { id: 'sw-1', nama: 'Dimas Anggara', kelas: '8E', nisn: '0089871234', nama_ortu: 'Bpk. Kasiman', alamat: 'Kelurahan Mandaranrejo, Pasuruan', no_telp: '085712349988' },
      { id: 'sw-2', nama: 'Bagas Pratama', kelas: '7C', nisn: '0094567890', nama_ortu: 'Ibu Siti Rahma', alamat: 'Jl. Panglima Sudirman No. 45', no_telp: '081234567891' },
      { id: 'sw-3', nama: 'Rizky Ramadhani', kelas: '8B', nisn: '0098765432', nama_ortu: 'Bpk. Sugeng Wibowo', alamat: 'Jl. Veteran No. 12', no_telp: '081234567890' }
    ]);
  };

  const handleSelectKelas = (newKelas: string) => {
    setFormData(prev => ({
      ...prev,
      kelas: newKelas,
      siswa_id: '',
      nama_siswa: '',
      nisn: ''
    }));
  };

  const handleSelectSiswa = (siswaId: string) => {
    const s = siswaList.find(item => item.id === siswaId || item.nama === siswaId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        siswa_id: s.id || '',
        nama_siswa: s.nama || '',
        nisn: s.nisn || s.nis || '',
        kelas: s.kelas || prev.kelas,
        jenis_kelamin: (s.jenis_kelamin === 'P' || s.jk === 'P' ? 'P' : 'L') as 'L' | 'P',
        nama_ortu: s.nama_ortu || prev.nama_ortu,
        alamat: s.alamat || prev.alamat,
        no_telp: s.no_telp || s.no_hp || prev.no_telp
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        siswa_id: '',
        nama_siswa: '',
        nisn: ''
      }));
    }
  };

  const filteredSiswa = siswaList.filter(s => {
    if (!formData.kelas) return false;
    return normalizeKelasKey(s.kelas) === normalizeKelasKey(formData.kelas);
  }).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_siswa || !formData.lama_tidak_sekolah) {
      setStatusMsg({ type: 'error', text: 'Nama siswa dan lama tidak bersekolah wajib diisi!' });
      return;
    }

    try {
      const record: SiswaATSBK = {
        id: editingId || `ats-${Date.now()}`,
        tanggal_identifikasi: formData.tanggal_identifikasi,
        siswa_id: formData.siswa_id,
        nama_siswa: formData.nama_siswa,
        nisn: formData.nisn,
        kelas: formData.kelas,
        jenis_kelamin: formData.jenis_kelamin,
        alamat: formData.alamat,
        nama_ortu: formData.nama_ortu,
        no_telp: formData.no_telp,
        kategori_ats: formData.kategori_ats,
        faktor_penyebab: formData.faktor_penyebab,
        lama_tidak_sekolah: formData.lama_tidak_sekolah,
        upaya_penanganan: formData.upaya_penanganan,
        status_penanganan: formData.status_penanganan,
        catatan_hasil: formData.catatan_hasil,
        petugas_pendamping: formData.petugas_pendamping,
        created_at: new Date().toISOString()
      };

      const updated = await sabdaService.saveATS(record);
      setAtsList(updated);
      setStatusMsg({ type: 'success', text: editingId ? 'Data penanganan ATS berhasil diperbarui!' : 'Data penanganan ATS berhasil dicatat!' });
      resetForm();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      tanggal_identifikasi: defaultDate,
      siswa_id: '',
      nama_siswa: '',
      nisn: '',
      kelas: '8E',
      jenis_kelamin: 'L',
      alamat: '',
      nama_ortu: '',
      no_telp: '',
      kategori_ats: 'Rentan Putus Sekolah',
      faktor_penyebab: 'Faktor Ekonomi & Membantu Orang Tua',
      lama_tidak_sekolah: '10 Hari (Alpha berturut-turut)',
      upaya_penanganan: 'Kunjungan rumah (Home Visit), advokasi bantuan perlengkapan sekolah & koordinasi wali kelas.',
      status_penanganan: 'Pendampingan',
      catatan_hasil: 'Orang tua menyepakati siswa dijadwalkan kembali bersekolah mulai pekan depan.',
      petugas_pendamping: `${getDefaultGuruBK(user)} & Tim Satgas ATS`
    });
  };

  const handleEdit = (item: SiswaATSBK) => {
    setEditingId(item.id);
    setFormData({
      tanggal_identifikasi: item.tanggal_identifikasi,
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      nisn: item.nisn || '',
      kelas: item.kelas,
      jenis_kelamin: item.jenis_kelamin,
      alamat: item.alamat,
      nama_ortu: item.nama_ortu,
      no_telp: item.no_telp,
      kategori_ats: item.kategori_ats,
      faktor_penyebab: item.faktor_penyebab,
      lama_tidak_sekolah: item.lama_tidak_sekolah,
      upaya_penanganan: item.upaya_penanganan,
      status_penanganan: item.status_penanganan,
      catatan_hasil: item.catatan_hasil,
      petugas_pendamping: item.petugas_pendamping && !item.petugas_pendamping.toLowerCase().includes('administrator') ? item.petugas_pendamping : `${getDefaultGuruBK(user)} & Tim Satgas ATS`
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteATS(id);
      setAtsList(updated);
      setDeleteConfirmId(null);
      setStatusMsg({ type: 'success', text: 'Data siswa ATS berhasil dihapus.' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Gagal menghapus data.' });
    }
  };

  const filteredAts = atsList.filter(item => {
    const matchSearch = 
      item.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori_ats.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status_penanganan.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (categoryFilter === 'Semua') return matchSearch;
    return matchSearch && item.kategori_ats === categoryFilter;
  });

  const totalTerdata = atsList.length;
  const totalPendampingan = atsList.filter(i => i.status_penanganan === 'Pendampingan').length;
  const totalKembali = atsList.filter(i => i.status_penanganan === 'Kembali Bersekolah').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-md tracking-wider">
              FORM I
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Siswa ATS (Anak Tidak Sekolah)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pendataan, pencegahan putus sekolah (Drop Out), dan intervensi re-entry siswa
          </p>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <UserX size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Terdata ATS</div>
            <div className="text-xl font-black text-slate-800">{totalTerdata} Siswa</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <HeartHandshake size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Dalam Pendampingan</div>
            <div className="text-xl font-black text-amber-600">{totalPendampingan} Siswa</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Berhasil Kembali Sekolah</div>
            <div className="text-xl font-black text-emerald-600">{totalKembali} Siswa</div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:bg-black/5 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form Input Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <UserX size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {editingId ? 'Edit Data Penanganan Siswa ATS' : 'Form Identifikasi & Penanganan Siswa ATS'}
            </h3>
            <p className="text-xs text-slate-500">
              Pencatatan intervensi bagi peserta didik rentan putus sekolah atau putus sekolah
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                TANGGAL IDENTIFIKASI *
              </label>
              <input
                type="date"
                value={formData.tanggal_identifikasi}
                onChange={(e) => setFormData({ ...formData, tanggal_identifikasi: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                KATEGORI ATS *
              </label>
              <select
                value={formData.kategori_ats}
                onChange={(e: any) => setFormData({ ...formData, kategori_ats: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="Rentan Putus Sekolah">Rentan Putus Sekolah (Sering Mangkir)</option>
                <option value="Putus Sekolah (DO)">Putus Sekolah (Drop Out)</option>
                <option value="Lulus Tidak Melanjutkan">Lulus Tidak Melanjutkan (LTM)</option>
                <option value="Belum Pernah Sekolah">Belum Pernah Sekolah (BPS)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                LAMA TIDAK BERSEKOLAH *
              </label>
              <input
                type="text"
                value={formData.lama_tidak_sekolah}
                onChange={(e) => setFormData({ ...formData, lama_tidak_sekolah: e.target.value })}
                placeholder="Contoh: 10 Hari (Alpha berturut-turut)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Student Picker - Kelas first then Siswa filtered */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Identitas Siswa ATS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  1. PILIH KELAS *
                </label>
                <select
                  value={formData.kelas}
                  onChange={(e) => handleSelectKelas(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {CLASSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-black uppercase text-slate-600">
                    2. PILIH SISWA DARI KELAS *
                  </label>
                  {formData.kelas && (
                    <span className="text-[10px] font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                      {filteredSiswa.length} Siswa di Kelas {formData.kelas}
                    </span>
                  )}
                </div>
                <select
                  onChange={(e) => handleSelectSiswa(e.target.value)}
                  value={formData.siswa_id || formData.nama_siswa}
                  disabled={!formData.kelas}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-500 outline-none disabled:opacity-50"
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
                    <option key={s.id || s.nama} value={s.id || s.nama}>
                      {idx + 1}. {s.nama} {s.nisn ? `(NISN: ${s.nisn})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  NAMA SISWA LENGKAP *
                </label>
                <input
                  type="text"
                  value={formData.nama_siswa}
                  onChange={(e) => setFormData({ ...formData, nama_siswa: e.target.value })}
                  placeholder="Nama siswa"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  NISN
                </label>
                <input
                  type="text"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  placeholder="0089871234"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  GENDER
                </label>
                <select
                  value={formData.jenis_kelamin}
                  onChange={(e: any) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Parent & Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NAMA ORANG TUA / WALI
              </label>
              <input
                type="text"
                value={formData.nama_ortu}
                onChange={(e) => setFormData({ ...formData, nama_ortu: e.target.value })}
                placeholder="Bpk. Kasiman"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NO. TELP / WHATSAPP
              </label>
              <input
                type="text"
                value={formData.no_telp}
                onChange={(e) => setFormData({ ...formData, no_telp: e.target.value })}
                placeholder="085712349988"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                ALAMAT TEMPAT TINGGAL
              </label>
              <input
                type="text"
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                placeholder="Kelurahan / Desa tempat tinggal..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Root cause and Interventions */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              FAKTOR PENYEBAB UTAMA ATS *
            </label>
            <input
              type="text"
              value={formData.faktor_penyebab}
              onChange={(e) => setFormData({ ...formData, faktor_penyebab: e.target.value })}
              placeholder="Contoh: Faktor Ekonomi dan Membantu Orang Tua berjualan di pasar subuh..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              BENTUK UPAYA PENANGANAN / INTERVENSI *
            </label>
            <textarea
              rows={3}
              value={formData.upaya_penanganan}
              onChange={(e) => setFormData({ ...formData, upaya_penanganan: e.target.value })}
              placeholder="Jelaskan langkah home visit, mediasi keluarga, koordinasi dinas/kelurahan, advokasi bantuan perlengkapan..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                STATUS PENANGANAN ATS *
              </label>
              <select
                value={formData.status_penanganan}
                onChange={(e: any) => setFormData({ ...formData, status_penanganan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="Teridentifikasi">Teridentifikasi (Baru terdata)</option>
                <option value="Pendampingan">Dalam Pendampingan / Proses Home Visit</option>
                <option value="Kembali Bersekolah">Berhasil Kembali Bersekolah (Re-entry)</option>
                <option value="Alih PKBM/Paket">Disalurkan ke Pendidikan Non-Formal (PKBM/Paket)</option>
                <option value="Pindah Sekolah">Pindah ke Satuan Pendidikan Lain</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                GURU BK / TIM SATGAS ATS *
              </label>
              <select
                value={formData.petugas_pendamping}
                onChange={(e) => setFormData({ ...formData, petugas_pendamping: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                {GURU_BK_OPTIONS.map((nama, idx) => (
                  <React.Fragment key={nama}>
                    <option value={`${nama} & Tim Satgas ATS`}>{idx + 1}. {nama} & Tim Satgas ATS</option>
                    <option value={nama}>{idx + 1}. {nama}</option>
                  </React.Fragment>
                ))}
                {formData.petugas_pendamping &&
                  !GURU_BK_OPTIONS.some(n => formData.petugas_pendamping === n || formData.petugas_pendamping === `${n} & Tim Satgas ATS`) &&
                  !formData.petugas_pendamping.toLowerCase().includes('administrator') && (
                    <option value={formData.petugas_pendamping}>{formData.petugas_pendamping}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              CATATAN HASIL & EVALUASI
            </label>
            <textarea
              rows={2}
              value={formData.catatan_hasil}
              onChange={(e) => setFormData({ ...formData, catatan_hasil: e.target.value })}
              placeholder="Catatan perkembangan respons orang tua dan siswa..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
            >
              <Save size={16} />
              <span>{editingId ? 'Perbarui Data ATS' : 'Simpan Data Siswa ATS'}</span>
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
              >
                <RotateCcw size={16} />
                <span>Batal Edit</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Daftar Siswa ATS & Hasil Penanganan
            </h3>
            <p className="text-xs text-slate-500">
              Total {atsList.length} siswa dalam basis data penanganan ATS
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 outline-none font-medium"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Rentan Putus Sekolah">Rentan Putus Sekolah</option>
              <option value="Putus Sekolah (DO)">Putus Sekolah (DO)</option>
              <option value="Lulus Tidak Melanjutkan">Lulus Tidak Melanjutkan</option>
              <option value="Belum Pernah Sekolah">Belum Pernah Sekolah</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari siswa, kelas..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Tanggal & Nama Siswa</th>
                <th className="py-3 px-4">Kategori ATS</th>
                <th className="py-3 px-4">Lama Tidak Sekolah</th>
                <th className="py-3 px-4">Faktor Penyebab</th>
                <th className="py-3 px-4">Status Penanganan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa ATS ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.nama_siswa}</div>
                      <div className="text-[11px] text-blue-600 font-medium">Kelas {item.kelas} {item.nisn && `• NISN: ${item.nisn}`}</div>
                      <div className="text-[10px] text-slate-400">Identifikasi: {item.tanggal_identifikasi}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.kategori_ats === 'Putus Sekolah (DO)' 
                          ? 'bg-rose-100 text-rose-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.kategori_ats}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {item.lama_tidak_sekolah}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={item.faktor_penyebab}>
                      {item.faktor_penyebab}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status_penanganan === 'Kembali Bersekolah' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : item.status_penanganan === 'Pendampingan'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status_penanganan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Cetak Berkas ATS"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h4 className="font-bold text-slate-900 text-lg mb-2">Hapus Data Siswa ATS?</h4>
            <p className="text-slate-600 text-sm mb-6">
              Apakah Anda yakin ingin menghapus catatan penanganan siswa ATS ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Modal Official Berkas ATS */}
      {printItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div id="bk-print-area" className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 relative my-8 text-slate-900 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="font-bold text-sm text-slate-700">Preview Berkas Penanganan Siswa ATS</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printBKReport('bk-print-area', `Berkas Siswa ATS - ${printItem.nama_siswa}`)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200"
                >
                  <Printer size={15} /> Cetak Laporan
                </button>
                <button
                  onClick={() => setPrintItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Letterhead */}
            <BKKopSurat />

            {/* Document Title */}
            <div className="text-center my-6">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider underline">
                LEMBAR PENANGANAN & PENDAMPINGAN SISWA ATS
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Kategori: {printItem.kategori_ats.toUpperCase()}
              </p>
            </div>

            {/* Content */}
            <div className="text-xs sm:text-sm space-y-4 leading-relaxed text-justify">
              <p>
                Berikut ini adalah rekam data dan riwayat intervensi peserta didik teridentifikasi Anak Tidak Sekolah (ATS) / Rentan Drop Out di UPT SMP Negeri 7 Pasuruan:
              </p>

              <div className="pl-6 space-y-1.5 font-medium">
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Nama Siswa</span>
                  <span className="col-span-2 font-bold text-slate-900">: {printItem.nama_siswa}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Kelas / NISN</span>
                  <span className="col-span-2">: {printItem.kelas} / {printItem.nisn || '-'} ({printItem.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'})</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Nama Orang Tua / Wali</span>
                  <span className="col-span-2">: {printItem.nama_ortu || '-'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Alamat Tempat Tinggal</span>
                  <span className="col-span-2">: {printItem.alamat || '-'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">No. Kontak / WA</span>
                  <span className="col-span-2">: {printItem.no_telp || '-'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Lama Tidak Bersekolah</span>
                  <span className="col-span-2 text-rose-700 font-bold">: {printItem.lama_tidak_sekolah}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">I. Faktor Penyebab Tidak Bersekolah:</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                  {printItem.faktor_penyebab}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">II. Upaya Intervensi & Penanganan yang Dilakukan:</p>
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs leading-relaxed text-slate-900 font-medium">
                  {printItem.upaya_penanganan}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">III. Status & Hasil Penanganan Terakhir:</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                  <p><strong>Status:</strong> {printItem.status_penanganan}</p>
                  <p className="mt-1">{printItem.catatan_hasil || 'Siswa dalam proses pemantauan kehadiran rutin.'}</p>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-4">
              <div className="text-right text-xs font-semibold text-slate-800 mb-6">
                Pasuruan, {printItem.tanggal_identifikasi}
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-600 font-medium">Petugas Pendamping / Guru BK,</p>
                  <p className="font-bold text-slate-900 mb-16">Satgas Penanganan ATS</p>
                  <p className="font-bold underline text-slate-900">{printItem.petugas_pendamping}</p>
                </div>

                <div>
                  <p className="text-slate-600 font-medium">Mengetahui,</p>
                  <p className="font-bold text-slate-900 mb-16">Kepala UPT SMPN 7 Pasuruan</p>
                  <p className="font-bold underline text-slate-900">Drs. Edy Suprayitno, M.M.</p>
                  <p className="text-[10px] text-slate-600">NIP. 19661103 199512 1 002</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
