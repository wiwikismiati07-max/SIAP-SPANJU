import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { Users, UserCheck, AlertTriangle, Clock, BarChart3, TrendingUp, FileText, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardIzin() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<IzinWithSiswa[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [stats, setStats] = useState({
    totalIzin: 0,
    menunggu: 0,
    disetujui: 0,
    ditolak: 0,
    totalSiswa: 0,
    siswaMasuk: 0
  });
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

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
        today <= d.tanggal_selesai &&
        d.alasan?.toLowerCase() !== 'dispensasi'
      );
      const uniqueTodayAbsent = new Set(todayAbsent.map(d => d.siswa_id)).size;
      const siswaMasuk = totalSiswaCount - uniqueTodayAbsent;

      setStats({
        totalIzin: filteredData.length,
        menunggu: filteredData.filter((d: any) => d.status === 'Menunggu').length,
        disetujui: filteredData.filter((d: any) => d.status === 'Disetujui' && d.alasan?.toLowerCase() !== 'dispensasi').length,
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

  // Group today's absentees by class and reason (excluding Dispensasi)
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAbsentees = data.filter(d => 
    d.status === 'Disetujui' && 
    today >= d.tanggal_mulai && 
    today <= d.tanggal_selesai &&
    d.alasan?.toLowerCase() !== 'dispensasi'
  );

  const groupedTodayAbsentees = todayAbsentees.reduce((acc: any, curr) => {
    const kelas = curr.siswa?.kelas || 'Tanpa Kelas';
    if (!acc[kelas]) acc[kelas] = {};
    if (!acc[kelas][curr.alasan]) acc[kelas][curr.alasan] = [];
    acc[kelas][curr.alasan].push(curr);
    return acc;
  }, {});

  const sortedClasses = Object.keys(groupedTodayAbsentees).sort();

  const topAbsentees = Array.from(new Set(filteredData.map(i => i.siswa_id)))
    .map(id => {
      const student = filteredData.find(i => i.siswa_id === id)?.siswa;
      const count = filteredData.filter(i => i.siswa_id === id).length;
      return { ...student, id, count };
    })
    .filter(s => s.count >= 3)
    .sort((a, b) => b.count - a.count);

  const hierarchicalData = filteredData.reduce((acc: any, curr) => {
    const kelas = curr.siswa?.kelas || 'Tanpa Kelas';
    const nama = curr.siswa?.nama || 'Unknown';
    const alasan = curr.alasan || 'Tanpa Alasan';
    const tanggal = curr.tanggal_mulai;

    if (!acc[kelas]) acc[kelas] = { count: 0, children: {} };
    acc[kelas].count++;

    if (!acc[kelas].children[nama]) acc[kelas].children[nama] = { count: 0, children: {} };
    acc[kelas].children[nama].count++;

    if (!acc[kelas].children[nama].children[alasan]) acc[kelas].children[nama].children[alasan] = { count: 0, children: {} };
    acc[kelas].children[nama].children[alasan].count++;

    if (!acc[kelas].children[nama].children[alasan].children[tanggal]) acc[kelas].children[nama].children[alasan].children[tanggal] = { count: 0 };
    acc[kelas].children[nama].children[alasan].children[tanggal].count++;

    return acc;
  }, {});

  const sortedHierarchicalKelas = Object.keys(hierarchicalData).sort();
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  const nihilClasses = KELAS_OPTIONS.filter(kelas => !groupedTodayAbsentees[kelas]);

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
        {/* Total Siswa - Violet Soft */}
        <div className="bg-violet-50 p-6 rounded-[2rem] shadow-sm border border-violet-100 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-200/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-violet-600 shadow-sm z-10 border border-violet-100">
            <Users size={28} />
          </div>
          <div className="z-10">
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.15em] mb-1">Total Siswa</p>
            <p className="text-3xl font-black text-violet-900 leading-none">{stats.totalSiswa}</p>
          </div>
        </div>

        {/* Siswa Masuk - Blue Soft */}
        <div className="bg-blue-50 p-6 rounded-[2rem] shadow-sm border border-blue-100 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm z-10 border border-blue-100">
            <UserCheck size={28} />
          </div>
          <div className="z-10">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.15em] mb-1">Siswa Masuk</p>
            <p className="text-3xl font-black text-blue-900 leading-none">{stats.siswaMasuk}</p>
          </div>
        </div>

        {/* Izin Disetujui - Emerald Soft */}
        <div className="bg-emerald-50 p-6 rounded-[2rem] shadow-sm border border-emerald-100 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-200/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm z-10 border border-emerald-100">
            <TrendingUp size={28} />
          </div>
          <div className="z-10">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em] mb-1">Izin Disetujui</p>
            <p className="text-3xl font-black text-emerald-900 leading-none">{stats.disetujui}</p>
          </div>
        </div>

        {/* Menunggu - Amber Soft */}
        <div className="bg-amber-50 p-6 rounded-[2rem] shadow-sm border border-amber-100 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-200/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-amber-600 shadow-sm z-10 border border-amber-100">
            <Clock size={28} />
          </div>
          <div className="z-10">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.15em] mb-1">Menunggu</p>
            <p className="text-3xl font-black text-amber-900 leading-none">{stats.menunggu}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Per Kelas */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Izin Per Kelas</h3>
              <p className="text-sm text-slate-500 font-medium">Data periode terpilih yang disetujui</p>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsPerKelas}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={24}>
                  {statsPerKelas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Tren Bulanan */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Tren Bulanan</h3>
              <p className="text-sm text-slate-500 font-medium">Total izin disetujui 6 bulan terakhir</p>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsPerBulan}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" fill="#3b82f6" fillOpacity={0.8} radius={[8, 8, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Berdasarkan Alasan */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Analisis Alasan Izin</h3>
              <p className="text-sm text-slate-500 font-medium">Distribusi alasan izin yang disetujui (Periode)</p>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsPerAlasan} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} width={120} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                  {statsPerAlasan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Today's Absentees List */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 z-0" />
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Siswa Tidak Masuk Hari Ini</h3>
            <p className="text-sm text-slate-500 font-medium">Monitoring kehadiran real-time (Status: Disetujui)</p>
          </div>
        </div>

        {sortedClasses.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-4 shadow-sm border border-emerald-50">
              <UserCheck size={32} />
            </div>
            <p className="text-slate-500 font-bold text-lg">Luar Biasa!</p>
            <p className="text-slate-400">Semua siswa hadir di sekolah hari ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
            {sortedClasses.map(kelas => (
              <div key={kelas} className="bg-slate-50/30 rounded-[2rem] border border-slate-100 overflow-hidden hover:bg-white hover:shadow-md transition-all duration-300 group">
                <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="font-black text-slate-700 tracking-tight">KELAS {kelas}</h4>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">
                    {Object.values(groupedTodayAbsentees[kelas]).flat().length} Siswa
                  </span>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {Object.keys(groupedTodayAbsentees[kelas]).map((alasan, idx) => {
                    const softColors = [
                      { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400', badge: 'bg-rose-100' },
                      { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', badge: 'bg-amber-100' },
                      { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', badge: 'bg-blue-100' },
                      { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400', badge: 'bg-violet-100' },
                    ];
                    const color = softColors[idx % softColors.length];
                    
                    return (
                      <div key={alasan} className={`p-4 rounded-2xl ${color.bg} border border-white shadow-sm`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${color.dot}`}></span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${color.text}`}>{alasan}</span>
                          </div>
                          <span className={`text-[10px] ${color.badge} ${color.text} px-2 py-0.5 rounded-lg font-black`}>
                            {groupedTodayAbsentees[kelas][alasan].length}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {groupedTodayAbsentees[kelas][alasan].map((item: any) => (
                            <li key={item.id} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                              {item.siswa?.nama}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 100% Attendance Classes (Nihil) */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -mr-32 -mt-32 z-0" />
        
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
            <UserCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Kelas 100% Nihil (Kehadiran Penuh)</h3>
            <p className="text-sm text-slate-500 font-medium">Kelas yang seluruh siswanya masuk (Tidak ada izin hari ini)</p>
          </div>
        </div>

        {nihilClasses.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 relative z-10">
            <p className="text-slate-500 font-bold">Semua kelas memiliki setidaknya satu siswa yang izin hari ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 relative z-10">
            {nihilClasses.map(kelas => (
              <div key={kelas} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center group hover:bg-emerald-50 hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 mb-2 shadow-sm border border-emerald-50 group-hover:scale-110 transition-transform">
                  <UserCheck size={18} />
                </div>
                <span className="text-sm font-black text-emerald-800 tracking-tight">{kelas}</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase mt-1">NIHIL</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pivot Rekap Izin Siswa */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100 shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Pivot Rekap Izin Siswa</h3>
              <p className="text-sm font-medium text-slate-500">Detail hirarkis rekap izin siswa (Periode)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                const allIds: string[] = [];
                Object.keys(hierarchicalData).forEach(k => {
                  allIds.push(k);
                  Object.keys(hierarchicalData[k].children).forEach(s => {
                    allIds.push(`${k}-${s}`);
                    Object.keys(hierarchicalData[k].children[s].children).forEach(a => {
                      allIds.push(`${k}-${s}-${a}`);
                    });
                  });
                });
                setExpandedItems(allIds);
              }}
              className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              Expand All
            </button>
            <button 
              onClick={() => setExpandedItems([])}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-[#993333] px-6 py-3 flex items-center justify-between text-white font-bold text-sm">
            <span className="text-lg">Izin Siswa</span>
            <div className="flex items-center gap-2">
              <span className="text-lg">Jumlah</span>
              <div className="bg-white text-slate-400 rounded p-0.5">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
          <div className="p-2 space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
            {sortedHierarchicalKelas.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-medium italic">
                Tidak ada data untuk ditampilkan.
              </div>
            ) : (
              sortedHierarchicalKelas.map((kelas, idx) => {
                const kData = hierarchicalData[kelas];
                const isKExpanded = expandedItems.includes(kelas);
                const rowColors = ['bg-rose-50/50', 'bg-orange-50/50', 'bg-blue-50/50'];
                const hoverColors = ['hover:bg-rose-100/50', 'hover:bg-orange-100/50', 'hover:bg-blue-100/50'];
                const colorIdx = idx % rowColors.length;
                
                return (
                  <div key={kelas} className="space-y-1">
                    {/* Level 1: Kelas */}
                    <div 
                      className={`flex items-center justify-between p-2 ${rowColors[colorIdx]} ${hoverColors[colorIdx]} rounded-lg cursor-pointer transition-colors group`}
                      onClick={() => toggleItem(kelas)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center bg-white text-slate-500">
                          {isKExpanded ? <span className="leading-none">-</span> : <span className="leading-none">+</span>}
                        </div>
                        <span className="font-black text-slate-800 text-sm">{kelas}</span>
                      </div>
                      <span className="font-black text-slate-800 text-sm">{kData.count}</span>
                    </div>

                    {isKExpanded && (
                      <div className="pl-6 space-y-1">
                        {Object.keys(kData.children).sort().map((siswa) => {
                          const sData = kData.children[siswa];
                          const sId = `${kelas}-${siswa}`;
                          const isSExpanded = expandedItems.includes(sId);

                          return (
                            <div key={siswa} className="space-y-1">
                              {/* Level 2: Siswa */}
                              <div 
                                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                                onClick={() => toggleItem(sId)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center bg-white text-slate-500">
                                    {isSExpanded ? <span className="leading-none">-</span> : <span className="leading-none">+</span>}
                                  </div>
                                  <span className="font-bold text-slate-700 text-sm uppercase">{siswa}</span>
                                </div>
                                <span className="font-bold text-slate-700 text-sm">{sData.count}</span>
                              </div>

                              {isSExpanded && (
                                <div className="pl-6 space-y-1">
                                  {Object.keys(sData.children).sort().map((alasan) => {
                                    const aData = sData.children[alasan];
                                    const aId = `${sId}-${alasan}`;
                                    const isAExpanded = expandedItems.includes(aId);

                                    return (
                                      <div key={alasan} className="space-y-1">
                                        {/* Level 3: Alasan */}
                                        <div 
                                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                                          onClick={() => toggleItem(aId)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center bg-white text-slate-500">
                                              {isAExpanded ? <span className="leading-none">-</span> : <span className="leading-none">+</span>}
                                            </div>
                                            <span className="font-medium text-slate-600 text-sm">{alasan}</span>
                                          </div>
                                          <span className="font-medium text-slate-600 text-sm">{aData.count}</span>
                                        </div>

                                        {isAExpanded && (
                                          <div className="pl-6 space-y-1">
                                            {Object.keys(aData.children).sort().map((tanggal) => {
                                              const dData = aData.children[tanggal];
                                              return (
                                                <div key={tanggal} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                  <span className="text-slate-500 text-xs font-mono pl-6">{tanggal}</span>
                                                  <span className="text-slate-500 text-xs">{dData.count}</span>
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
                );
              })
            )}
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
