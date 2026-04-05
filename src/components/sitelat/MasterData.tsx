import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa } from '../../types/sitelat';
import { Upload, Download, Trash2, Search, Save, RefreshCw, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MasterData() {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('master_siswa').select('*').order('kelas').order('nama');
        if (error) throw error;
        if (data) setSiswa(data);
      } else {
        const local = localStorage.getItem('sitelat_siswa');
        if (local) setSiswa(JSON.parse(local));
      }
    } catch (error) {
      console.error('Error fetching siswa:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateId = (nama: string, kelas: string) => {
    return `${kelas}-${nama}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const newSiswa: Siswa[] = jsonData.map((row: any) => {
        const nama = row['NAMA'] || row['Nama'] || row['nama'] || '';
        const kelas = row['KELAS'] || row['Kelas'] || row['kelas'] || '';
        return {
          id: generateId(nama, kelas),
          nama,
          kelas
        };
      }).filter(s => s.nama && s.kelas);

      if (supabase) {
        // Upsert to avoid breaking foreign keys
        const { error } = await supabase.from('master_siswa').upsert(newSiswa, { onConflict: 'id' });
        if (error) throw error;
        
        // Optionally, we could delete students not in the new list, but that might break existing transactions.
        // So we just upsert.
      } else {
        localStorage.setItem('sitelat_siswa', JSON.stringify(newSiswa));
      }
      
      fetchSiswa(); // Refresh from DB
      alert('Data siswa berhasil diupload!');
    } catch (error) {
      console.error('Error uploading excel:', error);
      alert('Gagal mengupload data Excel.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ NAMA: 'John Doe', KELAS: '7A' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Data_Siswa.xlsx");
  };

  const backupData = async () => {
    try {
      let dataToExport = { siswa: [], transaksi: [] };
      if (supabase) {
        const { data: sData } = await supabase.from('master_siswa').select('*');
        const { data: tData } = await supabase.from('transaksi_terlambat').select('*');
        dataToExport = { siswa: sData || [], transaksi: tData || [] };
      } else {
        dataToExport = {
          siswa: JSON.parse(localStorage.getItem('sitelat_siswa') || '[]'),
          transaksi: JSON.parse(localStorage.getItem('sitelat_transaksi') || '[]')
        };
      }

      const dataStr = JSON.stringify(dataToExport);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = 'backup_sitelat.json';
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
        if (json.siswa && json.transaksi) {
          if (supabase) {
             await supabase.from('master_siswa').upsert(json.siswa, { onConflict: 'id' });
             await supabase.from('transaksi_terlambat').upsert(json.transaksi, { onConflict: 'id' });
          } else {
             localStorage.setItem('sitelat_siswa', JSON.stringify(json.siswa));
             localStorage.setItem('sitelat_transaksi', JSON.stringify(json.transaksi));
          }
          fetchSiswa();
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

  const filteredSiswa = siswa.filter(s => 
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Data Siswa</h2>
          <p className="text-slate-500 text-sm">Kelola data induk siswa untuk pencatatan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadTemplate} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <Download size={16} /> Template
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
            <Upload size={16} /> Upload Excel
          </button>
          <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          
          <button onClick={backupData} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <Save size={16} /> Backup
          </button>
          <label className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer">
            <RefreshCw size={16} /> Restore
            <input type="file" accept=".json" className="hidden" onChange={restoreData} />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama atau kelas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total: {filteredSiswa.length} Siswa
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">Loading data...</div>
          ) : filteredSiswa.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
              <Users size={48} className="text-slate-300" />
              <p>Belum ada data siswa. Silakan upload dari Excel.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredSiswa.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                    {s.kelas}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 text-sm truncate">{s.nama}</p>
                    <p className="text-xs text-slate-500">ID: {s.id.substring(0,8)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
