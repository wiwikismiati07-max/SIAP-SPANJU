import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Filter,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import { supabase } from '../../lib/supabase';
import { AlumniTracing } from './types';

export default function AlumniTracingAdmin() {
  const [data, setData] = useState<AlumniTracing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Database tidak terhubung.');
      const { data: tracings, error: queryError } = await supabase
        .from('alumni_tracing')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (queryError) {
        if (queryError.message.includes('relation "public.alumni_tracing" does not exist') || queryError.message.includes('schema cache')) {
          throw new Error('Tabel "alumni_tracing" tidak ditemukan. Pastikan Anda sudah menjalankan script SQL di Supabase SQL Editor.');
        }
        throw queryError;
      }
      setData(tracings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportToExcel = async () => {
    if (filteredData.length === 0) return;
    
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tracing Alumni');
      const totalCols = 10;
      
      await addExcelHeaderAndLogos(worksheet, workbook, 'LAPORAN PENELUSURAN ALUMNI (TRACING ALUMNI)', totalCols);

      // Table Headers
      const headers = [
        'NO', 
        'NAMA LENGKAP', 
        'JENIS KELAMIN', 
        'TAHUN LULUS', 
        'NO. WA / HP', 
        'LANJUT KE', 
        'NAMA SEKOLAH LANJUTAN', 
        'JURUSAN / PROGRAM', 
        'ALASAN',
        'ALAMAT'
      ];

      const headerRow = worksheet.getRow(10);
      headerRow.values = headers;

      // Table Data
      filteredData.forEach((item, index) => {
        worksheet.addRow([
          index + 1,
          item.nama_lengkap,
          item.jenis_kelamin,
          item.tahun_lulus,
          item.wa_number,
          item.lanjut_ke,
          item.nama_sekolah_lanjutan || '-',
          item.jurusan || '-',
          item.alasan || '-',
          item.alamat || '-'
        ]);
      });

      applyColorfulTableStyle(worksheet, 10, filteredData.length, totalCols);

      // Set column widths
      worksheet.columns = [
        { width: 5 },   // NO
        { width: 30 },  // NAMA LENGKAP
        { width: 15 },  // JENIS KELAMIN
        { width: 12 },  // TAHUN LULUS
        { width: 18 },  // WA NUMBER
        { width: 20 },  // LANJUT KE
        { width: 30 },  // NAMA SEKOLAH
        { width: 25 },  // JURUSAN
        { width: 35 },  // ALASAN
        { width: 40 }   // ALAMAT
      ];

      // Signature Section
      const footerStartRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 12;
      const leftColStart = 2;
      const leftColEnd = 4;
      const rightColStart = 7;
      const rightColEnd = 9;

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

      // Right Signature (Guru BK)
      const today = new Date();
      const formattedDate = format(today, 'd MMMM yyyy', { locale: idLocale });
      
      worksheet.mergeCells(footerStartRow, rightColStart, footerStartRow, rightColEnd);
      worksheet.getCell(footerStartRow, rightColStart).value = `Pasuruan, ${formattedDate}`;
      worksheet.getCell(footerStartRow, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, rightColStart, footerStartRow + 1, rightColEnd);
      worksheet.getCell(footerStartRow + 1, rightColStart).value = 'Guru BK';
      worksheet.getCell(footerStartRow + 1, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, rightColStart, footerStartRow + 6, rightColEnd);
      const bkName = worksheet.getCell(footerStartRow + 6, rightColStart);
      bkName.value = 'WIWIK ISMIATI, S.Pd';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, rightColStart, footerStartRow + 7, rightColEnd);
      worksheet.getCell(footerStartRow + 7, rightColStart).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(footerStartRow + 7, rightColStart).alignment = { horizontal: 'center' };

      // Generate File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Tracing_Alumni_Full_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      console.error('Export Error:', err);
      alert('Gagal mengekspor data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(s => {
    const matchesSearch = s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.wa_number.includes(searchTerm) ||
                          s.nama_sekolah_lanjutan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    return matchesSearch && s.lanjut_ke === filterType;
  });

  return (
    <div className="p-6 md:p-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Database Tracing Alumni</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">Monitoring Pendidikan Alumni Spanju</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={exportToExcel}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl"
          >
            <Download size={20} /> Export Excel
          </button>
        </div>
      </div>

      {/* Tools & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 relative group">
          <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, WA, atau sekolah lanjutan..."
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold text-lg"
          />
        </div>

        <div className="relative">
          <Filter size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-12 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold appearance-none cursor-pointer text-slate-600"
          >
            <option value="all">SEMUA KATEGORI</option>
            <option value="SMA">SMA</option>
            <option value="SMK">SMK</option>
            <option value="MA">MA</option>
            <option value="Pondok Pesantren">PESANTREN</option>
            <option value="Tidak Melanjutkan">TIDAK MELANJUTKAN</option>
          </select>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Alumni</p>
            <p className="text-3xl font-black text-slate-800">{data.length}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600">
            <AlertCircle size={24} />
            <p className="font-bold">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-200 text-center sticky top-0 z-10">
                <th className="px-8 py-6">Alumni & WA</th>
                <th className="px-8 py-6">Lulusan</th>
                <th className="px-8 py-6">Melanjutkan Ke</th>
                <th className="px-8 py-6">Sekolah Lanjutan</th>
                <th className="px-8 py-6">Jurusan</th>
                <th className="px-8 py-6">Alasan</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{item.nama_lengkap}</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Phone size={10} /> {item.wa_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <p className="text-sm font-black text-slate-800">{item.tahun_lulus}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.jenis_kelamin}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                        {item.lanjut_ke}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 text-sm">{item.nama_sekolah_lanjutan || '-'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-500 text-xs">{item.jurusan || '-'}</p>
                    </td>
                    <td className="px-8 py-6 group relative">
                      <p className="text-xs text-slate-400 truncate max-w-[150px]">{item.alasan || '-'}</p>
                      {item.alasan && (
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 p-4 bg-slate-900 text-white rounded-xl text-[10px] font-medium leading-relaxed z-50 w-64 shadow-2xl mb-2">
                          {item.alasan}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Users size={64} strokeWidth={1} />
                      <p className="font-black uppercase tracking-[0.3em] text-xs">Belum ada data tracing alumni</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
