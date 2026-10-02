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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterMinggu, setFilterMinggu] = useState('');
  const [sortWeekAsc, setSortWeekAsc] = useState(true);

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
  const weeks = [1, 2, 3, 4, 5];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const monthOrder: Record<string, number> = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
    'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };
  
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
        .order('minggu_ke', { ascending: true })
        .order('tahun', { ascending: false });
      
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
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    resetForm();
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

    filteredJadwalList.forEach((item, index) => {
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

    applyColorfulTableStyle(worksheet, headerRowIndex, filteredJadwalList.length, columns.length);
    
    // --- SIGNATURE SECTION ---
    const footerStartRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : (headerRowIndex + filteredJadwalList.length + 2);
    const leftColStart = 2;
    const leftColEnd = 4;
    const rightColStart = 6;
    const rightColEnd = 8;

    // Left Signature (Kepala Sekolah)
    worksheet.mergeCells(footerStartRow, leftColStart, footerStartRow, leftColEnd);
    worksheet.getCell(footerStartRow, leftColStart).value = 'Mengetahui';
    worksheet.getCell(footerStartRow, leftColStart).alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 1, leftColStart, footerStartRow + 1, leftColEnd);
    worksheet.getCell(footerStartRow + 1, leftColStart).value = 'Kepala Sekolah';
    worksheet.getCell(footerStartRow + 1, leftColStart).alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 6, leftColStart, footerStartRow + 6, leftColEnd);
    const kasekName = worksheet.getCell(footerStartRow + 6, leftColStart);
    kasekName.value = 'NUR FADILAH, S.Pd';
    kasekName.font = { bold: true, underline: true };
    kasekName.alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 7, leftColStart, footerStartRow + 7, leftColEnd);
    worksheet.getCell(footerStartRow + 7, leftColStart).value = 'NIP. 19860410 201001 2 030';
    worksheet.getCell(footerStartRow + 7, leftColStart).alignment = { horizontal: 'center' };

    // Right Signature (Guru Agama)
    const today = new Date();
    const formattedDate = format(today, 'd MMMM yyyy', { locale: id });
    
    worksheet.mergeCells(footerStartRow, rightColStart, footerStartRow, rightColEnd);
    worksheet.getCell(footerStartRow, rightColStart).value = `Pasuruan, ${formattedDate}`;
    worksheet.getCell(footerStartRow, rightColStart).alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 1, rightColStart, footerStartRow + 1, rightColEnd);
    worksheet.getCell(footerStartRow + 1, rightColStart).value = 'Guru Agama';
    worksheet.getCell(footerStartRow + 1, rightColStart).alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 6, rightColStart, footerStartRow + 6, rightColEnd);
    const agName = worksheet.getCell(footerStartRow + 6, rightColStart);
    agName.value = '........................................';
    agName.font = { bold: true, underline: true };
    agName.alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 7, rightColStart, footerStartRow + 7, rightColEnd);
    worksheet.getCell(footerStartRow + 7, rightColStart).value = 'NIP. ............................';
    worksheet.getCell(footerStartRow + 7, rightColStart).alignment = { horizontal: 'center' };

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

  const filteredJadwalList = [...jadwalList]
    .filter(jadwal => {
      if (filterBulan && jadwal.bulan !== filterBulan) return false;
      if (filterMinggu && Number(jadwal.minggu_ke) !== Number(filterMinggu)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (jadwal.kegiatan?.nama_kegiatan || '').toLowerCase().includes(q) ||
        (jadwal.hari || '').toLowerCase().includes(q) ||
        (jadwal.bulan || '').toLowerCase().includes(q) ||
        (jadwal.kelas || '').toLowerCase().includes(q) ||
        (jadwal.keterangan || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // 1. Urutkan Minggu Ke: 1, 2, 3, 4, 5
      const wA = Number(a.minggu_ke) || 1;
      const wB = Number(b.minggu_ke) || 1;
      if (wA !== wB) {
        return sortWeekAsc ? wA - wB : wB - wA;
      }
      // 2. Bulan
      const mA = monthOrder[a.bulan] || 0;
      const mB = monthOrder[b.bulan] || 0;
      if (mA !== mB) return mA - mB;
      // 3. Tahun
      return (b.tahun || 0) - (a.tahun || 0);
    });

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Jadwal Kegiatan Mingguan</h2>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">Kelola jadwal rutin kegiatan keagamaan siswa</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            title="Download Template Excel"
          >
            <Download size={16} className="text-blue-500" />
            Template
          </button>
          <label className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all shadow-sm cursor-pointer active:scale-95">
            <Upload size={16} className="text-amber-500" />
            Upload Data
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
          </label>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            title="Export Ke Excel"
          >
            <FileSpreadsheet size={16} className="text-emerald-500" />
            Export Excel
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-xs sm:text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              <Plus size={16} />
              Tambah Jadwal
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari jadwal, kelas, atau kegiatan..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 text-xs sm:text-sm font-medium outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Minggu */}
            <select
              value={filterMinggu}
              onChange={e => setFilterMinggu(e.target.value)}
              className="px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Semua Minggu</option>
              {weeks.map(w => (
                <option key={w} value={w}>Minggu {w}</option>
              ))}
            </select>

            {/* Filter Bulan */}
            <select
              value={filterBulan}
              onChange={e => setFilterBulan(e.target.value)}
              className="px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Semua Bulan</option>
              {months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Tombol Urutan Minggu 1-5 */}
            <button
              onClick={() => setSortWeekAsc(!sortWeekAsc)}
              className={`flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-black transition-all border shadow-xs ${
                sortWeekAsc 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title="Klik untuk ubah urutan minggu"
            >
              <span>Urutan: Minggu {sortWeekAsc ? '1 → 5' : '5 → 1'}</span>
            </button>

            {(searchQuery || filterBulan || filterMinggu) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterBulan('');
                  setFilterMinggu('');
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="px-5 sm:px-7 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan</th>
                <th 
                  className="px-5 sm:px-7 py-4 text-[10px] font-black text-emerald-700 uppercase tracking-widest cursor-pointer hover:bg-emerald-50/50 transition-colors"
                  onClick={() => setSortWeekAsc(!sortWeekAsc)}
                  title="Klik untuk ubah urutan minggu"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Waktu</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black">
                      Minggu {sortWeekAsc ? '1-5' : '5-1'}
                    </span>
                  </div>
                </th>
                <th className="px-5 sm:px-7 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                <th className="px-5 sm:px-7 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-5 sm:px-7 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">Memuat data...</td>
                </tr>
              ) : filteredJadwalList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    {searchQuery ? 'Tidak ada jadwal yang sesuai pencarian.' : 'Belum ada jadwal yang dibuat.'}
                  </td>
                </tr>
              ) : (
                filteredJadwalList.map(jadwal => (
                  <tr key={jadwal.id} className="hover:bg-slate-50/60 transition-all group">
                    <td className="px-5 sm:px-7 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <BookOpen size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">{jadwal.kegiatan?.nama_kegiatan}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{jadwal.hari}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 sm:px-7 py-4">
                      <div className="space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-700">Minggu ke-{jadwal.minggu_ke}</p>
                        <p className="text-[11px] text-slate-400">{jadwal.bulan} {jadwal.tahun}</p>
                      </div>
                    </td>
                    <td className="px-5 sm:px-7 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase">
                        {jadwal.kelas}
                      </span>
                    </td>
                    <td className="px-5 sm:px-7 py-4">
                      <p className="text-xs sm:text-sm text-slate-500 max-w-xs truncate">{jadwal.keterangan || '-'}</p>
                    </td>
                    <td className="px-5 sm:px-7 py-4 text-right">
                      <div className="flex justify-end gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(jadwal)}
                            className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-90"
                            title="Edit Jadwal"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(jadwal.id)}
                            className="p-1.5 sm:p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all active:scale-90"
                            title="Hapus Jadwal"
                          >
                            <Trash2 size={15} />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
            {/* Full-screen Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />

            {/* Modal Dialog Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-lg md:max-w-xl rounded-2xl md:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto z-10 border border-slate-100"
            >
              {/* Compact Fixed Header */}
              <div className="bg-emerald-600 px-5 py-3.5 sm:px-6 sm:py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl font-black leading-tight">
                    {editingId ? 'Edit Jadwal Kegiatan' : 'Tambah Jadwal Baru'}
                  </h3>
                  <p className="text-emerald-100/90 text-[11px] sm:text-xs font-medium mt-0.5">
                    Lengkapi detail jadwal kegiatan mingguan
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={closeModal} 
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors text-white/90 hover:text-white"
                  title="Tutup Form"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Scrollable Form Body - Fits cleanly on mobile & laptop screens */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                    Pilih Kegiatan
                  </label>
                  <select
                    required
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-xs sm:text-sm text-slate-700 bg-white"
                    value={formData.kegiatan_id}
                    onChange={e => setFormData({ ...formData, kegiatan_id: e.target.value })}
                  >
                    <option value="">-- Pilih Kegiatan --</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nama_kegiatan}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                      Hari
                    </label>
                    <select
                      required
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-xs sm:text-sm text-slate-700 bg-white"
                      value={formData.hari}
                      onChange={e => setFormData({ ...formData, hari: e.target.value })}
                    >
                      <option value="">-- Pilih Hari --</option>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                      Minggu Ke
                    </label>
                    <select
                      required
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-xs sm:text-sm text-slate-700 bg-white"
                      value={formData.minggu_ke}
                      onChange={e => setFormData({ ...formData, minggu_ke: parseInt(e.target.value) })}
                    >
                      {weeks.map(w => <option key={w} value={w}>Minggu {w}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                      Bulan
                    </label>
                    <select
                      required
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-xs sm:text-sm text-slate-700 bg-white"
                      value={formData.bulan}
                      onChange={e => setFormData({ ...formData, bulan: e.target.value })}
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                      Tahun
                    </label>
                    <select
                      required
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-xs sm:text-sm text-slate-700 bg-white"
                      value={formData.tahun}
                      onChange={e => setFormData({ ...formData, tahun: parseInt(e.target.value) })}
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                    Kelas (Contoh: 7A, 8B, atau Semua Kelas)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan kelas..."
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-xs sm:text-sm text-slate-700"
                    value={formData.kelas}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                  />
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">
                    Keterangan (Opsional)
                  </label>
                  <textarea
                    placeholder="Tambahkan keterangan..."
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-xs sm:text-sm text-slate-700 h-16 sm:h-20 resize-none"
                    value={formData.keterangan}
                    onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  />
                </div>

                {/* Visible Action Buttons */}
                <div className="flex gap-2.5 sm:gap-3 pt-2 sm:pt-3 shrink-0">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 sm:py-3 rounded-xl md:rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-2.5 sm:py-3 rounded-xl md:rounded-2xl bg-emerald-600 text-white font-black text-xs sm:text-sm hover:bg-emerald-700 shadow-md shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
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
