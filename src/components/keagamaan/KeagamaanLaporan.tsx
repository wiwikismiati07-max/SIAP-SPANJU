import React, { useState, useEffect, useMemo } from 'react';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import { Download, BarChart3, AlertCircle, X } from 'lucide-react';
import { supabase, fetchAllSiswa, normalizeKelasKey } from '../../lib/supabase';
import { AgamaAbsensi } from '../../types/keagamaan';
import { format, parseISO } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { id as idLocale } from 'date-fns/locale';
import TahunAjaranModal from '../common/TahunAjaranModal';

interface MonthlyClassRecapRow {
  monthKey: string;
  monthLabel: string;
  kelas: string;
  total: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  haid: number;
  lainnya: number;
  tidakHadir: number;
  persenHadir: number;
}

const KeagamaanLaporan: React.FC<{ user?: any }> = () => {
  const [rawData, setRawData] = useState<AgamaAbsensi[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2026');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2026', '2025']);
  const [selectedRecapMonth, setSelectedRecapMonth] = useState<string>('ALL');
  const [recapViewMode, setRecapViewMode] = useState<'monthly_class' | 'total_class'>('monthly_class');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setNotice(null);

      const fetchAllAbsensi = async () => {
        const rows: any[] = [];
        const pageSize = 1000;
        let page = 0;

        while (page < 30) {
          const { data: pageData, error } = await supabase!
            .from('agama_absensi')
            .select('*')
            .order('tanggal', { ascending: false })
            .order('jam', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;
          if (!pageData || pageData.length === 0) break;

          rows.push(...pageData);
          if (pageData.length < pageSize) break;
          page++;
        }

        return rows;
      };

      const [allSiswaRaw, progRes, guruRes, rData] = await Promise.all([
        fetchAllSiswa(),
        supabase.from('agama_program').select('id, nama_kegiatan'),
        supabase.from('master_guru').select('id, nama_guru'),
        fetchAllAbsensi()
      ]);

      const allSiswa: any[] = (allSiswaRaw || []).filter((s: any) => !String(s.id || '').startsWith('pad-'));
      const allPrograms: any[] = progRes.data ? progRes.data : [];
      const allGuru: any[] = guruRes.data ? guruRes.data : [];

      if (allSiswa.length > 0) {
        const distinctPeriodes = Array.from(
          new Set(['2026', '2025', ...allSiswa.map((s) => s.periode || '2026')])
        )
          .filter(Boolean)
          .sort((a, b) => b.localeCompare(a));
        setAvailablePeriodes(distinctPeriodes);
      }

      const siswaMap = new Map<string, any>();
      allSiswa.forEach(s => {
        if (s.id) siswaMap.set(String(s.id), s);
      });

      const progMap = new Map<string, any>();
      allPrograms.forEach(p => {
        if (p.id) progMap.set(String(p.id), p);
      });

      const guruMap = new Map<string, any>();
      allGuru.forEach(g => {
        if (g.id) guruMap.set(String(g.id), g);
      });

      const joined = (rData || []).map(item => {
        const s = siswaMap.get(String(item.siswa_id)) || item.siswa;
        const p = progMap.get(String(item.kegiatan_id)) || item.kegiatan;
        const g = guruMap.get(String(item.wali_kelas_id)) || item.wali_kelas;
        return {
          ...item,
          siswa: s
            ? { ...s, kelas: normalizeKelasKey(s.kelas || '') }
            : { nama: 'Unknown', kelas: '-', periode: '2026' },
          kegiatan: p || { nama_kegiatan: 'Kegiatan Keagamaan' },
          wali_kelas: g || { nama_guru: '-' }
        };
      });

      setRawData(joined);
      setSelectedRecapMonth('ALL');
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodeFilteredData = useMemo(() => {
    if (selectedPeriode === 'ALL') return rawData;
    return rawData.filter((d) => {
      const p = String(d.siswa?.periode || '2026').replace(/^Periode\s*/i, '').trim() || '2026';
      return p === selectedPeriode;
    });
  }, [rawData, selectedPeriode]);

  const data = useMemo(() => {
    if (selectedRecapMonth === 'ALL') return periodeFilteredData;
    return periodeFilteredData.filter(
      (item) => String(item.tanggal || '').slice(0, 7) === selectedRecapMonth
    );
  }, [periodeFilteredData, selectedRecapMonth]);

  // Compute monthly per-class aggregation from currently loaded report data
  const {
    monthlyClassRows,
    availableRecapMonths,
    filteredMonthlyRows,
    totalPerClassRows,
    overallSummary,
    hasLainnya
  } = useMemo(() => {
    const map = new Map<string, MonthlyClassRecapRow>();
    const monthsMap = new Map<string, string>();
    let anyLainnya = false;

    const targetYears =
      selectedPeriode !== 'ALL' && /^\d{4}$/.test(selectedPeriode)
        ? [selectedPeriode]
        : Array.from(
            new Set([
              String(new Date().getFullYear()),
              ...periodeFilteredData
                .map((d) => String(d.tanggal || '').slice(0, 4))
                .filter((y) => /^\d{4}$/.test(y))
            ])
          ).sort();

    // Selalu tampilkan lengkap 12 bulan (Januari sampai Desember) pada dropdown bulan
    targetYears.forEach((yr) => {
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        const key = `${yr}-${mm}`;
        let label = key;
        try {
          label = format(parseISO(`${key}-01`), 'MMMM yyyy', { locale: idLocale });
        } catch {
          label = key;
        }
        monthsMap.set(key, label);
      }
    });

    periodeFilteredData.forEach((item) => {
      const rawDate = String(item.tanggal || '').slice(0, 10);
      const monthKey = rawDate.length >= 7 ? rawDate.slice(0, 7) : '0000-00';
      let monthLabel = monthKey;
      if (/^\d{4}-\d{2}$/.test(monthKey)) {
        try {
          monthLabel = format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: idLocale });
        } catch {
          monthLabel = monthKey;
        }
      }
      monthsMap.set(monthKey, monthLabel);

      const kelas = item.siswa?.kelas && item.siswa.kelas !== '-' ? normalizeKelasKey(item.siswa.kelas) : 'Tanpa Kelas';
      const key = `${monthKey}__${kelas}`;

      if (!map.has(key)) {
        map.set(key, {
          monthKey,
          monthLabel,
          kelas,
          total: 0,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          haid: 0,
          lainnya: 0,
          tidakHadir: 0,
          persenHadir: 0
        });
      }

      const row = map.get(key)!;
      const reason = String(item.alasan || 'Hadir').trim();
      const reasonLower = reason.toLowerCase();

      row.total += 1;
      if (reasonLower === 'hadir' || reason === '') {
        row.hadir += 1;
      } else if (reasonLower === 'sakit') {
        row.sakit += 1;
        row.tidakHadir += 1;
      } else if (reasonLower === 'izin') {
        row.izin += 1;
        row.tidakHadir += 1;
      } else if (reasonLower === 'alpa' || reasonLower === 'alpha') {
        row.alpa += 1;
        row.tidakHadir += 1;
      } else if (reasonLower === 'haid') {
        row.haid += 1;
        row.tidakHadir += 1;
      } else {
        row.lainnya += 1;
        row.tidakHadir += 1;
        anyLainnya = true;
      }
    });

    const allMonthly = Array.from(map.values())
      .map((r) => ({
        ...r,
        persenHadir: r.total > 0 ? (r.hadir / r.total) * 100 : 0
      }))
      .sort((a, b) => {
        const mDiff = a.monthKey.localeCompare(b.monthKey);
        if (mDiff !== 0) return mDiff;
        return a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
      });

    const monthsList = Array.from(monthsMap.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.key.localeCompare(b.key));

    const visibleMonthly =
      selectedRecapMonth === 'ALL'
        ? allMonthly
        : allMonthly.filter((r) => r.monthKey === selectedRecapMonth);

    // Aggregate across months per class
    const classMap = new Map<string, MonthlyClassRecapRow & { monthCount: number }>();
    visibleMonthly.forEach((r) => {
      if (!classMap.has(r.kelas)) {
        classMap.set(r.kelas, {
          monthKey: selectedRecapMonth,
          monthLabel: selectedRecapMonth === 'ALL' ? 'Semua Bulan' : r.monthLabel,
          kelas: r.kelas,
          total: 0,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          haid: 0,
          lainnya: 0,
          tidakHadir: 0,
          persenHadir: 0,
          monthCount: 0
        });
      }
      const agg = classMap.get(r.kelas)!;
      agg.total += r.total;
      agg.hadir += r.hadir;
      agg.sakit += r.sakit;
      agg.izin += r.izin;
      agg.alpa += r.alpa;
      agg.haid += r.haid;
      agg.lainnya += r.lainnya;
      agg.tidakHadir += r.tidakHadir;
      agg.monthCount += 1;
    });

    const totalByClass = Array.from(classMap.values())
      .map((c) => ({
        ...c,
        persenHadir: c.total > 0 ? (c.hadir / c.total) * 100 : 0
      }))
      .sort((a, b) => a.kelas.localeCompare(b.kelas, undefined, { numeric: true }));

    const grand = visibleMonthly.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.hadir += r.hadir;
        acc.sakit += r.sakit;
        acc.izin += r.izin;
        acc.alpa += r.alpa;
        acc.haid += r.haid;
        acc.lainnya += r.lainnya;
        acc.tidakHadir += r.tidakHadir;
        return acc;
      },
      { total: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0, haid: 0, lainnya: 0, tidakHadir: 0 }
    );

    return {
      monthlyClassRows: allMonthly,
      availableRecapMonths: monthsList,
      filteredMonthlyRows: visibleMonthly,
      totalPerClassRows: totalByClass,
      overallSummary: {
        ...grand,
        persenHadir: grand.total > 0 ? (grand.hadir / grand.total) * 100 : 0
      },
      hasLainnya: anyLainnya
    };
  }, [periodeFilteredData, selectedRecapMonth, selectedPeriode]);

  const downloadExcel = async () => {
    if (data.length === 0) {
      setNotice('Tidak ada data untuk diunduh.');
      return;
    }

    setNotice(null);
    setLoading(true);
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

      const totalCols = 8;
      await addExcelHeaderAndLogos(worksheet, workbook, 'Laporan Kegiatan Keagamaan Siswa', totalCols);

      // --- TABLE SECTION ---
      const headerRow = worksheet.getRow(10);
      const headers = ['NO', 'TANGGAL', 'JAM', 'NAMA SISWA', 'KELAS', 'KEGIATAN', 'KETERANGAN', 'WALI KELAS'];
      
      headerRow.values = headers;

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
        });
      });

      applyColorfulTableStyle(worksheet, 10, data.length, totalCols);

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
      bkName.value = '........................................';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, 6, footerStartRow + 7, 8);
      worksheet.getCell(footerStartRow + 7, 6).value = 'NIP. ............................';
      worksheet.getCell(footerStartRow + 7, 6).alignment = { horizontal: 'center' };

      // --- SHEET 2: REKAP BULANAN PER KELAS ---
      const recapSheet = workbook.addWorksheet('Rekap Bulanan Per Kelas');
      recapSheet.columns = [
        { width: 6 },  // No
        { width: 20 }, // Bulan
        { width: 12 }, // Kelas
        { width: 15 }, // Total Presensi
        { width: 12 }, // Hadir
        { width: 12 }, // Sakit
        { width: 12 }, // Izin
        { width: 12 }, // Alpa
        { width: 12 }, // Haid
        { width: 15 }, // Tidak Hadir
        { width: 16 }  // % Kehadiran
      ];

      await addExcelHeaderAndLogos(
        recapSheet,
        workbook,
        'Rekap Bulanan Presensi Kegiatan Keagamaan Per Kelas',
        11
      );

      const recapHeaderRow = recapSheet.getRow(10);
      recapHeaderRow.values = [
        'NO',
        'BULAN',
        'KELAS',
        'TOTAL PRESENSI',
        'HADIR (H)',
        'SAKIT (S)',
        'IZIN (I)',
        'ALPA (A)',
        'HAID',
        'TIDAK HADIR',
        '% KEHADIRAN'
      ];

      filteredMonthlyRows.forEach((rowItem, idx) => {
        const r = recapSheet.getRow(11 + idx);
        const vals = [
          idx + 1,
          rowItem.monthLabel,
          rowItem.kelas,
          rowItem.total,
          rowItem.hadir,
          rowItem.sakit,
          rowItem.izin,
          rowItem.alpa,
          rowItem.haid,
          rowItem.tidakHadir,
          `${rowItem.persenHadir.toFixed(1)}%`
        ];
        vals.forEach((v, colIdx) => {
          const cell = r.getCell(colIdx + 1);
          cell.value = v;
          cell.alignment = { horizontal: colIdx === 1 ? 'left' : 'center', vertical: 'middle' };
        });
      });

      applyColorfulTableStyle(recapSheet, 10, filteredMonthlyRows.length, 11);

      // Generate and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Keagamaan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error('Excel Export Error:', error);
      setNotice('Gagal mengekspor Excel. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {notice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-amber-900 text-sm font-bold">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 text-amber-500 hover:text-amber-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Monthly Per-Class Summary Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <BarChart3 size={22} className="text-emerald-600" />
              Rekap Bulanan Presensi Kegiatan Keagamaan Per Kelas
            </h3>
            <p className="text-xs text-slate-500">
              Ringkasan total presensi (Hadir, Sakit, Izin, Alpa, Haid) dan persentase kehadiran per kelas.
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-2.5 shrink-0">
            <div className="flex flex-col items-start gap-2">
              {/* View Mode Toggle */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRecapViewMode('monthly_class')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    recapViewMode === 'monthly_class'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Per Bulan & Kelas
                </button>
                <button
                  type="button"
                  onClick={() => setRecapViewMode('total_class')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    recapViewMode === 'total_class'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Total Per Kelas
                </button>
              </div>

              {/* Periode Tahun Ajaran */}
              <TahunAjaranModal
                selectedPeriode={selectedPeriode}
                onChange={(newPeriode) => {
                  setSelectedPeriode(newPeriode);
                  setSelectedRecapMonth('ALL');
                }}
                availablePeriodes={availablePeriodes}
                themeColor="emerald"
                label="Periode Tahun Ajaran"
              />
            </div>

            {/* Month Filter */}
            <select
              aria-label="Filter Bulan Rekap"
              value={selectedRecapMonth}
              onChange={(e) => setSelectedRecapMonth(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">Semua Bulan ({availableRecapMonths.length})</option>
              {availableRecapMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={downloadExcel}
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={16} /> {loading ? 'Memproses...' : 'Download Excel'}
            </button>
          </div>
        </div>

        {/* Overall Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-100 border-b border-slate-100">
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Presensi</p>
            <p className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
              {overallSummary.total.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Hadir (H)</p>
            <p className="text-xl font-black text-emerald-700 tabular-nums mt-0.5">
              {overallSummary.hadir.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Sakit (S)</p>
            <p className="text-xl font-black text-amber-700 tabular-nums mt-0.5">
              {overallSummary.sakit.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Izin (I)</p>
            <p className="text-xl font-black text-blue-700 tabular-nums mt-0.5">
              {overallSummary.izin.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alpa (A)</p>
            <p className="text-xl font-black text-slate-700 tabular-nums mt-0.5">
              {overallSummary.alpa.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Haid</p>
            <p className="text-xl font-black text-rose-700 tabular-nums mt-0.5">
              {overallSummary.haid.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 col-span-2 sm:col-span-4 lg:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">% Kehadiran</p>
            <p className="text-xl font-black text-emerald-700 tabular-nums mt-0.5">
              {overallSummary.persenHadir.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Recap Table */}
        <div className="overflow-x-auto rounded-b-[2rem]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">No</th>
                {recapViewMode === 'monthly_class' ? (
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Bulan</th>
                ) : (
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Jml Bulan</th>
                )}
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Kelas</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Total</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-emerald-600 uppercase tracking-wider text-right">Hadir</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-amber-600 uppercase tracking-wider text-right">Sakit</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-blue-600 uppercase tracking-wider text-right">Izin</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Alpa</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-rose-600 uppercase tracking-wider text-right">Haid</th>
                {hasLainnya && (
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Lainnya</th>
                )}
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Tidak Hadir</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-emerald-700 uppercase tracking-wider text-right">% Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={hasLainnya ? 12 : 11} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                    Menghitung rekap bulanan per kelas...
                  </td>
                </tr>
              ) : (recapViewMode === 'monthly_class' ? filteredMonthlyRows : totalPerClassRows).length === 0 ? (
                <tr>
                  <td colSpan={hasLainnya ? 12 : 11} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                    Belum ada data presensi keagamaan pada bulan dan periode tahun ajaran yang dipilih.
                  </td>
                </tr>
              ) : (
                (recapViewMode === 'monthly_class' ? filteredMonthlyRows : totalPerClassRows).map((row: any, idx) => (
                  <tr
                    key={`${row.monthKey}-${row.kelas}`}
                    className="hover:bg-slate-50/70 transition-colors text-sm"
                  >
                    <td className="px-5 py-3 text-slate-400 font-bold tabular-nums">{idx + 1}</td>
                    {recapViewMode === 'monthly_class' ? (
                      <td className="px-5 py-3 font-bold text-slate-800 whitespace-nowrap">{row.monthLabel}</td>
                    ) : (
                      <td className="px-5 py-3 font-semibold text-slate-600 text-center tabular-nums">
                        {row.monthCount} bln
                      </td>
                    )}
                    <td className="px-5 py-3 font-black text-slate-900 whitespace-nowrap">Kelas {row.kelas}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800 tabular-nums">
                      {row.total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-700 tabular-nums">
                      {row.hadir.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-amber-700 tabular-nums">
                      {row.sakit.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-blue-700 tabular-nums">
                      {row.izin.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-700 tabular-nums">
                      {row.alpa.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-rose-700 tabular-nums">
                      {row.haid.toLocaleString('id-ID')}
                    </td>
                    {hasLainnya && (
                      <td className="px-5 py-3 text-right font-semibold text-slate-600 tabular-nums">
                        {row.lainnya.toLocaleString('id-ID')}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right font-bold text-slate-700 tabular-nums">
                      {row.tidakHadir.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right font-black tabular-nums">
                      <span
                        className={
                          row.persenHadir >= 90
                            ? 'text-emerald-700'
                            : row.persenHadir >= 75
                              ? 'text-blue-700'
                              : row.persenHadir >= 60
                                ? 'text-amber-700'
                                : 'text-rose-700'
                        }
                      >
                        {row.persenHadir.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && overallSummary.total > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-sm">
                  <td colSpan={3} className="px-5 py-3.5 uppercase tracking-wider text-xs">
                    Total Keseluruhan
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    {overallSummary.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-300 tabular-nums">
                    {overallSummary.hadir.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-amber-300 tabular-nums">
                    {overallSummary.sakit.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-blue-300 tabular-nums">
                    {overallSummary.izin.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-200 tabular-nums">
                    {overallSummary.alpa.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-rose-300 tabular-nums">
                    {overallSummary.haid.toLocaleString('id-ID')}
                  </td>
                  {hasLainnya && (
                    <td className="px-5 py-3.5 text-right text-slate-300 tabular-nums">
                      {overallSummary.lainnya.toLocaleString('id-ID')}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    {overallSummary.tidakHadir.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-300 font-black tabular-nums">
                    {overallSummary.persenHadir.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
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
