import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Search, Filter, Calendar, CheckCircle2, Clock, LayoutGrid, List } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export default function DisiplinLaporan() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [reportType, setReportType] = useState<'detail' | 'pivot'>('detail');
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
      const worksheet = workbook.addWorksheet(reportType === 'detail' ? 'Laporan Detail' : 'Laporan Pivot');

      if (reportType === 'detail') {
        const totalCols = 13;
        await addExcelHeaderAndLogos(worksheet, workbook, 'LAPORAN DETAIL PELANGGARAN SISWA', totalCols);

        // Table Headers
        const headers = ['NO', 'TANGGAL', 'JAM', 'KELAS', 'NAMA SISWA', 'PELANGGARAN', 'KATEGORI', 'ALASAN', 'PENANGANAN', 'CATATAN', 'TINDAK LANJUT', 'GURU BK', 'STATUS'];

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
            d.pelanggaran?.kategori || '-',
            d.alasan || '-',
            d.penanganan || '-',
            d.catatan || '-',
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
          { width: 30 }, // PELANGGARAN
          { width: 15 }, // KATEGORI
          { width: 30 }, // ALASAN
          { width: 25 }, // PENANGANAN
          { width: 30 }, // CATATAN
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

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = reportType === 'detail' ? `Detail_Pelanggaran_${filter.startDate}_${filter.endDate}.xlsx` : `Pivot_Pelanggaran_${filter.startDate}_${filter.endDate}.xlsx`;
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
          nama: d.siswa?.nama || 'Unknown',
          kelas: d.siswa?.kelas || '-',
          count: 0,
          totalPoin: 0,
          lastStatus: d.status
        };
      }
      grouped[key].count += 1;
      grouped[key].totalPoin += (d.pelanggaran?.poin || 0);
      // Update status if it's more recent (though data is ordered by date desc already)
      // grouped[key].lastStatus = d.status; 
    });
    return Object.values(grouped).sort((a, b) => b.count - a.count);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Pelanggaran</h2>
          <p className="text-sm text-slate-500">Unduh dan filter data pelanggaran siswa</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setReportType('detail')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                reportType === 'detail' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={16} />
              Detail
            </button>
            <button 
              onClick={() => setReportType('pivot')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                reportType === 'pivot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={16} />
              Pivot
            </button>
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
            {reportType === 'detail' ? (
              <>
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Siswa</th>
                    <th className="px-6 py-4">Pelanggaran</th>
                    <th className="px-6 py-4">Detail Penanganan</th>
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
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <Clock size={10} />
                            {d.jam || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{d.siswa?.nama}</p>
                          <p className="text-xs text-slate-500">Kelas {d.siswa?.kelas}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{d.pelanggaran?.nama_pelanggaran}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold border border-blue-100">{d.pelanggaran?.kategori}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold border border-amber-100">{d.pelanggaran?.poin} Poin</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 uppercase text-[9px]">Alasan:</span> {d.alasan}</p>
                            <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 uppercase text-[9px]">Penanganan:</span> {d.penanganan}</p>
                            <p className="text-xs text-slate-600"><span className="font-bold text-slate-400 uppercase text-[9px]">Tindak Lanjut:</span> {d.tindak_lanjut}</p>
                            {d.catatan && <p className="text-xs text-indigo-600 italic"><span className="font-bold text-slate-400 uppercase text-[9px] not-italic">Catatan:</span> {d.catatan}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold ${
                            d.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {d.status === 'Selesai' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            {d.status}
                          </span>
                          <p className="text-[9px] text-slate-400 mt-1 font-medium">BK: {d.guru_bk}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">Nama Siswa</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4 text-center">Total Pelanggaran</th>
                    <th className="px-6 py-4 text-center">Total Poin</th>
                    <th className="px-6 py-4">Status Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Memuat data pivot...</td>
                    </tr>
                  ) : getPivotData().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data untuk filter yang dipilih.</td>
                    </tr>
                  ) : (
                    getPivotData().map((d: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4">{index + 1}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{d.nama}</td>
                        <td className="px-6 py-4 text-slate-600">{d.kelas}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-black text-sm border border-blue-100">
                            {d.count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full font-black text-sm border ${
                            d.totalPoin >= 50 ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            d.totalPoin >= 25 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-slate-50 text-slate-700 border-slate-100'
                          }`}>
                            {d.totalPoin}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            d.lastStatus === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
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
        </div>
      </div>
    </div>
  );
}
