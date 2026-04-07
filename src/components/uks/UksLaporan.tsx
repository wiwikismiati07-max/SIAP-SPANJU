import React, { useState } from 'react';
import { FileText, Download, Calendar, Search, Filter, HeartPulse, Pill, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const LOGO_URL = "https://iili.io/KDFk4fI.png";

const UksLaporan: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: format(new Date(), 'yyyy-MM-01'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'kunjungan' | 'screening' | 'obat'>('kunjungan');

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (reportType === 'kunjungan') {
        const { data, error } = await supabase
          .from('uks_kunjungan')
          .select(`
            *,
            siswa:master_siswa(nama, kelas),
            keluhan:uks_keluhan(nama_keluhan),
            obat_digunakan:uks_kunjungan_obat(
              jumlah,
              obat:uks_obat(nama_obat, satuan)
            )
          `)
          .gte('tanggal', dateRange.from)
          .lte('tanggal', dateRange.to)
          .order('tanggal', { ascending: false });
        
        if (error) throw error;
        return data;
      } else if (reportType === 'screening') {
        const { data, error } = await supabase
          .from('uks_screening')
          .select('*, siswa:master_siswa(nama, kelas)')
          .gte('tanggal', dateRange.from)
          .lte('tanggal', dateRange.to)
          .order('tanggal', { ascending: false });
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('uks_kunjungan_obat')
          .select(`
            *,
            obat:uks_obat(nama_obat, satuan),
            kunjungan:uks_kunjungan(
              tanggal,
              siswa:master_siswa(nama, kelas)
            )
          `)
          .gte('kunjungan(tanggal)', dateRange.from)
          .lte('kunjungan(tanggal)', dateRange.to);
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    const data = await fetchReportData();
    if (!data || data.length === 0) {
      alert('Tidak ada data untuk rentang tanggal ini.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan UKS');

    // Add Logo
    try {
      const response = await fetch(LOGO_URL);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const imageId = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0.5, row: 0.5 },
        ext: { width: 60, height: 60 }
      });
    } catch (e) {
      console.error('Failed to load logo for excel', e);
    }

    // Header
    worksheet.mergeCells('B1:H1');
    worksheet.getCell('B1').value = 'PEMERINTAH KOTA PASURUAN';
    worksheet.getCell('B1').font = { size: 14, bold: true };
    worksheet.getCell('B1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('B2:H2');
    worksheet.getCell('B2').value = 'DINAS PENDIDIKAN DAN KEBUDAYAAN';
    worksheet.getCell('B2').font = { size: 16, bold: true };
    worksheet.getCell('B2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('B3:H3');
    worksheet.getCell('B3').value = 'SMP NEGERI 7 PASURUAN';
    worksheet.getCell('B3').font = { size: 18, bold: true };
    worksheet.getCell('B3').alignment = { horizontal: 'center' };

    worksheet.mergeCells('B4:H4');
    worksheet.getCell('B4').value = 'Jl. Ki Hajar Dewantara No. 27 Pasuruan, Telp. (0343) 421270';
    worksheet.getCell('B4').font = { size: 10, italic: true };
    worksheet.getCell('B4').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow([]);

    const title = reportType === 'kunjungan' ? 'LAPORAN KUNJUNGAN & PEMERIKSAAN SISWA' : 
                  reportType === 'screening' ? 'LAPORAN SCREENING KESEHATAN SISWA' : 
                  'LAPORAN PEMAKAIAN OBAT UKS';
    
    worksheet.mergeCells('A7:H7');
    worksheet.getCell('A7').value = title;
    worksheet.getCell('A7').font = { size: 14, bold: true, underline: true };
    worksheet.getCell('A7').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A8:H8');
    worksheet.getCell('A8').value = `Periode: ${format(new Date(dateRange.from), 'dd MMMM yyyy', { locale: id })} s/d ${format(new Date(dateRange.to), 'dd MMMM yyyy', { locale: id })}`;
    worksheet.getCell('A8').alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Table Header
    let headers: string[] = [];
    if (reportType === 'kunjungan') {
      headers = ['NO', 'TANGGAL', 'JAM', 'NAMA SISWA', 'KELAS', 'KELUHAN', 'PENANGANAN', 'OBAT'];
    } else if (reportType === 'screening') {
      headers = ['NO', 'TANGGAL', 'NAMA SISWA', 'KELAS', 'EVALUASI', 'CATATAN', 'PETUGAS'];
    } else {
      headers = ['NO', 'TANGGAL', 'NAMA SISWA', 'KELAS', 'NAMA OBAT', 'JUMLAH', 'SATUAN'];
    }

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Data Rows
    data.forEach((item: any, index: number) => {
      let rowData: any[] = [];
      if (reportType === 'kunjungan') {
        const obatStr = item.obat_digunakan?.map((o: any) => `${o.obat?.nama_obat} (${o.jumlah} ${o.obat?.satuan})`).join(', ') || '-';
        rowData = [
          index + 1,
          format(new Date(item.tanggal), 'dd/MM/yyyy'),
          item.jam,
          item.siswa?.nama,
          item.siswa?.kelas,
          item.keluhan?.nama_keluhan,
          item.penanganan,
          obatStr
        ];
      } else if (reportType === 'screening') {
        rowData = [
          index + 1,
          format(new Date(item.tanggal), 'dd/MM/yyyy'),
          item.siswa?.nama,
          item.siswa?.kelas,
          item.evaluasi,
          item.catatan,
          item.petugas
        ];
      } else {
        rowData = [
          index + 1,
          format(new Date(item.kunjungan?.tanggal), 'dd/MM/yyyy'),
          item.kunjungan?.siswa?.nama,
          item.kunjungan?.siswa?.kelas,
          item.obat?.nama_obat,
          item.jumlah,
          item.obat?.satuan
        ];
      }
      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Signature
    const lastRow = worksheet.lastRow?.number || 0;
    worksheet.mergeCells(`F${lastRow + 1}:H${lastRow + 1}`);
    worksheet.getCell(`F${lastRow + 1}`).value = `Pasuruan, ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`;
    worksheet.getCell(`F${lastRow + 1}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`F${lastRow + 2}:H${lastRow + 2}`);
    worksheet.getCell(`F${lastRow + 2}`).value = 'Kepala SMP Negeri 7 Pasuruan';
    worksheet.getCell(`F${lastRow + 2}`).alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);

    worksheet.mergeCells(`F${lastRow + 6}:H${lastRow + 6}`);
    worksheet.getCell(`F${lastRow + 6}`).value = '................................................';
    worksheet.getCell(`F${lastRow + 6}`).font = { bold: true };
    worksheet.getCell(`F${lastRow + 6}`).alignment = { horizontal: 'center' };

    worksheet.mergeCells(`F${lastRow + 7}:H${lastRow + 7}`);
    worksheet.getCell(`F${lastRow + 7}`).value = 'NIP. ........................................';
    worksheet.getCell(`F${lastRow + 7}`).alignment = { horizontal: 'center' };

    // Column Widths
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(4).width = 30;
    if (reportType === 'kunjungan') {
      worksheet.getColumn(8).width = 40;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Laporan_UKS_${reportType}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Laporan & Rekapitulasi</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Ekspor data kesehatan siswa ke format Excel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Report Type Selection */}
          <div className="lg:col-span-1 space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Jenis Laporan</label>
            <div className="space-y-3">
              {[
                { id: 'kunjungan', label: 'Siswa Sakit / Kunjungan', icon: ClipboardList, color: 'rose' },
                { id: 'screening', label: 'Screening Kesehatan', icon: HeartPulse, color: 'emerald' },
                { id: 'obat', label: 'Pemakaian Obat', icon: Pill, color: 'amber' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id as any)}
                  className={`w-full p-6 rounded-3xl flex items-center gap-4 transition-all duration-300 border-2 ${
                    reportType === type.id 
                      ? `bg-${type.color}-50 border-${type.color}-200 text-${type.color}-700` 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    reportType === type.id ? `bg-${type.color}-600 text-white` : 'bg-slate-50 text-slate-400'
                  }`}>
                    <type.icon size={20} />
                  </div>
                  <span className="font-black text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter & Export */}
          <div className="lg:col-span-2 bg-slate-50 p-10 rounded-[40px] border border-slate-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Dari Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="w-full pl-14 pr-8 py-5 bg-white border-2 border-transparent rounded-3xl focus:border-rose-500 outline-none transition-all duration-300 font-bold text-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Sampai Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="w-full pl-14 pr-8 py-5 bg-white border-2 border-transparent rounded-3xl focus:border-rose-500 outline-none transition-all duration-300 font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={exportToExcel}
                disabled={loading}
                className="w-full py-8 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-[32px] font-black flex items-center justify-center gap-4 transition-all duration-300 shadow-xl shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Download size={28} />
                    Download Laporan Excel
                  </>
                )}
              </button>
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                Laporan akan diunduh dalam format .xlsx dengan kop surat resmi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Info */}
      <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100 flex items-start gap-6">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/20">
          <Filter size={24} />
        </div>
        <div>
          <h4 className="text-lg font-black text-blue-900 tracking-tight">Informasi Laporan</h4>
          <p className="text-sm text-blue-700/70 font-medium mt-1 leading-relaxed">
            Laporan yang dihasilkan mencakup seluruh data yang tersimpan di database Supabase sesuai dengan rentang tanggal yang dipilih. 
            Pastikan rentang tanggal sudah benar sebelum mengunduh. Data obat akan menampilkan rincian pemakaian per kunjungan siswa.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UksLaporan;
