import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, Filter, User, FileText, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TransaksiDispensasi } from '../../types/dispensasi';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { id as idLocale } from 'date-fns/locale';

const DispLaporan: React.FC = () => {
  const [data, setData] = useState<TransaksiDispensasi[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    kelas: '',
    siswaName: '',
    jenisId: ''
  });
  const [jenisList, setJenisList] = useState<any[]>([]);

  const classes = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  useEffect(() => {
    fetchInitialData();
    fetchReport();
  }, []);

  const fetchInitialData = async () => {
    const { data: jData } = await supabase.from('disp_master_jenis').select('*').order('nama_jenis');
    setJenisList(jData || []);
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('disp_transaksi')
        .select(`
          *,
          siswa:master_siswa(nama, kelas),
          jenis:disp_master_jenis(nama_jenis)
        `)
        .gte('tanggal', filters.startDate)
        .lte('tanggal', filters.endDate)
        .order('tanggal', { ascending: false })
        .order('jam', { ascending: false });

      if (filters.kelas) query = query.eq('kelas', filters.kelas);
      if (filters.jenisId) query = query.eq('jenis_id', filters.jenisId);
      
      const { data: rData, error } = await query;
      if (error) throw error;

      let filtered = rData || [];
      if (filters.siswaName) {
        filtered = filtered.filter(d => 
          d.siswa?.nama.toLowerCase().includes(filters.siswaName.toLowerCase())
        );
      }

      setData(filtered);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (data.length === 0) {
      alert('Tidak ada data untuk diunduh');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Dispensasi');

      // --- HEADER SECTION ---
      await addExcelHeaderAndLogos(worksheet, workbook, 'Laporan Dispensasi Siswa', 8);

      // --- TABLE SECTION ---
      const headerRow = worksheet.getRow(10);
      const headers = ['NO', 'TANGGAL', 'JAM', 'NAMA SISWA', 'KELAS', 'JENIS DISPENSASI', 'ALASAN', 'TINDAK LANJUT'];
      headerRow.values = headers;

      // Data Rows
      data.forEach((item, index) => {
        const row = worksheet.getRow(11 + index);
        const values = [
          index + 1,
          format(new Date(item.tanggal), 'dd/MM/yyyy'),
          item.jam,
          item.siswa?.nama || '-',
          item.kelas,
          item.jenis?.nama_jenis || '-',
          item.alasan || '-',
          item.tindak_lanjut || '-'
        ];

        values.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v;
          cell.alignment = { horizontal: i === 0 || i === 2 || i === 4 ? 'center' : 'left', vertical: 'middle' };
        });
      });

      applyColorfulTableStyle(worksheet, 10, data.length, 8);

      // Column Widths
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 10;
      worksheet.getColumn(4).width = 30;
      worksheet.getColumn(5).width = 10;
      worksheet.getColumn(6).width = 30;
      worksheet.getColumn(7).width = 40;
      worksheet.getColumn(8).width = 40;

      // --- FOOTER SECTION ---
      const lastDataRow = 11 + data.length;
      const footerStartRow = lastDataRow + 3;

      // Left Signature
      worksheet.mergeCells(footerStartRow, 2, footerStartRow, 3);
      worksheet.getCell(footerStartRow, 2).value = 'Mengetahui';
      worksheet.getCell(footerStartRow, 2).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, 2, footerStartRow + 1, 3);
      worksheet.getCell(footerStartRow + 1, 2).value = 'Kepala Sekolah';
      worksheet.getCell(footerStartRow + 1, 2).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, 2, footerStartRow + 6, 3);
      const kasekName = worksheet.getCell(footerStartRow + 6, 2);
      kasekName.value = 'NUR FADILAH, S.Pd';
      kasekName.font = { bold: true, underline: true };
      kasekName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, 2, footerStartRow + 7, 3);
      worksheet.getCell(footerStartRow + 7, 2).value = 'NIP. 19860410 201001 2 030';
      worksheet.getCell(footerStartRow + 7, 2).alignment = { horizontal: 'center' };

      // Right Signature
      const today = format(new Date(), 'd MMMM yyyy', { locale: idLocale });
      worksheet.mergeCells(footerStartRow, 6, footerStartRow, 8);
      worksheet.getCell(footerStartRow, 6).value = `Pasuruan, ${today}`;
      worksheet.getCell(footerStartRow, 6).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, 6, footerStartRow + 1, 8);
      worksheet.getCell(footerStartRow + 1, 6).value = 'Kesiswaan';
      worksheet.getCell(footerStartRow + 1, 6).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, 6, footerStartRow + 6, 8);
      const bkName = worksheet.getCell(footerStartRow + 6, 6);
      bkName.value = '........................................';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, 6, footerStartRow + 7, 8);
      worksheet.getCell(footerStartRow + 7, 6).value = 'NIP. ............................';
      worksheet.getCell(footerStartRow + 7, 6).alignment = { horizontal: 'center' };

      // Generate and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Dispensasi_${filters.startDate}_sd_${filters.endDate}.xlsx`);

    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Gagal mengekspor Excel');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Dispensasi</h2>
          <p className="text-sm text-slate-500">Rekapitulasi data dispensasi siswa</p>
        </div>
        <button 
          onClick={downloadExcel}
          className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Download size={20} />
          <span className="font-bold">Download Excel</span>
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
            <Calendar size={12} />
            <span>Mulai</span>
          </label>
          <input 
            type="date" 
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
            <Calendar size={12} />
            <span>Sampai</span>
          </label>
          <input 
            type="date" 
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
            <Filter size={12} />
            <span>Kelas</span>
          </label>
          <select 
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            value={filters.kelas}
            onChange={(e) => setFilters({ ...filters, kelas: e.target.value })}
          >
            <option value="">Semua Kelas</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
            <User size={12} />
            <span>Nama Siswa</span>
          </label>
          <input 
            type="text" 
            placeholder="Cari nama..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            value={filters.siswaName}
            onChange={(e) => setFilters({ ...filters, siswaName: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={fetchReport}
            className="w-full py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-bold text-sm"
          >
            Terapkan Filter
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div></div>
                  </td>
                </tr>
              ) : data.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                      <Calendar size={12} className="text-pink-500" />
                      <span>{format(new Date(item.tanggal), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                      <Clock size={10} className="text-blue-500" />
                      <span>{item.jam}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-700">{item.siswa?.nama}</div>
                    <div className="text-[10px] uppercase font-black text-blue-500">{item.kelas}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-pink-50 text-pink-600 rounded-md text-[10px] font-bold uppercase">
                      {item.jenis?.nama_jenis}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-slate-600 line-clamp-2">{item.alasan || '-'}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-slate-500 line-clamp-2">{item.tindak_lanjut || '-'}</p>
                  </td>
                </tr>
              ))}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm italic">Data tidak ditemukan untuk filter ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispLaporan;
