import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Upload, Save, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MasterIzin() {
  const [loading, setLoading] = useState(false);

  const backupData = async () => {
    try {
      let dataToExport = { izin_siswa: [], kalender_belajar: [], master_guru: [] };
      if (supabase) {
        const { data: iData } = await supabase.from('izin_siswa').select('*');
        const { data: kData } = await supabase.from('kalender_belajar').select('*');
        const { data: gData } = await supabase.from('master_guru').select('*');
        dataToExport = { 
          izin_siswa: iData || [], 
          kalender_belajar: kData || [],
          master_guru: gData || []
        };
      } else {
        dataToExport = {
          izin_siswa: JSON.parse(localStorage.getItem('izinsiswa_data') || '[]'),
          kalender_belajar: JSON.parse(localStorage.getItem('kalender_belajar') || '[]'),
          master_guru: JSON.parse(localStorage.getItem('master_guru') || '[]')
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
             if (json.master_guru) {
               await supabase.from('master_guru').upsert(json.master_guru, { onConflict: 'id' });
             }
          } else {
             localStorage.setItem('izinsiswa_data', JSON.stringify(json.izin_siswa));
             localStorage.setItem('kalender_belajar', JSON.stringify(json.kalender_belajar));
             if (json.master_guru) {
               localStorage.setItem('master_guru', JSON.stringify(json.master_guru));
             }
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

  const handleUploadGuru = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newGuru = data.map((row: any) => ({
          id: crypto.randomUUID(),
          nama_guru: row['Nama Guru'] || row['NAMA GURU'] || row['nama_guru'],
          mata_pelajaran: row['Mata Pelajaran'] || row['MATA PELAJARAN'] || row['mata_pelajaran'] || '-'
        })).filter(g => g.nama_guru);

        if (newGuru.length === 0) {
          alert('Format Excel tidak sesuai. Pastikan ada kolom "Nama Guru" dan "Mata Pelajaran".');
          return;
        }

        if (supabase) {
          const { error } = await supabase.from('master_guru').insert(newGuru);
          if (error) throw error;
        } else {
          const localGuru = JSON.parse(localStorage.getItem('master_guru') || '[]');
          localStorage.setItem('master_guru', JSON.stringify([...localGuru, ...newGuru]));
        }
        alert(`${newGuru.length} data guru berhasil diupload!`);
      } catch (error: any) {
        alert(`Gagal upload: ${error.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Master Data Izin Siswa</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Backup & Restore Data</h3>
          <div className="flex flex-col gap-4">
            <button
              onClick={backupData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl font-medium transition-colors"
            >
              <Download size={18} /> Backup Data (JSON)
            </button>
            
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-medium transition-colors cursor-pointer">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Master Data Guru</h3>
          <p className="text-sm text-slate-600 mb-4">
            Upload data guru dari file Excel (.xlsx) untuk digunakan pada form input manual izin.
            Pastikan file memiliki kolom <strong>Nama Guru</strong> dan <strong>Mata Pelajaran</strong>.
          </p>
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl font-medium transition-colors cursor-pointer">
            <Users size={18} /> Upload Data Guru (Excel)
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleUploadGuru}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
