import React, { useState, useEffect } from 'react';
import { Trophy, Users, Star, BarChart3, PieChart as PieChartIcon, Medal, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { PrestasiStats, RankingSiswa } from '../../types/prestasi';

const PrestasiDashboard: React.FC = () => {
  const [stats, setStats] = useState<PrestasiStats>({
    totalSiswa: 0,
    totalPrestasi: 0,
    totalSiswaBerprestasi: 0
  });
  const [classData, setClassData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [ranking, setRanking] = useState<RankingSiswa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Total Siswa
      const { count: totalSiswa } = await supabase
        .from('master_siswa')
        .select('*', { count: 'exact', head: true });

      // 2. Total Prestasi
      const { data: allPrestasi, count: totalPrestasi } = await supabase
        .from('prestasi_siswa')
        .select('*, siswa:master_siswa(nama)', { count: 'exact' });

      // 3. Total Siswa Berprestasi (Unique siswa_id)
      const uniqueSiswaIds = new Set(allPrestasi?.map(p => p.siswa_id));
      const totalSiswaBerprestasi = uniqueSiswaIds.size;

      setStats({
        totalSiswa: totalSiswa || 0,
        totalPrestasi: totalPrestasi || 0,
        totalSiswaBerprestasi
      });

      // 4. Bar Chart Data (Prestasi per Kelas)
      const classCounts: { [key: string]: number } = {};
      allPrestasi?.forEach(p => {
        classCounts[p.kelas] = (classCounts[p.kelas] || 0) + 1;
      });
      const formattedClassData = Object.entries(classCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClassData(formattedClassData);

      // 5. Pie Chart Data (Jenis Prestasi)
      const typeCounts: { [key: string]: number } = { 'Akademik': 0, 'Non Akademik': 0 };
      allPrestasi?.forEach(p => {
        if (typeCounts[p.jenis_prestasi] !== undefined) {
          typeCounts[p.jenis_prestasi]++;
        }
      });
      setTypeData([
        { name: 'Akademik', value: typeCounts['Akademik'] },
        { name: 'Non Akademik', value: typeCounts['Non Akademik'] }
      ]);

      // 6. Top 10 Ranking
      const studentCounts: { [key: string]: { nama: string, kelas: string, count: number } } = {};
      allPrestasi?.forEach(p => {
        if (!studentCounts[p.siswa_id]) {
          studentCounts[p.siswa_id] = { 
            nama: p.siswa?.nama || 'Siswa', 
            kelas: p.kelas, 
            count: 0 
          };
        }
        studentCounts[p.siswa_id].count++;
      });

      const formattedRanking = Object.entries(studentCounts)
        .map(([siswa_id, data]) => ({
          siswa_id,
          nama: data.nama,
          kelas: data.kelas,
          jumlah_prestasi: data.count
        }))
        .sort((a, b) => b.jumlah_prestasi - a.jumlah_prestasi)
        .slice(0, 10);
      
      setRanking(formattedRanking);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#f43f5e', '#f59e0b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Siswa */}
        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalSiswa}</p>
            </div>
          </div>
        </div>

        {/* Total Prestasi */}
        <div className="bg-violet-50/50 border border-violet-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-violet-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-violet-600 shadow-sm group-hover:scale-110 transition-transform">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Prestasi</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalPrestasi}</p>
            </div>
          </div>
        </div>

        {/* Siswa Berprestasi */}
        <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
              <Star size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Siswa Berprestasi</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalSiswaBerprestasi}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <BarChart3 className="text-purple-600" size={24} />
              <h3 className="font-black text-slate-800">Prestasi per Kelas</h3>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <PieChartIcon className="text-cyan-600" size={24} />
              <h3 className="font-black text-slate-800">Jenis Prestasi</h3>
            </div>
          </div>
          <div className="h-80 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/3 space-y-4">
              {typeData.map((item, index) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{item.name}</span>
                  <span className="text-xs font-black text-slate-800 ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Ranking */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <Medal className="text-amber-500" size={24} />
            <h3 className="font-black text-slate-800">Ranking 10 Besar Siswa Berprestasi</h3>
          </div>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ranking.map((item, index) => (
              <div key={item.siswa_id} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-white hover:border-purple-200 transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg mr-4 ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-slate-200 text-slate-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-white text-slate-400'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800 group-hover:text-purple-600 transition-colors">{item.nama}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.kelas}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-purple-600 font-black">
                    <span className="text-xl">{item.jumlah_prestasi}</span>
                    <Trophy size={16} className="ml-1" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Prestasi</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrestasiDashboard;
