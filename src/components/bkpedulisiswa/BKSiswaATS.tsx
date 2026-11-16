import React, { useState, useEffect } from 'react';
import {
  UserX,
  Save,
  Trash2,
  Edit2,
  Search,
  Printer,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  UserCheck,
  HeartHandshake,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { sabdaService, SiswaATSBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = ['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'];

const PELAKSANA_PRESETS: Record<string, { nip: string; jabatan: string; hp: string }> = {
  'WIWIK ISMIATI, S.Pd': {
    nip: '19831116 200904 2 003',
    jabatan: 'GURU BK',
    hp: '0851-6870-0953'
  },
  'EKI FEBRIANI, S.Pd': {
    nip: '19940214 202221 2 014',
    jabatan: 'GURU BK',
    hp: ''
  }
};

export const ATS_ALASAN_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'K_1', label: 'Tidak Mau Bersekolah' },
  { code: 'K_2', label: 'Tidak ada biaya' },
  { code: 'K_3', label: 'sekolah jauh dari rumah' },
  { code: 'K_4', label: 'sudah cukup dengan tingkat pendidikan yang dimiliki saat ini' },
  { code: 'K_5', label: 'Menikah/mengurus rumah tangga' },
  { code: 'K_6', label: 'mengalami kekerasan/perundungan/trauma di sekolah' },
  { code: 'K_7', label: 'bekerja' },
  { code: 'K_8', label: 'pengaruh lingkungan/teman' },
  { code: 'K_9', label: 'beranggapan sekolah tidak penting' },
  { code: 'K_10', label: 'tidak memiliki seragam sekolah' },
  { code: 'K_11', label: 'tidak memiliki akta kelahiran' },
  { code: 'K_12', label: 'masalah Kesehatan/penyandang disabilitas' },
  { code: 'K_15', label: 'dikeluarkan' },
  { code: 'K_16', label: 'mengundurkan diri' },
  { code: 'K_17', label: 'anak tidak ditemukan' },
  { code: 'K_18', label: 'melanjutkan ke luar negeri' },
  { code: 'K_19', label: 'melanjutkan ke pondok pesantren atau lainnya' },
  { code: 'K_21', label: 'meninggal dunia' },
  { code: 'K_22', label: 'bersekolah' },
  { code: 'K_23', label: 'pindah domisili' },
  { code: 'K_24', label: 'sudah tamat SMA/sederajat' },
  { code: 'K_25', label: 'bukan penduduk wilayah tersebut' },
  { code: 'K_13', label: 'lainnya' }
];

const KATEGORI_ATS_OPTIONS: Array<{
  value: SiswaATSBK['kategori_ats'];
  label: string;
}> = [
  { value: 'Drop Out', label: 'Drop Out' },
  { value: 'Lulus Tidak Melanjutkan', label: 'Lulus Tidak Melanjutkan' },
  { value: 'Belum Pernah Sekolah', label: 'Belum Pernah Sekolah' },
  { value: 'Beresiko Putus Sekolah', label: 'Beresiko Putus Sekolah' }
];

const STATUS_BERTEMU_OPTIONS: Array<'AYAH' | 'IBU' | 'WALI' | 'LAINNYA'> = [
  'AYAH',
  'IBU',
  'WALI',
  'LAINNYA'
];

const normalizeKategoriValue = (val?: string): SiswaATSBK['kategori_ats'] => {
  if (!val) return 'Lulus Tidak Melanjutkan';
  if (val === 'Putus Sekolah (DO)') return 'Drop Out';
  if (val === 'Rentan Putus Sekolah') return 'Beresiko Putus Sekolah';
  if (
    val === 'Drop Out' ||
    val === 'Lulus Tidak Melanjutkan' ||
    val === 'Belum Pernah Sekolah' ||
    val === 'Beresiko Putus Sekolah'
  ) {
    return val;
  }
  return 'Lulus Tidak Melanjutkan';
};

