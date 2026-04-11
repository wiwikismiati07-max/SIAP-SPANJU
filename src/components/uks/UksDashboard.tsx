import React, { useState, useEffect } from 'react';
import { Users, Calendar, Activity, AlertCircle, HeartPulse, Pill, TrendingUp, ShoppingCart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

const UksDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalKunjungan: 0,
    totalSiswaBerobat: 0,
    totalScreening: 0,
    totalObat: 0
  });
  const [visitTrend, setVisitTrend] = useState<any[]>([]);
  const [lowStockObat, setLowStockObat] = useState<any[]>([]);
  const [frequentPatients, setFrequentPatients] = useState<any[]>([]);
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
      
      // 1. Stats
      const { count: kunjunganCount } = await supabase.from('uks_kunjungan').select('*', { count: 'exact', head: true });
      const { data: uniqueSiswa } = await supabase.from('uks_kunjungan').select('siswa_id');
      const totalSiswaBerobat = new Set(uniqueSiswa?.map(s => s.siswa_id)).size;
      
      const { count: screeningCount } = await supabase.from('uks_screening').select('*', { count: 'exact', head: true });
      const { count: obatCount } = await supabase.from('uks_obat').select('*', { count: 'exact', head: true });

      // 2. Visit Trend (Last 7 days)
      const { data: trendData } = await supabase
        .from('uks_kunjungan')
        .select('tanggal')
        .order('tanggal', { ascending: false })
        .limit(100);

      const trendCounts: any = {};
      trendData?.forEach((v: any) => {
        trendCounts[v.tanggal] = (trendCounts[v.tanggal] || 0) + 1;
      });
      const formattedTrend = Object.keys(trendCounts).map(k => ({
        date: format(new Date(k), 'dd MMM'),
        count: trendCounts[k]
      })).reverse().slice(-7);

      // 3. Low Stock Obat (< 5)
      const { data: lowStock } = await supabase
        .from('uks_obat')
        .select('*')
        .lt('stok', 5)
        .order('stok', { ascending: true });

      // 4. Frequent Patients
      const { data: patientsData } = await supabase
        .from('uks_kunjungan')
        .select('siswa_id, siswa:master_siswa(nama, kelas)');
      
      const patientCounts: any = {};
      patientsData?.forEach((p: any) => {
        const key = p.siswa_id;
        if (!patientCounts[key]) {
          patientCounts[key] = { nama: p.siswa?.nama, kelas: p.siswa?.kelas, count: 0 };
        }
        patientCounts[key].count += 1;
      });
      const formattedPatients = Object.values(patientCounts)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalKunjungan: kunjunganCount || 0,
        totalSiswaBerobat: totalSiswaBerobat,
        totalScreening: screeningCount || 0,
        totalObat: obatCount || 0
      });
      setVisitTrend(formattedTrend);
      setLowStockObat(lowStock || []);
      setFrequentPatients(formattedPatients);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard UKS</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Monitoring Kesehatan Siswa SMPN 7 Pasuruan</p>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 px-6 py-3 rounded-full flex items-center gap-3">
          <Calendar size={18} className="text-rose-600" />
          <span className="text-sm font-bold text-slate-700">
            {format(currentTime, 'EEEE, d MMMM yyyy p', { locale: id })}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Kunjungan */}
        <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kunjungan</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalKunjungan}</p>
            </div>
          </div>
        </div>

        {/* Siswa Berobat */}
        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Siswa Berobat</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalSiswaBerobat}</p>
            </div>
          </div>
        </div>

        {/* Total Screening */}
        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
              <HeartPulse size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Screening</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalScreening}</p>
            </div>
          </div>
        </div>

        {/* Total Jenis Obat */}
        <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
              <Pill size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Jenis Obat</p>
              <p className="text-3xl font-black text-slate-800">{stats.totalObat}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visit Trend Chart */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-rose-600" />
              Tren Kunjungan Harian
            </h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Data kunjungan siswa ke UKS 7 hari terakhir</p>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
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
                  {visitTrend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === visitTrend.length - 1 ? '#e11d48' : '#fb7185'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar: Low Stock & Frequent Patients */}
        <div className="space-y-8">
          {/* Low Stock Medicines */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <ShoppingCart size={18} className="text-amber-600" />
                Order Obat
              </h3>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-widest">Stok Menipis</span>
            </div>
            
            <div className="space-y-4">
              {lowStockObat.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">Semua stok obat aman.</p>
              ) : (
                lowStockObat.map((obat) => (
                  <div key={obat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{obat.nama_obat}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{obat.satuan}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-rose-600">{obat.stok}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Tersisa</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Frequent Patients */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Siswa Sering Berobat
              </h3>
            </div>
            
            <div className="space-y-4">
              {frequentPatients.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">Belum ada data kunjungan.</p>
              ) : (
                frequentPatients.map((patient, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-sm group-hover:scale-110 transition-transform">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{patient.nama}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Kelas {patient.kelas}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">{patient.count}x</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Kunjungan</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UksDashboard;
