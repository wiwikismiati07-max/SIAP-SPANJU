import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TransaksiWithSiswa } from '../../types/sitelat';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserX, Clock, PhoneCall, Download } from 'lucide-react';
import { format, subDays, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export default function Dashboard() {
  const [transaksi, setTransaksi] = useState<TransaksiWithSiswa[]>([]);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [terlambatHariIni, setTerlambatHariIni] = useState(0);
  const [loading, setLoading] = useState(true);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Siswa</p>
            <p className="text-2xl font-bold text-slate-800">{totalSiswa}</p>
          </div>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Terlambat</p>
            <p className="text-2xl font-bold text-slate-800">{uniqueTerlambatCount}</p>
          </div>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tepat Waktu</p>
            <p className="text-2xl font-bold text-slate-800">{totalSiswa - uniqueTerlambatCount}</p>
          </div>
        </div>
        <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm">
            <PhoneCall size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Panggilan Ortu</p>
            <p className="text-2xl font-bold text-slate-800">{frequentLatecomers.length}</p>
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
                    frequentLatecomers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 uppercase">{s.nama}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase">
                            {s.kelas}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-black text-rose-600">{s.count}x</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                            Butuh Panggilan
                          </span>
                        </td>
                      </tr>
                    ))
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
          {[7, 8, 9].map((grade) => {
            const gradeData = transaksi.filter(t => t.siswa?.kelas.startsWith(grade.toString()));
            return (
              <div key={grade} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-black text-slate-800 uppercase tracking-tight">Kelas {grade}</h4>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-wider">
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
                        {gradeData.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-3 text-[10px] font-mono text-slate-400 font-bold">{t.jam}</td>
                            <td className="px-6 py-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded uppercase">
                                {t.siswa?.kelas}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors uppercase">
                                {t.siswa?.nama}
                              </p>
                            </td>
                          </tr>
                        ))}
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
