import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Search, Filter, Calendar, CheckCircle2, Clock } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { TransaksiKasus } from '../../types/bkpedulisiswa';

export default function BKLaporan() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TransaksiKasus[]>([]);
  const [reportType, setReportType] = useState<'kasus' | 'tindak_lanjut'>('kasus');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
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
          .from('bk_transaksi_kasus')
          .select('*, siswa:master_siswa(*), kasus:bk_master_kasus(*), tindak_lanjuts:bk_tindak_lanjut(*)')
          .gte('tanggal', filter.startDate)
          .lte('tanggal', filter.endDate)
          .order('tanggal', { ascending: false });

        if (filter.status) query = query.eq('status', filter.status);
        
        const { data: fetchedData, error } = await query;
        if (error) throw error;

        let filtered = fetchedData || [];
        if (filter.kelas) {
          filtered = filtered.filter((d: any) => d.siswa?.kelas === filter.kelas || d.kelas === filter.kelas);
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType === 'kasus' ? 'Laporan Kasus' : 'Laporan Tindak Lanjut');

    const totalCols = reportType === 'kasus' ? 9 : 9;
    const title = reportType === 'kasus' ? 'LAPORAN KASUS SISWA' : 'LAPORAN TINDAK LANJUT KASUS';
    
    await addExcelHeaderAndLogos(worksheet, workbook, title, totalCols);

    // Table Headers
    let headers: string[] = [];
    if (reportType === 'kasus') {
      headers = ['NO', 'TANGGAL', 'KELAS', 'NAMA SISWA', 'KATEGORI KASUS', 'KRONOLOGI', 'GURU BK', 'WALI KELAS', 'STATUS'];
    } else {
      headers = ['NO', 'TANGGAL KASUS', 'NAMA SISWA', 'KELAS', 'KATEGORI KASUS', 'TANGGAL TL', 'TINDAK LANJUT', 'KETERANGAN', 'GURU BK'];
    }

    const headerRow = worksheet.getRow(10);
    headerRow.values = headers;

    let dataRowCount = 0;
    // Table Data
    if (reportType === 'kasus') {
      filteredData.forEach((d, index) => {
        worksheet.addRow([
          index + 1,
          d.tanggal,
          d.kelas || d.siswa?.kelas || '-',
          d.siswa?.nama || '-',
          d.kasus?.nama_kasus || d.kasus_kategori || '-',
          d.kronologi || '-',
          d.guru_bk || '-',
          d.wali_kelas || '-',
          d.status
        ]);
        dataRowCount++;
      });
    } else {
      let rowIndex = 1;
      filteredData.forEach((d) => {
        if (d.tindak_lanjuts && d.tindak_lanjuts.length > 0) {
          d.tindak_lanjuts.forEach((tl) => {
            worksheet.addRow([
              rowIndex++,
              d.tanggal,
              d.siswa?.nama || '-',
              d.kelas || d.siswa?.kelas || '-',
              d.kasus_kategori || '-',
              tl.tanggal,
              tl.tindak_lanjut,
              tl.keterangan || '-',
              d.guru_bk || '-'
            ]);
            dataRowCount++;
          });
        }
      });
    }

    applyColorfulTableStyle(worksheet, 10, dataRowCount, totalCols);

    // Column Widths
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 10;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 30;
    worksheet.getColumn(7).width = 20;
    worksheet.getColumn(8).width = 20;
    worksheet.getColumn(9).width = 15;

    // Footer
    const footerRow = 11 + dataRowCount + 2;
    
    worksheet.getCell(`B${footerRow}`).value = 'Mengetahui';
    worksheet.getCell(`G${footerRow}`).value = `Pasuruan, ${format(new Date(), 'd MMMM yyyy')}`;
    
    worksheet.getCell(`B${footerRow + 1}`).value = 'Kepala Sekolah';
    worksheet.getCell(`G${footerRow + 1}`).value = 'Guru BK';
    
    worksheet.getCell(`B${footerRow + 5}`).value = 'NUR FADILAH, S.Pd';
    worksheet.getCell(`B${footerRow + 5}`).font = { bold: true, underline: true };
    worksheet.getCell(`G${footerRow + 5}`).value = 'WIWIK ISMIATI, S.Pd';
    worksheet.getCell(`G${footerRow + 5}`).font = { bold: true, underline: true };
    
    worksheet.getCell(`B${footerRow + 6}`).value = 'NIP. 19860410 201001 2 030';
    worksheet.getCell(`G${footerRow + 6}`).value = 'NIP. 19831116 200904 2 003';

    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Laporan_${reportType === 'kasus' ? 'Kasus' : 'Tindak_Lanjut'}_${filter.startDate}_${filter.endDate}.xlsx`);
  };

  const handleUpdateStatus = async (id: string, newStatus: 'Proses' | 'Selesai') => {
    try {
      if (supabase) {
        const { error } = await supabase.from('bk_transaksi_kasus').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Digital Counseling</h2>
          <p className="text-sm text-slate-500">Rekapitulasi data kasus dan tindak lanjut siswa</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mr-2">
            <button 
              onClick={() => setReportType('kasus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportType === 'kasus' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Laporan Kasus
            </button>
            <button 
              onClick={() => setReportType('tindak_lanjut')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${reportType === 'tindak_lanjut' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tindak Lanjut
            </button>
          </div>
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mr-2">
            <button 
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tree
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Table
            </button>
          </div>
          <button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-pink-100 hover:bg-pink-700 transition-colors"
          >
            <Download size={18} />
            Download Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari Nama Siswa..." 
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-40">
          <select 
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
            value={filter.kelas}
            onChange={e => setFilter({...filter, kelas: e.target.value})}
          >
            <option value="">Semua Kelas</option>
            {KELAS_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="w-40">
          <select 
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
            value={filter.status}
            onChange={e => setFilter({...filter, status: e.target.value})}
          >
            <option value="">Semua Status</option>
            <option value="Proses">Proses</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            className="px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
            value={filter.startDate}
            onChange={e => setFilter({...filter, startDate: e.target.value})}
          />
          <span className="text-slate-400 font-bold">s/d</span>
          <input 
            type="date" 
            className="px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none"
            value={filter.endDate}
            onChange={e => setFilter({...filter, endDate: e.target.value})}
          />
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-[#8BA866] px-6 py-4">
            <h3 className="text-white font-bold">{reportType === 'kasus' ? 'Laporan Kasus Siswa' : 'Laporan Tindak Lanjut'}</h3>
          </div>
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 italic">Memuat data...</div>
            ) : filteredData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">Tidak ada data ditemukan.</div>
            ) : (
              filteredData.map((d) => (
                <div key={d.id} className="space-y-1 border-b border-slate-100 pb-2 last:border-0">
                  {/* Level 1: Nama Siswa */}
                  <div className="bg-[#D4E4BC] px-4 py-3 flex items-center gap-3">
                    <div className="w-5 h-5 bg-white/50 rounded flex items-center justify-center text-slate-600">
                      <span className="text-xs font-bold">-</span>
                    </div>
                    <span className="font-black text-slate-700 uppercase tracking-tight">{d.siswa?.nama}</span>
                    <span className="ml-auto text-[10px] font-bold bg-white/50 px-2 py-1 rounded text-slate-600">{d.tanggal}</span>
                  </div>
                  
                  {/* Level 2: Kelas & Kategori */}
                  <div className="ml-6 bg-[#E6F0D9] px-4 py-2 flex items-center gap-3">
                    <div className="w-5 h-5 bg-white/50 rounded flex items-center justify-center text-slate-600">
                      <span className="text-xs font-bold">-</span>
                    </div>
                    <span className="font-bold text-slate-700">Kelas {d.kelas || d.siswa?.kelas} • {d.kasus_kategori}</span>
                  </div>

                  {/* Level 3: Kronologi (if kasus) or Follow-ups (if tindak_lanjut) */}
                  {reportType === 'kasus' ? (
                    <div className="ml-12 px-4 py-3 flex items-start gap-3">
                      <div className="w-5 h-5 border border-slate-300 rounded flex items-center justify-center text-slate-600 mt-1 shrink-0">
                        <span className="text-[10px] font-bold">-</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 italic leading-relaxed">
                          {d.kronologi || 'Tidak ada kronologi yang dicatat.'}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                          <span>BK: {d.guru_bk}</span>
                          <span>Wali: {d.wali_kelas}</span>
                          <span className={d.status === 'Selesai' ? 'text-emerald-600' : 'text-amber-600'}>Status: {d.status}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-12 space-y-1">
                      {d.tindak_lanjuts && d.tindak_lanjuts.length > 0 ? (
                        d.tindak_lanjuts.map((tl, idx) => (
                          <div key={idx} className="px-4 py-2 flex items-start gap-3 border-l-2 border-slate-100 ml-2">
                            <div className="w-4 h-4 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 mt-1 shrink-0">
                              <CheckCircle2 size={10} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{tl.tanggal} - {tl.tindak_lanjut}</p>
                              <p className="text-sm text-slate-500 italic">{tl.keterangan}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-xs text-slate-400 italic ml-4">Belum ada tindak lanjut.</div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Kasus</th>
                  {reportType === 'tindak_lanjut' && <th className="px-6 py-4">Tanggal TL</th>}
                  <th className="px-6 py-4">{reportType === 'kasus' ? 'Kronologi' : 'Tindak Lanjut'}</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Memuat data laporan...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data ditemukan.</td>
                  </tr>
                ) : (
                  filteredData.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-sm">{d.siswa?.nama}</p>
                        <p className="text-xs text-slate-500">Kelas {d.kelas || d.siswa?.kelas} • {d.tanggal}</p>
                      </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{d.kasus?.nama_kasus || d.kasus_kategori}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">BK: {d.guru_bk}</p>
                    </td>
                      {reportType === 'tindak_lanjut' && (
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {d.tindak_lanjuts?.slice(0, 2).map((tl, i) => (
                              <p key={i} className="text-[10px] text-slate-500 truncate">{tl.tanggal}</p>
                            ))}
                            {(d.tindak_lanjuts?.length || 0) > 2 && <div className="h-[14px]" />}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 max-w-xs">
                        {reportType === 'kasus' ? (
                          <p className="text-xs text-slate-600 line-clamp-2">{d.kronologi}</p>
                        ) : (
                          <div className="space-y-1">
                            {d.tindak_lanjuts?.slice(0, 2).map((tl, i) => (
                              <p key={i} className="text-[10px] text-slate-500 truncate">• {tl.tindak_lanjut}</p>
                            ))}
                            {(d.tindak_lanjuts?.length || 0) > 2 && <p className="text-[10px] text-pink-500">+{d.tindak_lanjuts!.length - 2} lagi...</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          d.status === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {d.status === 'Proses' ? (
                            <button 
                              onClick={() => handleUpdateStatus(d.id, 'Selesai')}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Selesaikan"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUpdateStatus(d.id, 'Proses')}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Buka Lagi"
                            >
                              <Clock size={16} />
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
      )}
    </div>
  );
}
