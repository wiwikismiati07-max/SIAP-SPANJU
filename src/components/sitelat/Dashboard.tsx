import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TransaksiWithSiswa } from '../../types/sitelat';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, UserX, Clock, PhoneCall, Download, BarChart as BarChartIcon, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { format, subDays, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export default function Dashboard() {
  const [transaksi, setTransaksi] = useState<TransaksiWithSiswa[]>([]);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [terlambatHariIni, setTerlambatHariIni] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('All');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch total students
      if (supabase) {
        const { count: siswaCount } = await supabase
          .from('master_siswa')
          .select('*', { count: 'exact', head: true });
        setTotalSiswa(siswaCount || 0);

        // Fetch today's latecomers (unique students)
        const { data: todayData } = await supabase
          .from('transaksi_terlambat')
          .select('siswa_id')
          .eq('tanggal', today);
        
        const uniqueToday = new Set(todayData?.map(t => t.siswa_id)).size;
        setTerlambatHariIni(uniqueToday);

        // Fetch transactions for range
        const { data: transData } = await supabase
          .from('transaksi_terlambat')
          .select(`*`)
          .gte('tanggal', dateRange.start)
          .lte('tanggal', dateRange.end)
          .order('tanggal', { ascending: false })
          .order('jam', { ascending: false });

        if (transData) {
          const { data: sData } = await supabase.from('master_siswa').select('*');
          const joinedData = transData.map(t => ({
            ...t,
            siswa: sData?.find(s => s.id === t.siswa_id) || { id: t.siswa_id, nama: 'Unknown', kelas: '-' }
          }));
          setTransaksi(joinedData as TransaksiWithSiswa[]);
        }
      } else {
        // Fallback to local storage
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        setTotalSiswa(localSiswa.length);

        const localTrans = JSON.parse(localStorage.getItem('sitelat_transaksi') || '[]');
        
        const todayTrans = localTrans.filter((t: any) => t.tanggal === today);
        const uniqueToday = new Set(todayTrans.map((t: any) => t.siswa_id)).size;
        setTerlambatHariIni(uniqueToday);

        const filteredTrans = localTrans.filter((t: any) => 
          t.tanggal >= dateRange.start && t.tanggal <= dateRange.end
        ).map((t: any) => ({
          ...t,
          siswa: localSiswa.find((s: any) => s.id === t.siswa_id)
        })).sort((a: any, b: any) => new Date(`${b.tanggal}T${b.jam}`).getTime() - new Date(`${a.tanggal}T${a.jam}`).getTime());
        
        setTransaksi(filteredTrans);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate chart data (last 7 days)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const count = transaksi.filter(t => t.tanggal === dateStr).length;
    return {
      name: format(d, 'dd/MM'),
      Terlambat: count
    };
  });

  // Calculate frequent latecomers
  const lateCounts = transaksi.reduce((acc, t) => {
    if (t.siswa) {
      acc[t.siswa.id] = (acc[t.siswa.id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const frequentLatecomers = Object.entries(lateCounts)
    .filter(([_, count]) => (count as number) > 2)
    .map(([id, count]) => {
      const siswa = transaksi.find(t => t.siswa?.id === id)?.siswa;
      return { ...siswa, count };
    })
    .sort((a, b) => b.count - a.count);

  const uniqueTerlambatCount = new Set(transaksi.map(t => t.siswa_id)).size;

  // Calculate late students per class for the bar chart
  const classLateCounts = transaksi.reduce((acc, t) => {
    if (t.siswa) {
      acc[t.siswa.kelas] = (acc[t.siswa.kelas] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const barChartData = Object.entries(classLateCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const softColors = [
    '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', 
    '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC', '#FFD1DC',
    '#E2F0CB', '#B5EAD7', '#C7CEEA'
  ];

  const toggleItem = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allKelas = Array.from(new Set(transaksi.map(t => t.siswa?.kelas || '-'))).sort();

  const filteredTransaksi = selectedKelas === 'All' 
    ? transaksi 
    : transaksi.filter(t => t.siswa?.kelas === selectedKelas);

  // Hierarchical grouping: Kelas -> Siswa -> Alasan -> Tanggal -> Jam
  const hierarchicalData = filteredTransaksi.reduce((acc, t) => {
    const kelas = t.siswa?.kelas || 'Tanpa Kelas';
    const siswaNama = t.siswa?.nama || 'Unknown';
    const alasan = t.alasan || 'Tanpa Alasan';
    const tanggal = t.tanggal;
    const jam = t.jam;

    if (!acc[kelas]) acc[kelas] = { count: 0, children: {} };
    acc[kelas].count++;
    
    if (!acc[kelas].children[siswaNama]) acc[kelas].children[siswaNama] = { count: 0, children: {} };
    acc[kelas].children[siswaNama].count++;

    if (!acc[kelas].children[siswaNama].children[alasan]) acc[kelas].children[siswaNama].children[alasan] = { count: 0, children: {} };
    acc[kelas].children[siswaNama].children[alasan].count++;

    if (!acc[kelas].children[siswaNama].children[alasan].children[tanggal]) acc[kelas].children[siswaNama].children[alasan].children[tanggal] = { count: 0, children: [] };
    acc[kelas].children[siswaNama].children[alasan].children[tanggal].count++;
    acc[kelas].children[siswaNama].children[alasan].children[tanggal].children.push(jam);

    return acc;
  }, {} as any);

  const sortedHierarchicalKelas = Object.keys(hierarchicalData).sort();

  return (
    <div className="space-y-6">
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ringkasan Siswa Terlambat</h2>
          <p className="text-slate-500 text-sm">Pantau kehadiran siswa secara real-time</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-1.5 outline-none text-sm font-medium text-slate-700 bg-transparent"
          />
          <span className="text-slate-400">-</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-1.5 outline-none text-sm font-medium text-slate-700 bg-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div className="bg-violet-50/50 border border-violet-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-violet-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-violet-600 shadow-sm group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
              <p className="text-3xl font-black text-slate-800">{totalSiswa}</p>
            </div>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
              <UserX size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Terlambat</p>
              <p className="text-3xl font-black text-slate-800">{uniqueTerlambatCount}</p>
            </div>
          </div>
        </div>

        {/* Tepat Waktu */}
        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tepat Waktu</p>
              <p className="text-3xl font-black text-slate-800">{totalSiswa - uniqueTerlambatCount}</p>
            </div>
          </div>
        </div>

        {/* Panggilan Ortu */}
        <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
              <PhoneCall size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Panggilan Ortu</p>
              <p className="text-3xl font-black text-slate-800">{frequentLatecomers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart: Terlambat Per Kelas */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <BarChartIcon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Rekap Terlambat Per Kelas</h3>
            <p className="text-sm font-medium text-slate-500">Jumlah siswa terlambat berdasarkan kelas pada periode terpilih.</p>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
              />
              <Bar 
                dataKey="count" 
                radius={[6, 6, 0, 0]} 
                barSize={30}
              >
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={softColors[index % softColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pivot Table: Siswa Terlambat Per Kelas (Hierarchical) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Pivot Terlambat Per Kelas</h3>
              <p className="text-sm font-medium text-slate-500">Detail hirarkis siswa terlambat.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase">Pilih Kelas:</span>
              <select 
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">Semua Kelas</option>
                {allKelas.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <button 
              onClick={() => {
                const allIds: string[] = [];
                Object.keys(hierarchicalData).forEach(k => {
                  allIds.push(k);
                  Object.keys(hierarchicalData[k].children).forEach(s => {
                    allIds.push(`${k}-${s}`);
                    Object.keys(hierarchicalData[k].children[s].children).forEach(a => {
                      allIds.push(`${k}-${s}-${a}`);
                      Object.keys(hierarchicalData[k].children[s].children[a].children).forEach(d => {
                        allIds.push(`${k}-${s}-${a}-${d}`);
                      });
                    });
                  });
                });
                setExpandedItems(allIds);
              }}
              className="px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              Expand All
            </button>
            <button 
              onClick={() => setExpandedItems([])}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
        <div className="p-4 bg-slate-50/30">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-cyan-600 px-4 py-2 flex items-center justify-between text-white font-bold text-sm">
              <span>Siswa Terlambat</span>
              <span>Jumlah</span>
            </div>
            <div className="p-2 space-y-1 max-h-[350px] overflow-y-auto custom-scrollbar">
              {sortedHierarchicalKelas.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-medium italic">
                  Tidak ada data untuk ditampilkan.
                </div>
              ) : (
                sortedHierarchicalKelas.map((kelas, idx) => {
                  const kData = hierarchicalData[kelas];
                  const isKExpanded = expandedItems.includes(kelas);
                  const rowColors = ['bg-blue-50/50', 'bg-emerald-50/50', 'bg-violet-50/50'];
                  const hoverColors = ['hover:bg-blue-100/50', 'hover:bg-emerald-100/50', 'hover:bg-violet-100/50'];
                  const colorIdx = idx % rowColors.length;
                  
                  return (
                    <div key={kelas} className="space-y-1">
                      {/* Level 1: Kelas */}
                      <div 
                        className={`flex items-center justify-between p-2 ${rowColors[colorIdx]} ${hoverColors[colorIdx]} rounded-lg cursor-pointer transition-colors group`}
                        onClick={() => toggleItem(kelas)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center bg-white text-slate-500">
                            {isKExpanded ? <span className="leading-none">-</span> : <span className="leading-none">+</span>}
                          </div>
                          <span className="font-black text-slate-800 text-sm">{kelas}</span>
                        </div>
                        <span className="font-black text-slate-800 text-sm">{kData.count}</span>
                      </div>

                      {isKExpanded && (
                        <div className="pl-6 space-y-1">
                          {Object.keys(kData.children).sort().map((siswa) => {
                            const sData = kData.children[siswa];
                            const sId = `${kelas}-${siswa}`;
                            const isSExpanded = expandedItems.includes(sId);

                            return (
                              <div key={siswa} className="space-y-1">
                                {/* Level 2: Siswa */}
                                <div 
                                  className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                                  onClick={() => toggleItem(sId)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center bg-white text-slate-500">
                                      {isSExpanded ? <span className="leading-none">-</span> : <span className="leading-none">+</span>}
                                    </div>
                                    <span className="font-bold text-slate-700 text-sm uppercase">{siswa}</span>
                                  </div>
                                  <span className="font-bold text-slate-700 text-sm">{sData.count}</span>
                                </div>

                                {isSExpanded && (
                                  <div className="pl-6 space-y-1">
                                    {Object.keys(sData.children).sort().map((alasan) => {
                                      const aData = sData.children[alasan];
                                      const aId = `${sId}-${alasan}`;
                                      const isAExpanded = expandedItems.includes(aId);

                                      return (
                                        <div key={alasan} className="space-y-1">
                                          {/* Level 3: Alasan */}
                                          <div 
                                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                                            onClick={() => toggleItem(aId)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center bg-white text-slate-500">
                                                {isAExpanded ? <span className="leading-none">-</span> : <span className="leading-none">+</span>}
                                              </div>
                                              <span className="font-medium text-slate-600 text-sm">{alasan}</span>
                                            </div>
                                            <span className="font-medium text-slate-600 text-sm">{aData.count}</span>
                                          </div>

                                          {isAExpanded && (
                                            <div className="pl-6 space-y-1">
                                              {Object.keys(aData.children).sort().map((tanggal) => {
                                                const dData = aData.children[tanggal];
                                                const dId = `${aId}-${tanggal}`;
                                                const isDExpanded = expandedItems.includes(dId);

                                                return (
                                                  <div key={tanggal} className="space-y-1">
                                                    {/* Level 4: Tanggal */}
                                                    <div 
                                                      className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
                                                      onClick={() => toggleItem(dId)}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border border-slate-300 rounded flex items-center justify-center bg-white text-slate-500">
                                                          {isDExpanded ? <span className="leading-none">-</span> : <span className="leading-none">+</span>}
                                                        </div>
                                                        <span className="font-bold text-slate-500 text-xs font-mono">{tanggal}</span>
                                                      </div>
                                                      <span className="font-bold text-slate-500 text-xs">{dData.count}</span>
                                                    </div>

                                                    {isDExpanded && (
                                                      <div className="pl-10 space-y-1">
                                                        {dData.children.map((jam: string, jIdx: number) => (
                                                          <div key={jIdx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                            <span className="text-slate-400 text-xs font-mono">{jam}</span>
                                                            <span className="text-slate-400 text-xs">1</span>
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
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <PhoneCall size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Panggilan Orang Tua</h3>
              <p className="text-sm font-medium text-slate-500">Siswa dengan keterlambatan lebih dari 2 kali.</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Nama Siswa</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Kelas</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Total Terlambat</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {frequentLatecomers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium italic">
                        Tidak ada siswa yang memenuhi kriteria panggilan orang tua.
                      </td>
                    </tr>
                  ) : (
                    frequentLatecomers.map((s, idx) => {
                      const rowColors = [
                        'bg-rose-50/30', 'bg-emerald-50/30', 'bg-blue-50/30', 
                        'bg-amber-50/30', 'bg-violet-50/30', 'bg-indigo-50/30'
                      ];
                      const textColors = [
                        'text-rose-600', 'text-emerald-600', 'text-blue-600', 
                        'text-amber-600', 'text-violet-600', 'text-indigo-600'
                      ];
                      const colorIdx = idx % rowColors.length;
                      
                      return (
                        <tr key={s.id} className={`${rowColors[colorIdx]} hover:bg-white transition-colors`}>
                          <td className="px-6 py-4">
                            <p className={`font-bold ${textColors[colorIdx]} uppercase`}>{s.nama}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 ${rowColors[colorIdx].replace('/30', '')} ${textColors[colorIdx]} text-[10px] font-black rounded-full uppercase`}>
                              {s.kelas}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-lg font-black ${textColors[colorIdx]}`}>{s.count}x</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`px-3 py-1 ${rowColors[colorIdx].replace('/30', '')} ${textColors[colorIdx]} text-[10px] font-black rounded-full uppercase tracking-wider`}>
                              Butuh Panggilan
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Laporan Mingguan Terlambat</h3>
              <p className="text-sm font-medium text-slate-500">Rekap siswa terlambat minggu ini (Kelas 7, 8, 9).</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({ start: e.target.value, end: e.target.value })}
                className="pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
              <Download size={18} />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 bg-slate-50/30">
          {[7, 8, 9].map((grade, gIdx) => {
            const gradeData = transaksi.filter(t => t.siswa?.kelas.startsWith(grade.toString()));
            const gradeColors = ['bg-blue-50', 'bg-emerald-50', 'bg-violet-50'];
            const gradeTextColors = ['text-blue-600', 'text-emerald-600', 'text-violet-600'];
            const gradeBorderColors = ['border-blue-100', 'border-emerald-100', 'border-violet-100'];

            return (
              <div key={grade} className={`bg-white rounded-2xl border ${gradeBorderColors[gIdx % 3]} shadow-sm flex flex-col overflow-hidden`}>
                <div className={`p-4 ${gradeColors[gIdx % 3]}/50 border-b ${gradeBorderColors[gIdx % 3]} flex items-center justify-between`}>
                  <h4 className={`font-black ${gradeTextColors[gIdx % 3]} uppercase tracking-tight`}>Kelas {grade}</h4>
                  <span className={`px-3 py-1 ${gradeColors[gIdx % 3]} ${gradeTextColors[gIdx % 3]} text-[10px] font-black rounded-full uppercase tracking-wider`}>
                    {gradeData.length} Terlambat
                  </span>
                </div>
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                  {gradeData.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs font-medium italic">
                      Tidak ada data keterlambatan untuk kelas {grade}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10 border-b border-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Jam</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Kelas</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {gradeData.map((t, tIdx) => {
                          const rowColors = [
                            'bg-rose-50/20', 'bg-emerald-50/20', 'bg-blue-50/20', 
                            'bg-amber-50/20', 'bg-violet-50/20', 'bg-indigo-50/20',
                            'bg-cyan-50/20', 'bg-orange-50/20'
                          ];
                          const rowTextColors = [
                            'text-rose-600', 'text-emerald-600', 'text-blue-600', 
                            'text-amber-600', 'text-violet-600', 'text-indigo-600',
                            'text-cyan-600', 'text-orange-600'
                          ];
                          const cIdx = tIdx % rowColors.length;

                          return (
                            <tr key={t.id} className={`${rowColors[cIdx]} hover:bg-white transition-colors group`}>
                              <td className={`px-6 py-3 text-[10px] font-mono ${rowTextColors[cIdx]} font-bold`}>{t.jam}</td>
                              <td className="px-6 py-3">
                                <span className={`px-2 py-0.5 ${rowColors[cIdx].replace('/20', '')} ${rowTextColors[cIdx]} text-[10px] font-black rounded uppercase`}>
                                  {t.siswa?.kelas}
                                </span>
                              </td>
                              <td className="px-6 py-3">
                                <p className={`text-sm font-bold ${rowTextColors[cIdx]} transition-colors uppercase`}>
                                  {t.siswa?.nama}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
