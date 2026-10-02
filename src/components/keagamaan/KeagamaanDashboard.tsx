import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Calendar, Activity, HeartPulse, Phone, Clock, FileText, 
  PlusSquare, MinusSquare, ChevronDown, RefreshCw, AlertCircle, CheckCircle2,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

interface DashboardStats {
  totalSiswa: number;
  totalKetidakhadiran: number;
  perluPanggilan: number;
  screeningHaid: number;
}

const KeagamaanDashboard: React.FC = () => {
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2026');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2026', '2025']);
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswa: 0,
    totalKetidakhadiran: 0,
    perluPanggilan: 0,
    screeningHaid: 0
  });
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [participationData, setParticipationData] = useState<any[]>([
    { name: 'Mengikuti', value: 0, color: '#10b981' },
    { name: 'Tidak Mengikuti', value: 0, color: '#f43f5e' }
  ]);
  const [absentByActivity, setAbsentByActivity] = useState<any[]>([]);
  const [pivotData, setPivotData] = useState<any>({});
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedPivotClass, setSelectedPivotClass] = useState('Semua Kelas');
  const [screeningReport, setScreeningReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Realtime clock
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMounted.current) setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load from local cache immediately on first render to prevent blank screen
  useEffect(() => {
    try {
      const cached = localStorage.getItem('local_agama_dashboard_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.participationData) setParticipationData(parsed.participationData);
        if (parsed.absentByActivity) setAbsentByActivity(parsed.absentByActivity);
        if (parsed.pivotData) setPivotData(parsed.pivotData);
        if (parsed.screeningReport) setScreeningReport(parsed.screeningReport);
        if (parsed.availablePeriodes?.length) setAvailablePeriodes(parsed.availablePeriodes);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse dashboard local cache:', e);
    }
  }, []);

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

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorNotice(null);

    // Timeout promise after 8 seconds to never hang indefinitely
    const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) => {
      setTimeout(() => resolve({ isTimeout: true }), 8000);
    });

    try {
      const fetchLogic = async () => {
        if (!supabase) {
          return { offline: true };
        }

        // 1. Fetch Students, Programs, and Absensi in parallel
        const [siswaRes, programRes, absensiRes] = await Promise.allSettled([
          supabase.from('master_siswa').select('id, nama, kelas, periode'),
          supabase.from('agama_program').select('id, nama_kegiatan'),
          supabase.from('agama_absensi')
            .select('id, siswa_id, tanggal, jam, kegiatan_id, alasan')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
        ]);

        const allSiswa: any[] = siswaRes.status === 'fulfilled' && siswaRes.value.data ? siswaRes.value.data : [];
        const allPrograms: any[] = programRes.status === 'fulfilled' && programRes.value.data ? programRes.value.data : [];
        const allAbsensi: any[] = absensiRes.status === 'fulfilled' && absensiRes.value.data ? absensiRes.value.data : [];

        // Build lookup maps for fast in-memory joins (immune to PostgREST relationship issues)
        const siswaMap = new Map<string, any>();
        allSiswa.forEach(s => {
          if (s.id) siswaMap.set(String(s.id), s);
        });

        const programMap = new Map<string, any>();
        allPrograms.forEach(p => {
          if (p.id) programMap.set(String(p.id), p);
        });

        // Filter students by selected periode
        const filteredSiswa = allSiswa.filter(s => {
          if (selectedPeriode === 'ALL') return true;
          return (s.periode || '2026') === selectedPeriode;
        });

        const distinctPeriodes = Array.from(
          new Set(['2026', '2025', ...allSiswa.map(s => s.periode || '2026')])
        ).filter(Boolean).sort((a, b) => b.localeCompare(a));

        // Filter absensi belonging to selected periode students (if not ALL)
        const filteredAbsensi = allAbsensi.filter(a => {
          if (selectedPeriode === 'ALL') return true;
          const student = siswaMap.get(String(a.siswa_id));
          return student ? (student.periode || '2026') === selectedPeriode : true;
        });

        // Calculate Stats
        const nonHadirList = filteredAbsensi.filter(a => a.alasan && a.alasan !== 'Hadir');
        const totalKetidakhadiran = nonHadirList.length;

        // Perlu Panggilan (> 3x tidak hadir dalam periode)
        const studentAbsenceCounts: Record<string, number> = {};
        nonHadirList.forEach(a => {
          const sid = String(a.siswa_id);
          studentAbsenceCounts[sid] = (studentAbsenceCounts[sid] || 0) + 1;
        });
        const perluPanggilan = Object.values(studentAbsenceCounts).filter(c => c >= 3).length;

        // Screening Haid
        const haidData = filteredAbsensi.filter(a => a.alasan === 'Haid');
        const haidCounts: Record<string, number> = {};
        haidData.forEach(h => {
          const sid = String(h.siswa_id);
          haidCounts[sid] = (haidCounts[sid] || 0) + 1;
        });
        const screeningCount = Object.values(haidCounts).filter(c => c > 14).length;

        // Pivot Data
        const pivot: Record<string, any> = {};
        nonHadirList.forEach(item => {
          const student = siswaMap.get(String(item.siswa_id));
          const kelas = student?.kelas || 'Tanpa Kelas';
          const nama = student?.nama || `Siswa ID ${item.siswa_id}`;
          const alasan = item.alasan || 'Tidak Hadir';
          const tanggal = item.tanggal || '--';
          const jam = item.jam || '--:--';

          if (!pivot[kelas]) pivot[kelas] = { count: 0, students: {} };
          if (!pivot[kelas].students[nama]) pivot[kelas].students[nama] = { count: 0, reasons: {} };
          if (!pivot[kelas].students[nama].reasons[alasan]) pivot[kelas].students[nama].reasons[alasan] = { count: 0, dates: {} };
          if (!pivot[kelas].students[nama].reasons[alasan].dates[tanggal]) pivot[kelas].students[nama].reasons[alasan].dates[tanggal] = { count: 0, times: [] };

          pivot[kelas].count++;
          pivot[kelas].students[nama].count++;
          pivot[kelas].students[nama].reasons[alasan].count++;
          pivot[kelas].students[nama].reasons[alasan].dates[tanggal].count++;
          pivot[kelas].students[nama].reasons[alasan].dates[tanggal].times.push(jam);
        });

        // Health Screening Details (> 14 days)
        const haidMap: Record<string, { nama: string; kelas: string; dates: Date[] }> = {};
        haidData.forEach(item => {
          const sid = String(item.siswa_id);
          const student = siswaMap.get(sid);
          if (!haidMap[sid]) {
            haidMap[sid] = {
              nama: student?.nama || `Siswa ID ${sid}`,
              kelas: student?.kelas || '-',
              dates: []
            };
          }
          if (item.tanggal) {
            haidMap[sid].dates.push(new Date(item.tanggal));
          }
        });

        const report: any[] = [];
        Object.keys(haidMap).forEach(sid => {
          const sObj = haidMap[sid];
          const dates = sObj.dates.sort((a, b) => a.getTime() - b.getTime());
          if (dates.length > 0) {
            let currentStreak: Date[] = [dates[0]];
            let longestStreak: Date[] = [dates[0]];

            for (let i = 1; i < dates.length; i++) {
              const diff = Math.round((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
              if (diff === 1) {
                currentStreak.push(dates[i]);
              } else {
                if (currentStreak.length > longestStreak.length) {
                  longestStreak = [...currentStreak];
                }
                currentStreak = [dates[i]];
              }
            }
            if (currentStreak.length > longestStreak.length) {
              longestStreak = currentStreak;
            }

            if (longestStreak.length > 14 || dates.length > 14) {
              report.push({
                siswa_id: sid,
                nama: sObj.nama,
                kelas: sObj.kelas,
                awal: format(longestStreak[0], 'd MMM yyyy', { locale: id }),
                akhir: format(longestStreak[longestStreak.length - 1], 'd MMM yyyy', { locale: id }),
                durasi: longestStreak.length,
                total: dates.length
              });
            }
          }
        });

        // Participation Today
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayAbsensi = allAbsensi.filter(a => a.tanggal === today);
        const todayNonHadir = todayAbsensi.filter(a => a.alasan && a.alasan !== 'Hadir').length;
        const totalSiswaCount = filteredSiswa.length || allSiswa.length || 0;
        const hadirCount = Math.max(0, totalSiswaCount - todayNonHadir);

        const newParticipationData = [
          { name: 'Mengikuti', value: hadirCount, color: '#10b981' },
          { name: 'Tidak Mengikuti', value: todayNonHadir, color: '#f43f5e' }
        ];

        // Absent by Activity
        const actCounts: Record<string, number> = {};
        nonHadirList.forEach(a => {
          const prog = programMap.get(String(a.kegiatan_id));
          const name = prog?.nama_kegiatan || 'Kegiatan Keagamaan';
          actCounts[name] = (actCounts[name] || 0) + 1;
        });

        const formattedAct = Object.keys(actCounts).map(k => ({
          name: k,
          count: actCounts[k]
        })).sort((a, b) => b.count - a.count).slice(0, 5);

        const newStats = {
          totalSiswa: totalSiswaCount,
          totalKetidakhadiran,
          perluPanggilan,
          screeningHaid: screeningCount
        };

        return {
          stats: newStats,
          availablePeriodes: distinctPeriodes,
          pivotData: pivot,
          screeningReport: report,
          participationData: newParticipationData,
          absentByActivity: formattedAct
        };
      };

      const result: any = await Promise.race([fetchLogic(), timeoutPromise]);

      if (!isMounted.current) return;

      if (result?.isTimeout) {
        setErrorNotice('Koneksi lambat, menampilkan data lokal yang tersedia.');
      } else if (result?.stats) {
        setStats(result.stats);
        if (result.availablePeriodes?.length) setAvailablePeriodes(result.availablePeriodes);
        setPivotData(result.pivotData || {});
        setScreeningReport(result.screeningReport || []);
        setParticipationData(result.participationData || []);
        setAbsentByActivity(result.absentByActivity || []);

        // Cache result
        try {
          localStorage.setItem('local_agama_dashboard_cache', JSON.stringify({
            stats: result.stats,
            availablePeriodes: result.availablePeriodes,
            pivotData: result.pivotData,
            screeningReport: result.screeningReport,
            participationData: result.participationData,
            absentByActivity: result.absentByActivity
          }));
        } catch (e) {}
      }
    } catch (error: any) {
      console.error('Error in fetchDashboardData:', error);
      if (isMounted.current) {
        setErrorNotice('Gagal memuat data terbaru: ' + (error?.message || 'Terjadi gangguan jaringan.'));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [startDate, endDate, selectedPeriode]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const expandAll = () => {
    const allKeys = new Set<string>();
    Object.keys(pivotData).forEach(kelas => {
      allKeys.add(kelas);
      Object.keys(pivotData[kelas].students || {}).forEach(nama => {
        const studentKey = `${kelas}-${nama}`;
        allKeys.add(studentKey);
        Object.keys(pivotData[kelas].students[nama].reasons || {}).forEach(alasan => {
          const reasonKey = `${studentKey}-${alasan}`;
          allKeys.add(reasonKey);
          Object.keys(pivotData[kelas].students[nama].reasons[alasan].dates || {}).forEach(tanggal => {
            allKeys.add(`${reasonKey}-${tanggal}`);
          });
        });
      });
    });
    setExpandedKeys(allKeys);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Safe percentage calculation
  const totalParticipation = (participationData[0]?.value || 0) + (participationData[1]?.value || 0);
  const participationPercentage = totalParticipation > 0 
    ? Math.round(((participationData[0]?.value || 0) / totalParticipation) * 100) 
    : 100;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Error / Notice Alert */}
      {errorNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Dashboard Overview</h1>
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={loading || refreshing}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-xs active:scale-95 disabled:opacity-50"
              title="Perbarui Data"
            >
              <RefreshCw size={16} className={refreshing || loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">Sistem Informasi Monitoring Kegiatan Keagamaan</p>
        </div>
        
        <div className="flex flex-wrap items-end gap-3">
          {/* Periode / Tahun Ajaran Selector */}
          <div className="flex flex-col min-w-[150px]">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
              Periode / Tahun Ajaran
            </label>
            <div className="relative">
              <select
                value={selectedPeriode}
                onChange={(e) => handlePeriodeChange(e.target.value)}
                className="w-full font-black text-xs sm:text-sm bg-emerald-50 text-emerald-800 border-2 border-emerald-200 py-2 px-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none shadow-xs"
              >
                {availablePeriodes.map(p => (
                  <option key={p} value={p}>Periode {p}</option>
                ))}
                <option value="ALL">Semua Periode</option>
              </select>
              <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none" />
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 sm:p-2 rounded-2xl shadow-xs">
            <div className="flex flex-col px-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tgl Awal</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
              />
            </div>
            <div className="h-8 w-px bg-slate-100" />
            <div className="flex flex-col px-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tgl Akhir</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-700 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-50/70 border border-emerald-100 px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-2.5">
              <Clock size={16} className="text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                {format(currentTime, 'EEEE, d MMMM yyyy HH:mm', { locale: id })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay indicator when refreshing */}
      {loading && (
        <div className="flex items-center justify-center p-8 bg-emerald-50/50 rounded-3xl border border-emerald-100 animate-pulse">
          <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            <span>Memuat dan mengolah data kegiatan keagamaan...</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Siswa Terdata */}
        <div className="bg-emerald-50/60 border border-emerald-100 p-6 rounded-3xl shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-200/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-xs group-hover:scale-110 transition-transform shrink-0">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa Terdata</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalSiswa}</p>
            </div>
          </div>
        </div>

        {/* Total Ketidakhadiran */}
        <div className="bg-blue-50/60 border border-blue-100 p-6 rounded-3xl shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-200/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-110 transition-transform shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Ketidakhadiran</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalKetidakhadiran}</p>
            </div>
          </div>
        </div>

        {/* Perlu Panggilan Ortu */}
        <div className="bg-amber-50/60 border border-amber-100 p-6 rounded-3xl shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-200/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-xs group-hover:scale-110 transition-transform shrink-0">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Perlu Panggilan Ortu</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.perluPanggilan}</p>
            </div>
          </div>
        </div>

        {/* Screening Kesehatan */}
        <div className="bg-rose-50/60 border border-rose-100 p-6 rounded-3xl shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-200/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-xs group-hover:scale-110 transition-transform shrink-0">
              <HeartPulse size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Screening Kesehatan</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.screeningHaid}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Participation Donut Chart */}
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl md:rounded-[40px] shadow-xs border border-slate-100">
          <div className="mb-6">
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Ketercapaian Kegiatan Hari Ini</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">Persentase siswa yang mengikuti kegiatan keagamaan</p>
          </div>
          
          <div className="h-[280px] sm:h-[320px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalParticipation > 0 ? participationData : [{ name: 'Data Kosong', value: 1, color: '#e2e8f0' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  paddingAngle={totalParticipation > 0 ? 5 : 0}
                  dataKey="value"
                >
                  {(totalParticipation > 0 ? participationData : [{ name: 'Data Kosong', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl sm:text-5xl font-black text-slate-800">{participationPercentage}%</span>
              <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Hadir</span>
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-4 flex-wrap">
            {participationData.map((item, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs sm:text-sm font-bold text-slate-600">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Absent by Activity Bar Chart */}
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl md:rounded-[40px] shadow-xs border border-slate-100">
          <div className="mb-6">
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Ketidakikutsertaan Terbanyak</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">Berdasarkan jenis kegiatan keagamaan</p>
          </div>
          
          <div className="h-[280px] sm:h-[320px] w-full">
            {absentByActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm italic border-2 border-dashed border-slate-100 rounded-2xl">
                <CheckCircle2 size={32} className="text-emerald-500 mb-2 opacity-80" />
                <span>Semua siswa hadir atau belum ada data ketidakhadiran pada rentang ini.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={absentByActivity} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                    {absentByActivity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#f43f5e', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Pivot Table Section */}
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl md:rounded-[40px] shadow-xs border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Pivot Ketidakhadiran Per Kelas</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">Detail hirarkis siswa tidak mengikuti kegiatan</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas:</span>
              <select 
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                value={selectedPivotClass}
                onChange={(e) => setSelectedPivotClass(e.target.value)}
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {Object.keys(pivotData).sort().map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <button 
                onClick={expandAll}
                className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider transition-colors"
              >
                Expand All
              </button>
              <button 
                onClick={collapseAll}
                className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl md:rounded-[32px] overflow-hidden shadow-xs">
          <div className="bg-emerald-600 px-6 sm:px-8 py-3.5 flex items-center justify-between text-white">
            <span className="font-black text-xs uppercase tracking-[0.2em]">Siswa Tidak Mengikuti</span>
            <span className="font-black text-xs uppercase tracking-[0.2em]">Jumlah</span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {Object.keys(pivotData)
              .filter(kelas => selectedPivotClass === 'Semua Kelas' || kelas === selectedPivotClass)
              .sort()
              .map((kelas) => (
              <div key={kelas} className="animate-in fade-in duration-300">
                {/* Level 1: Kelas */}
                <div 
                  className="flex items-center justify-between px-6 sm:px-8 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => toggleExpand(kelas)}
                >
                  <div className="flex items-center gap-3">
                    {expandedKeys.has(kelas) ? (
                      <MinusSquare size={18} className="text-indigo-600 transition-colors" />
                    ) : (
                      <PlusSquare size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    )}
                    <span className="font-black text-slate-700 uppercase tracking-wider text-xs sm:text-sm">Kelas {kelas}</span>
                  </div>
                  <span className="font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {pivotData[kelas].count}
                  </span>
                </div>

                {expandedKeys.has(kelas) && (
                  <div className="bg-slate-50/40 divide-y divide-slate-100">
                    {Object.keys(pivotData[kelas].students || {}).sort().map((nama) => {
                      const studentKey = `${kelas}-${nama}`;
                      const studentData = pivotData[kelas].students[nama];
                      return (
                        <div key={nama}>
                          {/* Level 2: Siswa */}
                          <div 
                            className="flex items-center justify-between px-8 sm:px-12 py-2.5 hover:bg-slate-100/60 cursor-pointer transition-colors group"
                            onClick={() => toggleExpand(studentKey)}
                          >
                            <div className="flex items-center gap-2.5">
                              {expandedKeys.has(studentKey) ? (
                                <MinusSquare size={15} className="text-indigo-600 transition-colors" />
                              ) : (
                                <PlusSquare size={15} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                              )}
                              <span className="font-bold text-slate-700 text-xs sm:text-sm uppercase">{nama}</span>
                            </div>
                            <span className="font-bold text-slate-600 text-xs">{studentData.count}x</span>
                          </div>

                          {expandedKeys.has(studentKey) && (
                            <div className="bg-white/70 divide-y divide-slate-50">
                              {Object.keys(studentData.reasons || {}).sort().map((alasan) => {
                                const reasonKey = `${studentKey}-${alasan}`;
                                const reasonData = studentData.reasons[alasan];
                                return (
                                  <div key={alasan}>
                                    {/* Level 3: Alasan */}
                                    <div 
                                      className="flex items-center justify-between px-12 sm:px-16 py-2 hover:bg-slate-50 cursor-pointer transition-colors group"
                                      onClick={() => toggleExpand(reasonKey)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {expandedKeys.has(reasonKey) ? (
                                          <MinusSquare size={13} className="text-indigo-600 transition-colors" />
                                        ) : (
                                          <PlusSquare size={13} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                        )}
                                        <span className="text-xs font-semibold text-slate-600">{alasan}</span>
                                      </div>
                                      <span className="text-xs font-bold text-slate-500">{reasonData.count}</span>
                                    </div>

                                    {expandedKeys.has(reasonKey) && (
                                      <div className="bg-slate-50/30 divide-y divide-slate-50">
                                        {Object.keys(reasonData.dates || {}).sort().map((tanggal) => {
                                          const dateKey = `${reasonKey}-${tanggal}`;
                                          const dateData = reasonData.dates[tanggal];
                                          return (
                                            <div key={tanggal}>
                                              {/* Level 4: Tanggal */}
                                              <div 
                                                className="flex items-center justify-between px-16 sm:px-20 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                                                onClick={() => toggleExpand(dateKey)}
                                              >
                                                <div className="flex items-center gap-2">
                                                  {expandedKeys.has(dateKey) ? (
                                                    <MinusSquare size={11} className="text-indigo-600 transition-colors" />
                                                  ) : (
                                                    <PlusSquare size={11} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                                  )}
                                                  <span className="text-[11px] font-mono text-slate-500">{tanggal}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400">{dateData.count}</span>
                                              </div>

                                              {expandedKeys.has(dateKey) && (
                                                <div className="px-20 sm:px-24 py-1 space-y-1">
                                                  {dateData.times.map((jam: string, tIdx: number) => (
                                                    <div key={tIdx} className="flex items-center justify-between py-0.5">
                                                      <span className="text-[10px] font-mono text-slate-400 ml-4">Jam: {jam}</span>
                                                      <span className="text-[10px] font-bold text-slate-300">1</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {Object.keys(pivotData).length === 0 && (
              <div className="text-center py-12 bg-slate-50">
                <p className="text-slate-400 font-bold italic text-xs sm:text-sm">
                  Tidak ada data ketidakhadiran pada rentang tanggal & periode ini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screening Report Section */}
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl md:rounded-[40px] shadow-xs border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100 shadow-xs shrink-0">
              <HeartPulse size={28} />
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">Health Screening Report (Pemantauan Kesehatan)</h3>
              <p className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg inline-block mt-1">
                Siswa dengan alasan Haid {'>'} 14 hari
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xs">
              {screeningReport.length} Kasus Perlu Pemantauan
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-3.5">Nama Siswa</th>
                <th className="px-6 py-3.5">Kelas</th>
                <th className="px-6 py-3.5">Awal Haid</th>
                <th className="px-6 py-3.5">Akhir Haid</th>
                <th className="px-6 py-3.5">Durasi</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {screeningReport.map((item, idx) => (
                <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800 uppercase">
                    {item.nama}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-500">
                    {item.kelas}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">
                    {item.awal}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">
                    {item.akhir}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-black">
                      {item.durasi} Hari
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
                      Perlu Pembinaan UKS/BK
                    </span>
                  </td>
                </tr>
              ))}
              {screeningReport.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 bg-slate-50/50">
                    <p className="text-slate-400 font-bold italic text-xs sm:text-sm">
                      Tidak ada siswi yang memerlukan pemantauan haid berkepanjangan pada periode ini.
                    </p>
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

export default KeagamaanDashboard;
