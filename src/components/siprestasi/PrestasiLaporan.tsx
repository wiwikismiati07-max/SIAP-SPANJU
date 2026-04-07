import React, { useState } from 'react';
import { Calendar, Search, Download, FileText, Filter, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
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
        .select('*, siswa:master_siswa(nama), wali_kelas:wali_kelas_id(nama_guru)')
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

  const downloadExcel = () => {
    if (reportData.length === 0) {
      alert('Tidak ada data untuk diunduh. Silakan klik Tampilkan Laporan terlebih dahulu.');
      return;
    }

    const worksheetData = reportData.map((item, index) => ({
      'No': index + 1,
      'Tanggal': format(new Date(item.tanggal), 'dd/MM/yyyy'),
      'Jam': item.jam,
      'Nama Siswa': item.siswa?.nama,
      'Kelas': item.kelas,
      'Jenis Prestasi': item.jenis_prestasi,
      'Nama Lomba': item.nama_lomba,
      'Juara/Peringkat': item.juara,
      'Tingkat': item.tingkat,
      'Wali Kelas': item.wali_kelas?.nama_guru,
      'Guru BK': item.guru_bk,
      'Bukti Sertifikat': item.bukti_url || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Prestasi');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Laporan_Prestasi_${dateRange.from}_to_${dateRange.to}.xlsx`);
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
