import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { Users, UserCheck, AlertTriangle, Clock, BarChart3, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardIzin() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<IzinWithSiswa[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [stats, setStats] = useState({
    totalIzin: 0,
    menunggu: 0,
    disetujui: 0,
    ditolak: 0,
    totalSiswa: 0,
    siswaMasuk: 0
  });

  const KELAS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch data for the trend (last 6 months from end date)
      const trendStart = format(subMonths(parseISO(dateRange.end), 5), 'yyyy-MM-dd');
      const fetchStart = trendStart < dateRange.start ? trendStart : dateRange.start;
      const end = dateRange.end;

      let allData: any[] = [];

      if (supabase) {
        const { data: fetchedData, error } = await supabase
          .from('izin_siswa')
          .select(`
            *,
            siswa:siswa_id (
              nama,
              kelas
            )
          `)
          .gte('tanggal_mulai', fetchStart)
          .lte('tanggal_mulai', end);

        if (error) throw error;
        allData = fetchedData || [];
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        allData = localData.filter((d: any) => d.tanggal_mulai >= fetchStart && d.tanggal_mulai <= end);
      }

      setData(allData);

      // Fetch Total Siswa
      let totalSiswaCount = 0;
      if (supabase) {
        const { count } = await supabase.from('master_siswa').select('*', { count: 'exact', head: true });
        totalSiswaCount = count || 0;
      } else {
        const localSiswa = JSON.parse(localStorage.getItem('master_siswa') || '[]');
        totalSiswaCount = localSiswa.length;
      }

      // Selected range stats
      const filteredData = allData.filter(d => d.tanggal_mulai >= dateRange.start && d.tanggal_mulai <= dateRange.end);

      // Calculate Siswa Masuk (Today)
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayAbsent = allData.filter(d => 
        d.status === 'Disetujui' && 
        today >= d.tanggal_mulai && 
        today <= d.tanggal_selesai
      );
      const uniqueTodayAbsent = new Set(todayAbsent.map(d => d.siswa_id)).size;
      const siswaMasuk = totalSiswaCount - uniqueTodayAbsent;

      setStats({
        totalIzin: filteredData.length,
        menunggu: filteredData.filter((d: any) => d.status === 'Menunggu').length,
        disetujui: filteredData.filter((d: any) => d.status === 'Disetujui').length,
        ditolak: filteredData.filter((d: any) => d.status === 'Ditolak').length,
        totalSiswa: totalSiswaCount,
        siswaMasuk: siswaMasuk
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Chart Data Calculations
  const filteredData = data.filter(d => d.tanggal_mulai >= dateRange.start && d.tanggal_mulai <= dateRange.end && d.status === 'Disetujui');

  const statsPerKelas = KELAS_OPTIONS.map(kelas => ({
    name: kelas,
    count: filteredData.filter(i => i.siswa?.kelas === kelas).length
  })).filter(s => s.count > 0);

  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(parseISO(dateRange.end), 5 - i);
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      name: format(d, 'MMM yyyy')
    };
  });

  const statsPerBulan = last6Months.map(m => {
    const count = data.filter(item => {
      const d = parseISO(item.tanggal_mulai);
      return d.getMonth() === m.month && d.getFullYear() === m.year && item.status === 'Disetujui';
    }).length;
    return { name: m.name, count };
  });

  const statsPerAlasan = Array.from(new Set(filteredData.map(i => i.alasan)))
    .map(alasan => ({
      name: alasan,
      count: filteredData.filter(i => i.alasan === alasan).length
    }))
    .sort((a, b) => b.count - a.count);

  const topAbsentees = Array.from(new Set(filteredData.map(i => i.siswa_id)))
    .map(id => {
      const student = filteredData.find(i => i.siswa_id === id)?.siswa;
      const count = filteredData.filter(i => i.siswa_id === id).length;
      return { ...student, id, count };
    })
    .filter(s => s.count >= 3)
    .sort((a, b) => b.count - a.count);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Izin Siswa</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Tgl Awal</span>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm font-bold text-slate-700 outline-none bg-transparent"
              />
            </div>
            <div className="w-px h-8 bg-slate-100 mx-1" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Tgl Akhir</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm font-bold text-slate-700 outline-none bg-transparent"
              />
            </div>
          </div>

          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <p>{errorMsg}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Siswa</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalSiswa}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Siswa Masuk (Hari Ini)</p>
            <p className="text-2xl font-bold text-slate-800">{stats.siswaMasuk}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Izin Disetujui (Periode)</p>
            <p className="text-2xl font-bold text-slate-800">{stats.disetujui}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Menunggu Persetujuan</p>
            <p className="text-2xl font-bold text-slate-800">{stats.menunggu}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Per Kelas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Izin Per Kelas</h3>
              <p className="text-xs text-slate-500">Data periode terpilih yang disetujui</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsPerKelas}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                  {statsPerKelas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Tren Bulanan */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Tren Bulanan</h3>
              <p className="text-xs text-slate-500">Total izin disetujui 6 bulan terakhir</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsPerBulan}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Berdasarkan Alasan */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Alasan Izin</h3>
              <p className="text-xs text-slate-500">Distribusi alasan izin yang disetujui (Periode)</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsPerAlasan} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {statsPerAlasan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Absentees List */}
      <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-rose-800">Siswa Sering Izin (≥ 3x Periode)</h3>
            <p className="text-xs text-rose-600/70">Daftar siswa dengan frekuensi izin tinggi</p>
          </div>
        </div>

        {topAbsentees.length === 0 ? (
          <div className="bg-white/50 p-8 rounded-xl text-center text-rose-600/70 italic border border-dashed border-rose-200">
            Tidak ada siswa dengan frekuensi izin tinggi pada periode ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topAbsentees.map((s: any) => (
              <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-rose-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{s.nama}</div>
                  <div className="text-xs text-slate-500">Kelas {s.kelas}</div>
                </div>
                <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm font-bold">
                  {s.count}x
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
