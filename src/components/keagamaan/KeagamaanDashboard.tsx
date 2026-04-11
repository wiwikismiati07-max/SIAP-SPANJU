import React, { useState, useEffect } from 'react';
import { Users, Calendar, Activity, AlertCircle, HeartPulse, Phone, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

const KeagamaanDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalKetidakhadiran: 0,
    perluPanggilan: 0,
    screeningHaid: 0
  });
  const [participationData, setParticipationData] = useState<any[]>([]);
  const [absentByActivity, setAbsentByActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Total Siswa
      const { count: siswaCount } = await supabase.from('master_siswa').select('*', { count: 'exact', head: true });
      
      // 2. Total Ketidakhadiran (Semua yang bukan 'Hadir')
      const { count: absensiCount } = await supabase
        .from('agama_absensi')
        .select('*', { count: 'exact', head: true })
        .neq('alasan', 'Hadir');
      
      // 3. Perlu Panggilan Ortu (Siswa dengan ketidakhadiran > 3 kali dalam sebulan)
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      const { data: monthlyAbsence } = await supabase
        .from('agama_absensi')
        .select('siswa_id')
        .neq('alasan', 'Hadir')
        .gte('tanggal', start)
        .lte('tanggal', end);

      const studentAbsenceCounts: any = {};
      monthlyAbsence?.forEach((a: any) => {
        studentAbsenceCounts[a.siswa_id] = (studentAbsenceCounts[a.siswa_id] || 0) + 1;
      });
      const perluPanggilan = Object.values(studentAbsenceCounts).filter((c: any) => c >= 3).length;

      // 4. Screening Haid (> 25 hari dalam sebulan)
      const { data: haidData } = await supabase
        .from('agama_absensi')
        .select('siswa_id')
        .eq('alasan', 'Haid')
        .gte('tanggal', start)
        .lte('tanggal', end);

      const haidCounts: any = {};
      haidData?.forEach((h: any) => {
        haidCounts[h.siswa_id] = (haidCounts[h.siswa_id] || 0) + 1;
      });
      const screening = Object.values(haidCounts).filter((c: any) => c > 25).length;

      // 5. Participation Chart (Donut)
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayAbsence } = await supabase
        .from('agama_absensi')
        .select('alasan')
        .eq('tanggal', today);
      
      const totalTodayAbsence = todayAbsence?.length || 0;
      const totalSiswa = siswaCount || 0;
      const hadirCount = totalSiswa - totalTodayAbsence;
      
      setParticipationData([
        { name: 'Mengikuti', value: hadirCount, color: '#10b981' },
        { name: 'Tidak Mengikuti', value: totalTodayAbsence, color: '#f43f5e' }
      ]);

      // 6. Absent by Activity
      const { data: activityData } = await supabase
        .from('agama_absensi')
        .select('kegiatan:agama_program(nama_kegiatan)')
        .neq('alasan', 'Hadir');

      const actCounts: any = {};
      activityData?.forEach((a: any) => {
        const name = a.kegiatan?.nama_kegiatan || 'Unknown';
        actCounts[name] = (actCounts[name] || 0) + 1;
      });

      const formattedAct = Object.keys(actCounts).map(k => ({
        name: k,
        count: actCounts[k]
      })).sort((a, b) => b.count - a.count).slice(0, 5);
      setAbsentByActivity(formattedAct);

      setStats({
        totalSiswa: totalSiswa,
        totalKetidakhadiran: absensiCount || 0,
        perluPanggilan: perluPanggilan,
        screeningHaid: screening
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const participationPercentage = participationData.length > 0 
    ? Math.round((participationData[0].value / (participationData[0].value + participationData[1].value)) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Sistem Informasi Monitoring Kegiatan Keagamaan</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50/50 border border-emerald-100 px-6 py-3 rounded-full flex items-center gap-3">
            <Calendar size={18} className="text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">
              {format(currentTime, 'EEEE, d MMMM yyyy p', { locale: id })}
            </span>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="text-right">
              <p className="text-sm font-black text-slate-800">Administrator</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Online</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Siswa Terdata */}
        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa Terdata</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalSiswa}</p>
            </div>
          </div>
        </div>

        {/* Total Ketidakhadiran */}
        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ketidakhadiran</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalKetidakhadiran}</p>
            </div>
          </div>
        </div>

        {/* Perlu Panggilan Ortu */}
        <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perlu Panggilan Ortu</p>
              <p className="text-3xl font-black text-slate-800">{stats.perluPanggilan}</p>
            </div>
          </div>
        </div>

        {/* Screening Kesehatan */}
        <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
              <HeartPulse size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Screening Kesehatan</p>
              <p className="text-3xl font-black text-slate-800">{stats.screeningHaid}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Participation Donut Chart */}
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Ketercapaian Kegiatan Hari Ini</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Persentase siswa yang mengikuti kegiatan keagamaan</p>
          </div>
          
          <div className="h-[350px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={participationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={140}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {participationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-5xl font-black text-slate-800">{participationPercentage}%</span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Hadir</span>
            </div>
          </div>

          <div className="flex justify-center gap-8 mt-6">
            {participationData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-bold text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Absent by Activity Bar Chart */}
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Ketidakikutsertaan Terbanyak</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Berdasarkan jenis kegiatan keagamaan (Total)</p>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absentByActivity} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={50}>
                  {absentByActivity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f43f5e', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeagamaanDashboard;
