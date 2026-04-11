import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, AlertCircle, TrendingUp, BarChart3, UserX, CheckCircle2, Clock, Phone, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

export default function BKDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [stats, setStats] = useState({
    totalKasus: 0,
    kasusBaru: 0,
    kasusProses: 0,
    kasusSelesai: 0,
    persentase: 0
  });
  const [classData, setClassData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);

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
      if (supabase) {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch cases within date range
        const { data: rangeKasus, error: pError } = await supabase
          .from('bk_transaksi_kasus')
          .select('*, siswa:master_siswa(nama, kelas)')
          .gte('tanggal', dateRange.start)
          .lte('tanggal', dateRange.end);
        
        if (pError) throw pError;

        const safeKasus = rangeKasus || [];
        setAllData(safeKasus);

        const totalKasus = safeKasus.length;
        const kasusBaru = safeKasus.filter(k => k.tanggal === today).length;
        const kasusProses = safeKasus.filter(k => k.status === 'Proses').length;
        const kasusSelesai = safeKasus.filter(k => k.status === 'Selesai').length;

        setStats({
          totalKasus,
          kasusBaru,
          kasusProses,
          kasusSelesai,
          persentase: totalKasus > 0 ? (kasusSelesai / totalKasus) * 100 : 0
        });

        // Chart Data (Per Kelas) - Now Bar Chart
        const perKelas = KELAS_OPTIONS.map(kelas => {
          const count = safeKasus.filter(p => p.kelas === kelas || p.siswa?.kelas === kelas).length;
          return {
            name: kelas,
            value: count
          };
        }).filter(k => k.value > 0);
        setClassData(perKelas);

        // Category Data
        const categories: Record<string, number> = {};
        safeKasus.forEach(k => {
          const cat = k.kasus_kategori || 'Lain-Lain';
          categories[cat] = (categories[cat] || 0) + 1;
        });

        const catData = Object.entries(categories).map(([name, value]) => ({
          name,
          value
        })).sort((a, b) => b.value - a.value);
        setCategoryData(catData);
      } else {
        throw new Error('Supabase client is not initialized');
      }
    } catch (error: any) {
      console.error('Error fetching BK dashboard data:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

  // Calculate students needing parent calls (e.g. > 1 case in period)
  const studentCounts: Record<string, any> = {};
  allData.forEach(k => {
    const sid = k.siswa_id;
    if (!studentCounts[sid]) {
      studentCounts[sid] = {
        nama: k.siswa?.nama || 'Unknown',
        kelas: k.siswa?.kelas || k.kelas || '-',
        count: 0
      };
    }
    studentCounts[sid].count += 1;
  });

  const needParentCall = Object.values(studentCounts)
    .filter((s: any) => s.count >= 2)
    .sort((a: any, b: any) => b.count - a.count);

  const processingCases = allData.filter(k => k.status === 'Proses');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Memuat dashboard BK...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 bg-rose-50 rounded-3xl border border-rose-100 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-rose-800 mb-1">Gagal Memuat Data</h3>
          <p className="text-sm text-rose-600">{errorMsg}</p>
        </div>
        <button 
          onClick={fetchData}
          className="mt-2 px-6 py-2 bg-white text-rose-600 font-bold rounded-xl shadow-sm border border-rose-200 hover:bg-rose-50 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard BK Peduli Siswa</h2>
          <p className="text-sm text-slate-500">Monitoring penanganan kasus siswa</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tgl Awal</span>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-sm font-bold text-slate-700 outline-none bg-transparent"
            />
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex flex-col px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tgl Akhir</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-sm font-bold text-slate-700 outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kasus */}
        <div className="bg-violet-50/50 border border-violet-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-violet-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-violet-600 shadow-sm group-hover:scale-110 transition-transform">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kasus</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalKasus}</p>
            </div>
          </div>
        </div>

        {/* Kasus Baru */}
        <div className="bg-pink-50/50 border border-pink-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-pink-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-pink-600 shadow-sm group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasus Baru</p>
              <p className="text-3xl font-black text-slate-800">{stats.kasusBaru}</p>
            </div>
          </div>
        </div>

        {/* Dalam Proses */}
        <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dalam Proses</p>
              <p className="text-3xl font-black text-slate-800">{stats.kasusProses}</p>
            </div>
          </div>
        </div>

        {/* Selesai */}
        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selesai</p>
              <p className="text-3xl font-black text-slate-800">{stats.kasusSelesai}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Per Kelas - Now Bar Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 border border-pink-100 shadow-sm">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Kasus Per Kelas</h3>
              <p className="text-sm text-slate-500 font-medium">Distribusi kasus berdasarkan kelas (Periode)</p>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={24}>
                  {classData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Frequent Cases */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Grafik Kasus Terbanyak</h3>
              <p className="text-xs text-slate-500">Kategori kasus yang paling sering terjadi</p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panggilan Orang Tua List */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shadow-sm">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Perlu Panggilan Ortu</h3>
              <p className="text-sm text-slate-500 font-medium">Siswa dengan kasus terbanyak (Periode)</p>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {needParentCall.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium italic">Tidak ada siswa yang memerlukan panggilan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {needParentCall.map((s: any, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-slate-400 group-hover:text-rose-600 shadow-sm transition-colors">
                        {s.nama.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 group-hover:text-rose-900 transition-colors uppercase">{s.nama}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas {s.kelas}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-rose-600 leading-none">{s.count}</p>
                      <p className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">Kasus</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kasus Dalam Proses BK Table */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Proses BK</h3>
              <p className="text-sm text-slate-500 font-medium">Daftar kasus yang sedang ditangani</p>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {processingCases.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium italic">Tidak ada kasus dalam proses.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Siswa</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kasus</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Tgl</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {processingCases.map((k: any) => (
                      <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-slate-800 uppercase truncate max-w-[120px]">{k.siswa?.nama || k.nama_siswa}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{k.siswa?.kelas || k.kelas}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-600 line-clamp-1">{k.kasus_nama}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-[10px] font-mono text-slate-400 font-bold">{k.tanggal}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
