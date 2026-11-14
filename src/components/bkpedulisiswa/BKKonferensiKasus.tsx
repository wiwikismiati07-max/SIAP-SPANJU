import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, AlertTriangle, Users, Calendar, Clock, MapPin, X } from 'lucide-react';
import { sabdaService, KonferensiKasusBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = ['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'];

export default function BKKonferensiKasus({ user }: { user?: any }) {
  const [konferensis, setKonferensis] = useState<KonferensiKasusBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<KonferensiKasusBK | null>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    nomor_dokumen: `421.3/BA-KK-${String(Math.floor(Math.random() * 900) + 100)}/SMPN7/XI/2026`,
    tanggal: defaultDate,
    waktu: '09:00 WIB',
    tempat: 'Ruang BK SMPN 7 Pasuruan',
    siswa_id: '',
    nama_siswa: '',
    nisn: '',
    kelas: '9C',
    kasus_dibahas: '',
    tujuan_konferensi: 'Mencari akar permasalahan dan merumuskan langkah penanganan kolaboratif terpadu antara sekolah dan orang tua.',
    peserta_hadir: 'Drs. Edy Suprayitno, M.M. (Kepala Sekolah), WIWIK ISMIATI, S.Pd (Guru BK), Wali Kelas, Orang Tua/Wali Murid',
    pokok_pembahasan: '',
    kesepakatan_solusi: '',
    tindak_lanjut: 'Monitoring perkembangan harian selama 2 pekan oleh Guru BK dan Wali Kelas.',
    pimpinan_sidang: 'Drs. Edy Suprayitno, M.M.',
    notulis: getDefaultGuruBK(user),
    status: 'Dalam Pemantauan' as const
  });

  useEffect(() => {
    loadData();
    loadSiswaList();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getKonferensi();
      setKonferensis(data);
    } catch (e: any) {
      console.error('Error loading konferensi kasus:', e);
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
        const { data: sbData } = await supabase.from('master_siswa').select('id, nama, kelas, nisn').order('nama', { ascending: true });
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
      { id: 'sw-1', nama: 'Muhammad Farhan', kelas: '9C', nisn: '0091234567' },
      { id: 'sw-2', nama: 'Rizky Ramadhani', kelas: '8B', nisn: '0098765432' },
      { id: 'sw-3', nama: 'Bagas Pratama', kelas: '7C', nisn: '0094567890' },
      { id: 'sw-4', nama: 'Dimas Anggara', kelas: '8E', nisn: '0089871234' }
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
        kelas: s.kelas || prev.kelas
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
    if (!formData.nama_siswa || !formData.kasus_dibahas) {
      setStatusMsg({ type: 'error', text: 'Nama siswa dan kasus yang dibahas wajib diisi!' });
      return;
    }

    try {
      const record: KonferensiKasusBK = {
        id: editingId || `kk-${Date.now()}`,
        nomor_dokumen: formData.nomor_dokumen,
        tanggal: formData.tanggal,
        waktu: formData.waktu,
        tempat: formData.tempat,
        siswa_id: formData.siswa_id,
        nama_siswa: formData.nama_siswa,
        nisn: formData.nisn,
        kelas: formData.kelas,
        kasus_dibahas: formData.kasus_dibahas,
        tujuan_konferensi: formData.tujuan_konferensi,
        peserta_hadir: formData.peserta_hadir,
        pokok_pembahasan: formData.pokok_pembahasan,
        kesepakatan_solusi: formData.kesepakatan_solusi,
        tindak_lanjut: formData.tindak_lanjut,
        pimpinan_sidang: formData.pimpinan_sidang,
        notulis: formData.notulis,
        status: formData.status,
        created_at: new Date().toISOString()
      };

      const updated = await sabdaService.saveKonferensi(record);
      setKonferensis(updated);
      setStatusMsg({ type: 'success', text: editingId ? 'Berita Acara Konferensi Kasus berhasil diperbarui!' : 'Berita Acara Konferensi Kasus berhasil disimpan!' });
      resetForm();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nomor_dokumen: `421.3/BA-KK-${String(Math.floor(Math.random() * 900) + 100)}/SMPN7/XI/2026`,
      tanggal: defaultDate,
      waktu: '09:00 WIB',
      tempat: 'Ruang BK SMPN 7 Pasuruan',
      siswa_id: '',
      nama_siswa: '',
      nisn: '',
      kelas: '9C',
      kasus_dibahas: '',
      tujuan_konferensi: 'Mencari akar permasalahan dan merumuskan langkah penanganan kolaboratif terpadu antara sekolah dan orang tua.',
      peserta_hadir: 'Drs. Edy Suprayitno, M.M. (Kepala Sekolah), WIWIK ISMIATI, S.Pd (Guru BK), Wali Kelas, Orang Tua/Wali Murid',
      pokok_pembahasan: '',
      kesepakatan_solusi: '',
      tindak_lanjut: 'Monitoring perkembangan harian selama 2 pekan oleh Guru BK dan Wali Kelas.',
      pimpinan_sidang: 'Drs. Edy Suprayitno, M.M.',
      notulis: getDefaultGuruBK(user),
      status: 'Dalam Pemantauan'
    });
  };

  const handleEdit = (item: KonferensiKasusBK) => {
    setEditingId(item.id);
    setFormData({
      nomor_dokumen: item.nomor_dokumen,
      tanggal: item.tanggal,
      waktu: item.waktu,
      tempat: item.tempat,
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      nisn: item.nisn || '',
      kelas: item.kelas,
      kasus_dibahas: item.kasus_dibahas,
      tujuan_konferensi: item.tujuan_konferensi,
      peserta_hadir: item.peserta_hadir,
      pokok_pembahasan: item.pokok_pembahasan,
      kesepakatan_solusi: item.kesepakatan_solusi,
      tindak_lanjut: item.tindak_lanjut,
      pimpinan_sidang: item.pimpinan_sidang,
      notulis: item.notulis && !item.notulis.toLowerCase().includes('administrator') ? item.notulis : getDefaultGuruBK(user),
      status: item.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteKonferensi(id);
      setKonferensis(updated);
      setDeleteConfirmId(null);
      setStatusMsg({ type: 'success', text: 'Data konferensi kasus berhasil dihapus.' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Gagal menghapus data.' });
    }
  };

  const filteredKonferensi = konferensis.filter(item => 
    item.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nomor_dokumen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kasus_dibahas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-md tracking-wider">
              FORM H
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Konferensi Kasus Siswa (Case Conference)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pembahasan dan penanganan kasus khusus siswa secara terpadu dan kolaboratif
          </p>
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

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Briefcase size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {editingId ? 'Edit Berita Acara Konferensi Kasus' : 'Form Input Konferensi Kasus Siswa'}
            </h3>
            <p className="text-xs text-slate-500">
              Dokumentasi resmi hasil musyawarah penanganan kasus khusus siswa
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NOMOR BERITA ACARA *
              </label>
              <input
                type="text"
                value={formData.nomor_dokumen}
                onChange={(e) => setFormData({ ...formData, nomor_dokumen: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                TANGGAL PELAKSANAAN *
              </label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                WAKTU / JAM
              </label>
              <input
                type="text"
                value={formData.waktu}
                onChange={(e) => setFormData({ ...formData, waktu: e.target.value })}
                placeholder="09:00 WIB"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                TEMPAT PERTEMUAN
              </label>
              <input
                type="text"
                value={formData.tempat}
                onChange={(e) => setFormData({ ...formData, tempat: e.target.value })}
                placeholder="Ruang BK SMPN 7 Pasuruan"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Student selection - Kelas first then Siswa filtered */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Identitas Siswa Yang Dibahas
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                  NAMA SISWA LENGKAP *
                </label>
                <input
                  type="text"
                  value={formData.nama_siswa}
                  onChange={(e) => setFormData({ ...formData, nama_siswa: e.target.value })}
                  placeholder="Nama lengkap siswa"
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
                  placeholder="0091234567"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              PESERTA KONFERENSI KASUS YANG HADIR *
            </label>
            <input
              type="text"
              value={formData.peserta_hadir}
              onChange={(e) => setFormData({ ...formData, peserta_hadir: e.target.value })}
              placeholder="Drs. Edy Suprayitno, M.M. (Kepala Sekolah), WIWIK ISMIATI, S.Pd (Guru BK), Wali Kelas, Orang Tua Siswa"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              DESKRIPSI PERMASALAHAN / KASUS YANG DIBAHAS *
            </label>
            <textarea
              rows={3}
              value={formData.kasus_dibahas}
              onChange={(e) => setFormData({ ...formData, kasus_dibahas: e.target.value })}
              placeholder="Jelaskan latar belakang kasus, kronologis kejadian, dan dampak yang ditimbulkan..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              DINAMIKA & POKOK PEMBAHASAN SIDANG
            </label>
            <textarea
              rows={3}
              value={formData.pokok_pembahasan}
              onChange={(e) => setFormData({ ...formData, pokok_pembahasan: e.target.value })}
              placeholder="Catatan pandangan pihak sekolah, keterangan orang tua, temuan konselor, dan analisa pemicu..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              KESEPAKATAN & SOLUSI TERPADU *
            </label>
            <textarea
              rows={3}
              value={formData.kesepakatan_solusi}
              onChange={(e) => setFormData({ ...formData, kesepakatan_solusi: e.target.value })}
              placeholder="Rumusan solusi bersama, pembagian peran orang tua dan sekolah, serta komitmen pembinaan..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              RENCANA TINDAK LANJUT & MONITORING *
            </label>
            <textarea
              rows={2}
              value={formData.tindak_lanjut}
              onChange={(e) => setFormData({ ...formData, tindak_lanjut: e.target.value })}
              placeholder="Bentuk evaluasi berkala, jadwal bimbingan lanjutan, dan pemantauan harian..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                PIMPINAN SIDANG *
              </label>
              <input
                type="text"
                value={formData.pimpinan_sidang}
                onChange={(e) => setFormData({ ...formData, pimpinan_sidang: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NOTULIS (GURU BK) *
              </label>
              <select
                value={formData.notulis}
                onChange={(e) => setFormData({ ...formData, notulis: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                {GURU_BK_OPTIONS.map((nama, idx) => (
                  <option key={nama} value={nama}>{idx + 1}. {nama}</option>
                ))}
                {!GURU_BK_OPTIONS.includes(formData.notulis as any) && formData.notulis && !formData.notulis.toLowerCase().includes('administrator') && (
                  <option value={formData.notulis}>{formData.notulis}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                STATUS KASUS
              </label>
              <select
                value={formData.status}
                onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="Dalam Pemantauan">Dalam Pemantauan</option>
                <option value="Selesai">Selesai (Kasus Tuntas)</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
            >
              <Save size={16} />
              <span>{editingId ? 'Perbarui Berita Acara' : 'Simpan Berita Acara Konferensi'}</span>
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
              Riwayat Berita Acara Konferensi Kasus
            </h3>
            <p className="text-xs text-slate-500">
              Total {konferensis.length} konferensi kasus tersimpan
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berita acara, siswa, kasus..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">No. Dokumen & Tanggal</th>
                <th className="py-3 px-4">Nama Siswa & Kelas</th>
                <th className="py-3 px-4">Kasus yang Dibahas</th>
                <th className="py-3 px-4">Peserta Hadir</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKonferensi.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data konferensi kasus ditemukan.
                  </td>
                </tr>
              ) : (
                filteredKonferensi.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{item.nomor_dokumen}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.tanggal} • {item.waktu}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.nama_siswa}</div>
                      <div className="text-[11px] text-blue-600 font-medium">Kelas {item.kelas}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium" title={item.kasus_dibahas}>
                      {item.kasus_dibahas}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500 text-[11px]" title={item.peserta_hadir}>
                      {item.peserta_hadir}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Selesai' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Cetak Berita Acara Resmi"
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
            <h4 className="font-bold text-slate-900 text-lg mb-2">Hapus Berita Acara?</h4>
            <p className="text-slate-600 text-sm mb-6">
              Apakah Anda yakin ingin menghapus data berita acara konferensi kasus ini? Tindakan ini tidak dapat dibatalkan.
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

      {/* Printable Modal Official Berita Acara Konferensi Kasus */}
      {printItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div id="bk-print-area" className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 relative my-8 text-slate-900 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="font-bold text-sm text-slate-700">Preview Berita Acara Konferensi Kasus Resmi</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printBKReport('bk-print-area', `Konferensi Kasus - ${printItem.nama_siswa}`)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200"
                >
                  <Printer size={15} /> Cetak Dokumen
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
                BERITA ACARA KONFERENSI KASUS (CASE CONFERENCE)
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Nomor: {printItem.nomor_dokumen}
              </p>
            </div>

            {/* Content */}
            <div className="text-xs sm:text-sm space-y-4 leading-relaxed text-justify">
              <p>
                Pada hari ini tanggal <strong>{printItem.tanggal}</strong> bertempat di <strong>{printItem.tempat}</strong>, telah diselenggarakan Konferensi Kasus Peserta Didik UPT SMP Negeri 7 Pasuruan dengan rincian data sebagai berikut:
              </p>

              <div className="pl-6 space-y-1.5 font-medium">
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Nama Siswa</span>
                  <span className="col-span-2 font-bold text-slate-900">: {printItem.nama_siswa}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Kelas / NISN</span>
                  <span className="col-span-2">: {printItem.kelas} / {printItem.nisn || '-'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Waktu Pelaksanaan</span>
                  <span className="col-span-2">: Pukul {printItem.waktu} s.d selesai</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Peserta yang Hadir</span>
                  <span className="col-span-2">: {printItem.peserta_hadir}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">I. Masalah / Kasus yang Dibahas:</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                  {printItem.kasus_dibahas}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">II. Dinamika & Pokok Pembahasan:</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                  {printItem.pokok_pembahasan || 'Telah dilakukan musyawarah mendalam mengenai faktor internal dan eksternal penyebab permasalahan siswa.'}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">III. Kesepakatan & Rekomendasi Solusi:</p>
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs leading-relaxed text-slate-900 font-medium">
                  {printItem.kesepakatan_solusi}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">IV. Rencana Tindak Lanjut:</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800">
                  {printItem.tindak_lanjut}
                </div>
              </div>

              <p>
                Demikian Berita Acara Konferensi Kasus ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya dan dijadikan pedoman dalam pendampingan siswa.
              </p>
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-4">
              <div className="text-right text-xs font-semibold text-slate-800 mb-6">
                Pasuruan, {printItem.tanggal}
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-600 font-medium">Notulis Sidang,</p>
                  <p className="font-bold text-slate-900 mb-16">Guru Bimbingan Konseling</p>
                  <p className="font-bold underline text-slate-900">{printItem.notulis}</p>
                </div>

                <div>
                  <p className="text-slate-600 font-medium">Pimpinan Sidang,</p>
                  <p className="font-bold text-slate-900 mb-16">Kepala UPT SMPN 7 Pasuruan</p>
                  <p className="font-bold underline text-slate-900">{printItem.pimpinan_sidang}</p>
                  <p className="text-[10px] text-slate-600">NIP. 19661103 199512 1 002</p>
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
                onClick={() => printBKReport('bk-print-area', `Berita Acara Konferensi Kasus - ${printItem.nama_siswa}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 shadow-md shadow-amber-200 cursor-pointer"
              >
                <Printer size={16} />
                <span>Cetak Berita Acara</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
