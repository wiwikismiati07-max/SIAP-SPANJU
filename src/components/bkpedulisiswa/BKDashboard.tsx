import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, AlertCircle, TrendingUp, BarChart3, UserX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function BKDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalPelanggaran: 0,
    persentase: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topViolators, setTopViolators] = useState<any[]>([]);

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
    try {
      if (supabase) {
        // Total Siswa
        const { count: countSiswa } = await supabase.from('master_siswa').select('*', { count: 'exact', head: true });
        
        // Total Pelanggaran
        const { data: allPelanggaran, error: pError } = await supabase
          .from('transaksi_pelanggaran')
          .select('*, siswa:siswa_id(nama, kelas)');
        
        if (pError) throw pError;

        const totalSiswa = countSiswa || 0;
        const totalPelanggaran = allPelanggaran?.length || 0;
        
        // Persentase (Siswa yang melanggar / Total Siswa)
        const uniqueStudentsWhoViolated = new Set(allPelanggaran?.map(p => p.siswa_id)).size;
        const persentase = totalSiswa > 0 ? (uniqueStudentsWhoViolated / totalSiswa) * 100 : 0;

        setStats({
          totalSiswa,
          totalPelanggaran,
          persentase
        });

        // Chart Data (Per Kelas)
        const perKelas = KELAS_OPTIONS.map(kelas => ({
          name: kelas,
          count: allPelanggaran?.filter(p => p.siswa?.kelas === kelas).length || 0
        })).filter(k => k.count > 0);
        setChartData(perKelas);

        // Top Violators (> 5x)
        const violatorCounts: Record<string, any> = {};
        allPelanggaran?.forEach(p => {
          if (!violatorCounts[p.siswa_id]) {
            violatorCounts[p.siswa_id] = {
              nama: p.siswa?.nama || 'Unknown',
              kelas: p.siswa?.kelas || '-',
              count: 0
            };
          }
          violatorCounts[p.siswa_id].count++;
        });

        const top = Object.values(violatorCounts)
          .filter(v => v.count >= 5)
          .sort((a, b) => b.count - a.count);
        
        setTopViolators(top);
      }
    } catch (error) {
      console.error('Error fetching BK dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Memuat dashboard BK...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Siswa</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalSiswa}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pelanggaran</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPelanggaran}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Persentase Pelanggaran</p>
            <p className="text-2xl font-bold text-slate-800">{stats.persentase.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Per Kelas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Pelanggaran Per Kelas</h3>
              <p className="text-xs text-slate-500">Distribusi pelanggaran berdasarkan kelas</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Violators */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <UserX size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Siswa Sering Melanggar (≥ 5x)</h3>
              <p className="text-xs text-slate-500">Daftar siswa dengan frekuensi pelanggaran tinggi</p>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {topViolators.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic text-sm">
                Tidak ada siswa dengan pelanggaran ≥ 5x.
              </div>
            ) : (
              topViolators.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{v.nama}</p>
                    <p className="text-xs text-slate-500">Kelas {v.kelas}</p>
                  </div>
                  <div className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                    {v.count} Pelanggaran
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
