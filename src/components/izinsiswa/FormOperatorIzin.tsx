import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa, Siswa } from '../../types/izinsiswa';
import { Check, X, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function FormOperatorIzin() {
  const [pendingIzin, setPendingIzin] = useState<IzinWithSiswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (supabase) {
        const fetchPromise = supabase
          .from('izin_siswa')
          .select('*')
          .eq('status', 'Menunggu')
          .order('created_at', { ascending: false });
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const { data: iData, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (error) throw error;
          
        if (iData) {
          const { data: sData, error: sError } = await supabase.from('master_siswa').select('*');
          if (sError) throw sError;
          
          const joinedData = iData.map((i: any) => ({
            ...i,
            siswa: sData?.find((s: any) => s.id === i.siswa_id) || { id: i.siswa_id, nama: 'Unknown', kelas: '-' }
          }));
          setPendingIzin(joinedData as IzinWithSiswa[]);
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        
        const pending = localData
          .filter((d: any) => d.status === 'Menunggu')
          .map((d: any) => ({
            ...d,
            siswa: localSiswa.find((s: any) => s.id === d.siswa_id) || { id: d.siswa_id, nama: 'Unknown', kelas: '-' }
          }))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
        setPendingIzin(pending);
      }
    } catch (error: any) {
      console.error('Error fetching pending:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Disetujui' | 'Ditolak') => {
    if (!confirm(`Apakah Anda yakin ingin ${status.toLowerCase()} izin ini?`)) return;
    
    try {
      if (supabase) {
        const { error } = await supabase
          .from('izin_siswa')
          .update({ status })
          .eq('id', id);
        if (error) throw error;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const updated = localData.map((d: any) => d.id === id ? { ...d, status } : d);
        localStorage.setItem('izinsiswa_data', JSON.stringify(updated));
      }
      
      alert(`Izin berhasil ${status.toLowerCase()}`);
      fetchPending();
    } catch (error: any) {
      alert(`Gagal update status: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Persetujuan Izin (Operator)</h2>
        <button 
          onClick={fetchPending}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
        >
          Refresh Data
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {errorMsg && (
          <div className="p-4 m-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
            <X size={20} />
            <p>{errorMsg}</p>
          </div>
        )}
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : pendingIzin.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Clock size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Tidak ada pengajuan baru</h3>
            <p className="text-slate-500 mt-1">Semua pengajuan izin telah diproses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Siswa</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Tanggal Izin</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Alasan</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Diajukan Oleh</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingIzin.map((izin) => (
                  <tr key={izin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{izin.siswa?.nama}</div>
                      <div className="text-xs text-slate-500">Kelas {izin.siswa?.kelas}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">
                        {izin.tanggal_mulai === izin.tanggal_selesai 
                          ? format(new Date(izin.tanggal_mulai), 'dd MMM yyyy')
                          : `${format(new Date(izin.tanggal_mulai), 'dd MMM')} - ${format(new Date(izin.tanggal_selesai), 'dd MMM yyyy')}`
                        }
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{izin.alasan}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {izin.diajukan_oleh}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(izin.id, 'Disetujui')}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                        title="Setujui"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(izin.id, 'Ditolak')}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                        title="Tolak"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
