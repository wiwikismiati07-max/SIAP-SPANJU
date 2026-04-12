import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, Users, Save, X, Edit2, Trash2, Search, Download, Plus, FileSpreadsheet, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AgamaProgram, AgamaJadwal } from '../../types/keagamaan';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';

const KeagamaanJadwal: React.FC<{ user?: any }> = ({ user }) => {
  const canDelete = user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const canAdd = user?.role === 'entry' || user?.role === 'full';
  const [jadwalList, setJadwalList] = useState<AgamaJadwal[]>([]);
  const [programs, setPrograms] = useState<AgamaProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kegiatan_id: '',
    hari: '',
    minggu_ke: 1,
    bulan: format(new Date(), 'MMMM', { locale: id }),
    tahun: new Date().getFullYear(),
    kelas: '',
    keterangan: ''
  });

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const weeks = [1, 2, 3, 4];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    fetchInitialData();
    fetchJadwal();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data } = await supabase.from('agama_program').select('*').order('nama_kegiatan');
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const fetchJadwal = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agama_jadwal')
        .select(`
          *,
          kegiatan:agama_program(nama_kegiatan)
        `)
        .order('tahun', { ascending: false })
        .order('bulan', { ascending: false })
        .order('minggu_ke', { ascending: false });
      
      if (error) throw error;
      setJadwalList(data || []);
    } catch (error) {
      console.error('Error fetching jadwal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kegiatan_id || !formData.hari || !formData.kelas) {
      alert('Mohon lengkapi data wajib');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        const { error } = await supabase
          .from('agama_jadwal')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agama_jadwal')
          .insert([formData]);
        if (error) throw error;
      }

      resetForm();
      fetchJadwal();
      alert('Berhasil menyimpan jadwal');
    } catch (error: any) {
      console.error('Error saving jadwal:', error);
      alert(`Gagal menyimpan jadwal: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      kegiatan_id: '',
      hari: '',
      minggu_ke: 1,
      bulan: format(new Date(), 'MMMM', { locale: id }),
      tahun: new Date().getFullYear(),
      kelas: '',
      keterangan: ''
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (jadwal: AgamaJadwal) => {
    setEditingId(jadwal.id);
    setFormData({
      kegiatan_id: jadwal.kegiatan_id,
      hari: jadwal.hari,
      minggu_ke: jadwal.minggu_ke,
      bulan: jadwal.bulan,
      tahun: jadwal.tahun,
      kelas: jadwal.kelas,
      keterangan: jadwal.keterangan || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus jadwal ini?')) return;
    try {
      const { error } = await supabase
        .from('agama_jadwal')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchJadwal();
    } catch (error) {
      console.error('Error deleting jadwal:', error);
      alert('Gagal menghapus jadwal');
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Jadwal Kegiatan');

    const columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Kegiatan', key: 'kegiatan', width: 30 },
      { header: 'Hari', key: 'hari', width: 15 },
      { header: 'Minggu Ke', key: 'minggu', width: 12 },
      { header: 'Bulan', key: 'bulan', width: 15 },
      { header: 'Tahun', key: 'tahun', width: 10 },
      { header: 'Kelas', key: 'kelas', width: 25 },
      { header: 'Keterangan', key: 'keterangan', width: 40 }
    ];

    worksheet.columns = columns;

    await addExcelHeaderAndLogos(worksheet, workbook, 'JADWAL KEGIATAN KEAGAMAAN MINGGUAN', columns.length);

    const headerRowIndex = 10;
    const headerRow = worksheet.getRow(headerRowIndex);
    columns.forEach((col, i) => {
      headerRow.getCell(i + 1).value = col.header;
    });

    jadwalList.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        kegiatan: item.kegiatan?.nama_kegiatan,
        hari: item.hari,
        minggu: item.minggu_ke,
        bulan: item.bulan,
        tahun: item.tahun,
        kelas: item.kelas,
        keterangan: item.keterangan || '-'
      });
    });

    applyColorfulTableStyle(worksheet, headerRowIndex, jadwalList.length, columns.length);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jadwal_Kegiatan_Keagamaan_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Jadwal');

    const columns = [
      { header: 'Nama Kegiatan', key: 'kegiatan', width: 30 },
      { header: 'Hari', key: 'hari', width: 15 },
      { header: 'Minggu Ke', key: 'minggu', width: 12 },
      { header: 'Bulan', key: 'bulan', width: 15 },
      { header: 'Tahun', key: 'tahun', width: 10 },
      { header: 'Kelas', key: 'kelas', width: 25 },
      { header: 'Keterangan', key: 'keterangan', width: 40 }
    ];

    worksheet.columns = columns;

    // Add example row
    worksheet.addRow({
      kegiatan: 'Sholat Dhuha',
      hari: 'Senin',
      minggu: 1,
      bulan: 'Januari',
      tahun: 2026,
      kelas: '7A',
      keterangan: 'Rutin setiap pagi'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Upload_Jadwal_Keagamaan.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const normalize = (str: string) => str?.toLowerCase().trim().replace(/\s+/g, ' ') || '';

        const mappedData = data.map((row: any) => {
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const foundKey = rowKeys.find(rk => normalize(rk) === normalize(key));
              if (foundKey) return String(row[foundKey]).trim();
            }
            return '';
          };

          const namaKegiatan = getValue(['nama kegiatan', 'kegiatan']);
          const hari = getValue(['hari']);
          const mingguKe = parseInt(getValue(['minggu ke', 'minggu']));
          const bulan = getValue(['bulan']);
          const tahun = parseInt(getValue(['tahun']));
          const kelas = getValue(['kelas']);
          const keterangan = getValue(['keterangan']);

          if (!namaKegiatan || !hari || !kelas) return null;

          const program = programs.find(p => normalize(p.nama_kegiatan) === normalize(namaKegiatan));
          if (!program) return null;

          return {
            kegiatan_id: program.id,
            hari,
            minggu_ke: isNaN(mingguKe) ? 1 : mingguKe,
            bulan: bulan || format(new Date(), 'MMMM', { locale: id }),
            tahun: isNaN(tahun) ? new Date().getFullYear() : tahun,
            kelas,
            keterangan
          };
        }).filter(Boolean);

        if (mappedData.length === 0) {
          alert('Tidak ada data valid untuk diupload. Pastikan Nama Kegiatan sesuai dengan Data Master.');
          return;
        }

        const { error } = await supabase.from('agama_jadwal').insert(mappedData);
        if (error) throw error;

        alert(`Berhasil mengupload ${mappedData.length} data jadwal.`);
        fetchJadwal();
      } catch (error: any) {
        console.error('Upload error:', error);
        alert('Gagal mengupload data: ' + error.message);
      } finally {
        setLoading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Jadwal Kegiatan Mingguan</h2>
          <p className="text-sm text-slate-400 font-medium mt-1">Kelola jadwal rutin kegiatan keagamaan siswa</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} className="text-blue-500" />
            Template
          </button>
          <label className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <Upload size={18} className="text-amber-500" />
            Upload Data
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
          </label>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileSpreadsheet size={18} className="text-emerald-500" />
            Export Excel
          </button>
          {canAdd && (
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              <Plus size={18} />
              Tambah Jadwal
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari jadwal atau kegiatan..." 
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-50 text-sm font-medium outline-none focus:border-emerald-500/20 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kegiatan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kelas</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keterangan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Memuat data...</td>
                </tr>
              ) : jadwalList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Belum ada jadwal yang dibuat.</td>
                </tr>
              ) : (
                jadwalList.map(jadwal => (
                  <tr key={jadwal.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{jadwal.kegiatan?.nama_kegiatan}</p>
                          <p className="text-xs text-slate-400">{jadwal.hari}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-600">Minggu ke-{jadwal.minggu_ke}</p>
                        <p className="text-xs text-slate-400">{jadwal.bulan} {jadwal.tahun}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">
                        {jadwal.kelas}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm text-slate-500 max-w-xs truncate">{jadwal.keterangan || '-'}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(jadwal)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(jadwal.id)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="bg-emerald-600 p-8 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black">{editingId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</h3>
                  <p className="text-emerald-100/80 text-sm font-medium">Lengkapi detail jadwal kegiatan mingguan</p>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pilih Kegiatan</label>
                  <select
                    required
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                    value={formData.kegiatan_id}
                    onChange={e => setFormData({ ...formData, kegiatan_id: e.target.value })}
                  >
                    <option value="">-- Pilih Kegiatan --</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nama_kegiatan}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Hari</label>
                    <select
                      required
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                      value={formData.hari}
                      onChange={e => setFormData({ ...formData, hari: e.target.value })}
                    >
                      <option value="">-- Pilih Hari --</option>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Minggu Ke</label>
                    <select
                      required
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                      value={formData.minggu_ke}
                      onChange={e => setFormData({ ...formData, minggu_ke: parseInt(e.target.value) })}
                    >
                      {weeks.map(w => <option key={w} value={w}>Minggu {w}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bulan</label>
                    <select
                      required
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                      value={formData.bulan}
                      onChange={e => setFormData({ ...formData, bulan: e.target.value })}
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tahun</label>
                    <select
                      required
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                      value={formData.tahun}
                      onChange={e => setFormData({ ...formData, tahun: parseInt(e.target.value) })}
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Kelas (Contoh: 7A, 8B, atau Semua Kelas)</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan kelas..."
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                    value={formData.kelas}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Keterangan (Opsional)</label>
                  <textarea
                    placeholder="Tambahkan keterangan..."
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 h-24 resize-none"
                    value={formData.keterangan}
                    onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KeagamaanJadwal;
