import React, { useState, useEffect } from 'react';
import { Home, Plus, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, MapPin, Users, Calendar, Clock, FileText } from 'lucide-react';
import { sabdaService, HomeVisitBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

export default function BKHomeVisit({ user }: { user?: any }) {
  const [visits, setVisits] = useState<HomeVisitBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<HomeVisitBK | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_siswa.trim()) {
      showNotification('error', 'Mohon pilih siswa terlebih dahulu.');
      return;
    }

    const record: HomeVisitBK = {
      id: editingId || `hv-${Date.now()}`,
      ...formData,
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
    setEditingId(item.id);
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
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                ANGGOTA KELUARGA DITEMUI
              </label>
              <input 
                type="text"
                placeholder="Ibu Kandung / Ayah / Wali..."
                value={formData.anggota_keluarga}
                onChange={e => setFormData({ ...formData, anggota_keluarga: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
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
                      <div className="font-black text-slate-800 text-xs uppercase">{item.nama_siswa}</div>
                      <div className="text-[10px] font-bold text-amber-700 uppercase">Kelas {item.kelas}</div>
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
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Nama Siswa:</span>
                  <span className="col-span-2 font-black text-slate-900 uppercase">{printItem.nama_siswa} (Kelas {printItem.kelas})</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Alamat Rumah:</span>
                  <span className="col-span-2 text-slate-800">{printItem.alamat}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Hari / Tanggal:</span>
                  <span className="col-span-2 text-slate-800">{printItem.tanggal} ({printItem.waktu})</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Ditemui Oleh:</span>
                  <span className="col-span-2 text-slate-800">{printItem.anggota_keluarga}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Petugas Kunjungan:</span>
                  <span className="col-span-2 font-bold text-slate-800">{printItem.petugas}</span>
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

              {printItem.foto_url && (
                <div>
                  <h4 className="font-black text-slate-800 uppercase mb-1">C. Dokumentasi Kunjungan</h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-center">
                    <img
                      src={printItem.foto_url}
                      alt="Dokumentasi Home Visit"
                      className="max-h-48 w-auto object-contain rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              )}

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
    </div>
  );
}
