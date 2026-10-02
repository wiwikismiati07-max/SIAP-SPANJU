import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../../lib/supabase';
import { 
  Users, AlertCircle, TrendingUp, BarChart3, UserX, CheckCircle2, 
  Clock, PieChart as PieChartIcon, Trophy, Star, ChevronDown, RefreshCw,
  Database, ShieldAlert, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { SupabaseConfigModal } from '../common/SupabaseConfigModal';

export default function DisiplinDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2026');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2026', '2025']);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  const [stats, setStats] = useState({
    totalKasus: 0,
    kasusBaru: 0,
    kasusProses: 0,
    kasusSelesai: 0,
    persentase: 0
  });
  const [classData, setClassData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [frequentViolators, setFrequentViolators] = useState<any[]>([]);
  const [perfectClasses, setPerfectClasses] = useState<string[]>([]);

  const KELAS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  // Load from local storage cache on initial render
  useEffect(() => {
    try {
      const cached = localStorage.getItem('local_disiplin_dashboard_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.classData) setClassData(parsed.classData);
        if (parsed.categoryData) setCategoryData(parsed.categoryData);
        if (parsed.frequentViolators) setFrequentViolators(parsed.frequentViolators);
        if (parsed.perfectClasses) setPerfectClasses(parsed.perfectClasses);
        if (parsed.availablePeriodes?.length) setAvailablePeriodes(parsed.availablePeriodes);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to parse Disiplin dashboard local cache:', e);
    }
  }, []);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    const client = getSupabase();

    if (!client) {
      setErrorMsg('Koneksi Supabase belum dikonfigurasi.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Safety timeout promise (8s) to prevent hanging
    const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) => {
      setTimeout(() => resolve({ isTimeout: true }), 8000);
    });

    try {
      const loadLogic = async () => {
        const today = new Date().toISOString().split('T')[0];

        // Fetch students and violations in parallel
        const [siswaRes, kasusRes, jenisRes] = await Promise.allSettled([
          client.from('master_siswa').select('id, nama, kelas, periode'),
          client.from('transaksi_pelanggaran').select('id, siswa_id, pelanggaran_id, tanggal, status, keterangan, tindakan, poin'),
          client.from('master_pelanggaran').select('id, nama_pelanggaran, kategori, poin')
        ]);

        const allSiswa: any[] = siswaRes.status === 'fulfilled' && siswaRes.value.data ? siswaRes.value.data : [];
        const rawKasus: any[] = kasusRes.status === 'fulfilled' && kasusRes.value.data ? kasusRes.value.data : [];
        const allJenis: any[] = jenisRes.status === 'fulfilled' && jenisRes.value.data ? jenisRes.value.data : [];

        // Distinct periodes
        const distinctPeriodes = Array.from(
          new Set(['2026', '2025', ...allSiswa.map(s => s.periode || '2026')])
        ).filter(Boolean).sort((a, b) => b.localeCompare(a));

        // Maps for in-memory joining
        const siswaMap = new Map<string, any>();
        allSiswa.forEach(s => {
          if (s.id) siswaMap.set(String(s.id), s);
        });

        const jenisMap = new Map<string, any>();
        allJenis.forEach(j => {
          if (j.id) jenisMap.set(String(j.id), j);
        });

        // Joined cases
        const joinedKasus = rawKasus.map(k => {
          const s = siswaMap.get(String(k.siswa_id));
          const j = jenisMap.get(String(k.pelanggaran_id));
          return {
            ...k,
            siswa: s || { nama: 'Unknown', kelas: '-', periode: '2026' },
            pelanggaran: j || { nama_pelanggaran: 'Pelanggaran', kategori: 'Ringan', poin: k.poin || 0 }
          };
        });

        // Filter by selected periode
        let safeKasus = joinedKasus;
        if (selectedPeriode !== 'ALL') {
          safeKasus = safeKasus.filter(k => (k.siswa?.periode || '2026') === selectedPeriode);
        }

        const totalKasus = safeKasus.length;
        const kasusBaru = safeKasus.filter(k => k.tanggal === today).length;
        const kasusProses = safeKasus.filter(k => k.status === 'Proses').length;
        const kasusSelesai = safeKasus.filter(k => k.status === 'Selesai').length;

        const newStats = {
          totalKasus,
          kasusBaru,
          kasusProses,
          kasusSelesai,
          persentase: totalKasus > 0 ? Math.round((kasusSelesai / totalKasus) * 100) : 0
        };

        // Perfect Classes Today
        const violatingSiswaIdsToday = new Set(safeKasus.filter(k => k.tanggal === today).map(k => String(k.siswa_id)));
        const newPerfectClasses = KELAS_OPTIONS.filter(kelas => {
          const siswaInClass = allSiswa.filter(s => s.kelas === kelas);
          return siswaInClass.length > 0 && !siswaInClass.some(s => violatingSiswaIdsToday.has(String(s.id)));
        });

        // Chart Data per Kelas
        const perKelas = KELAS_OPTIONS.map(kelas => {
          const count = safeKasus.filter(p => p.siswa?.kelas === kelas).length;
          return {
            name: kelas,
            value: count,
            percentage: totalKasus > 0 ? Math.round((count / totalKasus) * 100) : 0
          };
        }).filter(k => k.value > 0);

        // Category Data
        const categories: Record<string, number> = {};
        safeKasus.forEach(item => {
          const kat = item.pelanggaran?.kategori || 'Ringan';
          categories[kat] = (categories[kat] || 0) + 1;
        });

        const newCategoryData = Object.keys(categories).map(key => ({
          name: key,
          value: categories[key]
        }));

        // Frequent Violators
        const studentCounts: Record<string, any> = {};
        safeKasus.forEach(item => {
          const sid = String(item.siswa_id);
          if (!studentCounts[sid]) {
            studentCounts[sid] = {
              siswa_id: sid,
              nama: item.siswa?.nama || 'Unknown',
              kelas: item.siswa?.kelas || '-',
              count: 0
            };
          }
          studentCounts[sid].count += 1;
        });

        const frequent = Object.values(studentCounts)
          .filter((s: any) => s.count >= 3)
          .sort((a: any, b: any) => b.count - a.count);

        return {
          stats: newStats,
          availablePeriodes: distinctPeriodes,
          perfectClasses: newPerfectClasses,
          classData: perKelas,
          categoryData: newCategoryData,
          frequentViolators: frequent
        };
      };

      const result: any = await Promise.race([loadLogic(), timeoutPromise]);

      if (result?.isTimeout) {
        setErrorMsg('Waktu respon Supabase melebihi batas. Menampilkan data lokal.');
      } else if (result?.stats) {
        setStats(result.stats);
        if (result.availablePeriodes?.length) setAvailablePeriodes(result.availablePeriodes);
        setPerfectClasses(result.perfectClasses || []);
        setClassData(result.classData || []);
        setCategoryData(result.categoryData || []);
        setFrequentViolators(result.frequentViolators || []);

        try {
          localStorage.setItem('local_disiplin_dashboard_cache', JSON.stringify(result));
        } catch (e) {}
      }
    } catch (error: any) {
      console.error('Error fetching Disiplin dashboard data:', error);
      setErrorMsg(error.message || 'Gagal terhubung ke database Supabase.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Supabase Connection Setup Modal */}
      <SupabaseConfigModal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)}
        onSuccess={() => fetchData(true)}
      />

      {/* Connection Notice / Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Kendala Koneksi Database Supabase</h4>
              <p className="text-xs text-rose-600 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Database size={14} /> Atur Koneksi Supabase
            </button>
            <button
              onClick={() => fetchData(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Beranda Disiplin Siswa</h2>
            <button
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-xs active:scale-95 disabled:opacity-50"
              title="Perbarui Data"
            >
              <RefreshCw size={16} className={refreshing || loading ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
            Monitoring pelanggaran & pembinaan tata tertib harian siswa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Periode Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode:</span>
            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value)}
              className="text-xs font-black text-blue-800 bg-blue-50 px-2.5 py-1 rounded-xl outline-none cursor-pointer border border-blue-200"
            >
              {availablePeriodes.map(p => (
                <option key={p} value={p}>Periode {p}</option>
              ))}
              <option value="ALL">Semua Periode</option>
            </select>
          </div>

          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 rounded-2xl text-xs font-bold transition-all shadow-xs hover:bg-blue-50"
          >
            <Database size={14} className="text-blue-600" />
            <span className="hidden sm:inline">Koneksi Database</span>
          </button>
        </div>
      </div>

      {/* Loading bar when refreshing */}
      {loading && (
        <div className="flex items-center justify-center p-6 bg-blue-50/60 rounded-3xl border border-blue-100 animate-pulse">
          <div className="flex items-center gap-3 text-blue-700 font-bold text-xs sm:text-sm">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Memuat data pembinaan disiplin siswa dari Supabase...</span>
          </div>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kasus</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <BarChart3 size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalKasus}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Semua catatan pelanggaran</p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Kasus Hari Ini</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.kasusBaru}</p>
          <p className="text-[10px] text-amber-600 mt-1 font-bold">Tercatat hari ini</p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Dalam Proses</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.kasusProses}</p>
          <p className="text-[10px] text-rose-600 mt-1 font-bold">Perlu tindak lanjut guru</p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Terselesaikan</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.kasusSelesai}</p>
          <p className="text-[10px] text-emerald-600 mt-1 font-bold">{stats.persentase}% penyelesaian</p>
        </div>
      </div>

      {/* Perfect Classes Banner (Zero Violations Today) */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
            <Trophy size={24} className="text-amber-300" />
          </div>
          <div>
            <h3 className="text-lg font-black leading-tight">Kelas Tertib & Teladan Hari Ini</h3>
            <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
              Kelas yang bersih tanpa catatan pelanggaran hari ini
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
          {perfectClasses.length > 0 ? (
            perfectClasses.map(cls => (
              <span key={cls} className="px-2.5 py-1 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-black border border-white/30">
                {cls}
              </span>
            ))
          ) : (
            <span className="text-xs italic text-emerald-100">Semua kelas memiliki catatan hari ini.</span>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Cases per class bar chart */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800">Catatan Kasus per Kelas</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Distribusi pelanggaran siswa per rombongan belajar</p>
          </div>

          <div className="h-[280px] w-full">
            {classData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-2xl">
                Tidak ada data pelanggaran untuk periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={28}>
                    {classData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category breakdown pie chart */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800">Kategori Pelanggaran</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Proporsi tingkatan kasus yang ditangani</p>
          </div>

          <div className="h-[280px] w-full flex items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-2xl">
                Tidak ada data kategori pelanggaran.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Students with Frequent Violations */}
      {frequentViolators.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <UserX size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Siswa Memerlukan Perhatian Khusus</h3>
              <p className="text-xs text-slate-400 font-medium">Siswa dengan catatan pelanggaran ≥ 3 kali dalam periode ini</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {frequentViolators.map((s, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-xs uppercase">{s.nama}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Kelas {s.kelas}</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs">
                  {s.count}x Kasus
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
