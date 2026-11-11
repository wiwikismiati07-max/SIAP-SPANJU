import React, { useState, useEffect } from 'react';
import { User, Plus, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, Sparkles, BookOpen, Clock, Calendar } from 'lucide-react';
import { sabdaService, KonselingIndividualBK } from '../../lib/sabdaBkService';
import { supabase } from '../../lib/supabase';

export default function BKKonselingIndividual({ user }: { user?: any }) {
  const [konselings, setKonselings] = useState<KonselingIndividualBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<KonselingIndividualBK | null>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    siswa_id: '',
    nama_siswa: '',
    kelas: '7A',
    tanggal: defaultDate,
    jam: '09:00 WIB',
    bidang: 'Belajar' as const,
    gejala_masalah: '',
    pendekatan_teknik: 'Cognitive Behavioral Therapy / Restrukturisasi Kognitif',
    proses_konseling: '',
    rencana_tindak_lanjut: '',
    guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd',
    status: 'Proses' as const
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
    try {
      if (supabase) {
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

  const handleSelectSiswa = (siswaId: string) => {
    const s = siswaList.find(x => x.id === siswaId);
    if (s) {
      setFormData(prev => ({
        ...prev,
        siswa_id: s.id,
        nama_siswa: s.nama,
        kelas: s.kelas || prev.kelas
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_siswa.trim()) {
      showNotification('error', 'Mohon pilih siswa terlebih dahulu.');
      return;
    }

    const record: KonselingIndividualBK = {
      id: editingId || `ki-${Date.now()}`,
      ...formData,
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
      gejala_masalah: '',
      pendekatan_teknik: 'Cognitive Behavioral Therapy / Restrukturisasi Kognitif',
      proses_konseling: '',
      rencana_tindak_lanjut: '',
      guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd',
      status: 'Proses'
    });
  };

  const handleEdit = (item: KonselingIndividualBK) => {
    setEditingId(item.id);
    setFormData({
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      kelas: item.kelas,
      tanggal: item.tanggal,
      jam: item.jam,
      bidang: item.bidang,
      gejala_masalah: item.gejala_masalah,
      pendekatan_teknik: item.pendekatan_teknik,
      proses_konseling: item.proses_konseling,
      rencana_tindak_lanjut: item.rencana_tindak_lanjut,
      guru_bk: item.guru_bk,
      status: item.status
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
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Pilih Siswa</label>
                {siswaList.length > 0 ? (
                  <select
                    value={formData.siswa_id}
                    onChange={e => handleSelectSiswa(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white"
                  >
                    <option value="">-- Pilih Siswa dari Database --</option>
                    {siswaList.map(s => (
                      <option key={s.id} value={s.id}>{s.nama} ({s.kelas})</option>
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

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kelas</label>
                <input 
                  type="text"
                  value={formData.kelas}
                  onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm"
                  required
                />
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
              PENDEKATAN / TEKNIK KONSELING YANG DIGUNAKAN
            </label>
            <input 
              type="text"
              placeholder="Contoh: Rational Emotive Behavior Therapy (REBT), Client-Centered, Behavioral..."
              value={formData.pendekatan_teknik}
              onChange={e => setFormData({ ...formData, pendekatan_teknik: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none font-bold text-slate-800 transition-all text-sm"
              required
            />
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
              <input 
                type="text"
                value={formData.guru_bk}
                onChange={e => setFormData({ ...formData, guru_bk: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-slate-50"
              />
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
                      <div className="font-black text-slate-800 text-xs uppercase">{item.nama_siswa}</div>
                      <div className="text-[10px] font-bold text-sky-700 uppercase">Kelas {item.kelas}</div>
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
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {item.gejala_masalah}
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
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in my-8 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Kop Surat */}
            <div className="text-center border-b-4 border-double border-slate-800 pb-4 mb-6">
              <div className="flex items-center justify-center gap-4 mb-2">
                <img src="https://iili.io/KDFk4fI.png" alt="Logo SMPN 7" className="w-16 h-16 object-contain" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">PEMERINTAH KOTA PASURUAN • DINAS PENDIDIKAN DAN KEBUDAYAAN</h4>
                  <h2 className="text-lg font-black uppercase text-slate-900">UPT SMP NEGERI 7 PASURUAN</h2>
                  <p className="text-[10px] text-slate-600 font-medium">Jl. Ki Hajar Dewantara No. 27, Pasuruan, Jawa Timur • Telp: (0343) 424355</p>
                  <p className="text-[9px] font-bold text-sky-700 uppercase tracking-widest">LEMBAR REKAM LAYANAN KONSELING INDIVIDUAL (FORM E)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Nama Konseli:</span>
                  <span className="col-span-2 font-black text-slate-900 uppercase">{printItem.nama_siswa} (Kelas {printItem.kelas})</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Tanggal / Waktu:</span>
                  <span className="col-span-2 text-slate-800">{printItem.tanggal} ({printItem.jam})</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Bidang Bimbingan:</span>
                  <span className="col-span-2 font-bold text-sky-800">{printItem.bidang}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Teknik / Pendekatan:</span>
                  <span className="col-span-2 font-bold text-slate-800">{printItem.pendekatan_teknik}</span>
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
                <div>
                  <p>Konseli / Siswa,</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">{printItem.nama_siswa}</p>
                </div>
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
                onClick={() => window.print()}
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
    </div>
  );
}
