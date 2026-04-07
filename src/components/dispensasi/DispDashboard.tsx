import React, { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TransaksiDispensasi, SiswaSeringDispensasi } from '../../types/dispensasi';

const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const DispDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalDispensasi: 0,
    persentase: 0
  });
  const [classData, setClassData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<SiswaSeringDispensasi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Total Siswa
      const { count: siswaCount } = await supabase.from('master_siswa').select('*', { count: 'exact', head: true });
      
      // 2. Total Dispensasi
      const { data: dispData, error: dispError } = await supabase
        .from('disp_transaksi')
        .select(`
          *,
          siswa:master_siswa(nama, kelas),
          jenis:disp_master_jenis(nama_jenis)
        `);
      
      if (dispError) throw dispError;

      const totalDisp = dispData?.length || 0;
      const totalSiswa = siswaCount || 0;
      const persentase = totalSiswa > 0 ? (totalDisp / totalSiswa) * 100 : 0;

      setStats({
        totalSiswa,
        totalDispensasi: totalDisp,
        persentase
      });

      // 3. Data per Kelas
      const classMap: any = {};
      dispData?.forEach(d => {
        const className = d.kelas || 'Unknown';
        classMap[className] = (classMap[className] || 0) + 1;
      });
      const classChartData = Object.keys(classMap).map(k => ({ name: k, total: classMap[k] })).sort((a,b) => a.name.localeCompare(b.name));
      setClassData(classChartData);

      // 4. Data per Jenis
      const typeMap: any = {};
      dispData?.forEach(d => {
        const typeName = d.jenis?.nama_jenis || 'Lain-lain';
        typeMap[typeName] = (typeMap[typeName] || 0) + 1;
      });
      const typeChartData = Object.keys(typeMap).map(k => ({ name: k, value: typeMap[k] }));
      setTypeData(typeChartData);

      // 5. Top Students
      const studentMap: any = {};
      dispData?.forEach(d => {
        const sid = d.siswa_id;
        if (!studentMap[sid]) {
          studentMap[sid] = {
            siswa_id: sid,
            nama: d.siswa?.nama || 'Unknown',
            kelas: d.kelas,
            jumlah: 0,
            jenis: {}
          };
        }
        studentMap[sid].jumlah += 1;
        const tname = d.jenis?.nama_jenis || 'Lain-lain';
        studentMap[sid].jenis[tname] = (studentMap[sid].jenis[tname] || 0) + 1;
      });

      const topList = Object.values(studentMap).map((s: any) => {
        const bestType = Object.keys(s.jenis).reduce((a, b) => s.jenis[a] > s.jenis[b] ? a : b);
        return {
          ...s,
          jenis_terbanyak: bestType
        };
      }).sort((a, b) => b.jumlah - a.jumlah).slice(0, 5) as SiswaSeringDispensasi[];

      setTopStudents(topList);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 duration-500" />
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl relative z-10">
            <Users size={24} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
            <p className="text-3xl font-black text-slate-800">{stats.totalSiswa}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 duration-500" />
          <div className="p-3 bg-pink-100 text-pink-600 rounded-xl relative z-10">
            <FileText size={24} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dispensasi</p>
            <p className="text-3xl font-black text-slate-800">{stats.totalDispensasi}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 duration-500" />
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl relative z-10">
            <TrendingUp size={24} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">% Siswa Dispensasi</p>
            <p className="text-3xl font-black text-slate-800">{stats.persentase.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Statistik Jenis Dispensasi</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
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
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {typeData.map((entry, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-600 truncate">{entry.name}</span>
                <span className="font-bold text-slate-800 ml-auto">{((entry.value / stats.totalDispensasi) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Grafik Dispensasi per Kelas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {classData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Students */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Siswa Sering Dispensasi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-50">
                <th className="pb-4">Nama Siswa</th>
                <th className="pb-4">Kelas</th>
                <th className="pb-4">Jumlah Dispensasi</th>
                <th className="pb-4">Jenis Terbanyak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {topStudents.map((s, i) => (
                <tr key={i} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {s.nama.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{s.nama}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase">{s.kelas}</span>
                  </td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[10px] font-bold">{s.jumlah} kali</span>
                  </td>
                  <td className="py-4">
                    <span className="text-xs text-slate-500">{s.jenis_terbanyak}</span>
                  </td>
                </tr>
              ))}
              {topStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">Belum ada data rekap</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispDashboard;
