import React, { useState, useEffect } from 'react';
import { Calendar, Search, Download, FileText, Filter, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AgamaAbsensi } from '../../types/keagamaan';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { id as idLocale } from 'date-fns/locale';

const KeagamaanLaporan: React.FC = () => {
  const [data, setData] = useState<AgamaAbsensi[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    kelas: '',
    siswaName: '',
    kegiatanId: ''
  });
  const [programs, setPrograms] = useState<any[]>([]);

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
    const { data: pData } = await supabase.from('agama_program').select('*').order('nama_kegiatan');
    setPrograms(pData || []);
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('agama_absensi')
        .select(`
          *,
          siswa:master_siswa(nama, kelas),
          kegiatan:agama_program(nama_kegiatan),
          wali_kelas:master_guru(nama_guru)
        `)
        .gte('tanggal', filters.startDate)
        .lte('tanggal', filters.endDate)
        .order('tanggal', { ascending: false })
        .order('jam', { ascending: false });

      if (filters.kelas) query = query.eq('kelas', filters.kelas);
      if (filters.kegiatanId) query = query.eq('kegiatan_id', filters.kegiatanId);
      
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
      const worksheet = workbook.addWorksheet('Laporan Keagamaan');

      // Set Column Widths
      worksheet.columns = [
        { width: 5 },   // No
        { width: 15 },  // Tanggal
        { width: 10 },  // Jam
        { width: 30 },  // Nama Siswa
        { width: 10 },  // Kelas
        { width: 30 },  // Kegiatan
        { width: 20 },  // Keterangan
        { width: 30 },  // Wali Kelas
      ];

      // --- HEADER SECTION ---
      try {
        const response = await fetch('https://iili.io/KDFk4fI.png');
        const buffer = await response.arrayBuffer();
        const logoId = workbook.addImage({
          buffer: buffer,
          extension: 'png',
        });
        worksheet.addImage(logoId, {
          tl: { col: 0.2, row: 0.2 },
          ext: { width: 80, height: 90 }
        });
      } catch (e) {
        console.error('Failed to load logo:', e);
      }

      const headerRows = [
        ['PEMERINTAH KOTA PASURUAN'],
        ['SMP NEGERI 7'],
        ['Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139'],
        ['Telepon (0343) 426845'],
        ['Pos-el smp7pas@yahoo.co.id, Laman www.smpn7pasuruan.sch.id']
      ];

      headerRows.forEach((text, i) => {
        const row = worksheet.getRow(i + 1);
        row.getCell(4).value = text[0];
        worksheet.mergeCells(i + 1, 4, i + 1, 8);
        const cell = row.getCell(4);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { 
          name: 'Arial', 
          bold: i === 1, 
          size: i === 1 ? 16 : 11 
        };
      });

      // Separator Line
      worksheet.getRow(6).height = 5;
      worksheet.mergeCells(6, 1, 6, 8);
      worksheet.getRow(6).getCell(1).border = { bottom: { style: 'double', color: { argb: 'FF000000' } } };

      // Title
      worksheet.mergeCells(8, 1, 8, 8);
      const titleCell = worksheet.getCell(8, 1);
      titleCell.value = 'Laporan Kegiatan Keagamaan Siswa';
      titleCell.font = { name: 'Arial', bold: true, size: 20 };
      titleCell.alignment = { horizontal: 'center' };

      // --- TABLE SECTION ---
      const headerRow = worksheet.getRow(10);
      const headers = ['NO', 'TANGGAL', 'JAM', 'NAMA SISWA', 'KELAS', 'KEGIATAN', 'KETERANGAN', 'WALI KELAS'];
      
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' }
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Data Rows
      data.forEach((item, index) => {
        const row = worksheet.getRow(11 + index);
        const values = [
          index + 1,
          format(new Date(item.tanggal), 'dd/MM/yyyy'),
          item.jam,
          item.siswa?.nama || '-',
          item.siswa?.kelas || '-',
          item.kegiatan?.nama_kegiatan || '-',
          item.alasan || '-',
          item.wali_kelas?.nama_guru || '-'
        ];

        values.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v;
          cell.alignment = { horizontal: i === 0 || i === 2 || i === 4 ? 'center' : 'left', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

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
      worksheet.getCell(footerStartRow + 1, 6).value = 'Guru Agama';
      worksheet.getCell(footerStartRow + 1, 6).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, 6, footerStartRow + 6, 8);
      const bkName = worksheet.getCell(footerStartRow + 6, 6);
      bkName.value = 'WIWIK ISMIATI, S.Pd';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, 6, footerStartRow + 7, 8);
      worksheet.getCell(footerStartRow + 7, 6).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(footerStartRow + 7, 6).alignment = { horizontal: 'center' };

      // Generate and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Keagamaan_${filters.startDate}_sd_${filters.endDate}.xlsx`);

    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Gagal mengekspor Excel');
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Filter Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Filter size={24} className="text-emerald-600" />
            Filter Laporan
          </h3>
          <button
            onClick={downloadExcel}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
          >
            <Download size={18} /> Download Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dari Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-slate-700"
                value={filters.startDate}
                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sampai Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-slate-700"
                value={filters.endDate}
                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pilih Kelas</label>
            <select
              className="w-full px-4 py-3 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
              value={filters.kelas}
              onChange={e => setFilters({ ...filters, kelas: e.target.value })}
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nama Siswa</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari nama..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-slate-700"
                value={filters.siswaName}
                onChange={e => setFilters({ ...filters, siswaName: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={fetchReport}
            className="px-12 py-4 bg-slate-800 text-white rounded-2xl font-black hover:bg-slate-900 shadow-xl shadow-slate-200 transition-all"
          >
            Tampilkan Laporan
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">Hasil Laporan</h3>
          <span className="px-4 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase">
            {data.length} Data Ditemukan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Siswa</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kegiatan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keterangan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wali Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 italic">Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 italic">Tidak ada data yang sesuai filter.</td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5 text-slate-400 font-bold">{index + 1}</td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-700">{item.siswa?.nama}</p>
                      <p className="text-xs text-slate-400">Kelas {item.siswa?.kelas}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">
                        {item.kegiatan?.nama_kegiatan}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-600">{format(new Date(item.tanggal), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-slate-400">{item.jam}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        item.alasan === 'Hadir' ? 'bg-emerald-50 text-emerald-600' :
                        item.alasan === 'Haid' ? 'bg-rose-50 text-rose-600' :
                        item.alasan === 'Alpa' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {item.alasan}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-500 text-sm">{item.wali_kelas?.nama_guru}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KeagamaanLaporan;
