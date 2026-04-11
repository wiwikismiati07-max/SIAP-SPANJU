import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Search, Filter, Calendar, CheckCircle2, Clock } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export default function DisiplinLaporan() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
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
      const worksheet = workbook.addWorksheet('Laporan Pelanggaran');

      const totalCols = 11;
      await addExcelHeaderAndLogos(worksheet, workbook, 'LAPORAN PELANGGARAN SISWA', totalCols);

      // Table Headers
      const headers = ['NO', 'TANGGAL', 'JAM', 'KELAS', 'NAMA SISWA', 'PELANGGARAN', 'ALASAN', 'PENANGANAN', 'CATATAN', 'KONSEKUENSI', 'STATUS'];

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
          d.pelanggaran?.nama_pelanggaran || '-',
          d.alasan || '-',
          d.penanganan || '-',
          d.catatan || '-',
          d.konsekuensi || '-',
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
        { width: 30 }, // PELANGGARAN
        { width: 30 }, // ALASAN
        { width: 20 }, // PENANGANAN
        { width: 30 }, // CATATAN
        { width: 25 }, // KONSEKUENSI
        { width: 15 }  // STATUS
      ];

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Pelanggaran_${filter.startDate}_${filter.endDate}.xlsx`);
    } catch (error) {
      console.error('Export Excel Error:', error);
      alert('Gagal mengunduh Excel. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Pelanggaran</h2>
          <p className="text-sm text-slate-500">Unduh dan filter data pelanggaran siswa</p>
        </div>
        <button 
          onClick={handleDownloadExcel}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} />
          <span>{loading ? 'Memproses...' : 'Download Excel'}</span>
        </button>
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
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Pelanggaran</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Memuat data laporan...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data untuk filter yang dipilih.</td>
                </tr>
              ) : (
                filteredData.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {d.tanggal}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{d.siswa?.nama}</p>
                      <p className="text-xs text-slate-500">Kelas {d.siswa?.kelas}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{d.pelanggaran?.nama_pelanggaran}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">{d.pelanggaran?.kategori}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 line-clamp-2">{d.alasan}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold ${
                        d.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {d.status === 'Selesai' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
