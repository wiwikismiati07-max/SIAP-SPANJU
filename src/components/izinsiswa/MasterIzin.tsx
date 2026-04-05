import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Upload, Save } from 'lucide-react';

export default function MasterIzin() {
  const [loading, setLoading] = useState(false);

  const backupData = async () => {
    try {
      let dataToExport = { izin_siswa: [], kalender_belajar: [] };
      if (supabase) {
        const { data: iData } = await supabase.from('izin_siswa').select('*');
        const { data: kData } = await supabase.from('kalender_belajar').select('*');
        dataToExport = { izin_siswa: iData || [], kalender_belajar: kData || [] };
      } else {
        dataToExport = {
          izin_siswa: JSON.parse(localStorage.getItem('izinsiswa_data') || '[]'),
          kalender_belajar: JSON.parse(localStorage.getItem('kalender_belajar') || '[]')
        };
      }

      const dataStr = JSON.stringify(dataToExport);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = 'backup_izinsiswa.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error backing up:', error);
      alert('Gagal melakukan backup.');
    }
  };

  const restoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.izin_siswa && json.kalender_belajar) {
          if (supabase) {
             await supabase.from('izin_siswa').upsert(json.izin_siswa, { onConflict: 'id' });
             await supabase.from('kalender_belajar').upsert(json.kalender_belajar, { onConflict: 'id' });
          } else {
             localStorage.setItem('izinsiswa_data', JSON.stringify(json.izin_siswa));
             localStorage.setItem('kalender_belajar', JSON.stringify(json.kalender_belajar));
          }
          alert('Data berhasil direstore!');
        } else {
          alert('Format file backup tidak sesuai.');
        }
      } catch (error) {
        alert('File JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Master Data Izin Siswa</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Backup & Restore Data</h3>
        <div className="flex gap-4">
          <button
            onClick={backupData}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl font-medium transition-colors"
          >
            <Download size={18} /> Backup Data (JSON)
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-medium transition-colors cursor-pointer">
            <Upload size={18} /> Restore Data
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={restoreData}
            />
          </label>
        </div>
        <p className="text-sm text-slate-500 mt-4">
          Catatan: Data siswa diambil dari Master Siswa yang sama dengan aplikasi Si-Telat.
        </p>
      </div>
    </div>
  );
}
