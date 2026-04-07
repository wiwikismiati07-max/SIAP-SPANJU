import React, { useState, useEffect } from 'react';
import { Users, Calendar, Activity, AlertCircle, HeartPulse, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const KeagamaanDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalAbsensi: 0,
    totalKegiatan: 0,
    screeningHaid: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [absentByActivity, setAbsentByActivity] = useState<any[]>([]);
  const [screeningList, setScreeningList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Total Siswa
      const { count: siswaCount } = await supabase.from('master_siswa').select('*', { count: 'exact', head: true });
      
      // 2. Total Absensi
      const { count: absensiCount } = await supabase.from('agama_absensi').select('*', { count: 'exact', head: true });
      
      // 3. Total Kegiatan
      const { count: kegiatanCount } = await supabase.from('agama_program').select('*', { count: 'exact', head: true });

      // 4. Screening Haid (> 25 hari dalam sebulan)
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      const { data: haidData } = await supabase
        .from('agama_absensi')
        .select('siswa_id, siswa:master_siswa(nama, kelas)')
        .eq('alasan', 'Haid')
        .gte('tanggal', start)
        .lte('tanggal', end);

      const haidCounts: any = {};
      haidData?.forEach((h: any) => {
        const id = h.siswa_id;
        if (!haidCounts[id]) {
          haidCounts[id] = { 
            id, 
            nama: h.siswa?.nama, 
            kelas: h.siswa?.kelas, 
            count: 0 
          };
        }
        haidCounts[id].count += 1;
      });

      const screening = Object.values(haidCounts).filter((h: any) => h.count > 25);
      setScreeningList(screening);

      // 5. Chart Data (Absensi per Kelas)
      const { data: classData } = await supabase
        .from('agama_absensi')
        .select('siswa:master_siswa(kelas)')
        .eq('alasan', 'Hadir');

      const classCounts: any = {};
      classData?.forEach((c: any) => {
        const kelas = c.siswa?.kelas || 'Unknown';
        classCounts[kelas] = (classCounts[kelas] || 0) + 1;
      });

      const formattedChart = Object.keys(classCounts).map(k => ({
        name: k,
        count: classCounts[k]
      })).sort((a, b) => a.name.localeCompare(b.name));
      setChartData(formattedChart);

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
      }));
      setAbsentByActivity(formattedAct);

      setStats({
        totalSiswa: siswaCount || 0,
        totalAbsensi: absensiCount || 0,
        totalKegiatan: kegiatanCount || 0,
        screeningHaid: screening.length
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Siswa</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.totalSiswa}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Absensi</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.totalAbsensi}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Kegiatan</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.totalKegiatan}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <HeartPulse size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Screening Haid</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.screeningHaid}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-emerald-600" />
            Partisipasi Per Kelas
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <AlertCircle size={20} className="text-rose-600" />
            Ketidakikutsertaan Terbanyak
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absentByActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} width={100} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="count" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Screening Section */}
      <div className="bg-rose-50 p-8 rounded-3xl border border-rose-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
              <HeartPulse size={20} className="text-rose-600" />
              Pemantauan Kesehatan (Screening)
            </h3>
            <p className="text-sm text-rose-600/70">Siswa dengan siklus haid &gt; 25 hari dalam sebulan</p>
          </div>
          <span className="px-4 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-full uppercase">Perlu Screening</span>
        </div>

        {screeningList.length === 0 ? (
          <div className="bg-white/50 p-8 rounded-2xl text-center text-rose-400 italic">
            Tidak ada siswa yang memerlukan screening kesehatan bulan ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screeningList.map((s: any) => (
              <div key={s.id} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">{s.nama}</h4>
                  <p className="text-xs text-slate-500">Kelas {s.kelas}</p>
                </div>
                <div className="text-right">
                  <span className="block text-lg font-black text-rose-600">{s.count} Hari</span>
                  <button className="text-[10px] font-bold text-blue-600 hover:underline">Tindak Lanjut</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeagamaanDashboard;
