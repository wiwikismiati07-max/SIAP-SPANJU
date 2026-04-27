import React, { useState, useEffect } from 'react';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
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
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [dateRange, reportType]);

  const loadPreview = async () => {
    setPreviewLoading(true);
    const data = await fetchReportData();
    setPreviewData(data || []);
    setPreviewLoading(false);
  };

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

    const totalCols = reportType === 'kunjungan' ? 8 : 7;
    const title = reportType === 'kunjungan' ? 'LAPORAN KUNJUNGAN & PEMERIKSAAN SISWA' : 
                  reportType === 'screening' ? 'LAPORAN SCREENING KESEHATAN SISWA' : 
                  'LAPORAN PEMAKAIAN OBAT UKS';
    
    await addExcelHeaderAndLogos(worksheet, workbook, title, totalCols);

    // Subtitle for period
    worksheet.mergeCells(`A9:${String.fromCharCode(64 + totalCols)}9`);
    const subTitleCell = worksheet.getCell('A9');
    subTitleCell.value = `Periode: ${format(new Date(dateRange.from), 'dd MMMM yyyy', { locale: id })} s/d ${format(new Date(dateRange.to), 'dd MMMM yyyy', { locale: id })}`;
    subTitleCell.alignment = { horizontal: 'center' };

    // Table Header
    const headerRow = worksheet.getRow(11);
    let headers: string[] = [];
    if (reportType === 'kunjungan') {
      headers = ['NO', 'TANGGAL', 'JAM', 'NAMA SISWA', 'KELAS', 'KELUHAN', 'PENANGANAN', 'OBAT'];
    } else if (reportType === 'screening') {
      headers = ['NO', 'TANGGAL', 'NAMA SISWA', 'KELAS', 'EVALUASI', 'CATATAN', 'PETUGAS'];
    } else {
      headers = ['NO', 'TANGGAL', 'NAMA SISWA', 'KELAS', 'NAMA OBAT', 'JUMLAH', 'SATUAN'];
    }
    headerRow.values = headers;

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
      worksheet.addRow(rowData);
    });

    applyColorfulTableStyle(worksheet, 11, data.length, totalCols);

    // Signature
    const footerStartRow = 12 + data.length + 3;
    const leftColStart = 2;
    const leftColEnd = 3;
    const rightColStart = totalCols - 1;
    const rightColEnd = totalCols;

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

    // Right Signature (Petugas UKS)
    worksheet.mergeCells(footerStartRow, rightColStart, footerStartRow, rightColEnd);
    worksheet.getCell(footerStartRow, rightColStart).value = `Pasuruan, ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`;
    worksheet.getCell(footerStartRow, rightColStart).alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 1, rightColStart, footerStartRow + 1, rightColEnd);
    worksheet.getCell(footerStartRow + 1, rightColStart).value = 'Petugas UKS';
    worksheet.getCell(footerStartRow + 1, rightColStart).alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 6, rightColStart, footerStartRow + 6, rightColEnd);
    const petugasName = worksheet.getCell(footerStartRow + 6, rightColStart);
    petugasName.value = '................................................';
    petugasName.font = { bold: true, underline: true };
    petugasName.alignment = { horizontal: 'center' };

    worksheet.mergeCells(footerStartRow + 7, rightColStart, footerStartRow + 7, rightColEnd);
    worksheet.getCell(footerStartRow + 7, rightColStart).value = 'NIP. ........................................';
    worksheet.getCell(footerStartRow + 7, rightColStart).alignment = { horizontal: 'center' };

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

      {/* Preview Table */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Pratinjau Laporan</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">Menampilkan data terbaru berdasarkan filter</p>
            </div>
          </div>
          <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
            Total: {previewData.length} Data
          </span>
        </div>

        <div className="overflow-hidden border border-slate-100 rounded-[32px]">
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-4">No</th>
                  <th className="px-8 py-4">Tanggal</th>
                  <th className="px-8 py-4">Nama Siswa</th>
                  <th className="px-8 py-4">Kelas</th>
                  <th className="px-8 py-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {previewLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : previewData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-20 text-slate-400 italic">Tidak ada data untuk periode ini.</td>
                  </tr>
                ) : (
                  previewData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 text-sm font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-8 py-4 text-sm font-bold text-slate-600">
                        {format(new Date(reportType === 'obat' ? item.kunjungan?.tanggal : item.tanggal), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-8 py-4 text-sm font-black text-slate-800 uppercase">
                        {reportType === 'obat' ? item.kunjungan?.siswa?.nama : item.siswa?.nama}
                      </td>
                      <td className="px-8 py-4 text-sm font-bold text-slate-500">
                        {reportType === 'obat' ? item.kunjungan?.siswa?.kelas : item.siswa?.kelas}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-600">
                        {reportType === 'kunjungan' ? item.keluhan?.nama_keluhan : 
                         reportType === 'screening' ? item.evaluasi : 
                         item.obat?.nama_obat}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
