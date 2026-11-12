import React, { useState, useEffect } from 'react';
import { FileText, Plus, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { sabdaService, SuratPernyataanBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import { formatKelasDisplay } from './BKAgendaKerja';

const CLASSES = ['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'];

export default function BKSuratPernyataan({ user }: { user?: any }) {
  const [pernyataans, setPernyataans] = useState<SuratPernyataanBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<SuratPernyataanBK | null>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    nomor_surat: `421.3/SP-${String(Math.floor(Math.random() * 900) + 100)}/SMPN7/XI/2026`,
    tanggal: defaultDate,
    siswa_id: '',
    nama_siswa: '',
    nisn: '',
    kelas: '8A',
    nama_ortu: '',
    alamat_ortu: '',
    no_hp_ortu: '',
    jenis_pernyataan: 'Perjanjian 2' as const,
    butir_pelanggaran: '',
    isi_pernyataan: 'Dengan ini saya berjanji dengan sungguh-sungguh tidak akan mengulangi perbuatan/pelanggaran tersebut, dan bersedia menaati seluruh tata tertib yang berlaku di UPT SMP Negeri 7 Pasuruan.',
    konsekuensi: 'Apabila di kemudian hari saya mengulangi pelanggaran yang sama atau melakukan pelanggaran tata tertib lainnya, saya bersedia menerima sanksi yang lebih berat sesuai aturan sekolah / siap dikembalikan kepada orang tua.',
    guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd',
    wali_kelas: 'Wali Kelas',
    kepala_sekolah: 'Drs. Edy Suprayitno, M.M.',
    status: 'Aktif' as const
  });

  useEffect(() => {
    loadData();
    loadSiswaList();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getPernyataan();
      setPernyataans(data);
    } catch (e: any) {
      console.error('Error loading pernyataan:', e);
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
        setSiswaList(data.map((s: any) => ({
          ...s,
          kelas: formatKelasDisplay(s.kelas)
        })));
        try {
          localStorage.setItem('sitelat_siswa', JSON.stringify(data));
          localStorage.setItem('master_siswa', JSON.stringify(data));
        } catch (_) {}
        return;
      }
    } catch (err) {
      console.warn('Gagal memuat siswa dari fetchAllSiswa:', err);
    }

    const local = localStorage.getItem('master_siswa');
    if (local) {
      try {
        setSiswaList(JSON.parse(local));
        return;
      } catch {}
    }

    // Default mock list
    setSiswaList([
      { id: 'sw-1', nama: 'Rizky Ramadhani', kelas: '8B', nisn: '0098765432', nama_ortu: 'Bpk. Sugeng Wibowo', alamat: 'Jl. Veteran No. 12, Pasuruan' },
      { id: 'sw-2', nama: 'Muhammad Farhan', kelas: '9C', nisn: '0091234567', nama_ortu: 'Ibu Nurul', alamat: 'Jl. Diponegoro No. 8, Pasuruan' },
      { id: 'sw-3', nama: 'Bagas Pratama', kelas: '7C', nisn: '0094567890', nama_ortu: 'Ibu Siti Rahma', alamat: 'Jl. Panglima Sudirman No. 45' },
      { id: 'sw-4', nama: 'Dimas Anggara', kelas: '8E', nisn: '0089871234', nama_ortu: 'Bpk. Kasiman', alamat: 'Kelurahan Mandaranrejo, Pasuruan' }
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
        nama_ortu: s.nama_ortu || prev.nama_ortu,
        alamat_ortu: s.alamat || prev.alamat_ortu
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
    if (!formData.nama_siswa || !formData.butir_pelanggaran) {
      setStatusMsg({ type: 'error', text: 'Nama siswa dan uraian pelanggaran wajib diisi!' });
      return;
    }

    try {
      const record: SuratPernyataanBK = {
        id: editingId || `sp-${Date.now()}`,
        nomor_surat: formData.nomor_surat,
        tanggal: formData.tanggal,
        siswa_id: formData.siswa_id,
        nama_siswa: formData.nama_siswa,
        nisn: formData.nisn,
        kelas: formData.kelas,
        nama_ortu: formData.nama_ortu || 'Orang Tua / Wali',
        alamat_ortu: formData.alamat_ortu,
        no_hp_ortu: formData.no_hp_ortu,
        jenis_pernyataan: formData.jenis_pernyataan,
        butir_pelanggaran: formData.butir_pelanggaran,
        isi_pernyataan: formData.isi_pernyataan,
        konsekuensi: formData.konsekuensi,
        guru_bk: formData.guru_bk,
        wali_kelas: formData.wali_kelas,
        kepala_sekolah: formData.kepala_sekolah,
        status: formData.status,
        created_at: new Date().toISOString()
      };

      const updated = await sabdaService.savePernyataan(record);
      setPernyataans(updated);
      setStatusMsg({ type: 'success', text: editingId ? 'Surat Pernyataan berhasil diperbarui!' : 'Surat Pernyataan berhasil diterbitkan!' });
      resetForm();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nomor_surat: `421.3/SP-${String(Math.floor(Math.random() * 900) + 100)}/SMPN7/XI/2026`,
      tanggal: defaultDate,
      siswa_id: '',
      nama_siswa: '',
      nisn: '',
      kelas: '8A',
      nama_ortu: '',
      alamat_ortu: '',
      no_hp_ortu: '',
      jenis_pernyataan: 'Perjanjian 2',
      butir_pelanggaran: '',
      isi_pernyataan: 'Dengan ini saya berjanji dengan sungguh-sungguh tidak akan mengulangi perbuatan/pelanggaran tersebut, dan bersedia menaati seluruh tata tertib yang berlaku di UPT SMP Negeri 7 Pasuruan.',
      konsekuensi: 'Apabila di kemudian hari saya mengulangi pelanggaran yang sama atau melakukan pelanggaran tata tertib lainnya, saya bersedia menerima sanksi yang lebih berat sesuai aturan sekolah / siap dikembalikan kepada orang tua.',
      guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd',
      wali_kelas: 'Wali Kelas',
      kepala_sekolah: 'Drs. Edy Suprayitno, M.M.',
      status: 'Aktif'
    });
  };

  const handleEdit = (item: SuratPernyataanBK) => {
    setEditingId(item.id);
    setFormData({
      nomor_surat: item.nomor_surat,
      tanggal: item.tanggal,
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      nisn: item.nisn || '',
      kelas: item.kelas,
      nama_ortu: item.nama_ortu || '',
      alamat_ortu: item.alamat_ortu || '',
      no_hp_ortu: item.no_hp_ortu || '',
      jenis_pernyataan: item.jenis_pernyataan,
      butir_pelanggaran: item.butir_pelanggaran,
      isi_pernyataan: item.isi_pernyataan,
      konsekuensi: item.konsekuensi,
      guru_bk: item.guru_bk,
      wali_kelas: item.wali_kelas || 'Wali Kelas',
      kepala_sekolah: item.kepala_sekolah || 'Drs. Edy Suprayitno, M.M.',
      status: item.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deletePernyataan(id);
      setPernyataans(updated);
      setDeleteConfirmId(null);
      setStatusMsg({ type: 'success', text: 'Surat pernyataan berhasil dihapus.' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Gagal menghapus data.' });
    }
  };

  const filteredPernyataan = pernyataans.filter(item => 
    item.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nomor_surat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.jenis_pernyataan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-md tracking-wider">
              FORM G
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Surat Pernyataan Siswa SMPN 7
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penerbitan surat perjanjian tertib dan komitmen tertulis siswa bermaterai
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
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {editingId ? 'Edit Surat Pernyataan Siswa' : 'Form Input Surat Pernyataan Siswa'}
            </h3>
            <p className="text-xs text-slate-500">
              Isi data pelanggaran dan kesepakatan komitmen tertulis siswa
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NOMOR SURAT PERNYATAAN *
              </label>
              <input
                type="text"
                value={formData.nomor_surat}
                onChange={(e) => setFormData({ ...formData, nomor_surat: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                TANGGAL DITANDATANGANI *
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
                TINGKAT PERNYATAAN *
              </label>
              <select
                value={formData.jenis_pernyataan}
                onChange={(e: any) => setFormData({ ...formData, jenis_pernyataan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="Perjanjian 1">Perjanjian 1 (Peringatan Awal)</option>
                <option value="Perjanjian 2">Perjanjian 2 (Peringatan Keras)</option>
                <option value="Perjanjian 3 (Bermaterai)">Perjanjian 3 (Bermaterai Rp10.000 / Terakhir)</option>
                <option value="Pernyataan Khusus">Pernyataan Khusus / Perjanjian Bersama</option>
              </select>
            </div>
          </div>

          {/* Student Selection - Kelas first then Siswa filtered */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Identitas Siswa
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
                  placeholder="0098765432"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Parent Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NAMA ORANG TUA / WALI *
              </label>
              <input
                type="text"
                value={formData.nama_ortu}
                onChange={(e) => setFormData({ ...formData, nama_ortu: e.target.value })}
                placeholder="Bpk / Ibu ..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                NO. TELEPON / WA ORANG TUA
              </label>
              <input
                type="text"
                value={formData.no_hp_ortu}
                onChange={(e) => setFormData({ ...formData, no_hp_ortu: e.target.value })}
                placeholder="081234567890"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                ALAMAT ORANG TUA / WALI
              </label>
              <input
                type="text"
                value={formData.alamat_ortu}
                onChange={(e) => setFormData({ ...formData, alamat_ortu: e.target.value })}
                placeholder="Alamat rumah tinggal..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Violations & Commitment */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              BUTIR PELANGGARAN TATA TERTIB YANG DILAKUKAN *
            </label>
            <textarea
              rows={2}
              value={formData.butir_pelanggaran}
              onChange={(e) => setFormData({ ...formData, butir_pelanggaran: e.target.value })}
              placeholder="Contoh: Membawa HP saat jam belajar tanpa izin guru, membolos pelajaran..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              ISI JANJI & PERNYATAAN SISWA *
            </label>
            <textarea
              rows={3}
              value={formData.isi_pernyataan}
              onChange={(e) => setFormData({ ...formData, isi_pernyataan: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
              KONSEKUENSI / SANKSI JIKA MENGULANGI KEMBALI *
            </label>
            <textarea
              rows={2}
              value={formData.konsekuensi}
              onChange={(e) => setFormData({ ...formData, konsekuensi: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                GURU BK PENDAMPING *
              </label>
              <input
                type="text"
                value={formData.guru_bk}
                onChange={(e) => setFormData({ ...formData, guru_bk: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                WALI KELAS
              </label>
              <input
                type="text"
                value={formData.wali_kelas}
                onChange={(e) => setFormData({ ...formData, wali_kelas: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-600 mb-1.5">
                STATUS KEPATUHAN
              </label>
              <select
                value={formData.status}
                onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="Aktif">Aktif (Dalam Pengawasan)</option>
                <option value="Dipatuhi">Dipatuhi (Perilaku Membaik)</option>
                <option value="Dilanggar">Dilanggar (Perlu Tindak Lanjut)</option>
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
              <span>{editingId ? 'Perbarui Surat Pernyataan' : 'Simpan & Terbitkan Surat'}</span>
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
              Daftar Surat Pernyataan Siswa
            </h3>
            <p className="text-xs text-slate-500">
              Total {pernyataans.length} surat pernyataan tercatat di sistem
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari siswa, kelas, no surat..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">No. Surat & Tanggal</th>
                <th className="py-3 px-4">Nama Siswa & Kelas</th>
                <th className="py-3 px-4">Tingkat Surat</th>
                <th className="py-3 px-4">Pelanggaran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPernyataan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data surat pernyataan ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPernyataan.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{item.nomor_surat}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.tanggal}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.nama_siswa}</div>
                      <div className="text-[11px] text-blue-600 font-medium">Kelas {item.kelas} {item.nisn && `• NISN: ${item.nisn}`}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.jenis_pernyataan.includes('Bermaterai') 
                          ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                          : item.jenis_pernyataan.includes('2')
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {item.jenis_pernyataan}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={item.butir_pelanggaran}>
                      {item.butir_pelanggaran}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Dipatuhi' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : item.status === 'Dilanggar'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Cetak Surat Resmi"
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
            <h4 className="font-bold text-slate-900 text-lg mb-2">Hapus Surat Pernyataan?</h4>
            <p className="text-slate-600 text-sm mb-6">
              Apakah Anda yakin ingin menghapus arsip surat pernyataan ini? Tindakan ini tidak dapat dibatalkan.
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

      {/* Printable Modal Official Surat Pernyataan */}
      {printItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 relative my-8 text-slate-900">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="font-bold text-sm text-slate-700">Preview Cetak Surat Pernyataan Resmi</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
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
            <div className="text-center pb-4 border-b-2 border-black">
              <div className="flex items-center justify-center gap-4">
                <img src="https://iili.io/KDFk4fI.png" alt="Logo" className="w-16 h-16 object-contain shrink-0" referrerPolicy="no-referrer" />
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">PEMERINTAH KOTA PASURUAN</h3>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
                  <h2 className="font-black text-lg sm:text-xl uppercase tracking-tight text-slate-900 leading-tight">
                    UPT SMP NEGERI 7 PASURUAN
                  </h2>
                  <p className="text-[10px] text-slate-600">
                    Jl. Ki Hajar Dewantara No. 27 Pasuruan, Jawa Timur • Telp: (0343) 424356 • NPSN: 20535451
                  </p>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider underline">
                SURAT PERNYATAAN KEDISIPLINAN SISWA
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Nomor: {printItem.nomor_surat}
              </p>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                {printItem.jenis_pernyataan.toUpperCase()}
              </span>
            </div>

            {/* Body */}
            <div className="text-xs sm:text-sm space-y-4 leading-relaxed text-justify">
              <p>Yang bertanda tangan di bawah ini:</p>

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
                  <span className="text-slate-600">Nama Orang Tua / Wali</span>
                  <span className="col-span-2">: {printItem.nama_ortu}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Alamat Rumah</span>
                  <span className="col-span-2">: {printItem.alamat_ortu || '-'}</span>
                </div>
              </div>

              <p>
                Menyatakan dengan sesungguhnya bahwa saya telah melakukan pelanggaran terhadap tata tertib sekolah berupa:
              </p>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-semibold italic text-xs">
                "{printItem.butir_pelanggaran}"
              </div>

              <p>
                Sehubungan dengan pelanggaran tersebut di atas, dengan ini saya berjanji dan menyatakan:
              </p>

              <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 text-slate-900 font-medium text-xs leading-relaxed">
                {printItem.isi_pernyataan}
              </div>

              <p>
                <strong>Konsekuensi:</strong> {printItem.konsekuensi}
              </p>

              <p>
                Demikian surat pernyataan ini saya buat dan tanda tangani dengan penuh kesadaran dan tanggung jawab, tanpa ada paksaan dari pihak manapun.
              </p>
            </div>

            {/* Date & Signatures */}
            <div className="mt-8 pt-4">
              <div className="text-right text-xs font-semibold text-slate-800 mb-6">
                Pasuruan, {printItem.tanggal}
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-600 font-medium">Mengetahui,</p>
                  <p className="font-bold text-slate-900 mb-16">Orang Tua / Wali Murid</p>
                  <p className="font-bold underline text-slate-900">{printItem.nama_ortu}</p>
                </div>

                <div>
                  <p className="text-slate-600 font-medium">Yang membuat pernyataan,</p>
                  <p className="font-bold text-slate-900 mb-4">Siswa yang bersangkutan</p>
                  {printItem.jenis_pernyataan.includes('Bermaterai') && (
                    <div className="w-20 h-10 border border-dashed border-slate-400 mx-auto mb-2 flex items-center justify-center text-[9px] text-slate-400">
                      Materai 10.000
                    </div>
                  )}
                  <p className="font-bold underline text-slate-900 mt-12">{printItem.nama_siswa}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs mt-10">
                <div>
                  <p className="text-slate-600 font-medium">Guru Bimbingan Konseling,</p>
                  <p className="font-bold text-slate-900 mb-16">UPT SMPN 7 Pasuruan</p>
                  <p className="font-bold underline text-slate-900">{printItem.guru_bk}</p>
                </div>

                <div>
                  <p className="text-slate-600 font-medium">Mengetahui,</p>
                  <p className="font-bold text-slate-900 mb-16">Kepala UPT SMPN 7 Pasuruan</p>
                  <p className="font-bold underline text-slate-900">{printItem.kepala_sekolah}</p>
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
