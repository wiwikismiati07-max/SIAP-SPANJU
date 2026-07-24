import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  Users, 
  GraduationCap, 
  School, 
  RefreshCw, 
  Download, 
  Filter, 
  Briefcase, 
  XCircle, 
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Building2,
  FileText
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { motion } from 'motion/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import { supabase } from '../../lib/supabase';
import { AlumniTracing } from './types';

interface AlumniReportProps {
  onBack?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'SMA': '#3B82F6', // Blue
  'SMK': '#10B981', // Emerald
  'MA': '#8B5CF6', // Purple
  'Pondok Pesantren': '#F59E0B', // Amber
  'Perguruan Tinggi': '#06B6D4', // Cyan
  'Bekerja': '#EC4899', // Pink
  'Tidak Melanjutkan': '#EF4444', // Red
  'Lainnya': '#64748B' // Slate
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#EF4444', '#64748B', '#84CC16', '#6366F1'];

export default function AlumniReport({ onBack }: AlumniReportProps) {
  const [data, setData] = useState<AlumniTracing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Database tidak terhubung.');
      const { data: tracings, error: queryError } = await supabase
        .from('alumni_tracing')
        .select('*')
        .order('tahun_lulus', { ascending: false });

      if (queryError) {
        if (queryError.message.includes('relation "public.alumni_tracing" does not exist') || queryError.message.includes('schema cache')) {
          throw new Error('Tabel "alumni_tracing" belum ada di database.');
        }
        throw queryError;
      }
      setData(tracings || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data alumni.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract all available graduation years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(item => {
      if (item.tahun_lulus) {
        years.add(String(item.tahun_lulus));
      }
    });
    // Sort descending
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [data]);

  // Filter data based on selected graduation year
  const filteredData = useMemo(() => {
    if (selectedYear === 'ALL') return data;
    return data.filter(item => String(item.tahun_lulus) === selectedYear);
  }, [data, selectedYear]);

  // Pie chart data: distribution by continuation category (lanjut_ke)
  const categoryChartData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    filteredData.forEach(item => {
      const cat = item.lanjut_ke ? item.lanjut_ke.trim() : 'Lainnya';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const total = filteredData.length;
    return Object.keys(categoryCounts).map(cat => ({
      name: cat,
      value: categoryCounts[cat],
      percentage: total > 0 ? ((categoryCounts[cat] / total) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Yearly report data: alumni count & continuation breakdown per graduation year
  const yearlyReportData = useMemo(() => {
    const yearMap: Record<string, { total: number; melanjutkan: number; tidakMelanjutkan: number; categories: Record<string, number> }> = {};

    data.forEach(item => {
      const yr = item.tahun_lulus ? String(item.tahun_lulus) : 'Tidak Diketahui';
      if (!yearMap[yr]) {
        yearMap[yr] = { total: 0, melanjutkan: 0, tidakMelanjutkan: 0, categories: {} };
      }
      yearMap[yr].total += 1;
      const cat = item.lanjut_ke ? item.lanjut_ke.trim() : 'Lainnya';
      yearMap[yr].categories[cat] = (yearMap[yr].categories[cat] || 0) + 1;

      if (cat === 'Tidak Melanjutkan') {
        yearMap[yr].tidakMelanjutkan += 1;
      } else {
        yearMap[yr].melanjutkan += 1;
      }
    });

    return Object.keys(yearMap)
      .sort((a, b) => Number(b) - Number(a))
      .map(yr => {
        const item = yearMap[yr];
        const rate = item.total > 0 ? ((item.melanjutkan / item.total) * 100).toFixed(1) : '0';
        return {
          tahun: yr,
          total: item.total,
          melanjutkan: item.melanjutkan,
          tidakMelanjutkan: item.tidakMelanjutkan,
          rate: Number(rate),
          categories: item.categories
        };
      });
  }, [data]);

  // Overall key metric statistics
  const metrics = useMemo(() => {
    const total = filteredData.length;
    let melanjutkan = 0;
    let bekerja = 0;
    let tidakMelanjutkan = 0;

    filteredData.forEach(item => {
      const cat = (item.lanjut_ke || '').trim().toUpperCase();
      if (cat === 'TIDAK MELANJUTKAN') {
        tidakMelanjutkan += 1;
      } else if (cat === 'BEKERJA' || cat === 'KERJA' || cat === 'WIRAUSAHA') {
        bekerja += 1;
      } else {
        melanjutkan += 1;
      }
    });

    const percentMelanjutkan = total > 0 ? ((melanjutkan / total) * 100).toFixed(1) : '0';
    const percentBekerja = total > 0 ? ((bekerja / total) * 100).toFixed(1) : '0';
    const percentTidak = total > 0 ? ((tidakMelanjutkan / total) * 100).toFixed(1) : '0';

    return {
      total,
      melanjutkan,
      percentMelanjutkan,
      bekerja,
      percentBekerja,
      tidakMelanjutkan,
      percentTidak
    };
  }, [filteredData]);

  // Top destination schools
  const topSchools = useMemo(() => {
    const schoolCounts: Record<string, { count: number; category: string }> = {};
    filteredData.forEach(item => {
      const school = item.nama_sekolah_lanjutan ? item.nama_sekolah_lanjutan.trim() : '';
      if (school && school !== '-') {
        if (!schoolCounts[school]) {
          schoolCounts[school] = { count: 0, category: item.lanjut_ke || '-' };
        }
        schoolCounts[school].count += 1;
      }
    });

    return Object.entries(schoolCounts)
      .map(([name, info]) => ({ name, count: info.count, category: info.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredData]);

  // Export Report to Excel
  const exportReportExcel = async () => {
    if (filteredData.length === 0) return;
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Ringkasan & Grafik Report
      const sheet1 = workbook.addWorksheet('Laporan Ringkasan');
      const totalCols = 7;
      
      const yearTitle = selectedYear === 'ALL' ? 'SEMUA TAHUN LULUSAN' : `TAHUN LULUSAN ${selectedYear}`;
      await addExcelHeaderAndLogos(sheet1, workbook, `LAPORAN REPORT ALUMNI & TRACING (${yearTitle})`, totalCols);

      // Section 1: Ringkasan Statistik
      sheet1.getRow(10).values = ['RINGKASAN METRIK URAMA'];
      sheet1.getRow(10).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };

      sheet1.getRow(11).values = ['METRIK', 'JUMLAH ALUMNI', 'PERSENTASE (%)'];
      sheet1.getRow(11).font = { bold: true };

      sheet1.addRow(['Total Alumni Terdata', metrics.total, '100%']);
      sheet1.addRow(['Melanjutkan Pendidikan', metrics.melanjutkan, `${metrics.percentMelanjutkan}%`]);
      sheet1.addRow(['Bekerja / Wirausaha', metrics.bekerja, `${metrics.percentBekerja}%`]);
      sheet1.addRow(['Tidak Melanjutkan', metrics.tidakMelanjutkan, `${metrics.percentTidak}%`]);

      applyColorfulTableStyle(sheet1, 11, 4, 3);

      // Section 2: Kategori Kelanjutan Studi
      const catStartRow = 18;
      sheet1.getRow(catStartRow).values = ['DISTRIBUSI KATEGORI KELANJUTAN STUDI (GRAFIK LINGKARAN)'];
      sheet1.getRow(catStartRow).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };

      sheet1.getRow(catStartRow + 1).values = ['NO', 'KATEGORI KELANJUTAN', 'JUMLAH ALUMNI', 'PERSENTASE (%)'];
      sheet1.getRow(catStartRow + 1).font = { bold: true };

      categoryChartData.forEach((item, index) => {
        sheet1.addRow([index + 1, item.name, item.value, `${item.percentage}%`]);
      });

      applyColorfulTableStyle(sheet1, catStartRow + 1, categoryChartData.length, 4);

      // Section 3: Laporan per Tahun Lulusan
      const yrStartRow = catStartRow + categoryChartData.length + 4;
      sheet1.getRow(yrStartRow).values = ['REPORT KELANJUTAN PER TAHUN LULUSAN'];
      sheet1.getRow(yrStartRow).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };

      sheet1.getRow(yrStartRow + 1).values = ['NO', 'TAHUN LULUS', 'TOTAL ALUMNI', 'MELANJUTKAN', 'TIDAK MELANJUTKAN', '% MELANJUTKAN'];
      sheet1.getRow(yrStartRow + 1).font = { bold: true };

      yearlyReportData.forEach((item, index) => {
        sheet1.addRow([
          index + 1,
          item.tahun,
          item.total,
          item.melanjutkan,
          item.tidakMelanjutkan,
          `${item.rate}%`
        ]);
      });

      applyColorfulTableStyle(sheet1, yrStartRow + 1, yearlyReportData.length, 6);

      sheet1.columns = [
        { width: 8 },
        { width: 30 },
        { width: 18 },
        { width: 18 },
        { width: 22 },
        { width: 20 },
        { width: 20 }
      ];

      // Sheet 2: Detail Data Alumni Filtered
      const sheet2 = workbook.addWorksheet('Data Detail Alumni');
      await addExcelHeaderAndLogos(sheet2, workbook, `DETAIL DATA TRACING ALUMNI (${yearTitle})`, 9);

      const headers2 = ['NO', 'NAMA LENGKAP', 'JENIS KELAMIN', 'TAHUN LULUS', 'NO. WA', 'LANJUT KE', 'SEKOLAH LANJUTAN', 'JURUSAN', 'ALAMAT'];
      const hRow2 = sheet2.getRow(10);
      hRow2.values = headers2;

      filteredData.forEach((item, index) => {
        sheet2.addRow([
          index + 1,
          item.nama_lengkap,
          item.jenis_kelamin,
          item.tahun_lulus,
          item.wa_number,
          item.lanjut_ke,
          item.nama_sekolah_lanjutan || '-',
          item.jurusan || '-',
          item.alamat || '-'
        ]);
      });

      applyColorfulTableStyle(sheet2, 10, filteredData.length, 9);
      sheet2.columns = [
        { width: 6 },
        { width: 28 },
        { width: 15 },
        { width: 14 },
        { width: 18 },
        { width: 20 },
        { width: 28 },
        { width: 22 },
        { width: 35 }
      ];

      // Signatures on Sheet 1
      const footerStartRow = sheet1.lastRow ? sheet1.lastRow.number + 3 : 30;
      sheet1.mergeCells(footerStartRow, 2, footerStartRow, 3);
      sheet1.getCell(footerStartRow, 2).value = 'Mengetahui,';
      sheet1.getCell(footerStartRow, 2).alignment = { horizontal: 'center' };

      sheet1.mergeCells(footerStartRow + 1, 2, footerStartRow + 1, 3);
      sheet1.getCell(footerStartRow + 1, 2).value = 'Kepala Sekolah';
      sheet1.getCell(footerStartRow + 1, 2).alignment = { horizontal: 'center' };

      sheet1.mergeCells(footerStartRow + 5, 2, footerStartRow + 5, 3);
      const kasek = sheet1.getCell(footerStartRow + 5, 2);
      kasek.value = 'NUR FADILAH, S.Pd';
      kasek.font = { bold: true, underline: true };
      kasek.alignment = { horizontal: 'center' };

      const today = new Date();
      const formattedDate = format(today, 'd MMMM yyyy', { locale: idLocale });
      sheet1.mergeCells(footerStartRow, 5, footerStartRow, 6);
      sheet1.getCell(footerStartRow, 5).value = `Pasuruan, ${formattedDate}`;
      sheet1.getCell(footerStartRow, 5).alignment = { horizontal: 'center' };

      sheet1.mergeCells(footerStartRow + 1, 5, footerStartRow + 1, 6);
      sheet1.getCell(footerStartRow + 1, 5).value = 'Guru BK';
      sheet1.getCell(footerStartRow + 1, 5).alignment = { horizontal: 'center' };

      sheet1.mergeCells(footerStartRow + 5, 5, footerStartRow + 5, 6);
      const bk = sheet1.getCell(footerStartRow + 5, 5);
      bk.value = 'WIWIK ISMIATI, S.Pd';
      bk.font = { bold: true, underline: true };
      bk.alignment = { horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Report_Alumni_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      console.error('Export Error:', err);
      alert('Gagal mengekspor Laporan Report Alumni.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
              <PieChartIcon size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Report Alumni</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Laporan & Grafik Tracing Alumni Berdasarkan Kelanjutan Studi
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
            <Filter size={16} className="text-indigo-600" />
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tahun Lulus:</span>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-black text-slate-800 text-sm outline-none cursor-pointer pr-2"
            >
              <option value="ALL">SEMUA TAHUN LULUSAN</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Tahun Lulus {yr}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-2xl transition-all hover:bg-slate-200 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={exportReportExcel}
            disabled={loading || filteredData.length === 0}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download size={18} />
            Export Report Excel
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Alumni Terdata</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{metrics.total}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {selectedYear === 'ALL' ? 'Semua Angkatan' : `Lulusan ${selectedYear}`}
            </p>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={28} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Melanjutkan Sekolah</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{metrics.melanjutkan}</h3>
            <p className="text-xs font-extrabold text-emerald-600 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
              {metrics.percentMelanjutkan}% dari total
            </p>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <School size={28} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Bekerja / Wirausaha</p>
            <h3 className="text-3xl font-black text-pink-600 mt-1">{metrics.bekerja}</h3>
            <p className="text-xs font-extrabold text-pink-600 mt-1 bg-pink-50 px-2 py-0.5 rounded-full inline-block">
              {metrics.percentBekerja}% dari total
            </p>
          </div>
          <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center">
            <Briefcase size={28} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tidak Melanjutkan</p>
            <h3 className="text-3xl font-black text-rose-600 mt-1">{metrics.tidakMelanjutkan}</h3>
            <p className="text-xs font-extrabold text-rose-600 mt-1 bg-rose-50 px-2 py-0.5 rounded-full inline-block">
              {metrics.percentTidak}% dari total
            </p>
          </div>
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <XCircle size={28} />
          </div>
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Grafik Lingkaran (Pie Chart) - Kategori Kelanjutan Studi */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <PieChartIcon className="text-indigo-600" size={22} />
                  Grafik Lingkaran Kelanjutan Studi Alumni
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  Persentase Kategori Studi Lanjutan ({selectedYear === 'ALL' ? 'Semua Tahun' : `Tahun ${selectedYear}`})
                </p>
              </div>

              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full uppercase tracking-wider">
                {categoryChartData.length} Kategori
              </span>
            </div>

            {loading ? (
              <div className="h-72 flex items-center justify-center">
                <RefreshCw size={32} className="animate-spin text-indigo-500" />
              </div>
            ) : categoryChartData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Pie Chart Canvas */}
                <div className="md:col-span-7 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => {
                          const color = CATEGORY_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} stroke="#FFFFFF" strokeWidth={3} />;
                        })}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 font-bold">
                                <p className="text-indigo-300 font-extrabold uppercase tracking-wider">{data.name}</p>
                                <p className="text-base font-black">{data.value} Alumni ({data.percentage}%)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend & Breakdown */}
                <div className="md:col-span-5 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {categoryChartData.map((item, idx) => {
                    const color = CATEGORY_COLORS[item.name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                    return (
                      <div key={item.name} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                          <span className="text-xs font-black text-slate-700 truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-800">{item.value} <span className="text-[10px] text-slate-400">({item.percentage}%)</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <PieChartIcon size={48} strokeWidth={1.5} />
                <p className="text-sm font-bold">Belum ada data tracing alumni untuk ditampilkan</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold mt-4">
            <span>Sumber Data: Form Tracing Alumni</span>
            <span>Total Responden: {metrics.total} Alumni</span>
          </div>
        </div>

        {/* Report Tahun Lulusan (Bar Chart & Summary) */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <BarChart3 className="text-indigo-600" size={22} />
                  Report Tahun Lulusan
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  Jumlah Alumni & Tren Kelanjutan per Angkatan
                </p>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw size={32} className="animate-spin text-indigo-500" />
              </div>
            ) : yearlyReportData.length > 0 ? (
              <div className="space-y-6">
                {/* Bar Chart */}
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyReportData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="tahun" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 font-bold">
                                <p className="text-indigo-300 font-extrabold uppercase">Lulusan Tahun {data.tahun}</p>
                                <p>Total Alumni: {data.total}</p>
                                <p className="text-emerald-400">Melanjutkan: {data.melanjutkan} ({data.rate}%)</p>
                                <p className="text-rose-400">Tidak Melanjutkan: {data.tidakMelanjutkan}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="melanjutkan" name="Melanjutkan" fill="#10B981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="tidakMelanjutkan" name="Tidak Melanjutkan" fill="#EF4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* List Table per Year */}
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    Rincian per Angkatan Kelulusan:
                  </p>
                  <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
                    {yearlyReportData.map((item) => (
                      <div key={item.tahun} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-black">
                            {item.tahun}
                          </span>
                          <span className="font-bold text-slate-600">{item.total} Alumni</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-600 font-black">{item.melanjutkan} Lanjut ({item.rate}%)</span>
                          {item.tidakMelanjutkan > 0 && (
                            <span className="text-rose-500 font-bold">{item.tidakMelanjutkan} Tidak</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <BarChart3 size={48} strokeWidth={1.5} />
                <p className="text-sm font-bold">Belum ada data lulusan</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Detail Breakdown & Top Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Top Destination Schools */}
        <div className="lg:col-span-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Building2 className="text-indigo-600" size={20} />
              Sekolah Lanjutan Terfavorit Alumni
            </h3>
            <span className="text-xs font-bold text-slate-400">Top 6 Destinasi</span>
          </div>

          {topSchools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topSchools.map((sch, idx) => (
                <div key={sch.name} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1 min-w-0 pr-2">
                    <p className="text-xs font-black text-slate-800 truncate">{sch.name}</p>
                    <span className="px-2 py-0.5 bg-indigo-100/80 text-indigo-700 text-[10px] font-black rounded-md uppercase">
                      {sch.category}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-indigo-600">{sch.count}</p>
                    <p className="text-[10px] font-bold text-slate-400">Siswa</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Belum ada data sekolah lanjutan terdaftar.</p>
          )}
        </div>

        {/* Detailed Category Progress Cards */}
        <div className="lg:col-span-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={20} />
              Rincian Kategori Kelanjutan Studi
            </h3>
            <span className="text-xs font-bold text-slate-400">Detail Persentase</span>
          </div>

          <div className="space-y-3">
            {categoryChartData.map((cat, idx) => {
              const color = CATEGORY_COLORS[cat.name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {cat.name}
                    </span>
                    <span className="text-slate-900">{cat.value} Alumni ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${cat.percentage}%`, backgroundColor: color }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
