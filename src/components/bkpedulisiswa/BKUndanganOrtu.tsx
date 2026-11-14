import React, { useState, useEffect } from 'react';
import { Mail, Plus, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, User, Clock, MapPin, FileText, ChevronDown } from 'lucide-react';
import { sabdaService, UndanganOrtuBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { supabase, fetchAllSiswa } from '../../lib/supabase';
import { formatKelasDisplay } from './BKAgendaKerja';
import BKKopSurat, { printBKReport } from './BKKopSurat';

export default function BKUndanganOrtu({ user }: { user?: any }) {
  const [undangans, setUndangans] = useState<UndanganOrtuBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<UndanganOrtuBK | null>(null);

  const [selectedClass, setSelectedClass] = useState<string>('7-A');
  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    nomor_surat: `421.3/BK-${String(Math.floor(Math.random() * 900) + 100)}/SMPN7/XI/2026`,
    siswa_id: '',
    nama_siswa: '',
    kelas: '7-A',
    nama_ortu: '',
    tanggal_hadir: defaultDate,
    jam_hadir: '08:30 WIB',
    tempat: 'Ruang BK SMPN 7 Pasuruan',
    menemui: `${getDefaultGuruBK(user)} (Guru BK)`,
    perihal: 'Konsultasi dan Pembinaan Perkembangan Siswa',
    status: 'Menunggu' as const,
    hasil_pertemuan: ''
  });

  useEffect(() => {
    loadData();
    loadSiswa();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await sabdaService.getUndangan();
      setUndangans(data);
    } catch (e: any) {
      console.error('Error loading undangan:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSiswa = async () => {
    try {
      const data = await fetchAllSiswa();
      if (data && data.length > 0) {
        setSiswaList(data.map((s: any) => ({
          ...s,
          kelas: formatKelasDisplay(s.kelas)
        })));
        return;
      }
    } catch (e) {
      console.warn('Notice loading siswa:', e);
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
        kelas: s.kelas || prev.kelas,
        nama_ortu: s.nama_ortu || prev.nama_ortu
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_siswa.trim()) {
      showNotification('error', 'Mohon pilih atau masukkan nama siswa.');
      return;
    }

    const record: UndanganOrtuBK = {
      id: editingId || `und-${Date.now()}`,
      ...formData,
      created_at: new Date().toISOString()
    };

    try {
      const updated = await sabdaService.saveUndangan(record);
      setUndangans(updated);
      showNotification('success', editingId ? 'Surat undangan berhasil diperbarui!' : 'Surat undangan baru berhasil disimpan!');
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan undangan: ' + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nomor_surat: `421.3/BK-${String(Math.floor(Math.random() * 900) + 100)}/SMPN7/XI/2026`,
      siswa_id: '',
      nama_siswa: '',
      kelas: '7A',
      nama_ortu: '',
      tanggal_hadir: defaultDate,
      jam_hadir: '08:30 WIB',
      tempat: 'Ruang BK SMPN 7 Pasuruan',
      menemui: `${getDefaultGuruBK(user)} (Guru BK)`,
      perihal: 'Konsultasi dan Pembinaan Perkembangan Siswa',
      status: 'Menunggu',
      hasil_pertemuan: ''
    });
  };

  const handleEdit = (item: UndanganOrtuBK) => {
    setEditingId(item.id);
    setFormData({
      nomor_surat: item.nomor_surat,
      siswa_id: item.siswa_id || '',
      nama_siswa: item.nama_siswa,
      kelas: item.kelas,
      nama_ortu: item.nama_ortu || '',
      tanggal_hadir: item.tanggal_hadir,
      jam_hadir: item.jam_hadir,
      tempat: item.tempat,
      menemui: item.menemui,
      perihal: item.perihal,
      status: item.status,
      hasil_pertemuan: item.hasil_pertemuan || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async (id: string) => {
    try {
      const updated = await sabdaService.deleteUndangan(id);
      setUndangans(updated);
      showNotification('success', 'Undangan orang tua berhasil dihapus.');
      setDeleteConfirmId(null);
    } catch (e: any) {
      showNotification('error', 'Gagal menghapus: ' + e.message);
    }
  };

  const filteredUndangans = undangans.filter(u =>
    u.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.perihal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nomor_surat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
            FORM B
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Undangan Orang Tua Siswa</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Layanan surat pemanggilan & konsultasi wali murid SMPN 7 Pasuruan</p>
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

      {/* Input Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              {editingId ? 'Edit Surat Undangan' : 'Form Pembuatan Undangan Orang Tua'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Panggilan resmi orang tua/wali murid untuk koordinasi pembinaan</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                NOMOR SURAT UNDANGAN
              </label>
              <input 
                type="text"
                value={formData.nomor_surat}
                onChange={e => setFormData({ ...formData, nomor_surat: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-800 transition-all text-sm bg-slate-50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                STATUS KEHADIRAN
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white"
              >
                <option value="Menunggu">Menunggu Konfirmasi / Tanggal Hadir</option>
                <option value="Hadir">Hadir (Selesai Pertemuan)</option>
                <option value="Reschedule">Jadwal Ulang (Reschedule)</option>
                <option value="Selesai">Kasus Selesai Dibina</option>
              </select>
            </div>
          </div>

          {/* Student Selector: Kelas First, then Filtered Siswa */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Data Siswa & Orang Tua
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kelas</label>
                <select
                  value={selectedClass}
                  onChange={e => {
                    const cls = e.target.value;
                    setSelectedClass(cls);
                    setFormData(prev => ({ ...prev, kelas: cls, siswa_id: '', nama_siswa: '' }));
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white"
                >
                  {[
                    '7-A', '7-B', '7-C', '7-D', '7-E', '7-F', '7-G', '7-H',
                    '8-A', '8-B', '8-C', '8-D', '8-E', '8-F', '8-G', '8-H',
                    '9-A', '9-B', '9-C', '9-D', '9-E', '9-F', '9-G', '9-H'
                  ].map(k => (
                    <option key={k} value={k}>Kelas {k}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Cari / Pilih Siswa</label>
                {siswaList.length > 0 ? (
                  <select
                    value={formData.siswa_id}
                    onChange={e => handleSelectSiswa(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm bg-white"
                  >
                    <option value="">-- Pilih Siswa Kelas {selectedClass} --</option>
                    {siswaList
                      .filter(s => (s.kelas || '').trim() === selectedClass.trim())
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.nama} {s.nis ? `(NIS: ${s.nis})` : ''}</option>
                      ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    placeholder="Nama lengkap siswa..."
                    value={formData.nama_siswa}
                    onChange={e => setFormData({ ...formData, nama_siswa: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm"
                    required
                  />
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nama Orang Tua / Wali Murid</label>
                <input 
                  type="text"
                  placeholder="Bpk / Ibu..."
                  value={formData.nama_ortu}
                  onChange={e => setFormData({ ...formData, nama_ortu: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Schedule & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                TANGGAL KEHADIRAN
              </label>
              <input 
                type="date"
                value={formData.tanggal_hadir}
                onChange={e => setFormData({ ...formData, tanggal_hadir: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                JAM / WAKTU
              </label>
              <input 
                type="text"
                placeholder="08:30 WIB"
                value={formData.jam_hadir}
                onChange={e => setFormData({ ...formData, jam_hadir: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-800 transition-all text-sm"
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
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Officer & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                MENEMUI (GURU BK / PIHAK SEKOLAH)
              </label>
              <select 
                value={formData.menemui}
                onChange={e => setFormData({ ...formData, menemui: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-800 transition-all text-sm bg-white"
                required
              >
                {GURU_BK_OPTIONS.map((nama, idx) => (
                  <option key={nama} value={`${nama} (Guru BK)`}>{idx + 1}. {nama} (Guru BK)</option>
                ))}
                {!GURU_BK_OPTIONS.some(n => formData.menemui === `${n} (Guru BK)`) && formData.menemui && !formData.menemui.toLowerCase().includes('administrator') && (
                  <option value={formData.menemui}>{formData.menemui}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                PERIHAL PEMANGGILAN
              </label>
              <input 
                type="text"
                placeholder="Konsultasi kedisiplinan / prestasi..."
                value={formData.perihal}
                onChange={e => setFormData({ ...formData, perihal: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-800 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Meeting Notes */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
              HASIL PERTEMUAN / KESEPAKATAN (DIISI SETELAH PERTEMUAN)
            </label>
            <textarea
              rows={3}
              placeholder="Catatan notulen hasil pertemuan dengan orang tua siswa..."
              value={formData.hasil_pertemuan}
              onChange={e => setFormData({ ...formData, hasil_pertemuan: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none font-medium text-slate-800 transition-all text-sm"
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
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-all"
            >
              <Save size={18} />
              <span>{editingId ? 'Simpan Perubahan' : 'Buat Surat Undangan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Undangan List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Daftar Undangan Orang Tua</h3>
            <p className="text-xs text-slate-500 font-medium">Rekap surat panggilan dan riwayat kehadiran wali murid</p>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari siswa atau nomor surat..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium w-56 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Siswa & Kelas</th>
                <th className="px-6 py-4">No. Surat</th>
                <th className="px-6 py-4">Jadwal Hadir</th>
                <th className="px-6 py-4">Perihal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Memuat data undangan...</td>
                </tr>
              ) : filteredUndangans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Belum ada undangan yang dibuat.</td>
                </tr>
              ) : (
                filteredUndangans.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800 text-xs uppercase">{item.nama_siswa}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Kelas {item.kelas} {item.nama_ortu ? `• Ortu: ${item.nama_ortu}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 font-semibold">
                      {item.nomor_surat}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="font-bold text-slate-700">{item.tanggal_hadir}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{item.jam_hadir}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {item.perihal}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        item.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'Selesai' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'Reschedule' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Cetak Surat Resmi"
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

      {/* Official Printable Letter Modal */}
      {printItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div id="bk-print-area" className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in my-8 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Kop Surat */}
            <BKKopSurat />

            <div className="space-y-4 text-sm text-slate-800">
              <div className="flex justify-between text-xs">
                <div>
                  <p><span className="font-bold">Nomor:</span> {printItem.nomor_surat}</p>
                  <p><span className="font-bold">Lampiran:</span> -</p>
                  <p><span className="font-bold">Perihal:</span> {printItem.perihal}</p>
                </div>
                <div className="text-right">
                  <p>Pasuruan, {printItem.tanggal_hadir}</p>
                  <p>Kepada Yth.</p>
                  <p className="font-bold">Bapak/Ibu Orang Tua/Wali Murid</p>
                  <p>dari: <span className="font-bold uppercase">{printItem.nama_siswa}</span> (Kelas {printItem.kelas})</p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed">
                Dengan hormat,<br />
                Sehubungan dengan program pembinaan karakter serta pemantauan perkembangan peserta didik UPT SMP Negeri 7 Pasuruan, kami mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid pada:
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Hari / Tanggal:</span>
                  <span className="col-span-2 font-bold text-slate-900">{printItem.tanggal_hadir}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Pukul / Waktu:</span>
                  <span className="col-span-2 font-bold text-slate-900">{printItem.jam_hadir}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Tempat:</span>
                  <span className="col-span-2 font-bold text-slate-900">{printItem.tempat}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Menemui:</span>
                  <span className="col-span-2 font-bold text-slate-900">{printItem.menemui}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold text-slate-600">Keperluan:</span>
                  <span className="col-span-2 font-bold text-slate-900">{printItem.perihal}</span>
                </div>
              </div>

              <p className="text-xs leading-relaxed">
                Mengingat pentingnya koordinasi ini demi masa depan dan kebaikan putra/putri Bapak/Ibu, kami sangat mengharap kehadiran tepat pada waktunya. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.
              </p>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 pt-8 text-xs text-center">
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala UPT SMPN 7 Pasuruan</p>
                  <div className="h-16" />
                  <p className="font-black underline uppercase">NUR FADILAH, S.Pd</p>
                  <p className="text-[10px] text-slate-500">NIP. 19860410 201001 2 030</p>
                </div>
                <div>
                  <p>Guru Bimbingan Konseling,</p>
                  <p>UPT SMPN 7 Pasuruan</p>
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
                onClick={() => printBKReport('bk-print-area', `Surat Undangan Orang Tua - ${printItem.nama_siswa}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 shadow-md shadow-indigo-200"
              >
                <Printer size={16} />
                <span>Cetak / Cetak PDF</span>
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
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Undangan?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Data surat undangan ini akan dihapus permanen dari sistem.
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
