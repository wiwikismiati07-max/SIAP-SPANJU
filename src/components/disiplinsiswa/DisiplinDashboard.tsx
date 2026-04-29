import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, AlertCircle, TrendingUp, BarChart3, UserX, CheckCircle2, Clock, PieChart as PieChartIcon, Trophy, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

export default function DisiplinDashboard() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (supabase) {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch all cases
        const { data: allKasus, error: pError } = await supabase
          .from('transaksi_pelanggaran')
          .select('*, siswa:master_siswa(nama, kelas), pelanggaran:master_pelanggaran(nama_pelanggaran, kategori, poin)');
        
        if (pError) throw pError;

        // Fetch master siswa to calculate perfect classes
        const { data: sData } = await supabase.from('master_siswa').select('*');

        const safeKasus = allKasus || [];
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

        // Calculate perfect classes today
        if (sData) {
          const allUniqueClasses = KELAS_OPTIONS.sort();
          const violatingSiswaIdsToday = new Set(safeKasus.filter(k => k.tanggal === today).map(k => k.siswa_id));
          const perfectClassesToday = allUniqueClasses.filter(kelas => {
            const siswaInClass = sData.filter(s => s.kelas === kelas);
            // Class is perfect if it has students AND none of them violated today
            return siswaInClass.length > 0 && !siswaInClass.some(s => violatingSiswaIdsToday.has(s.id));
          });
          setPerfectClasses(perfectClassesToday);
        }

        // Chart Data (Per Kelas)
        const perKelas = KELAS_OPTIONS.map(kelas => {
          const count = safeKasus.filter(p => p.siswa?.kelas === kelas).length;
          return {
            name: kelas,
            value: count,
            percentage: totalKasus > 0 ? (count / totalKasus) * 100 : 0
          };
        }).filter(k => k.value > 0);
        setClassData(perKelas);

        // Category Data (Most frequent cases)
        const categories: Record<string, number> = {};
        safeKasus.forEach(k => {
          const cat = k.pelanggaran?.kategori || 'Lain-Lain';
          categories[cat] = (categories[cat] || 0) + 1;
        });

        const catData = Object.entries(categories).map(([name, value]) => ({
          name,
          value
        })).sort((a, b) => b.value - a.value);
        setCategoryData(catData);

        // Frequent Violators (> 5x)
        const studentCounts: Record<string, any> = {};
        safeKasus.forEach(k => {
          const sid = k.siswa_id;
          if (!studentCounts[sid]) {
            studentCounts[sid] = {
              nama: k.siswa?.nama || 'Unknown',
              kelas: k.siswa?.kelas || '-',
              count: 0
            };
          }
          studentCounts[sid].count += 1;
        });

        const frequent = Object.values(studentCounts)
          .filter((s: any) => s.count >= 5)
          .sort((a: any, b: any) => b.count - a.count);
        setFrequentViolators(frequent);
      } else {
        throw new Error('Supabase client is not initialized');
      }
    } catch (error: any) {
      console.error('Error fetching Disiplin dashboard data:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Memuat dashboard Disiplin Siswa...</p>
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
        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
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

      {/* Classes with 100% Discipline */}
      {perfectClasses.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-6 rounded-3xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 text-white">
            <Trophy size={120} />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-xl">
              <Star size={32} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                Zona Hijau: Kelas Paling Disiplin Hari Ini
                <span>🏆</span>
              </h3>
              <p className="text-indigo-50 text-sm font-medium mt-1">
                Apresiasi untuk kelas dengan 0 pelanggaran disiplin hari ini. Terus tingkatkan kedisiplinan!
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {perfectClasses.map((kelas) => (
                  <div 
                    key={kelas} 
                    className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-sm font-black flex items-center gap-2 hover:bg-white/20 transition-colors cursor-default"
                  >
                    <Trophy size={14} className="text-yellow-300" />
                    {kelas}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Per Kelas */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Grafik Kategori Pelanggaran</h3>
              <p className="text-xs text-slate-500">Kategori pelanggaran yang paling sering terjadi</p>
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

      {/* Frequent Violators Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <UserX size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Siswa Sering Melanggar (≥ 5x)</h3>
            <p className="text-xs text-slate-500">Daftar siswa dengan intensitas pelanggaran tinggi</p>
          </div>
        </div>

        {frequentViolators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {frequentViolators.map((s, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-rose-50 hover:border-rose-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-slate-400 group-hover:text-rose-600 shadow-sm">
                    {s.nama.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-rose-900">{s.nama}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kelas {s.kelas}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-rose-600">{s.count}</p>
                  <p className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">Pelanggaran</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-slate-500 font-medium">Tidak ada siswa dengan pelanggaran lebih dari 5 kali.</p>
          </div>
        )}
      </div>
    </div>
  );
}
