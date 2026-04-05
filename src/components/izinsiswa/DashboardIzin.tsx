import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { Users, UserCheck, AlertTriangle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardIzin() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalIzin: 0,
    menunggu: 0,
    disetujui: 0,
    ditolak: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      if (supabase) {
        // Add timeout to prevent infinite loading if Supabase hangs
        const fetchPromise = supabase
          .from('izin_siswa')
          .select('*')
          .gte('tanggal_mulai', start)
          .lte('tanggal_mulai', end);
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) throw error;

        if (data) {
          setStats({
            totalIzin: data.length,
            menunggu: data.filter((d: any) => d.status === 'Menunggu').length,
            disetujui: data.filter((d: any) => d.status === 'Disetujui').length,
            ditolak: data.filter((d: any) => d.status === 'Ditolak').length
          });
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const filtered = localData.filter((d: any) => d.tanggal_mulai >= start && d.tanggal_mulai <= end);
        setStats({
          totalIzin: filtered.length,
          menunggu: filtered.filter((d: any) => d.status === 'Menunggu').length,
          disetujui: filtered.filter((d: any) => d.status === 'Disetujui').length,
          ditolak: filtered.filter((d: any) => d.status === 'Ditolak').length
        });
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Izin Siswa (Bulan Ini)</h2>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
        >
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <p>{errorMsg}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pengajuan</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalIzin}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Menunggu Persetujuan</p>
            <p className="text-2xl font-bold text-slate-800">{stats.menunggu}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Disetujui</p>
            <p className="text-2xl font-bold text-slate-800">{stats.disetujui}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ditolak</p>
            <p className="text-2xl font-bold text-slate-800">{stats.ditolak}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
