import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Save, Trash2, Edit2, Search, Printer, CheckCircle2, RotateCcw, AlertTriangle, Check, CheckSquare, Users, X } from 'lucide-react';
import { sabdaService, SuratPernyataanBK, GURU_BK_OPTIONS, getDefaultGuruBK } from '../../lib/sabdaBkService';
import { fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import BKKopSurat, { printBKReport } from './BKKopSurat';

const CLASSES = ['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'];

export default function BKSuratPernyataan({ user }: { user?: any }) {
  const [pernyataans, setPernyataans] = useState<SuratPernyataanBK[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerClassFilter, setPickerClassFilter] = useState<string>('Semua');
  const [tempSelectedMap, setTempSelectedMap] = useState<Map<string, any>>(new Map());
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
    kelas: '',
    nama_ortu: '',
    alamat_ortu: '',
    no_hp_ortu: '',
    jenis_pernyataan: 'Perjanjian 2' as const,
    butir_pelanggaran: '',
    isi_pernyataan: 'Dengan ini saya berjanji dengan sungguh-sungguh tidak akan mengulangi perbuatan/pelanggaran tersebut, dan bersedia menaati seluruh tata tertib yang berlaku di UPT SMP Negeri 7 Pasuruan.',
    konsekuensi: 'Apabila di kemudian hari saya mengulangi pelanggaran yang sama atau melakukan pelanggaran tata tertib lainnya, saya bersedia menerima sanksi yang lebih berat sesuai aturan sekolah / siap dikembalikan kepada orang tua.',
    guru_bk: getDefaultGuruBK(user),
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
        setSiswaList(data);
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

  const sortedSiswa = useMemo(() => {
    return siswaList
      .filter((s: any) => !String(s.id || '').startsWith('pad-'))
      .map((s: any) => ({
        ...s,
        kelas: normalizeKelasKey(s.kelas || '') || s.kelas || '-'
      }))
      .sort((a: any, b: any) => {
        const kDiff = (a.kelas || '').localeCompare(b.kelas || '', undefined, { numeric: true });
        if (kDiff !== 0) return kDiff;
        return (a.nama || '').localeCompare(b.nama || '');
      });
  }, [siswaList]);

  const filteredModalStudents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return sortedSiswa.filter((s: any) => {
      const matchClass = pickerClassFilter === 'Semua' || normalizeKelasKey(s.kelas || '') === pickerClassFilter;
      if (!matchClass) return false;
      if (!q) return true;
      const nama = String(s.nama || '').toLowerCase();
      const nis = String(s.nisn || s.nis || '').toLowerCase();
      const kls = String(s.kelas || '').toLowerCase();
      return nama.includes(q) || nis.includes(q) || kls.includes(q);
    });
  }, [sortedSiswa, pickerClassFilter, pickerSearch]);

  const allFilteredSelected =
    filteredModalStudents.length > 0 &&
    filteredModalStudents.every(s => tempSelectedMap.has(String(s.id || s.nama)));

  const syncSelectedToForm = (students: any[]) => {
    setSelectedStudents(students);
    if (students.length === 0) {
      setFormData(prev => ({
        ...prev,
        siswa_id: '',
        nama_siswa: '',
        nisn: '',
        kelas: ''
      }));
      return;
    }

    const uniqueClasses = Array.from(
      new Set(students.map(s => normalizeKelasKey(s.kelas || '') || s.kelas).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

    if (students.length === 1) {
      const s = students[0];
      setFormData(prev => ({
        ...prev,
        siswa_id: s.id || '',
        nama_siswa: s.nama || '',
        nisn: s.nisn || s.nis || '',
        kelas: normalizeKelasKey(s.kelas || '') || s.kelas || prev.kelas,
        nama_ortu: s.nama_ortu || prev.nama_ortu,
        alamat_ortu: s.alamat || prev.alamat_ortu
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      siswa_id: students.map(s => s.id).filter(Boolean).join(','),
      nama_siswa: students.map(s => s.nama).join(', '),
      nisn: students.map(s => s.nisn || s.nis || '-').join(', '),
      kelas: uniqueClasses.join(', ')
    }));
  };

  const openPickerModal = () => {
    const nextMap = new Map<string, any>();
    selectedStudents.forEach(s => {
      nextMap.set(String(s.id || s.nama), s);
    });
    setTempSelectedMap(nextMap);
    setPickerSearch('');
    setPickerClassFilter('Semua');
    setIsPickerOpen(true);
  };

  const toggleTempStudent = (student: any) => {
    const sid = String(student.id || student.nama);
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
        filteredModalStudents.forEach(s => next.delete(String(s.id || s.nama)));
      } else {
        filteredModalStudents.forEach(s => next.set(String(s.id || s.nama), s));
      }
      return next;
    });
  };

  const applySelectedStudents = () => {
    const list = Array.from(tempSelectedMap.values()).sort((a: any, b: any) => {
      const kDiff = (a.kelas || '').localeCompare(b.kelas || '', undefined, { numeric: true });
      if (kDiff !== 0) return kDiff;
      return (a.nama || '').localeCompare(b.nama || '');
    });
    syncSelectedToForm(list);
    setIsPickerOpen(false);
  };

  const removeSelectedStudent = (sid: string) => {
    const nextList = selectedStudents.filter(s => String(s.id || s.nama) !== sid);
    syncSelectedToForm(nextList);
  };

  const clearAllSelected = () => {
    syncSelectedToForm([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!formData.nama_siswa.trim() && selectedStudents.length === 0) || !formData.butir_pelanggaran.trim()) {
      setStatusMsg({ type: 'error', text: 'Nama siswa dan uraian pelanggaran wajib diisi!' });
      return;
    }

    try {
      const baseTime = Date.now();
      let updatedList = pernyataans;

      if (selectedStudents.length > 1) {
        for (let idx = 0; idx < selectedStudents.length; idx++) {
          const s = selectedStudents[idx];
          const recordId = editingId && idx === 0 ? editingId : `sp-${baseTime}-${idx}`;
          const record: SuratPernyataanBK = {
            id: recordId,
            nomor_surat: formData.nomor_surat,
            tanggal: formData.tanggal,
            siswa_id: s.id || '',
            nama_siswa: s.nama || formData.nama_siswa,
            nisn: s.nisn || s.nis || '',
            kelas: normalizeKelasKey(s.kelas || '') || s.kelas || formData.kelas || '-',
            nama_ortu: (selectedStudents.length === 1 ? formData.nama_ortu : s.nama_ortu || formData.nama_ortu) || 'Orang Tua / Wali',
            alamat_ortu: (selectedStudents.length === 1 ? formData.alamat_ortu : s.alamat || formData.alamat_ortu) || '',
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
          updatedList = await sabdaService.savePernyataan(record);
        }
        setPernyataans(updatedList);
        setStatusMsg({
          type: 'success',
          text: editingId
            ? `Surat Pernyataan berhasil diperbarui (${selectedStudents.length} siswa)!`
            : `${selectedStudents.length} Surat Pernyataan berhasil diterbitkan!`
        });
      } else {
        const single = selectedStudents[0];
        const record: SuratPernyataanBK = {
          id: editingId || `sp-${baseTime}`,
          nomor_surat: formData.nomor_surat,
          tanggal: formData.tanggal,
          siswa_id: formData.siswa_id || single?.id || '',
          nama_siswa: formData.nama_siswa || single?.nama || '',
          nisn: formData.nisn || single?.nisn || single?.nis || '',
          kelas: formData.kelas || single?.kelas || '-',
          nama_ortu: formData.nama_ortu || single?.nama_ortu || 'Orang Tua / Wali',
          alamat_ortu: formData.alamat_ortu || single?.alamat || '',
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

        updatedList = await sabdaService.savePernyataan(record);
        setPernyataans(updatedList);
        setStatusMsg({ type: 'success', text: editingId ? 'Surat Pernyataan berhasil diperbarui!' : 'Surat Pernyataan berhasil diterbitkan!' });
      }
      resetForm();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedStudents([]);
    setPickerSearch('');
    setFormData({
      nomor_surat: `421.3/SP-${String(Math.floor(Math.random() * 900) + 100)}/SMPN7/XI/2026`,
      tanggal: defaultDate,
      siswa_id: '',
      nama_siswa: '',
      nisn: '',
      kelas: '',
      nama_ortu: '',
      alamat_ortu: '',
      no_hp_ortu: '',
      jenis_pernyataan: 'Perjanjian 2',
      butir_pelanggaran: '',
      isi_pernyataan: 'Dengan ini saya berjanji dengan sungguh-sungguh tidak akan mengulangi perbuatan/pelanggaran tersebut, dan bersedia menaati seluruh tata tertib yang berlaku di UPT SMP Negeri 7 Pasuruan.',
      konsekuensi: 'Apabila di kemudian hari saya mengulangi pelanggaran yang sama atau melakukan pelanggaran tata tertib lainnya, saya bersedia menerima sanksi yang lebih berat sesuai aturan sekolah / siap dikembalikan kepada orang tua.',
      guru_bk: getDefaultGuruBK(user),
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
      guru_bk: item.guru_bk && !item.guru_bk.toLowerCase().includes('administrator') ? item.guru_bk : getDefaultGuruBK(user),
      wali_kelas: item.wali_kelas || 'Wali Kelas',
      kepala_sekolah: item.kepala_sekolah || 'Drs. Edy Suprayitno, M.M.',
      status: item.status
    });
    const matchedStudent = sortedSiswa.find(
      s =>
        (item.siswa_id && String(s.id) === String(item.siswa_id)) ||
        (s.nama && item.nama_siswa && s.nama.toLowerCase() === item.nama_siswa.toLowerCase())
    );
    setSelectedStudents([
      matchedStudent || {
        id: item.siswa_id || item.nama_siswa,
        nama: item.nama_siswa,
        kelas: normalizeKelasKey(item.kelas || '') || item.kelas || '-',
        nisn: item.nisn || ''
      }
    ]);
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

          {/* Student Selection - Multi Kelas & Multi Siswa */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <Users size={15} className="text-blue-600" />
                <span>Identitas Siswa (Multi Kelas & Siswa) *</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllSelected}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Kosongkan ({selectedStudents.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={openPickerModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Users size={14} />
                  <span>
                    {selectedStudents.length > 0
                      ? `Ubah / Tambah Siswa (${selectedStudents.length} Dipilih)`
                      : 'Pilih Kelas & Siswa'}
                  </span>
                </button>
              </div>
            </div>

            <div
              onClick={openPickerModal}
              className="w-full min-h-[58px] p-3.5 bg-white hover:bg-blue-50/30 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              {selectedStudents.length === 0 ? (
                <div className="flex items-center justify-between text-slate-400 text-sm">
                  <span>Klik untuk memilih satu atau banyak siswa lintas kelas...</span>
                  <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold shrink-0 ml-2">
                    Multi Pilih
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                  {selectedStudents.map(s => {
                    const sid = String(s.id || s.nama);
                    return (
                      <span
                        key={sid}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200 shadow-xs text-xs font-bold text-slate-800"
                      >
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black">
                          {s.kelas}
                        </span>
                        <span className="uppercase">{s.nama}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedStudent(sid)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus siswa"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
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
              <select
                value={formData.guru_bk}
                onChange={(e) => setFormData({ ...formData, guru_bk: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                {GURU_BK_OPTIONS.map((nama, idx) => (
                  <option key={nama} value={nama}>{idx + 1}. {nama}</option>
                ))}
                {!GURU_BK_OPTIONS.includes(formData.guru_bk as any) && formData.guru_bk && !formData.guru_bk.toLowerCase().includes('administrator') && (
                  <option value={formData.guru_bk}>{formData.guru_bk}</option>
                )}
              </select>
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
          <div id="bk-print-area" className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 relative my-8 text-slate-900 print:m-0 print:p-0 print:shadow-none print:border-none">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="font-bold text-sm text-slate-700">Preview Cetak Surat Pernyataan Resmi</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printBKReport('bk-print-area', `Surat Pernyataan - ${printItem.nama_siswa}`)}
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
                onClick={() => printBKReport('bk-print-area', `Surat Pernyataan - ${printItem.nama_siswa}`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 shadow-md shadow-amber-200 cursor-pointer"
              >
                <Printer size={16} />
                <span>Cetak Surat Pernyataan</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Multi-Student & Multi-Class Picker Modal */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200"
            onClick={e => e.stopPropagation()}
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
                    onChange={e => setPickerSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all shrink-0 cursor-pointer ${
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
                {['Semua', ...CLASSES].map(cls => {
                  const isActive = pickerClassFilter === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setPickerClassFilter(cls)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
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
                filteredModalStudents.map(s => {
                  const sid = String(s.id || s.nama);
                  const isChecked = tempSelectedMap.has(sid);
                  const nisDisplay = s.nisn || s.nis || '-';
                  const jkDisplay = s.jenis_kelamin || '-';
                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => toggleTempStudent(s)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${
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
                Total <span className="font-bold text-slate-900">{tempSelectedMap.size} anggota</span> siap dimasukkan ke Surat Pernyataan.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applySelectedStudents}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Check size={15} />
                  <span>Gunakan {tempSelectedMap.size} Siswa Terpilih</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
