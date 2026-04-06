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
  const [stats, setStats] = useState({
    totalIzin: 0,
    menunggu: 0,
    disetujui: 0,
    ditolak: 0
  });

  const KELAS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch data for the last 6 months to show trends
      const start = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      let allData: any[] = [];

      if (supabase) {
        const { data: fetchedData, error } = await supabase
          .from('izin_siswa')
          .select(`
            *,
            siswa:siswa_id (
              nama_lengkap,
              kelas,
              nisn
            )
          `)
          .gte('tanggal_mulai', start)
          .lte('tanggal_mulai', end);

        if (error) throw error;
        allData = fetchedData || [];
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        allData = localData.filter((d: any) => d.tanggal_mulai >= start && d.tanggal_mulai <= end);
      }

      setData(allData);

      // Current month stats
      const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const currentMonthData = allData.filter(d => d.tanggal_mulai >= currentMonthStart);

      setStats({
        totalIzin: currentMonthData.length,
        menunggu: currentMonthData.filter((d: any) => d.status === 'Menunggu').length,
        disetujui: currentMonthData.filter((d: any) => d.status === 'Disetujui').length,
        ditolak: currentMonthData.filter((d: any) => d.status === 'Ditolak').length
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Chart Data Calculations
  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthData = data.filter(d => d.tanggal_mulai >= currentMonthStart && d.status === 'Disetujui');

  const statsPerKelas = KELAS_OPTIONS.map(kelas => ({
    name: kelas,
    count: currentMonthData.filter(i => i.siswa?.kelas === kelas).length
  })).filter(s => s.count > 0);

  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i);
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

  const topAbsentees = Array.from(new Set(currentMonthData.map(i => i.siswa_id)))
    .map(id => {
      const student = currentMonthData.find(i => i.siswa_id === id)?.siswa;
      const count = currentMonthData.filter(i => i.siswa_id === id).length;
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Izin Siswa</h2>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
        >
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <p>{errorMsg}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pengajuan (Bulan Ini)</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalIzin}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Menunggu</p>
            <p className="text-2xl font-bold text-slate-800">{stats.menunggu}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Disetujui</p>
            <p className="text-2xl font-bold text-slate-800">{stats.disetujui}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ditolak</p>
            <p className="text-2xl font-bold text-slate-800">{stats.ditolak}</p>
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
              <p className="text-xs text-slate-500">Data bulan ini yang disetujui</p>
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
      </div>

      {/* Top Absentees List */}
      <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-rose-800">Siswa Sering Izin (≥ 3x Bulan Ini)</h3>
            <p className="text-xs text-rose-600/70">Daftar siswa dengan frekuensi izin tinggi</p>
          </div>
        </div>

        {topAbsentees.length === 0 ? (
          <div className="bg-white/50 p-8 rounded-xl text-center text-rose-600/70 italic border border-dashed border-rose-200">
            Tidak ada siswa dengan frekuensi izin tinggi bulan ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topAbsentees.map((s: any) => (
              <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-rose-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{s.nama_lengkap}</div>
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
