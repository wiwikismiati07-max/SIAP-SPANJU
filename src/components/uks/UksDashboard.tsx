import React, { useState, useEffect } from 'react';
import { Users, Calendar, Activity, AlertCircle, HeartPulse, Pill, TrendingUp, ShoppingCart, FileText, PlusSquare, MinusSquare, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const UksDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState({
    totalKunjungan: 0,
    totalSiswaBerobat: 0,
    totalScreening: 0,
    totalObat: 0
  });
  const [visitTrend, setVisitTrend] = useState<any[]>([]);
  const [lowStockObat, setLowStockObat] = useState<any[]>([]);
  const [frequentPatients, setFrequentPatients] = useState<any[]>([]);
  const [pivotData, setPivotData] = useState<any>({});
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedPivotClass, setSelectedPivotClass] = useState('Semua Kelas');
  const [screeningReport, setScreeningReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Stats filtered by date
      const { count: kunjunganCount } = await supabase
        .from('uks_kunjungan')
        .select('*', { count: 'exact', head: true })
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      const { data: uniqueSiswa } = await supabase
        .from('uks_kunjungan')
        .select('siswa_id')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      const totalSiswaBerobat = new Set(uniqueSiswa?.map(s => s.siswa_id)).size;
      
      const { count: screeningCount } = await supabase
        .from('uks_screening')
        .select('*', { count: 'exact', head: true })
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      const { count: obatCount } = await supabase.from('uks_obat').select('*', { count: 'exact', head: true });

      // 2. Visit Trend (Filtered by date range)
      const { data: trendData } = await supabase
        .from('uks_kunjungan')
        .select('tanggal')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true });

      const trendCounts: any = {};
      trendData?.forEach((v: any) => {
        trendCounts[v.tanggal] = (trendCounts[v.tanggal] || 0) + 1;
      });
      const formattedTrend = Object.keys(trendCounts).map(k => ({
        date: format(new Date(k), 'dd MMM'),
        count: trendCounts[k]
      }));

      // 3. Low Stock Obat (< 5)
      const { data: lowStock } = await supabase
        .from('uks_obat')
        .select('*')
        .lt('stok', 5)
        .order('stok', { ascending: true });

      // 4. Frequent Patients & Pivot Data
      const { data: patientsData } = await supabase
        .from('uks_kunjungan')
        .select('siswa_id, tanggal, jam, keluhan, siswa:master_siswa(nama, kelas)')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      
      const patientCounts: any = {};
      const pivot: any = {};

      patientsData?.forEach((p: any) => {
        const key = p.siswa_id;
        const kelas = p.siswa?.kelas || 'Tanpa Kelas';
        const nama = p.siswa?.nama || 'Unknown';
        const tanggal = p.tanggal;
        const jam = p.jam || '--:--';
        const keluhan = p.keluhan || 'Tidak ada keluhan';

        // Stats for sidebar
        if (!patientCounts[key]) {
          patientCounts[key] = { nama: nama, kelas: kelas, count: 0 };
        }
        patientCounts[key].count += 1;

        // Hierarchical Pivot Data
        if (!pivot[kelas]) pivot[kelas] = { count: 0, students: {} };
        if (!pivot[kelas].students[nama]) pivot[kelas].students[nama] = { count: 0, visits: {} };
        if (!pivot[kelas].students[nama].visits[tanggal]) pivot[kelas].students[nama].visits[tanggal] = { count: 0, details: [] };
        
        pivot[kelas].count++;
        pivot[kelas].students[nama].count++;
        pivot[kelas].students[nama].visits[tanggal].count++;
        pivot[kelas].students[nama].visits[tanggal].details.push({ jam, keluhan });
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
      setPivotData(pivot);

      // 5. Screening Haid Report (> 14 days)
      const { data: haidRaw } = await supabase
        .from('agama_absensi')
        .select('siswa_id, tanggal, siswa:master_siswa(nama, kelas)')
        .eq('alasan', 'Haid')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true });

      const studentHaid: any = {};
      haidRaw?.forEach((item: any) => {
        const id = item.siswa_id;
        if (!studentHaid[id]) {
          studentHaid[id] = {
            nama: item.siswa?.nama,
            kelas: item.siswa?.kelas,
            dates: []
          };
        }
        studentHaid[id].dates.push(new Date(item.tanggal));
      });

      const report: any[] = [];
      Object.keys(studentHaid).forEach(siswaId => {
        const data = studentHaid[siswaId];
        const dates = data.dates.sort((a: any, b: any) => a - b);
        
        if (dates.length > 0) {
          // Find longest contiguous streak
          let currentStreak: Date[] = [dates[0]];
          let longestStreak: Date[] = [dates[0]];

          for (let i = 1; i < dates.length; i++) {
            const diff = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
              currentStreak.push(dates[i]);
            } else {
              if (currentStreak.length > longestStreak.length) {
                longestStreak = [...currentStreak];
              }
              currentStreak = [dates[i]];
            }
          }
          if (currentStreak.length > longestStreak.length) {
            longestStreak = currentStreak;
          }

          // If longest streak > 14 days OR total days > 14
          if (longestStreak.length > 14 || dates.length > 14) {
            report.push({
              siswa_id: siswaId,
              nama: data.nama,
              kelas: data.kelas,
              awal: format(longestStreak[0], 'd MMM yyyy', { locale: id }),
              akhir: format(longestStreak[longestStreak.length - 1], 'd MMM yyyy', { locale: id }),
              durasi: longestStreak.length,
              total: dates.length,
              status: 'Perlu Screening'
            });
          }
        }
      });
      setScreeningReport(report);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const expandAll = () => {
    const allKeys = new Set<string>();
    Object.keys(pivotData).forEach(kelas => {
      allKeys.add(kelas);
      Object.keys(pivotData[kelas].students).forEach(nama => {
        const studentKey = `${kelas}-${nama}`;
        allKeys.add(studentKey);
        Object.keys(pivotData[kelas].students[nama].visits).forEach(tanggal => {
          allKeys.add(`${studentKey}-${tanggal}`);
        });
      });
    });
    setExpandedKeys(allKeys);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard UKS</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Monitoring Kesehatan Siswa SMPN 7 Pasuruan</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mulai:</span>
              <input 
                type="date" 
                className="text-xs font-bold text-slate-700 outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selesai:</span>
              <input 
                type="date" 
                className="text-xs font-bold text-slate-700 outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="bg-rose-50/50 border border-rose-100 px-6 py-3 rounded-2xl flex items-center gap-3">
            <Calendar size={18} className="text-rose-600" />
            <span className="text-sm font-bold text-slate-700">
              {format(currentTime, 'p', { locale: id })}
            </span>
          </div>
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

      {/* Pivot Table Section */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Pivot Kunjungan UKS Per Kelas</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">Detail hirarkis siswa yang sering ke UKS.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Kelas:</span>
              <select 
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                value={selectedPivotClass}
                onChange={(e) => setSelectedPivotClass(e.target.value)}
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {Object.keys(pivotData).sort().map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
              <button 
                onClick={expandAll}
                className="text-xs font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest transition-colors"
              >
                Expand All
              </button>
              <button 
                onClick={collapseAll}
                className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        <div className="border border-slate-100 rounded-[32px] overflow-hidden">
          <div className="bg-rose-800 px-8 py-4 flex items-center justify-between text-white">
            <span className="font-black text-xs uppercase tracking-[0.2em]">Kunjungan Siswa</span>
            <span className="font-black text-xs uppercase tracking-[0.2em]">Jumlah</span>
          </div>
          
          <div className="divide-y divide-slate-50">
            {Object.keys(pivotData)
              .filter(kelas => selectedPivotClass === 'Semua Kelas' || kelas === selectedPivotClass)
              .sort()
              .map((kelas) => (
              <div key={kelas} className="animate-in fade-in duration-300">
                {/* Level 1: Kelas */}
                <div 
                  className="flex items-center justify-between px-8 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => toggleExpand(kelas)}
                >
                  <div className="flex items-center gap-4">
                    {expandedKeys.has(kelas) ? (
                      <MinusSquare size={18} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
                    ) : (
                      <PlusSquare size={18} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
                    )}
                    <span className="font-black text-slate-700 uppercase tracking-widest">Kelas {kelas}</span>
                  </div>
                  <span className="font-black text-slate-800">{pivotData[kelas].count}</span>
                </div>

                {expandedKeys.has(kelas) && (
                  <div className="bg-slate-50/30 divide-y divide-slate-50/50">
                    {Object.keys(pivotData[kelas].students).sort().map((nama) => {
                      const studentKey = `${kelas}-${nama}`;
                      const studentData = pivotData[kelas].students[nama];
                      return (
                        <div key={nama}>
                          {/* Level 2: Siswa */}
                          <div 
                            className="flex items-center justify-between px-12 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                            onClick={() => toggleExpand(studentKey)}
                          >
                            <div className="flex items-center gap-4">
                              {expandedKeys.has(studentKey) ? (
                                <MinusSquare size={16} className="text-slate-300 group-hover:text-rose-600 transition-colors" />
                              ) : (
                                <PlusSquare size={16} className="text-slate-300 group-hover:text-rose-600 transition-colors" />
                              )}
                              <span className="font-bold text-slate-600 text-sm uppercase">{nama}</span>
                            </div>
                            <span className="font-bold text-slate-700 text-sm">{studentData.count}</span>
                          </div>

                          {expandedKeys.has(studentKey) && (
                            <div className="bg-white/50 divide-y divide-slate-50/30">
                              {Object.keys(studentData.visits).sort((a,b) => b.localeCompare(a)).map((tanggal) => {
                                const dateKey = `${studentKey}-${tanggal}`;
                                const dateData = studentData.visits[tanggal];
                                return (
                                  <div key={tanggal}>
                                    {/* Level 3: Tanggal */}
                                    <div 
                                      className="flex items-center justify-between px-16 py-2 hover:bg-slate-50 cursor-pointer transition-colors group"
                                      onClick={() => toggleExpand(dateKey)}
                                    >
                                      <div className="flex items-center gap-4">
                                        {expandedKeys.has(dateKey) ? (
                                          <MinusSquare size={14} className="text-slate-200 group-hover:text-rose-600 transition-colors" />
                                        ) : (
                                          <PlusSquare size={14} className="text-slate-200 group-hover:text-rose-600 transition-colors" />
                                        )}
                                        <span className="text-xs font-medium text-slate-500">{format(new Date(tanggal), 'dd MMM yyyy', {locale: id})}</span>
                                      </div>
                                      <span className="text-xs font-bold text-slate-600">{dateData.count}</span>
                                    </div>

                                    {expandedKeys.has(dateKey) && (
                                      <div className="bg-slate-50/20 px-20 py-2 space-y-2">
                                        {dateData.details.map((detail: any, dIdx: number) => (
                                          <div key={dIdx} className="flex items-start justify-between py-1 border-l-2 border-rose-100 pl-4">
                                            <div>
                                              <p className="text-[10px] font-mono text-rose-400">{detail.jam}</p>
                                              <p className="text-[11px] font-medium text-slate-500 mt-0.5">{detail.keluhan}</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-200">1</span>
                                          </div>
                                        ))}
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
            ))}
            {Object.keys(pivotData).length === 0 && (
              <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold italic">Tidak ada data kunjungan pada periode ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screening Haid Report Section */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-50 rounded-[24px] flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
              <HeartPulse size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pemantauan Kesehatan (Screening)</h3>
              <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg inline-block mt-1">Siswa dengan siklus haid {'>'} 14 hari</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20">
              Perlu Screening
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">Nama Siswa</th>
                <th className="px-8 py-4">Kelas</th>
                <th className="px-8 py-4">Awal Haid</th>
                <th className="px-8 py-4">Akhir Haid</th>
                <th className="px-8 py-4">Durasi</th>
                <th className="px-8 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {screeningReport.map((item, idx) => (
                <tr key={idx} className="group bg-slate-50 hover:bg-white rounded-[32px] border-2 border-transparent hover:border-amber-100 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-500">
                  <td className="px-8 py-6 rounded-l-[32px]">
                    <p className="font-black text-slate-800 uppercase tracking-tight">{item.nama}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-500">{item.kelas}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-600">{item.awal}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-600">{item.akhir}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-black">
                      {item.durasi} Hari
                    </span>
                  </td>
                  <td className="px-8 py-6 rounded-r-[32px] text-right">
                    <button className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                      Tindak Lanjut
                    </button>
                  </td>
                </tr>
              ))}
              {screeningReport.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold italic">Tidak ada siswa yang memerlukan screening haid saat ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UksDashboard;
