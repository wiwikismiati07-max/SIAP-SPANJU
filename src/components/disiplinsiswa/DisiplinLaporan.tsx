import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Search, Filter, Calendar, CheckCircle2, Clock, LayoutGrid, List, ChevronRight, User, ShieldAlert, BookOpen, UserCheck, AlertCircle, Users, Activity } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function DisiplinLaporan() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [reportType, setReportType] = useState<'detail' | 'pivot' | 'kasus'>('pivot');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    startDate: format(new Date(), 'yyyy-MM-01'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    kelas: '',
    status: ''
  });

  const KELAS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (supabase) {
        let query = supabase
          .from('transaksi_pelanggaran')
          .select('*, siswa:master_siswa(*), pelanggaran:master_pelanggaran(*)')
          .gte('tanggal', filter.startDate)
          .lte('tanggal', filter.endDate)
          .order('tanggal', { ascending: false });

        if (filter.status) query = query.eq('status', filter.status);
        
        const { data: fetchedData, error } = await query;
        if (error) throw error;

        let filtered = fetchedData || [];
        if (filter.kelas) {
          filtered = filtered.filter((d: any) => d.siswa?.kelas === filter.kelas);
        }

        setData(filtered);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(d => 
    d.siswa?.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadExcel = async () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }

    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheetName = reportType === 'pivot' ? 'Laporan Pivot' : 'Laporan Detail';
      const worksheet = workbook.addWorksheet(sheetName);

      if (reportType === 'detail' || reportType === 'kasus') {
        const totalCols = 15;
        await addExcelHeaderAndLogos(worksheet, workbook, 'LAPORAN DETAIL PELANGGARAN SISWA', totalCols);

        // Table Headers
        const headers = [
          'NO', 'TANGGAL', 'JAM', 'KELAS', 'NAMA SISWA', 'WALI KELAS', 
          'PELANGGARAN', 'KATEGORI', 'POIN', 'ALASAN', 
          'PENANGANAN', 'KONSEKUENSI', 'TINDAK LANJUT', 'GURU BK', 'STATUS'
        ];

        const headerRow = worksheet.getRow(10);
        headerRow.values = headers;

        // Table Data
        filteredData.forEach((d, index) => {
          worksheet.addRow([
            index + 1,
            d.tanggal,
            d.jam || '-',
            d.siswa?.kelas || '-',
            d.siswa?.nama || '-',
            d.wali_kelas || '-',
            d.pelanggaran?.nama_pelanggaran || '-',
            d.pelanggaran?.kategori || '-',
            d.pelanggaran?.poin || 0,
            d.alasan || '-',
            d.penanganan || '-',
            d.konsekuensi || '-',
            d.tindak_lanjut || '-',
            d.guru_bk || '-',
            d.status
          ]);
        });

        applyColorfulTableStyle(worksheet, 10, filteredData.length, totalCols);

        // Set column widths
        worksheet.columns = [
          { width: 5 },  // NO
          { width: 12 }, // TANGGAL
          { width: 10 }, // JAM
          { width: 10 }, // KELAS
          { width: 25 }, // NAMA SISWA
          { width: 20 }, // WALI KELAS
          { width: 30 }, // PELANGGARAN
          { width: 15 }, // KATEGORI
          { width: 8 },  // POIN
          { width: 30 }, // ALASAN
          { width: 25 }, // PENANGANAN
          { width: 25 }, // KONSEKUENSI
          { width: 25 }, // TINDAK LANJUT
          { width: 20 }, // GURU BK
          { width: 15 }  // STATUS
        ];
      } else {
        // Pivot Logic
        const pivotData = getPivotData();
        const totalCols = 6;
        await addExcelHeaderAndLogos(worksheet, workbook, 'LAPORAN PIVOT PELANGGARAN SISWA', totalCols);

        const headers = ['NO', 'NAMA SISWA', 'KELAS', 'TOTAL PELANGGARAN', 'POIN TERAKUMULASI', 'STATUS TERAKHIR'];
        const headerRow = worksheet.getRow(10);
        headerRow.values = headers;

        pivotData.forEach((d, index) => {
          worksheet.addRow([
            index + 1,
            d.nama,
            d.kelas,
            d.count,
            d.totalPoin,
            d.lastStatus
          ]);
        });

        applyColorfulTableStyle(worksheet, 10, pivotData.length, totalCols);

        worksheet.columns = [
          { width: 5 },
          { width: 30 },
          { width: 10 },
          { width: 20 },
          { width: 20 },
          { width: 15 }
        ];
      }

      // --- SIGNATURE SECTION ---
      const footerStartRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 12;
      const leftColStart = 2;
      const leftColEnd = 4;
      const rightColStart = reportType === 'pivot' ? 5 : 10;
      const rightColEnd = reportType === 'pivot' ? 6 : 14;

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

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      let fileNamePrefix = 'Detail_Pelanggaran';
      if (reportType === 'pivot') fileNamePrefix = 'Pivot_Pelanggaran';
      if (reportType === 'kasus') fileNamePrefix = 'Kartu_Kasus_Pelanggaran';
      
      const fileName = `${fileNamePrefix}_${filter.startDate}_${filter.endDate}.xlsx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Export Excel Error:', error);
      alert('Gagal mengunduh Excel. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const getPivotData = () => {
    const grouped: Record<string, any> = {};
    filteredData.forEach(d => {
      const key = d.siswa_id;
      if (!grouped[key]) {
        grouped[key] = {
          id: d.siswa_id,
          nama: d.siswa?.nama || 'Unknown',
          kelas: d.siswa?.kelas || '-',
          count: 0,
          totalPoin: 0,
          lastStatus: d.status,
          cases: []
        };
      }
      grouped[key].count += 1;
      grouped[key].totalPoin += (d.pelanggaran?.poin || 0);
      grouped[key].cases.push(d);
    });
    return Object.values(grouped).sort((a, b) => b.count - a.count);
  };

  const getGroupedByStudent = () => {
    const grouped: Record<string, any> = {};
    filteredData.forEach(d => {
      const studentName = d.siswa?.nama || 'Unknown';
      if (!grouped[studentName]) {
        grouped[studentName] = {
          studentName,
          kelas: d.siswa?.kelas || '-',
          lastDate: d.tanggal,
          categories: {}
        };
      }
      
      const category = d.pelanggaran?.kategori || 'Lainnya';
      if (!grouped[studentName].categories[category]) {
        grouped[studentName].categories[category] = [];
      }
      grouped[studentName].categories[category].push(d);
      
      if (new Date(d.tanggal) > new Date(grouped[studentName].lastDate)) {
        grouped[studentName].lastDate = d.tanggal;
      }
    });
    return Object.values(grouped);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Pelanggaran</h2>
          <p className="text-sm text-slate-500">Unduh dan filter data pelanggaran siswa</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setReportType('pivot')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widset transition-all ${
                reportType === 'pivot' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={16} />
              Pivot
            </button>
            <button 
              onClick={() => setReportType('detail')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                reportType === 'detail' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={16} />
              Detail
            </button>
            <button 
              onClick={() => setReportType('kasus')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                reportType === 'kasus' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={16} />
              Kartu Kasus
            </button>
          </div>
          <button 
            onClick={handleDownloadExcel}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200/50 hover:shadow-emerald-300/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed translate-y-[-2px]"
          >
            <Download size={18} />
            <span>{loading ? 'Memproses...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
          <Filter size={18} className="text-blue-600" />
          Filter Laporan
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dari Tanggal</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filter.startDate}
              onChange={e => setFilter({...filter, startDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sampai Tanggal</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filter.endDate}
              onChange={e => setFilter({...filter, endDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kelas</label>
            <select 
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filter.kelas}
              onChange={e => setFilter({...filter, kelas: e.target.value})}
            >
              <option value="">Semua Kelas</option>
              {KELAS_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
            <select 
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filter.status}
              onChange={e => setFilter({...filter, status: e.target.value})}
            >
              <option value="">Semua Status</option>
              <option value="Proses">Dalam Proses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari nama siswa..." 
                className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full sm:w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {reportType === 'detail' && (
              <>
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                    <th className="px-8 py-5">Tanggal & Jam</th>
                    <th className="px-8 py-5">Siswa</th>
                    <th className="px-8 py-5">Pelanggaran</th>
                    <th className="px-8 py-5">Detail Penanganan</th>
                    <th className="px-8 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">Memuat data laporan...</td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">Tidak ada data untuk filter yang dipilih.</td>
                    </tr>
                  ) : (
                    filteredData.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Calendar size={14} />
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-xs">{d.tanggal}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{d.jam || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{d.siswa?.nama}</p>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Kelas {d.siswa?.kelas}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-bold text-slate-700 text-xs">{d.pelanggaran?.nama_pelanggaran}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-black uppercase tracking-widest border border-slate-200">{d.pelanggaran?.kategori}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-black uppercase tracking-widest border border-amber-100">{d.pelanggaran?.poin} Poin</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 max-w-sm">
                          <div className="space-y-2">
                            <p className="text-[11px] leading-relaxed text-slate-600"><span className="font-black text-slate-400 uppercase text-[9px] tracking-widest mr-1">Alasan:</span> {d.alasan}</p>
                            <p className="text-[11px] leading-relaxed text-slate-600"><span className="font-black text-slate-400 uppercase text-[9px] tracking-widest mr-1">Tindak Lanjut:</span> {d.tindak_lanjut}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            d.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${d.status === 'Selesai' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                            {d.status}
                          </span>
                          <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest italic">BK: {d.guru_bk}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
            {reportType === 'pivot' && (
              <>
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-6">Nama Siswa</th>
                    <th className="px-8 py-6">Kelas</th>
                    <th className="px-8 py-6 text-center">Total Pelanggaran</th>
                    <th className="px-8 py-6 text-center">Total Poin</th>
                    <th className="px-8 py-6">Status Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">Memuat data pivot...</td>
                    </tr>
                  ) : getPivotData().length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">Tidak ada data untuk filter yang dipilih.</td>
                    </tr>
                  ) : (
                    getPivotData().map((d: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-800 uppercase tracking-tight text-sm group-hover:text-blue-600 transition-colors">{d.nama}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{d.kelas}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-sm shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                              {d.count}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-sm border group-hover:scale-110 transition-transform ${
                              d.totalPoin >= 50 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              d.totalPoin >= 25 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                              {d.totalPoin}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            d.lastStatus === 'Selesai' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {d.lastStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>

          {reportType === 'kasus' && (
            <div className="p-8 space-y-12 bg-slate-50/50">
              {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">Memuat kartu laporan...</div>
              ) : getGroupedByStudent().length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">Tidak ada data untuk filter yang dipilih.</div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-12">
                  <header className="bg-[#8DA778] p-8 rounded-t-[2rem] shadow-lg">
                    <h3 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-4">
                      <FileText size={32} />
                      Laporan Kasus Siswa
                    </h3>
                  </header>

                  <div className="space-y-8 pb-12">
                    {getGroupedByStudent().map((student: any, sIdx: number) => (
                      <div key={sIdx} className="space-y-4">
                        {/* Student Name Bar */}
                        <div className="bg-[#D8E4D1] p-5 rounded-2xl flex items-center justify-between shadow-sm border border-[#C6D6BD]">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/50 rounded-xl flex items-center justify-center text-[#5D6F4D]">
                              <User size={20} />
                            </div>
                            <h4 className="text-lg font-black text-[#4A5D3A] uppercase tracking-tight">{student.studentName}</h4>
                          </div>
                          <div className="bg-white/50 px-4 py-2 rounded-xl text-[10px] font-black text-[#5D6F4D] uppercase tracking-widest shadow-inner">
                            {student.lastDate}
                          </div>
                        </div>

                        {/* Categories Group */}
                        <div className="ml-12 space-y-6">
                          {Object.entries(student.categories).map(([category, items]: [string, any], cIdx: number) => (
                            <div key={cIdx} className="space-y-4">
                              <div className="bg-[#EAF0E7] p-4 rounded-l-2xl border-l-4 border-[#8DA778] flex items-center gap-3">
                                <div className="p-1.5 bg-white/50 rounded-lg text-[#8DA778]">
                                  <ShieldAlert size={16} />
                                </div>
                                <span className="font-black text-[#5D6F4D] text-xs uppercase tracking-widest">Kelas {student.kelas} • {category}</span>
                              </div>

                              {/* Case Items */}
                              <div className="ml-8 space-y-4">
                                {items.map((item: any, iIdx: number) => (
                                  <div key={iIdx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 group hover:shadow-md transition-shadow">
                                    <div className="flex gap-4">
                                      <div className="mt-1 w-6 h-6 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center shrink-0">
                                        <AlertCircle size={14} />
                                      </div>
                                      <div className="space-y-3">
                                        <p className="text-sm font-medium italic text-slate-600 leading-relaxed">
                                          {item.alasan}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                              <BookOpen size={12} className="text-blue-500" />
                                              Penanganan
                                            </p>
                                            <p className="text-xs text-slate-700 font-medium">{item.penanganan || '-'}</p>
                                          </div>
                                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                              <ChevronRight size={12} className="text-emerald-500" />
                                              Tindak Lanjut
                                            </p>
                                            <p className="text-xs text-slate-700 font-medium">{item.tindak_lanjut || '-'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-50">
                                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <UserCheck size={14} className="text-blue-400" />
                                        BK: <span className="text-slate-600">{item.guru_bk}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <Users size={14} className="text-indigo-400" />
                                        WALI: <span className="text-slate-600">{item.wali_kelas || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                        <Activity size={14} className={item.status === 'Selesai' ? 'text-emerald-500' : 'text-amber-500'} />
                                        STATUS: <span className={item.status === 'Selesai' ? 'text-emerald-600' : 'text-amber-600'}>{item.status}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
