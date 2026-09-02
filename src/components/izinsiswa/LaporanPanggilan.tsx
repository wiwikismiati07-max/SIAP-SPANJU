import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { AlertTriangle, Download, Filter, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import TahunAjaranModal from '../common/TahunAjaranModal';

export default function LaporanPanggilan() {
  const [data, setData] = useState<{ siswa: any, totalIzin: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2025');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2026', '2025']);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedPeriode]);

  const handlePeriodeChange = (newPeriode: string) => {
    setSelectedPeriode(newPeriode);
    if (newPeriode !== 'ALL') {
      const year = parseInt(newPeriode, 10);
      if (!isNaN(year)) {
        const currentYear = new Date().getFullYear();
        if (year === currentYear) {
          setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
          setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
        } else {
          setStartDate(`${year}-01-01`);
          setEndDate(`${year}-12-31`);
        }
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let allIzin: any[] = [];
      let allSiswa: any[] = [];

      if (supabase) {
        // Fetch distinct periodes
        const { data: siswaPeriodeData } = await supabase.from('master_siswa').select('periode');
        if (siswaPeriodeData && siswaPeriodeData.length > 0) {
          const distinctPeriodes = Array.from(new Set(['2026', '2025', ...siswaPeriodeData.map(s => s.periode || '2025')]))
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
          setAvailablePeriodes(distinctPeriodes);
        }

        let query = supabase.from('izin_siswa').select('*').eq('status', 'Disetujui');
        if (startDate) query = query.gte('tanggal_mulai', startDate);
        if (endDate) query = query.lte('tanggal_mulai', endDate);
        const { data: iData } = await query;
        
        let sQuery = supabase.from('master_siswa').select('*');
        if (selectedPeriode !== 'ALL') {
          sQuery = sQuery.eq('periode', selectedPeriode);
        }
        const { data: sData } = await sQuery;
        
        if (iData) allIzin = iData;
        if (sData) allSiswa = sData;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        allIzin = localData.filter((d: any) => {
          if (d.status !== 'Disetujui') return false;
          if (startDate && d.tanggal_mulai < startDate) return false;
          if (endDate && d.tanggal_mulai > endDate) return false;
          return true;
        });
        allSiswa = (JSON.parse(localStorage.getItem('sitelat_siswa') || '[]'))
          .filter((s: any) => selectedPeriode === 'ALL' || (s.periode || '2025') === selectedPeriode);
      }

      // Group by siswa_id
      const counts: Record<string, number> = {};
      allIzin.forEach(izin => {
        counts[izin.siswa_id] = (counts[izin.siswa_id] || 0) + 1;
      });

      // Filter > 5
      const panggilanList = Object.entries(counts)
        .filter(([siswa_id, count]) => {
          const studentExists = allSiswa.some(s => s.id === siswa_id);
          return count > 5 && studentExists;
        })
        .map(([siswa_id, count]) => {
          const siswa = allSiswa.find(s => s.id === siswa_id) || { id: siswa_id, nama: 'Unknown', kelas: '-' };
          return { siswa, totalIzin: count };
        })
        .sort((a, b) => b.totalIzin - a.totalIzin);

      setData(panggilanList);
    } catch (error) {
      console.error('Error fetching panggilan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (data.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Panggilan Orang Tua');

      const totalCols = 3;
      await addExcelHeaderAndLogos(worksheet, workbook, 'Laporan Panggilan Orang Tua', totalCols);

      // Table Headers
      const headerRow = worksheet.getRow(10);
      headerRow.values = ['NO', 'NAMA SISWA', 'KELAS', 'TOTAL IZIN'];
      
      // Data Rows
      data.forEach((item, index) => {
        worksheet.addRow([
          index + 1,
          item.siswa?.nama || '-',
          item.siswa?.kelas || '-',
          item.totalIzin
        ]);
      });

      applyColorfulTableStyle(worksheet, 10, data.length, 4); // 4 columns actually

      // Column Widths
      worksheet.columns = [
        { width: 5 },
        { width: 40 },
        { width: 15 },
        { width: 15 }
      ];

      // --- SIGNATURE SECTION ---
      const footerStartRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 12;
      const leftColStart = 1;
      const leftColEnd = 2;
      const rightColStart = 3;
      const rightColEnd = 4;

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

      // Right Signature (Guru BK)
      // We don't have idLocale here, I'll use a simple format or import it if needed
      // Actually lib/excelUtils might be better if I had more helpers, but let's just use native Intl or simple string
      const today = new Date();
      const formattedDate = `${today.getDate()} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][today.getMonth()]} ${today.getFullYear()}`;
      
      worksheet.mergeCells(footerStartRow, rightColStart, footerStartRow, rightColEnd);
      worksheet.getCell(footerStartRow, rightColStart).value = `Pasuruan, ${formattedDate}`;
      worksheet.getCell(footerStartRow, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, rightColStart, footerStartRow + 1, rightColEnd);
      worksheet.getCell(footerStartRow + 1, rightColStart).value = 'Kesiswaan';
      worksheet.getCell(footerStartRow + 1, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, rightColStart, footerStartRow + 6, rightColEnd);
      const bkName = worksheet.getCell(footerStartRow + 6, rightColStart);
      bkName.value = '........................................';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, rightColStart, footerStartRow + 7, rightColEnd);
      worksheet.getCell(footerStartRow + 7, rightColStart).value = 'NIP. ............................';
      worksheet.getCell(footerStartRow + 7, rightColStart).alignment = { horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Panggilan_Orang_Tua.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Gagal membuat file Excel');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Panggilan Orang Tua</h2>
          <p className="text-xs text-slate-500 mt-1">Daftar siswa dengan frekuensi izin lebih dari 5 kali</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Popup Periode Tahun Ajaran */}
          <TahunAjaranModal
            selectedPeriode={selectedPeriode}
            onChange={handlePeriodeChange}
            availablePeriodes={availablePeriodes}
            themeColor="rose"
            label="Periode Tahun Ajaran"
          />

          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            />
            <span className="text-slate-400 text-xs font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Download size={18} /> Download Excel
          </button>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 text-rose-800">
        <AlertTriangle className="shrink-0 mt-0.5" size={20} />
        <p className="text-sm">
          Daftar di bawah ini adalah siswa yang telah melakukan izin lebih dari 5 kali (status Disetujui). 
          Siswa-siswa ini direkomendasikan untuk pemanggilan orang tua.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Siswa</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-center">Total Izin Disetujui</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">Tidak ada siswa yang melebihi batas izin.</td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.siswa?.nama}</div>
                      <div className="text-xs text-slate-500">Kelas {item.siswa?.kelas}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold">
                        {item.totalIzin}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition-colors">
                        Buat Surat Panggilan
                      </button>
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
