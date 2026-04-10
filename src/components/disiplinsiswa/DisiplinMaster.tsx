import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Trash2, Plus, Search, Database, AlertCircle, Download, FileJson } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DisiplinMaster() {
  const [loading, setLoading] = useState(true);
  const [kasus, setKasus] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKasus, setNewKasus] = useState({
    nama_pelanggaran: '',
    kategori: 'Ringan',
    poin: 0
  });

  useEffect(() => {
    fetchKasus();
  }, []);

  const fetchKasus = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('master_pelanggaran').select('*').order('nama_pelanggaran', { ascending: true });
        if (error) throw error;
        setKasus(data || []);
      }
    } catch (error) {
      console.error('Error fetching master pelanggaran:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      if (supabase) {
        const { data: kData } = await supabase.from('master_pelanggaran').select('*');
        const { data: sData } = await supabase.from('master_siswa').select('*');
        const { data: gData } = await supabase.from('master_guru').select('*');
        
        const backupData = {
          master_pelanggaran: kData,
          master_siswa: sData,
          master_guru: gData,
          backup_date: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_master_disiplin_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      alert('Error backup: ' + error.message);
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const backupData = JSON.parse(content);

        if (!confirm('Restore data akan menimpa data yang ada (jika ID sama) atau menambah data baru. Lanjutkan?')) return;

        setLoading(true);
        if (supabase) {
          if (backupData.master_pelanggaran) {
            await supabase.from('master_pelanggaran').upsert(backupData.master_pelanggaran);
          }
          if (backupData.master_siswa) {
            await supabase.from('master_siswa').upsert(backupData.master_siswa);
          }
          if (backupData.master_guru) {
            await supabase.from('master_guru').upsert(backupData.master_guru);
          }
          alert('Restore data berhasil!');
          fetchKasus();
        }
      } catch (err: any) {
        alert('Error restore: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAdd = async () => {
    if (!newKasus.nama_pelanggaran) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('master_pelanggaran').insert([newKasus]);
        if (error) throw error;
        setNewKasus({ nama_pelanggaran: '', kategori: 'Ringan', poin: 0 });
        setShowAddForm(false);
        fetchKasus();
      }
    } catch (error) {
      console.error('Error adding pelanggaran:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('master_pelanggaran').delete().eq('id', id);
        if (error) throw error;
        fetchKasus();
      }
    } catch (error) {
      console.error('Error deleting pelanggaran:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) throw new Error('Gagal membaca file.');
        
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          alert('File Excel kosong atau tidak terbaca.');
          return;
        }

        const formattedData = jsonData.map((row: any) => {
          const getVal = (keys: string[]) => {
            for (const key of keys) {
              const foundKey = Object.keys(row).find(k => k.trim().toUpperCase() === key.toUpperCase());
              if (foundKey) return row[foundKey];
            }
            return null;
          };

          const nama = getVal(['NAMA PELANGGARAN', 'NAMA', 'PELANGGARAN', 'KASUS', 'CASE', 'NAMA_PELANGGARAN']);
          const kategori = getVal(['KATEGORI', 'CATEGORY', 'LEVEL']) || 'Ringan';
          const poin = parseInt(getVal(['POIN', 'POINTS', 'SCORE']) || '0') || 0;

          return {
            nama_pelanggaran: nama,
            kategori: kategori,
            poin: poin
          };
        }).filter(r => r.nama_pelanggaran);

        if (formattedData.length === 0) {
          alert('Tidak ada data yang valid ditemukan. Pastikan header kolom benar (Contoh: NAMA PELANGGARAN, KATEGORI, POIN)');
          return;
        }

        if (supabase) {
          setLoading(true);
          const { error } = await supabase.from('master_pelanggaran').insert(formattedData);
          if (error) {
            alert('Gagal menyimpan ke database: ' + error.message);
          } else {
            alert(`Berhasil mengupload ${formattedData.length} data!`);
            await fetchKasus();
          }
        } else {
          alert('Koneksi database tidak tersedia.');
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        alert('Terjadi kesalahan saat memproses file: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filteredData = kasus.filter(k => 
    k.nama_pelanggaran?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.kategori?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Pelanggaran</h2>
          <p className="text-sm text-slate-500">Kelola jenis-jenis pelanggaran ringan siswa</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
            title="Backup Master Data ke JSON"
          >
            <Download size={18} />
            Backup
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200 cursor-pointer transition-colors" title="Restore Master Data dari JSON">
            <FileJson size={18} />
            Restore
            <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
          </label>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-100 cursor-pointer transition-colors">
            <Upload size={18} />
            Upload Excel
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Tambah Baru
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Pelanggaran</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newKasus.nama_pelanggaran}
                onChange={e => setNewKasus({...newKasus, nama_pelanggaran: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori</label>
              <select 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newKasus.kategori}
                onChange={e => setNewKasus({...newKasus, kategori: e.target.value})}
              >
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Poin</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newKasus.poin}
                onChange={e => setNewKasus({...newKasus, poin: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-500 font-bold">Batal</button>
            <button onClick={handleAdd} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Simpan</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari pelanggaran..." 
            className="flex-1 outline-none text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={fetchKasus}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <Database size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Nama Pelanggaran</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Poin</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Memuat data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data ditemukan.</td>
                </tr>
              ) : (
                filteredData.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{k.nama_pelanggaran}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        k.kategori === 'Ringan' ? 'bg-emerald-100 text-emerald-600' :
                        k.kategori === 'Sedang' ? 'bg-amber-100 text-amber-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {k.kategori}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{k.poin}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(k.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
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
