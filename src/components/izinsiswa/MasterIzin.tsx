import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Upload, Save, Users, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MasterIzin() {
  const [loading, setLoading] = useState(false);

  const backupData = async () => {
    try {
      let dataToExport = { izin_siswa: [], kalender_belajar: [], master_guru: [], master_mapel: [] };
      if (supabase) {
        const { data: iData } = await supabase.from('izin_siswa').select('*');
        const { data: kData } = await supabase.from('kalender_belajar').select('*');
        const { data: gData } = await supabase.from('master_guru').select('*');
        const { data: mData } = await supabase.from('master_mapel').select('*');
        dataToExport = { 
          izin_siswa: iData || [], 
          kalender_belajar: kData || [],
          master_guru: gData || [],
          master_mapel: mData || []
        };
      } else {
        dataToExport = {
          izin_siswa: JSON.parse(localStorage.getItem('izinsiswa_data') || '[]'),
          kalender_belajar: JSON.parse(localStorage.getItem('kalender_belajar') || '[]'),
          master_guru: JSON.parse(localStorage.getItem('master_guru') || '[]'),
          master_mapel: JSON.parse(localStorage.getItem('master_mapel') || '[]')
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
             if (json.master_mapel) {
               await supabase.from('master_mapel').upsert(json.master_mapel, { onConflict: 'id' });
             }
          } else {
             localStorage.setItem('izinsiswa_data', JSON.stringify(json.izin_siswa));
             localStorage.setItem('kalender_belajar', JSON.stringify(json.kalender_belajar));
             if (json.master_guru) {
               localStorage.setItem('master_guru', JSON.stringify(json.master_guru));
             }
             if (json.master_mapel) {
               localStorage.setItem('master_mapel', JSON.stringify(json.master_mapel));
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

        const newGuru = data.map((row: any) => {
          // Flexible column name detection
          const keys = Object.keys(row);
          const nameKey = keys.find(k => k.toLowerCase().trim() === 'nama guru' || k.toLowerCase().trim() === 'nama_guru' || k.toLowerCase().trim() === 'guru');
          const nama_guru = nameKey ? String(row[nameKey]).trim() : '';
          
          return {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
            nama_guru: nama_guru
          };
        }).filter(g => g.nama_guru);

        if (newGuru.length === 0) {
          alert('Format Excel tidak sesuai. Pastikan ada kolom "Nama Guru". Kolom yang ditemukan: ' + Object.keys(data[0] || {}).join(', '));
          return;
        }

        console.log('Attempting to upload gurus:', newGuru);

        if (supabase) {
          const { data: result, error } = await supabase.from('master_guru').insert(newGuru).select();
          if (error) {
            console.error('Supabase insert error:', error);
            throw error;
          }
          console.log('Upload success:', result);
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

  const handleUploadMapel = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const newMapel = data.map((row: any) => {
          // Flexible column name detection
          const keys = Object.keys(row);
          const mapelKey = keys.find(k => k.toLowerCase().trim() === 'mata pelajaran' || k.toLowerCase().trim() === 'mata_pelajaran' || k.toLowerCase().trim() === 'mapel');
          const nama_mapel = mapelKey ? String(row[mapelKey]).trim() : '';

          return {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
            nama_mapel: nama_mapel
          };
        }).filter(m => m.nama_mapel);

        if (newMapel.length === 0) {
          alert('Format Excel tidak sesuai. Pastikan ada kolom "Mata Pelajaran". Kolom yang ditemukan: ' + Object.keys(data[0] || {}).join(', '));
          return;
        }

        console.log('Attempting to upload mapels:', newMapel);

        if (supabase) {
          const { data: result, error } = await supabase.from('master_mapel').insert(newMapel).select();
          if (error) {
            console.error('Supabase insert error:', error);
            throw error;
          }
          console.log('Upload success:', result);
        } else {
          const localMapel = JSON.parse(localStorage.getItem('master_mapel') || '[]');
          localStorage.setItem('master_mapel', JSON.stringify([...localMapel, ...newMapel]));
        }
        alert(`${newMapel.length} data mata pelajaran berhasil diupload!`);
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
            Pastikan file memiliki kolom <strong>Nama Guru</strong>.
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Master Data Mata Pelajaran</h3>
          <p className="text-sm text-slate-600 mb-4">
            Upload data mata pelajaran dari file Excel (.xlsx).
            Pastikan file memiliki kolom <strong>Mata Pelajaran</strong>.
          </p>
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl font-medium transition-colors cursor-pointer">
            <BookOpen size={18} /> Upload Data Mapel (Excel)
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleUploadMapel}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
