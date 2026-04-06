import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Search, Filter, Calendar, CheckCircle2, Clock } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { TransaksiPelanggaran } from '../../types/bkpedulisiswa';

export default function BKLaporan() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TransaksiPelanggaran[]>([]);
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
          .select('*, siswa:siswa_id(nama, kelas), pelanggaran:pelanggaran_id(nama_pelanggaran, kategori, poin)')
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

  const handleDownloadExcel = async (type: 'all' | 'finished') => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Pelanggaran');

    // Fetch logo image
    let logoId;
    try {
      const response = await fetch('https://api.allorigins.win/raw?url=https://iili.io/KDFk4fI.png');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      logoId = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
    } catch (error) {
      console.error('Failed to load logo image:', error);
    }

    // Add Image to Worksheet
    if (logoId !== undefined) {
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 90, height: 90 }
      });
    }

    // Header text
    worksheet.mergeCells('B1:N1');
    worksheet.getCell('B1').value = 'PEMERINTAH KOTA PASURUAN';
    worksheet.getCell('B1').font = { bold: true, size: 14, name: 'Times New Roman' };
    worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B2:N2');
    worksheet.getCell('B2').value = 'SMP NEGERI 7';
    worksheet.getCell('B2').font = { bold: true, size: 16, name: 'Times New Roman' };
    worksheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B3:N3');
    worksheet.getCell('B3').value = 'Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139';
    worksheet.getCell('B3').font = { size: 11, name: 'Times New Roman' };
    worksheet.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B4:N4');
    worksheet.getCell('B4').value = 'Telepon (0343) 426845';
    worksheet.getCell('B4').font = { size: 11, name: 'Times New Roman' };
    worksheet.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B5:N5');
    worksheet.getCell('B5').value = 'Pos-el smp7pas@yahoo.co.id , Laman www.smpn7pasuruan.sch.id';
    worksheet.getCell('B5').font = { size: 11, name: 'Times New Roman' };
    worksheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };

    // Double border under header
    for (let i = 1; i <= 14; i++) {
      worksheet.getCell(6, i).border = {
        bottom: { style: 'double' },
        top: { style: 'thin' }
      };
    }

    // Report Title
    worksheet.mergeCells('B8:N8');
    worksheet.getCell('B8').value = 'Laporan Pelanggaran Siswa';
    worksheet.getCell('B8').font = { bold: true, size: 12, name: 'Times New Roman' };
    worksheet.getCell('B8').alignment = { horizontal: 'center', vertical: 'middle' };

    // Table Headers
    const headers = [
      'NO', 'TANGGAL', 'JAM', 'NAMA SISWA', 'KELAS', 
      'PELANGGARAN', 'KATEGORI', 'POIN', 'ALASAN', 
      'PENANGANAN', 'KONSEKUENSI', 'TINDAK LANJUT', 
      'WALI KELAS', 'GURU BK', 'STATUS'
    ];
    const headerRow = worksheet.getRow(10);
    headerRow.values = headers;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Table Data
    const exportData = data.filter(d => type === 'finished' ? d.status === 'Selesai' : true);
    
    exportData.forEach((d, index) => {
      const row = worksheet.addRow([
        index + 1,
        d.tanggal,
        d.jam,
        d.siswa?.nama || 'Unknown',
        d.siswa?.kelas || '-',
        d.pelanggaran?.nama_pelanggaran || '-',
        d.pelanggaran?.kategori || '-',
        d.pelanggaran?.poin || 0,
        d.alasan || '-',
        d.penanganan || '-',
        d.konsekuensi || '-',
        d.tindak_lanjut || '-',
        d.wali_kelas || '-',
        d.guru_bk || '-',
        d.status
      ]);
      
      const isAlt = index % 2 !== 0;
      
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri' };
        if (isAlt) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        }
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // Column Widths
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 12;
    worksheet.getColumn(3).width = 8;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 8;
    worksheet.getColumn(6).width = 25;
    worksheet.getColumn(7).width = 15;
    worksheet.getColumn(8).width = 8;
    worksheet.getColumn(9).width = 20;
    worksheet.getColumn(10).width = 20;
    worksheet.getColumn(11).width = 20;
    worksheet.getColumn(12).width = 20;
    worksheet.getColumn(13).width = 20;
    worksheet.getColumn(14).width = 20;
    worksheet.getColumn(15).width = 12;

    // Footer
    const lastRow = 11 + exportData.length + 2;
    
    worksheet.getCell(`B${lastRow}`).value = 'Mengetahui';
    worksheet.getCell(`B${lastRow}`).font = { name: 'Times New Roman' };
    worksheet.getCell(`L${lastRow}`).value = `Pasuruan, ${format(new Date(), 'd MMMM yyyy')}`;
    worksheet.getCell(`L${lastRow}`).font = { name: 'Times New Roman' };
    
    worksheet.getCell(`B${lastRow + 1}`).value = 'Kepala Sekolah';
    worksheet.getCell(`B${lastRow + 1}`).font = { name: 'Times New Roman' };
    worksheet.getCell(`L${lastRow + 1}`).value = 'Guru BK';
    worksheet.getCell(`L${lastRow + 1}`).font = { name: 'Times New Roman' };
    
    worksheet.getCell(`B${lastRow + 5}`).value = 'NUR FADILAH, S.Pd';
    worksheet.getCell(`B${lastRow + 5}`).font = { bold: true, underline: true, name: 'Times New Roman' };
    worksheet.getCell(`L${lastRow + 5}`).value = 'WIWIK ISMIATI, S.Pd';
    worksheet.getCell(`L${lastRow + 5}`).font = { bold: true, underline: true, name: 'Times New Roman' };
    
    worksheet.getCell(`B${lastRow + 6}`).value = 'NIP. 19860410 201001 2 030';
    worksheet.getCell(`B${lastRow + 6}`).font = { name: 'Times New Roman' };
    worksheet.getCell(`L${lastRow + 6}`).value = 'NIP. 19831116 200904 2 003';
    worksheet.getCell(`L${lastRow + 6}`).font = { name: 'Times New Roman' };

    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Laporan_Pelanggaran_${type}_${filter.startDate}_to_${filter.endDate}.xlsx`);
  };

  const handleUpdateStatus = async (id: string, newStatus: 'Proses' | 'Selesai') => {
    try {
      if (supabase) {
        const { error } = await supabase.from('transaksi_pelanggaran').update({ status: newStatus }).eq('id', id);
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
          <h2 className="text-2xl font-bold text-slate-800">Laporan Pelanggaran Siswa</h2>
          <p className="text-sm text-slate-500">Rekapitulasi data pelanggaran dan tindak lanjut</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleDownloadExcel('all')}
            className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-bold border border-pink-100 hover:bg-pink-100 transition-colors"
          >
            <Download size={18} />
            Download Semua
          </button>
          <button 
            onClick={() => handleDownloadExcel('finished')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
          >
            <Download size={18} />
            Download Selesai
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
          <input 
            type="date" 
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
            value={filter.startDate}
            onChange={e => setFilter({...filter, startDate: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
          <input 
            type="date" 
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
            value={filter.endDate}
            onChange={e => setFilter({...filter, endDate: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kelas</label>
          <select 
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
            value={filter.kelas}
            onChange={e => setFilter({...filter, kelas: e.target.value})}
          >
            <option value="">Semua Kelas</option>
            {KELAS_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
          <select 
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
            value={filter.status}
            onChange={e => setFilter({...filter, status: e.target.value})}
          >
            <option value="">Semua Status</option>
            <option value="Proses">Proses</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Siswa</th>
                <th className="px-6 py-4">Pelanggaran</th>
                <th className="px-6 py-4">Tindak Lanjut</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Memuat data laporan...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data ditemukan.</td>
                </tr>
              ) : (
                data.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{d.siswa?.nama}</p>
                      <p className="text-xs text-slate-500">Kelas {d.siswa?.kelas} • {d.tanggal}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{d.pelanggaran?.nama_pelanggaran}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{d.pelanggaran?.kategori} • {d.pelanggaran?.poin} Poin</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-600">{d.tindak_lanjut}</p>
                      <p className="text-[10px] text-slate-400 italic">BK: {d.guru_bk}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        d.status === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {d.status === 'Proses' ? (
                        <button 
                          onClick={() => handleUpdateStatus(d.id, 'Selesai')}
                          className="flex items-center gap-1 ml-auto px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Selesaikan
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUpdateStatus(d.id, 'Proses')}
                          className="flex items-center gap-1 ml-auto px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100 hover:bg-slate-100 transition-colors"
                        >
                          <Clock size={14} />
                          Buka Lagi
                        </button>
                      )}
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
