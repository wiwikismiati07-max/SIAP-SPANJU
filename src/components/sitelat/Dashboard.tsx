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
            <p className="text-2xl font-bold text-slate-800">-</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Laporan Hadir Terlambat Siswa</h3>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Terakhir Update: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="overflow-auto flex-1 max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-sm font-semibold text-slate-600">Tanggal</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Waktu</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Nama Siswa</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Kelas</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading data...</td></tr>
                ) : transaksi.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada data absensi untuk tanggal ini.</td></tr>
                ) : (
                  transaksi.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm text-slate-600">{t.tanggal}</td>
                      <td className="p-4 text-sm text-slate-600">{t.jam}</td>
                      <td className="p-4 text-sm font-medium text-slate-800">{t.siswa?.nama || 'Unknown'}</td>
                      <td className="p-4 text-sm text-slate-600">{t.siswa?.kelas || '-'}</td>
                      <td className="p-4 text-sm text-rose-600 font-medium">Terlambat</td>
                      <td className="p-4 text-sm text-slate-600">{t.alasan}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Chart & Alerts */}
        <div className="space-y-6">
          {/* Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Tren Keterlambatan (7 Hari)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="Terlambat" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Report Panggilan Orang Tua</h3>
                  <p className="text-xs text-slate-500">Siswa terlambat lebih dari 2 kali</p>
                </div>
              </div>
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Penting</span>
            </div>
            
            <div className="space-y-3 mt-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
              {frequentLatecomers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Tidak ada siswa yang perlu dipanggil.</p>
              ) : (
                frequentLatecomers.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-rose-100/50">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.nama}</p>
                      <p className="text-xs text-slate-500">Kelas {s.kelas}</p>
                    </div>
                    <div className="bg-rose-100 text-rose-700 font-bold text-sm px-3 py-1 rounded-lg">
                      {s.count}x
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
}
