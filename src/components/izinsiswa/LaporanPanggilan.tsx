import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function LaporanPanggilan() {
  const [data, setData] = useState<{ siswa: any, totalIzin: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let allIzin: any[] = [];
      let allSiswa: any[] = [];

      if (supabase) {
        const { data: iData } = await supabase.from('izin_siswa').select('*').eq('status', 'Disetujui');
        const { data: sData } = await supabase.from('master_siswa').select('*');
        if (iData) allIzin = iData;
        if (sData) allSiswa = sData;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        allIzin = localData.filter((d: any) => d.status === 'Disetujui');
        allSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
      }

      // Group by siswa_id
      const counts: Record<string, number> = {};
      allIzin.forEach(izin => {
        counts[izin.siswa_id] = (counts[izin.siswa_id] || 0) + 1;
      });

      // Filter > 5
      const panggilanList = Object.entries(counts)
        .filter(([_, count]) => count > 5)
        .map(([siswa_id, count]) => {
          const siswa = allSiswa.find(s => s.id === siswa_id) || { id: siswa_id, nama: 'Unknown', kelas: '-' };
          return { siswa, totalIzin: count };
        })
        .sort((a, b) => b.totalIzin - a.totalIzin);

      setData(panggilanList);
    } catch (error) {
      console.error('Error fetching panggilan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    const exportData = data.map(d => ({
      'NAMA': d.siswa?.nama,
      'KELAS': d.siswa?.kelas,
      'TOTAL IZIN': d.totalIzin
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Panggilan Orang Tua");
    XLSX.writeFile(wb, `Laporan_Panggilan_Orang_Tua.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Laporan Panggilan Orang Tua</h2>
        <button
          onClick={handleDownloadExcel}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-medium transition-colors"
        >
          <Download size={18} /> Download Excel
        </button>
      </div>

      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 text-rose-800">
        <AlertTriangle className="shrink-0 mt-0.5" size={20} />
        <p className="text-sm">
          Daftar di bawah ini adalah siswa yang telah melakukan izin lebih dari 5 kali (status Disetujui). 
          Siswa-siswa ini direkomendasikan untuk pemanggilan orang tua.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Siswa</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-center">Total Izin Disetujui</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">Tidak ada siswa yang melebihi batas izin.</td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{item.siswa?.nama}</div>
                      <div className="text-xs text-slate-500">Kelas {item.siswa?.kelas}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold">
                        {item.totalIzin}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition-colors">
                        Buat Surat Panggilan
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