const formatTanggalIndo = (dateStr?: string): string => {
  if (!dateStr) return format(new Date(), 'd MMMM yyyy', { locale: idLocale });
  try {
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'd MMMM yyyy', { locale: idLocale });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

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
  const defaultGuru = getDefaultGuruBK(user);
  const defaultPreset = PELAKSANA_PRESETS[defaultGuru] || PELAKSANA_PRESETS['WIWIK ISMIATI, S.Pd'];

  const createEmptyForm = () => ({
    tanggal_identifikasi: defaultDate,
    unit_jenis: 'SMP' as 'SD' | 'SMP' | 'KELURAHAN',
    nama_wilayah: 'GADINGREJO',
    // I. Identitas Pelaksana
    pelaksana_nama: defaultGuru,
    pelaksana_nip: defaultPreset.nip,
    pelaksana_jabatan: defaultPreset.jabatan,
    pelaksana_hp: defaultPreset.hp,
    // II. Identitas Sasaran
    siswa_id: '',
    kelas: '',
    nama_siswa: '',
    usia: '',
    nisn: '',
    jenis_kelamin: 'P' as 'L' | 'P',
    kategori_ats: 'Lulus Tidak Melanjutkan' as SiswaATSBK['kategori_ats'],
    alamat: '',
    // III. Bertemu Dengan
    bertemu_nama: '',
    bertemu_status: 'IBU' as 'AYAH' | 'IBU' | 'WALI' | 'LAINNYA',
    no_telp: '',
    // IV. Pilihan Alasan
    alasan_kode: [] as string[],
    alasan_lainnya: '',
    // V. Catatan Hasil Kunjungan & Status
    catatan_hasil: '',
    status_penanganan: 'Pendampingan' as SiswaATSBK['status_penanganan']
  });

  const [formData, setFormData] = useState(createEmptyForm);

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
        const { data: sbData } = await supabase
          .from('master_siswa')
          .select('id, nama, kelas, nisn, jenis_kelamin, nama_ortu, alamat, no_telp')
          .order('nama', { ascending: true });
        if (sbData && sbData.length > 0) {
          setSiswaList(sbData);
          return;
        }
      }
    } catch {
      // fallback
    }
  };

  const handleSelectPelaksanaPreset = (nama: string) => {
    const preset = PELAKSANA_PRESETS[nama];
    setFormData((prev) => ({
      ...prev,
      pelaksana_nama: nama,
      pelaksana_nip: preset ? preset.nip : prev.pelaksana_nip,
      pelaksana_jabatan: preset ? preset.jabatan : prev.pelaksana_jabatan,
      pelaksana_hp: preset && preset.hp ? preset.hp : prev.pelaksana_hp
    }));
  };

  const handleSelectKelas = (newKelas: string) => {
    setFormData((prev) => ({
      ...prev,
      kelas: newKelas,
      siswa_id: ''
    }));
  };

  const handleSelectSiswa = (siswaId: string) => {
    const s = siswaList.find((item) => item.id === siswaId || item.nama === siswaId);
    if (s) {
      setFormData((prev) => ({
        ...prev,
        siswa_id: s.id || '',
        nama_siswa: s.nama || '',
        nisn: s.nisn || s.nis || '',
        kelas: s.kelas || prev.kelas,
        jenis_kelamin: (s.jenis_kelamin === 'P' || s.jk === 'P' ? 'P' : 'L') as 'L' | 'P',
        bertemu_nama: s.nama_ortu || prev.bertemu_nama,
        alamat: s.alamat || prev.alamat,
        no_telp: s.no_telp || s.no_hp || prev.no_telp
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        siswa_id: ''
      }));
    }
  };

  const toggleAlasan = (code: string) => {
    setFormData((prev) => {
      const exists = prev.alasan_kode.includes(code);
      const next = exists
        ? prev.alasan_kode.filter((c) => c !== code)
        : [...prev.alasan_kode, code];
      return { ...prev, alasan_kode: next };
    });
  };

  const filteredSiswa = siswaList
    .filter((s) => {
      if (!formData.kelas) return false;
      return normalizeKelasKey(s.kelas) === normalizeKelasKey(formData.kelas);
    })
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  const buildAlasanSummary = (codes: string[], lainnya: string): string => {
    if (codes.length === 0) return '-';
    return codes
      .map((code) => {
        const opt = ATS_ALASAN_OPTIONS.find((o) => o.code === code);
        if (!opt) return code;
        if (code === 'K_13' && lainnya.trim()) {
          return `${opt.code} ${opt.label} (${lainnya.trim()})`;
        }
        return `${opt.code} ${opt.label}`;
      })
      .join(', ');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_siswa.trim()) {
      setStatusMsg({ type: 'error', text: 'Nama sasaran (anak/siswa) wajib diisi!' });
      return;
    }
    if (!formData.pelaksana_nama.trim()) {
      setStatusMsg({ type: 'error', text: 'Nama pelaksana wajib diisi!' });
      return;
    }

    try {
      const alasanSummary = buildAlasanSummary(formData.alasan_kode, formData.alasan_lainnya);
      const record: SiswaATSBK = {
        id: editingId || `ats-${Date.now()}`,
        tanggal_identifikasi: formData.tanggal_identifikasi,
        unit_jenis: formData.unit_jenis,
        nama_wilayah: formData.nama_wilayah.trim() || 'GADINGREJO',
        pelaksana_nama: formData.pelaksana_nama.trim(),
        pelaksana_nip: formData.pelaksana_nip.trim(),
        pelaksana_jabatan: formData.pelaksana_jabatan.trim() || 'GURU BK',
        pelaksana_hp: formData.pelaksana_hp.trim(),
        siswa_id: formData.siswa_id,
        nama_siswa: formData.nama_siswa.trim(),
        usia: formData.usia.trim(),
        nisn: formData.nisn,
        kelas: formData.kelas || '-',
        jenis_kelamin: formData.jenis_kelamin,
        alamat: formData.alamat.trim(),
        bertemu_nama: formData.bertemu_nama.trim(),
        bertemu_status: formData.bertemu_status,
        nama_ortu: formData.bertemu_nama.trim(),
        no_telp: formData.no_telp.trim(),
        alasan_kode: formData.alasan_kode,
        alasan_lainnya: formData.alasan_lainnya.trim(),
        kategori_ats: formData.kategori_ats,
        faktor_penyebab: alasanSummary,
        lama_tidak_sekolah: formData.usia ? `Usia ${formData.usia}` : '-',
        upaya_penanganan: formData.catatan_hasil.trim() || '-',
        status_penanganan: formData.status_penanganan,
        catatan_hasil: formData.catatan_hasil.trim(),
        petugas_pendamping: formData.pelaksana_nama.trim(),
        created_at: new Date().toISOString()
      };

      const updated = await sabdaService.saveATS(record);
      setAtsList(updated);
      setStatusMsg({
        type: 'success',
        text: editingId
          ? 'Formulir kunjungan ATS berhasil diperbarui!'
          : 'Formulir kunjungan ATS berhasil disimpan!'
      });
      resetForm();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(createEmptyForm());
  };

  const handleEdit = (item: SiswaATSBK) => {
    const pelName =
      item.pelaksana_nama ||
      (item.petugas_pendamping && !item.petugas_pendamping.toLowerCase().includes('administrator')
        ? item.petugas_pendamping.replace(/\s*&\s*Tim Satgas ATS/i, '')
        : defaultGuru);
    const preset = PELAKSANA_PRESETS[pelName];

    setEditingId(item.id);
    setFormData({
      tanggal_identifikasi: item.tanggal_identifikasi || defaultDate,
      unit_jenis: item.unit_jenis || 'SMP',
      nama_wilayah: item.nama_wilayah || 'GADINGREJO',
      pelaksana_nama: pelName,
      pelaksana_nip: item.pelaksana_nip ?? (preset?.nip || ''),
      pelaksana_jabatan: item.pelaksana_jabatan || 'GURU BK',
      pelaksana_hp: item.pelaksana_hp ?? (preset?.hp || ''),
      siswa_id: item.siswa_id || '',
      kelas: item.kelas === '-' ? '' : item.kelas || '',
      nama_siswa: item.nama_siswa || '',
      usia: item.usia || '',
      nisn: item.nisn || '',
      jenis_kelamin: item.jenis_kelamin || 'L',
      kategori_ats: normalizeKategoriValue(item.kategori_ats),
      alamat: item.alamat || '',
      bertemu_nama: item.bertemu_nama || item.nama_ortu || '',
      bertemu_status: item.bertemu_status || 'IBU',
      no_telp: item.no_telp || '',
      alasan_kode: Array.isArray(item.alasan_kode) ? item.alasan_kode : [],
      alasan_lainnya: item.alasan_lainnya || '',
      catatan_hasil: item.catatan_hasil || '',
      status_penanganan: item.status_penanganan || 'Pendampingan'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteATS(id);
      setAtsList(updated);
      setDeleteConfirmId(null);
      setStatusMsg({ type: 'success', text: 'Data formulir kunjungan ATS berhasil dihapus.' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Gagal menghapus data.' });
    }
  };

  const filteredAts = atsList.filter((item) => {
    const normalizedCat = normalizeKategoriValue(item.kategori_ats);
    const q = searchTerm.toLowerCase();
    const matchSearch =
      item.nama_siswa.toLowerCase().includes(q) ||
      (item.alamat || '').toLowerCase().includes(q) ||
      (item.bertemu_nama || item.nama_ortu || '').toLowerCase().includes(q) ||
      normalizedCat.toLowerCase().includes(q) ||
      (item.faktor_penyebab || '').toLowerCase().includes(q) ||
      item.status_penanganan.toLowerCase().includes(q);

    if (categoryFilter === 'Semua') return matchSearch;
    return matchSearch && normalizedCat === categoryFilter;
  });

  const totalTerdata = atsList.length;
  const totalPendampingan = atsList.filter((i) => i.status_penanganan === 'Pendampingan').length;
  const totalKembali = atsList.filter((i) => i.status_penanganan === 'Kembali Bersekolah').length;

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
              Siswa ATS (Formulir Kunjungan Pencegahan &amp; Penanganan)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pendataan kunjungan Anak Tidak Sekolah (ATS) dan Anak Beresiko Putus Sekolah
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
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:bg-black/5 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Official Structured Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <UserX size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm sm:text-base uppercase tracking-tight">
                {editingId
                  ? 'Edit Formulir Kunjungan Pencegahan & Penanganan ATS'
                  : 'Formulir Kunjungan Pencegahan dan Penanganan Anak Tidak Sekolah & Beresiko Putus Sekolah'}
              </h3>
              <p className="text-xs text-slate-500">
                Lengkapi bagian I s.d. V sesuai hasil kunjungan lapangan
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Header Metadata Bar: Tanggal, Unit, Wilayah */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                TANGGAL KUNJUNGAN *
              </label>
              <input
                type="date"
                value={formData.tanggal_identifikasi}
                onChange={(e) => setFormData({ ...formData, tanggal_identifikasi: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                JENIS UNIT (SD/SMP/KELURAHAN) *
              </label>
              <select
                value={formData.unit_jenis}
                onChange={(e: any) => setFormData({ ...formData, unit_jenis: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 outline-none"
              >
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="KELURAHAN">KELURAHAN</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NAMA SEKOLAH / KELURAHAN *
              </label>
              <input
                type="text"
                value={formData.nama_wilayah}
                onChange={(e) => setFormData({ ...formData, nama_wilayah: e.target.value })}
                placeholder="Contoh: GADINGREJO"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 uppercase focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* SECTION I: IDENTITAS PELAKSANA */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                I. IDENTITAS PELAKSANA
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {GURU_BK_OPTIONS.map((nama) => (
                  <button
                    key={nama}
                    type="button"
                    onClick={() => handleSelectPelaksanaPreset(nama)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                      formData.pelaksana_nama === nama
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {nama}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  1. NAMA *
                </label>
                <input
                  type="text"
                  value={formData.pelaksana_nama}
                  onChange={(e) => setFormData({ ...formData, pelaksana_nama: e.target.value })}
                  placeholder="WIWIK ISMIATI, S.Pd"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  2. NIP
                </label>
                <input
                  type="text"
                  value={formData.pelaksana_nip}
                  onChange={(e) => setFormData({ ...formData, pelaksana_nip: e.target.value })}
                  placeholder="19831116 200904 2 003"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  3. JABATAN
                </label>
                <input
                  type="text"
                  value={formData.pelaksana_jabatan}
                  onChange={(e) => setFormData({ ...formData, pelaksana_jabatan: e.target.value })}
                  placeholder="GURU BK"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  4. NO HP
                </label>
                <input
                  type="text"
                  value={formData.pelaksana_hp}
                  onChange={(e) => setFormData({ ...formData, pelaksana_hp: e.target.value })}
                  placeholder="0851-6870-0953"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION II: IDENTITAS SASARAN */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                II. IDENTITAS SASARAN
              </h4>
            </div>

            {/* Optional quick pick from registered master_siswa */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-600">
                Ambil Cepat dari Database Siswa (Opsional — boleh dikosongkan jika sasaran di luar sekolah / isi manual)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={formData.kelas}
                  onChange={(e) => handleSelectKelas(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Pilih Kelas (Opsional) --</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
                <div className="sm:col-span-2">
                  <select
                    onChange={(e) => handleSelectSiswa(e.target.value)}
                    value={formData.siswa_id || ''}
                    disabled={!formData.kelas}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 outline-none disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.kelas
                        ? '-- Pilih Kelas untuk cari siswa --'
                        : filteredSiswa.length === 0
                          ? '-- Tidak ada siswa di kelas ini --'
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  1. NAMA *
                </label>
                <input
                  type="text"
                  value={formData.nama_siswa}
                  onChange={(e) => setFormData({ ...formData, nama_siswa: e.target.value })}
                  placeholder="Contoh: HILDA JULIANI"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  2. USIA
                </label>
                <input
                  type="text"
                  value={formData.usia}
                  onChange={(e) => setFormData({ ...formData, usia: e.target.value })}
                  placeholder="Contoh: 17 Tahun"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  3. KATEGORI *
                </label>
                <select
                  value={formData.kategori_ats}
                  onChange={(e: any) => setFormData({ ...formData, kategori_ats: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                >
                  {KATEGORI_ATS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-12">
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  4. ALAMAT LENGKAP
                </label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Contoh: Jl. Sidogiri Rt.06 Rw.04 Tambak Rejo Kraton"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION III: BERTEMU DENGAN */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                III. BERTEMU DENGAN
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  1. NAMA
                </label>
                <input
                  type="text"
                  value={formData.bertemu_nama}
                  onChange={(e) => setFormData({ ...formData, bertemu_nama: e.target.value })}
                  placeholder="Contoh: Sulastri"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  2. STATUS (AYAH / IBU / WALI / LAINNYA)
                </label>
                <select
                  value={formData.bertemu_status}
                  onChange={(e: any) => setFormData({ ...formData, bertemu_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                >
                  {STATUS_BERTEMU_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  3. NO HP
                </label>
                <input
                  type="text"
                  value={formData.no_telp}
                  onChange={(e) => setFormData({ ...formData, no_telp: e.target.value })}
                  placeholder="Contoh: 085963963630"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION IV: PILIH ALASAN DENGAN MEMBERIKAN TANDA CENTANG */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                IV. PILIH ALASAN DENGAN MEMBERIKAN TANDA CENTANG
              </h4>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {formData.alasan_kode.length} Alasan Dipilih
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ATS_ALASAN_OPTIONS.map((opt) => {
                const isChecked = formData.alasan_kode.includes(opt.code);
                return (
                  <label
                    key={opt.code}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                      isChecked
                        ? 'bg-blue-50/80 border-blue-400 text-slate-900 shadow-xs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAlasan(opt.code)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className={`text-xs sm:text-sm leading-snug ${isChecked ? 'font-bold text-slate-900' : 'font-medium'}`}>
                      <span className="font-mono font-bold mr-1.5">{opt.code}</span>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>

            {formData.alasan_kode.includes('K_13') && (
              <div className="pt-1">
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  KETERANGAN TAMBAHAN (K_13 LAINNYA)
                </label>
                <input
                  type="text"
                  value={formData.alasan_lainnya}
                  onChange={(e) => setFormData({ ...formData, alasan_lainnya: e.target.value })}
                  placeholder="Tuliskan alasan lainnya secara spesifik..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* SECTION V: CATATAN HASIL KUNJUNGAN */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                V. CATATAN HASIL KUNJUNGAN
              </h4>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                URAIAN CATATAN HASIL KUNJUNGAN
              </label>
              <textarea
                rows={3}
                value={formData.catatan_hasil}
                onChange={(e) => setFormData({ ...formData, catatan_hasil: e.target.value })}
                placeholder="Contoh: Murid tidak melanjutkan sekolah karena bekerja, sebab tidak ada biaya untuk melanjutkan sekolah..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                STATUS PENANGANAN / TINDAK LANJUT
              </label>
              <select
                value={formData.status_penanganan}
                onChange={(e: any) => setFormData({ ...formData, status_penanganan: e.target.value })}
                className="w-full md:w-1/2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="Teridentifikasi">Teridentifikasi (Baru terdata)</option>
                <option value="Pendampingan">Dalam Pendampingan / Proses Kunjungan</option>
                <option value="Kembali Bersekolah">Berhasil Kembali Bersekolah (Re-entry)</option>
                <option value="Alih PKBM/Paket">Disalurkan ke Pendidikan Non-Formal (PKBM/Paket)</option>
                <option value="Pindah Sekolah">Pindah ke Satuan Pendidikan Lain</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
            >
              <Save size={16} />
              <span>{editingId ? 'Perbarui Formulir ATS' : 'Simpan Formulir Kunjungan ATS'}</span>
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
              Daftar Kunjungan Siswa ATS &amp; Hasil Penanganan
            </h3>
            <p className="text-xs text-slate-500">
              Total {atsList.length} sasaran dalam basis data kunjungan ATS
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 outline-none font-medium"
            >
              <option value="Semua">Semua Kategori</option>
              {KATEGORI_ATS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, alasan..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Tanggal &amp; Nama Sasaran</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Bertemu Dengan</th>
                <th className="py-3 px-4">Alasan Terpilih</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat data kunjungan ATS...
                  </td>
                </tr>
              ) : filteredAts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data kunjungan siswa ATS ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAts.map((item) => {
                  const normalizedCat = normalizeKategoriValue(item.kategori_ats);
                  const bertemuLabel = item.bertemu_nama || item.nama_ortu || '-';
                  const alasanCodes = Array.isArray(item.alasan_kode) ? item.alasan_kode : [];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.nama_siswa}</div>
                        <div className="text-[11px] text-blue-600 font-medium">
                          {item.usia ? `Usia ${item.usia}` : item.kelas && item.kelas !== '-' ? `Kelas ${item.kelas}` : 'Sasaran ATS'}
                          {item.alamat ? ` • ${item.alamat}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400">Tanggal: {item.tanggal_identifikasi}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            normalizedCat === 'Drop Out'
                              ? 'bg-rose-100 text-rose-700'
                              : normalizedCat === 'Lulus Tidak Melanjutkan'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {normalizedCat}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{bertemuLabel}</div>
                        <div className="text-[10px] text-slate-500">
                          {item.bertemu_status ? `Status: ${item.bertemu_status}` : ''}
                          {item.no_telp ? ` • ${item.no_telp}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {alasanCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {alasanCodes.map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 truncate block" title={item.faktor_penyebab}>
                            {item.faktor_penyebab}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status_penanganan === 'Kembali Bersekolah'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status_penanganan === 'Pendampingan'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status_penanganan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPrintItem(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Cetak Formulir Kunjungan ATS"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h4 className="font-bold text-slate-900 text-lg mb-2">Hapus Data Formulir ATS?</h4>
            <p className="text-slate-600 text-sm mb-6">
              Apakah Anda yakin ingin menghapus catatan formulir kunjungan siswa ATS ini? Tindakan ini tidak dapat dibatalkan.
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

      {/* Printable Modal Official Formulir Kunjungan ATS (Exact Layout as Reference Form) */}
      {printItem && (() => {
        const pelNama =
          printItem.pelaksana_nama ||
          (printItem.petugas_pendamping || 'WIWIK ISMIATI, S.Pd').replace(/\s*&\s*Tim Satgas ATS/i, '');
        const pelNip =
          printItem.pelaksana_nip ||
          PELAKSANA_PRESETS[pelNama]?.nip ||
          '19831116 200904 2 003';
        const pelJabatan = printItem.pelaksana_jabatan || 'GURU BK';
        const pelHp =
          printItem.pelaksana_hp ||
          PELAKSANA_PRESETS[pelNama]?.hp ||
          '0851-6870-0953';
        const unitJenis = printItem.unit_jenis || 'SMP';
        const namaWilayah = printItem.nama_wilayah || 'GADINGREJO';
        const normKat = normalizeKategoriValue(printItem.kategori_ats);
        const bertemuNama = printItem.bertemu_nama || printItem.nama_ortu || '-';
        const bertemuStatus = printItem.bertemu_status || 'IBU';
        const selectedCodes = Array.isArray(printItem.alasan_kode) ? printItem.alasan_kode : [];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div
              id="bk-print-area"
              className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 relative my-4 text-slate-950 print:m-0 print:p-2 print:shadow-none print:border-none"
            >
              {/* Action Bar */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 print:hidden">
                <span className="font-bold text-sm text-slate-700">
                  Preview Formulir Kunjungan Pencegahan &amp; Penanganan ATS
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      printBKReport('bk-print-area', `Formulir Kunjungan ATS - ${printItem.nama_siswa}`)
                    }
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200"
                  >
                    <Printer size={15} /> Cetak Formulir
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

              {/* Document Title matching image_365676c9.png */}
              <div className="text-center my-4 leading-snug">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wide">
                  FORMULIR KUNJUNGAN PENCEGAHAN DAN PENANGANAN
                </h2>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                  ANAK TIDAK SEKOLAH DAN ANAK BERESIKO PUTUS SEKOLAH
                </h3>
                <p className="text-xs sm:text-sm font-black uppercase mt-0.5">
                  <span className={unitJenis === 'SD' ? '' : 'line-through text-slate-500 font-semibold'}>
                    SD
                  </span>
                  /
                  <span className={unitJenis === 'SMP' ? '' : 'line-through text-slate-500 font-semibold'}>
                    SMP
                  </span>
                  /
                  <span className={unitJenis === 'KELURAHAN' ? '' : 'line-through text-slate-500 font-semibold'}>
                    KELURAHAN
                  </span>
                  * {namaWilayah}
                </p>
              </div>

              {/* Body I .. V */}
              <div className="text-xs sm:text-[13px] space-y-3.5 leading-snug">
                {/* I. IDENTITAS PELAKSANA */}
                <div>
                  <p className="font-black uppercase mb-1">I. &nbsp;&nbsp;&nbsp; IDENTITAS PELAKSANA</p>
                  <div className="pl-7 space-y-0.5">
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">1. &nbsp; NAMA</span>
                      <span className="col-span-8 font-bold uppercase">: {pelNama}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">2. &nbsp; NIP</span>
                      <span className="col-span-8">: {pelNip || '-'}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">3. &nbsp; JABATAN</span>
                      <span className="col-span-8 uppercase">: {pelJabatan}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">4. &nbsp; NO HP</span>
                      <span className="col-span-8">: {pelHp || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* II. IDENTITAS SASARAN */}
                <div>
                  <p className="font-black uppercase mb-1">II. &nbsp;&nbsp; IDENTITAS SASARAN</p>
                  <div className="pl-7 space-y-0.5">
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">1. &nbsp; NAMA</span>
                      <span className="col-span-8 font-bold uppercase">: {printItem.nama_siswa}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">2. &nbsp; USIA</span>
                      <span className="col-span-8">: {printItem.usia || '-'}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">3. &nbsp; KATEGORI</span>
                      <span className="col-span-8">
                        :{' '}
                        <span className={normKat === 'Drop Out' ? 'font-bold' : 'line-through text-slate-500'}>
                          Drop Out
                        </span>
                        /
                        <span
                          className={
                            normKat === 'Lulus Tidak Melanjutkan' ? 'font-bold' : 'line-through text-slate-500'
                          }
                        >
                          Lulus Tidak Melanjutkan
                        </span>
                        /
                        <span
                          className={
                            normKat === 'Belum Pernah Sekolah' ? 'font-bold' : 'line-through text-slate-500'
                          }
                        >
                          Belum Pernah Bersekolah
                        </span>
                        *
                        {normKat === 'Beresiko Putus Sekolah' && (
                          <span className="ml-1.5 font-bold">(Beresiko Putus Sekolah)</span>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">4. &nbsp; ALAMAT LENGKAP</span>
                      <span className="col-span-8">: {printItem.alamat || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* III. BERTEMU DENGAN */}
                <div>
                  <p className="font-black uppercase mb-1">III. &nbsp; BERTEMU DENGAN</p>
                  <div className="pl-7 space-y-0.5">
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">1. &nbsp; NAMA</span>
                      <span className="col-span-8 font-semibold">: {bertemuNama}</span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">2. &nbsp; STATUS</span>
                      <span className="col-span-8">
                        :{' '}
                        {STATUS_BERTEMU_OPTIONS.map((st, idx) => (
                          <React.Fragment key={st}>
                            {idx > 0 && '/'}
                            <span className={bertemuStatus === st ? 'font-bold' : 'line-through text-slate-500'}>
                              {st}
                            </span>
                          </React.Fragment>
                        ))}
                        *
                      </span>
                    </div>
                    <div className="grid grid-cols-12">
                      <span className="col-span-4">3. &nbsp; NO HP</span>
                      <span className="col-span-8">: {printItem.no_telp || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* IV. PILIH ALASAN DENGAN MEMBERIKAN TANDA CENTANG */}
                <div>
                  <p className="font-black uppercase mb-1">
                    IV. &nbsp; PILIH ALASAN DENGAN MEMBERIKAN TANDA CENTANG
                  </p>
                  <div className="pl-8 space-y-0.5 text-[11.5px] sm:text-xs">
                    {ATS_ALASAN_OPTIONS.map((opt) => {
                      const checked = selectedCodes.includes(opt.code);
                      return (
                        <div
                          key={opt.code}
                          className={`flex items-start gap-2 ${checked ? 'font-bold text-slate-950' : 'text-slate-700'}`}
                        >
                          <span className="w-4 inline-block text-center shrink-0">
                            {checked ? '☑' : '○'}
                          </span>
                          <span>
                            {opt.code} {opt.label}
                            {opt.code === 'K_13' && checked && printItem.alasan_lainnya
                              ? `: ${printItem.alasan_lainnya}`
                              : ''}
                          </span>
                        </div>
                      );
                    })}
                    {selectedCodes.length === 0 && printItem.faktor_penyebab && printItem.faktor_penyebab !== '-' && (
                      <p className="text-xs italic text-slate-600 pt-1">
                        Catatan alasan: {printItem.faktor_penyebab}
                      </p>
                    )}
                  </div>
                </div>

                {/* V. CATATAN HASIL KUNJUNGAN */}
                <div>
                  <p className="font-black uppercase mb-1">V. &nbsp;&nbsp; CATATAN HASIL KUNJUNGAN</p>
                  <div className="pl-7 text-xs sm:text-[13px] text-slate-900 leading-relaxed whitespace-pre-line">
                    {printItem.catatan_hasil || printItem.upaya_penanganan || '-'}
                  </div>
                </div>
              </div>

              {/* Signatures matching image_365676c9.png */}
              <div className="mt-8 pt-2 grid grid-cols-2 gap-8 text-xs sm:text-[13px]">
                <div className="pl-7 flex flex-col justify-between">
                  <div>
                    <p>&nbsp;</p>
                    <p className="font-semibold">Sasaran</p>
                  </div>
                  <div className="mt-16">
                    <p className="font-bold uppercase">{printItem.nama_siswa}</p>
                  </div>
                </div>

                <div className="pl-4 flex flex-col justify-between">
                  <div>
                    <p>Pasuruan, {formatTanggalIndo(printItem.tanggal_identifikasi)}</p>
                    <p className="font-semibold">Pelaksana,</p>
                  </div>
                  <div className="mt-16">
                    <p className="font-bold underline uppercase">{pelNama}</p>
                    <p className="text-xs">Nip. {pelNip || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100 print:hidden">
                <button
                  type="button"
                  onClick={() => setPrintItem(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printBKReport('bk-print-area', `Formulir Kunjungan ATS - ${printItem.nama_siswa}`)
                  }
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 shadow-md shadow-amber-200 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Cetak Formulir</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
