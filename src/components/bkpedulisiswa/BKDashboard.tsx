import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, AlertCircle, TrendingUp, BarChart3, UserX, CheckCircle2, Clock, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

export default function BKDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalKasus: 0,
    kasusBaru: 0,
    kasusProses: 0,
    kasusSelesai: 0,
    persentase: 0
  });
  const [classData, setClassData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

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
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch all cases
        const { data: allKasus, error: pError } = await supabase
          .from('transaksi_pelanggaran')
          .select('*, siswa:master_siswa(nama, kelas)');
        
        if (pError) throw pError;

        const totalKasus = allKasus?.length || 0;
        const kasusBaru = allKasus?.filter(k => k.tanggal === today).length || 0;
        const kasusProses = allKasus?.filter(k => k.status === 'Proses').length || 0;
        const kasusSelesai = allKasus?.filter(k => k.status === 'Selesai').length || 0;

        setStats({
          totalKasus,
          kasusBaru,
          kasusProses,
          kasusSelesai,
          persentase: totalKasus > 0 ? (kasusSelesai / totalKasus) * 100 : 0
        });

        // Chart Data (Per Kelas)
        const perKelas = KELAS_OPTIONS.map(kelas => {
          const count = allKasus?.filter(p => p.kelas === kelas || p.siswa?.kelas === kelas).length || 0;
          return {
            name: kelas,
            value: count,
            percentage: totalKasus > 0 ? (count / totalKasus) * 100 : 0
          };
        }).filter(k => k.value > 0);
        setClassData(perKelas);

        // Category Data (Most frequent cases)
        const categories: Record<string, number> = {};
        allKasus?.forEach(k => {
          const cat = k.kasus_kategori || 'Lain-Lain';
          categories[cat] = (categories[cat] || 0) + 1;
        });

        const catData = Object.entries(categories).map(([name, value]) => ({
          name,
          value
        })).sort((a, b) => b.value - a.value);
        setCategoryData(catData);
      }
    } catch (error) {
      console.error('Error fetching BK dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kasus</p>
            <p className="text-2xl font-black text-slate-800">{stats.totalKasus}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasus Baru</p>
            <p className="text-2xl font-black text-slate-800">{stats.kasusBaru}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dalam Proses</p>
            <p className="text-2xl font-black text-slate-800">{stats.kasusProses}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selesai</p>
            <p className="text-2xl font-black text-slate-800">{stats.kasusSelesai}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Per Kelas */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Persentase Kasus Tiap Kelas</h3>
              <p className="text-xs text-slate-500">Distribusi kasus berdasarkan kelas</p>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {classData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value} Kasus (${props.payload.percentage.toFixed(1)}%)`,
                    `Kelas ${name}`
                  ]}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
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
    </div>
  );
}
