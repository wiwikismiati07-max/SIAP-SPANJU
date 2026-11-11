import React, { useState, useEffect } from 'react';
import { Users, Plus, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, Sparkles, MapPin, Calendar, Clock } from 'lucide-react';
import { sabdaService, KonselingKelompokBK } from '../../lib/sabdaBkService';

export default function BKKonselingKelompok({ user }: { user?: any }) {
  const [kelompoks, setKelompoks] = useState<KonselingKelompokBK[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<KonselingKelompokBK | null>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    topik: '',
    anggota_siswa: '',
    kelas: '8A',
    tanggal: defaultDate,
    jam: '10:00 WIB',
    tempat: 'Ruang Bimbingan Kelompok BK',
    tujuan: 'Membangun komunikasi asertif, rasa percaya diri, dan resolusi konflik sebaya',
    dinamika_kelompok: '',
    kesepakatan: '',
    evaluasi: 'Anggota kelompok aktif memberikan masukan dan saling berkomitmen rukun.',
    guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getKonselingKelompok();
      setKelompoks(data);
    } catch (e: any) {
      console.error('Error loading konseling kelompok:', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topik.trim() || !formData.anggota_siswa.trim()) {
      showNotification('error', 'Mohon lengkapi topik dan anggota kelompok siswa.');
      return;
    }

    const record: KonselingKelompokBK = {
      id: editingId || `kk-${Date.now()}`,
      ...formData,
      created_at: new Date().toISOString()
    };

    try {
      const updated = await sabdaService.saveKonselingKelompok(record);
      setKelompoks(updated);
      showNotification('success', editingId ? 'Rencana konseling kelompok berhasil diperbarui!' : 'Rencana konseling kelompok berhasil disimpan!');
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      topik: '',
      anggota_siswa: '',
      kelas: '8A',
      tanggal: defaultDate,
      jam: '10:00 WIB',
      tempat: 'Ruang Bimbingan Kelompok BK',
      tujuan: 'Membangun komunikasi asertif, rasa percaya diri, dan resolusi konflik sebaya',
      dinamika_kelompok: '',
      kesepakatan: '',
      evaluasi: 'Anggota kelompok aktif memberikan masukan dan saling berkomitmen rukun.',
      guru_bk: user?.nama_lengkap || 'Wiwik Ismiati, S.Pd'
    });
  };

  const handleEdit = (item: KonselingKelompokBK) => {
    setEditingId(item.id);
    setFormData({
      topik: item.topik,
      anggota_siswa: item.anggota_siswa,
      kelas: item.kelas,
      tanggal: item.tanggal,
      jam: item.jam,
      tempat: item.tempat,
      tujuan: item.tujuan,
      dinamika_kelompok: item.dinamika_kelompok,
      kesepakatan: item.kesepakatan,
      evaluasi: item.evaluasi,
      guru_bk: item.guru_bk
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteKonselingKelompok(id);
      setKelompoks(updated);
      showNotification('success', 'Rencana konseling kelompok berhasil dihapus.');
      setDeleteConfirmId(null);
    } catch (e: any) {
      showNotification('error', 'Gagal menghapus: ' + e.message);
    }
  };

  const filtered = kelompoks.filter(k =>
    k.topik.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.anggota_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            FORM F
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rencana Konseling Kelompok</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Layanan konseling dan dinamika kelompok siswa SMPN 7 Pasuruan</p>
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
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Konseling Kelompok' : 'Form Rencana Konseling Kelompok'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Layanan penanganan masalah bersama dan dinamika interaksi kelompok</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TOPIK / TEMA PERMASALAHAN KELOMPOK
              </label>
              <input 
                type="text"
                placeholder="Contoh: Manajemen Emosi, Solidaritas Kelas, Motivasi Belajar Ujian..."
                value={formData.topik}
                onChange={e => setFormData({ ...formData, topik: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                KELAS ANGGOTA
              </label>
              <input 
                type="text"
                placeholder="Contoh: 8A, 7B-7C..."
                value={formData.kelas}
                onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              DAFTAR NAMA ANGGOTA SISWA KELOMPOK
            </label>
            <textarea
              rows={2}
              placeholder="Tuliskan nama-nama siswa anggota kelompok (contoh: 1. Rian (8A), 2. Fajar (8A), 3. Dimas (8A), 4. Reza (8A))..."
              value={formData.anggota_siswa}
              onChange={e => setFormData({ ...formData, anggota_siswa: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          {/* Schedule & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TANGGAL PELAKSANAAN
              </label>
              <input 
                type="date"
                value={formData.tanggal}
                onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
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
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TEMPAT PERTEMUAN
              </label>
              <input 
                type="text"
                value={formData.tempat}
                onChange={e => setFormData({ ...formData, tempat: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              TUJUAN LAYANAN KELOMPOK
            </label>
            <input 
              type="text"
              placeholder="Tujuan yang diharapkan dicapai melalui dinamika kelompok..."
              value={formData.tujuan}
              onChange={e => setFormData({ ...formData, tujuan: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              DINAMIKA KELOMPOK & PROSES DISKUSI
            </label>
            <textarea
              rows={3}
              placeholder="Bagaimana interaksi antar anggota, keterbukaan anggota dalam mengemukakan pendapat, dan jalannya dinamika kelompok..."
              value={formData.dinamika_kelompok}
              onChange={e => setFormData({ ...formData, dinamika_kelompok: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                KESEPAKATAN / KOMITMEN KELOMPOK
              </label>
              <textarea
                rows={2}
                placeholder="Kesepakatan bersama antar anggota kelompok..."
                value={formData.kesepakatan}
                onChange={e => setFormData({ ...formData, kesepakatan: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                EVALUASI HASIL & GURU PEMBIMBING
              </label>
              <textarea
                rows={2}
                placeholder="Evaluasi ketercapaian tujuan konseling kelompok..."
                value={formData.evaluasi}
                onChange={e => setFormData({ ...formData, evaluasi: e.target.value })}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none font-medium text-slate-800 transition-all text-sm"
                required
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
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-lg shadow-purple-200 active:scale-95 transition-all"
            >
              <Save size={18} />
              <span>{editingId ? 'Simpan Perubahan' : 'Simpan Rencana Kelompok'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Group Counseling List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Daftar Rekam Konseling Kelompok</h3>
            <p className="text-xs text-slate-500 font-medium">Rekapitulasi pelaksanaan konseling kelompok peserta didik</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari topik atau nama anggota..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none text-xs font-medium w-56 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Topik & Kelas</th>
                <th className="px-6 py-4">Tanggal & Waktu</th>
                <th className="px-6 py-4">Anggota Siswa</th>
                <th className="px-6 py-4">Kesepakatan Bersama</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Memuat data konseling kelompok...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Belum ada rekam konseling kelompok.</td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800 text-xs">{item.topik}</div>
                      <div className="text-[10px] font-bold text-purple-700 uppercase">Kelas {item.kelas} • {item.tempat}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-bold text-slate-700">{item.tanggal}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{item.jam}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 max-w-xs truncate">
                      {item.anggota_siswa}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {item.kesepakatan}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Cetak Lembar Konseling Kelompok"
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

      {/* Print Modal for Group Counseling */}
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
                  <p className="text-[9px] font-bold text-purple-700 uppercase tracking-widest">LEMBAR LAPORAN LAYANAN KONSELING KELOMPOK (FORM F)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Topik Layanan:</span>
                  <span className="col-span-2 font-black text-slate-900 uppercase">{printItem.topik}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Kelas / Tempat:</span>
                  <span className="col-span-2 text-slate-800">Kelas {printItem.kelas} • {printItem.tempat}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Hari / Tanggal:</span>
                  <span className="col-span-2 text-slate-800">{printItem.tanggal} ({printItem.jam})</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Tujuan Layanan:</span>
                  <span className="col-span-2 text-slate-800">{printItem.tujuan}</span>
                </div>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">A. Anggota Kelompok Siswa</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium">{printItem.anggota_siswa}</p>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">B. Ringkasan Dinamika Kelompok</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">{printItem.dinamika_kelompok}</p>
              </div>

              <div>
                <h4 className="font-black text-slate-800 uppercase mb-1">C. Kesepakatan Bersama</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">{printItem.kesepakatan}</p>
              </div>

              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala UPT SMPN 7 Pasuruan</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">NUR FADILAH, S.Pd</p>
                  <p className="text-[10px] text-slate-500">NIP. 19860410 201001 2 030</p>
                </div>
                <div>
                  <p>Guru Pembimbing BK,</p>
                  <p>UPT SMPN 7 Pasuruan</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">{printItem.guru_bk}</p>
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
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 shadow-md shadow-purple-200"
              >
                <Printer size={16} />
                <span>Cetak Lembar Laporan</span>
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
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Konseling Kelompok?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Data rekam konseling kelompok ini akan dihapus permanen.
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
