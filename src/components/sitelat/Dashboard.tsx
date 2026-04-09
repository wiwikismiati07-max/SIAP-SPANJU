import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TransaksiWithSiswa } from '../../types/sitelat';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserX, Clock, PhoneCall, Download } from 'lucide-react';
import { format, subDays, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export default function Dashboard() {
  const [transaksi, setTransaksi] = useState<TransaksiWithSiswa[]>([]);
  const [totalSiswa, setTotalSiswa] = useState(0);
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
      // Fetch total students
      if (supabase) {
        const { count: siswaCount } = await supabase
          .from('master_siswa')
          .select('*', { count: 'exact', head: true });
        setTotalSiswa(siswaCount || 0);

        // Fetch transactions
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
            <p className="text-2xl font-bold text-slate-800">{transaksi.length}</p>
          </div>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tepat Waktu</p>
            <p className="text-2xl font-bold text-slate-800">{totalSiswa - transaksi.length}</p>
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

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30">
          {[7, 8, 9].map((grade) => {
            const gradeData = transaksi.filter(t => t.siswa?.kelas.startsWith(grade.toString()));
            return (
              <div key={grade} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
                <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                  <h4 className="font-black text-slate-800 uppercase tracking-tight">Kelas {grade}</h4>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                    {gradeData.length} Terlambat
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  {gradeData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium italic">
                      Tidak ada data
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {gradeData.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="text-sm font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors uppercase">
                              {t.siswa?.nama}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-slate-400 font-bold">{t.jam}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded uppercase">
                              {t.siswa?.kelas}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
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
