import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState } from 'react';
import { Calendar, Search, Download, FileText, Filter, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const PrestasiLaporan: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setHasFetched(true);
      const { data, error } = await supabase
        .from('prestasi_siswa')
        .select('*, siswa:master_siswa(nama), wali_kelas:master_guru(nama_guru)')
        .gte('tanggal', dateRange.from)
        .lte('tanggal', dateRange.to)
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setReportData(data || []);
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Gagal memuat laporan: ' + (error instanceof Error ? error.message : 'Terjadi kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (reportData.length === 0) {
      alert('Tidak ada data untuk diunduh. Silakan klik Tampilkan Laporan terlebih dahulu.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Prestasi');

      // --- HEADER SECTION ---
      await addExcelHeaderAndLogos(worksheet, workbook, 'Laporan Prestasi Siswa', 11);

      // --- TABLE SECTION ---
      const headerRow = worksheet.getRow(10);
      const headers = ['NO', 'TANGGAL', 'JAM', 'NAMA SISWA', 'KELAS', 'JENIS', 'NAMA LOMBA', 'JUARA', 'TINGKAT', 'WALI KELAS', 'GURU BK'];
      headerRow.values = headers;

      // Data Rows
      reportData.forEach((item, index) => {
        const row = worksheet.getRow(11 + index);
        const values = [
          index + 1,
          format(new Date(item.tanggal), 'dd/MM/yyyy'),
          item.jam,
          item.siswa?.nama || '-',
          item.kelas,
          item.jenis_prestasi,
          item.nama_lomba,
          item.juara,
          item.tingkat,
          item.wali_kelas?.nama_guru || '-',
          item.guru_bk
        ];

        values.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v;
          cell.alignment = { horizontal: i === 0 || i === 2 || i === 4 ? 'center' : 'left', vertical: 'middle' };
        });
      });

      applyColorfulTableStyle(worksheet, 10, reportData.length, 11);

      // Column Widths
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 10;
      worksheet.getColumn(4).width = 30;
      worksheet.getColumn(5).width = 10;
      worksheet.getColumn(6).width = 15;
      worksheet.getColumn(7).width = 35;
      worksheet.getColumn(8).width = 15;
      worksheet.getColumn(9).width = 15;
      worksheet.getColumn(10).width = 25;
      worksheet.getColumn(11).width = 25;

      // --- FOOTER SECTION ---
      const lastDataRow = 11 + reportData.length;
      const footerStartRow = lastDataRow + 3;

      // Left Signature
      worksheet.mergeCells(footerStartRow, 2, footerStartRow, 4);
      worksheet.getCell(footerStartRow, 2).value = 'Mengetahui';
      worksheet.getCell(footerStartRow, 2).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, 2, footerStartRow + 1, 4);
      worksheet.getCell(footerStartRow + 1, 2).value = 'Kepala Sekolah';
      worksheet.getCell(footerStartRow + 1, 2).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, 2, footerStartRow + 6, 4);
      const kasekName = worksheet.getCell(footerStartRow + 6, 2);
      kasekName.value = 'NUR FADILAH, S.Pd';
      kasekName.font = { bold: true, underline: true };
      kasekName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, 2, footerStartRow + 7, 4);
      worksheet.getCell(footerStartRow + 7, 2).value = 'NIP. 19860410 201001 2 030';
      worksheet.getCell(footerStartRow + 7, 2).alignment = { horizontal: 'center' };

      // Right Signature
      const today = format(new Date(), 'd MMMM yyyy', { locale: idLocale });
      worksheet.mergeCells(footerStartRow, 8, footerStartRow, 11);
      worksheet.getCell(footerStartRow, 8).value = `Pasuruan, ${today}`;
      worksheet.getCell(footerStartRow, 8).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, 8, footerStartRow + 1, 11);
      worksheet.getCell(footerStartRow + 1, 8).value = 'Guru BK';
      worksheet.getCell(footerStartRow + 1, 8).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, 8, footerStartRow + 6, 11);
      const bkName = worksheet.getCell(footerStartRow + 6, 8);
      bkName.value = 'WIWIK ISMIATI, S.Pd';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, 8, footerStartRow + 7, 11);
      worksheet.getCell(footerStartRow + 7, 8).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(footerStartRow + 7, 8).alignment = { horizontal: 'center' };

      // Generate and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Prestasi_${dateRange.from}_to_${dateRange.to}.xlsx`);

    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Gagal mengekspor Excel');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Laporan Prestasi Siswa</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Rekapitulasi pencapaian prestasi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sampai Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={fetchReport}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-200"
            >
              <Filter size={18} />
              <span className="text-sm font-black uppercase tracking-widest">Tampilkan</span>
            </button>
            <button 
              onClick={downloadExcel}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
            >
              <Download size={18} />
              <span className="text-sm font-black uppercase tracking-widest">Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">No</th>
                <th className="px-8 py-5">Tanggal</th>
                <th className="px-8 py-5">Siswa</th>
                <th className="px-8 py-5">Lomba</th>
                <th className="px-8 py-5">Juara/Tingkat</th>
                <th className="px-8 py-5">Wali Kelas/BK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
                  </td>
                </tr>
              ) : reportData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 text-sm font-bold text-slate-400">{index + 1}</td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-700">{format(new Date(item.tanggal), 'dd/MM/yyyy')}</span>
                      <span className="text-[10px] font-bold text-slate-400">{item.jam}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800">{item.siswa?.nama}</span>
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{item.kelas}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{item.nama_lomba}</span>
                      <span className="text-[10px] font-black text-blue-600">{item.jenis_prestasi}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-amber-600">{item.juara}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.tingkat}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">WK: {item.wali_kelas?.nama_guru || '-'}</span>
                      <span className="text-xs font-bold text-slate-600">BK: {item.guru_bk}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && reportData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold">
                    {!hasFetched ? 'Klik Tampilkan untuk memuat data' : 'Tidak ada data ditemukan untuk periode ini'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PrestasiLaporan;
