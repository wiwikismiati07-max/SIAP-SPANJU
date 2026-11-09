import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Trash2, Plus, Search, Database, AlertCircle, Download, FileJson, CheckCircle2, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DisiplinMaster() {
  const [loading, setLoading] = useState(true);
  const [kasus, setKasus] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newKasus, setNewKasus] = useState({
    nama_pelanggaran: '',
    kategori: 'Ringan',
    poin: 0
  });

  useEffect(() => {
    fetchKasus();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const fetchKasus = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('master_pelanggaran').select('*').order('nama_pelanggaran', { ascending: true });
        if (error) throw error;
        setKasus(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching master pelanggaran:', error);
      showToast('error', 'Gagal memuat master pelanggaran: ' + (error.message || String(error)));
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
        a.download = `backup_master_disiplin_${(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'))}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('success', 'Backup berhasil diunduh.');
      }
    } catch (error: any) {
      showToast('error', 'Error backup: ' + error.message);
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
          showToast('success', 'Restore data berhasil!');
          fetchKasus();
        }
      } catch (err: any) {
        showToast('error', 'Error restore: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAdd = async () => {
    if (!newKasus.nama_pelanggaran.trim()) {
      showToast('error', 'Mohon isi nama pelanggaran.');
      return;
    }
    try {
      if (supabase) {
        const { error } = await supabase.from('master_pelanggaran').insert([newKasus]);
        if (error) throw error;
        showToast('success', `Pelanggaran "${newKasus.nama_pelanggaran}" berhasil ditambahkan.`);
        setNewKasus({ nama_pelanggaran: '', kategori: 'Ringan', poin: 0 });
        setShowAddForm(false);
        fetchKasus();
      }
    } catch (error: any) {
      console.error('Error adding pelanggaran:', error);
      showToast('error', 'Gagal menambah: ' + (error.message || String(error)));
    }
  };

  const executeDelete = async (item: any) => {
    if (!item?.id) return;
    setIsDeleting(true);
    try {
      if (supabase) {
        // Safe FK handling: unlink any transactions referencing this pelanggaran_id
        await supabase
          .from('transaksi_pelanggaran')
          .update({ pelanggaran_id: null })
          .eq('pelanggaran_id', item.id);

        const { error } = await supabase.from('master_pelanggaran').delete().eq('id', item.id);
        if (error) throw error;
      }

      // Optimistically update list
      setKasus(prev => prev.filter(k => k.id !== item.id));
      showToast('success', `Pelanggaran "${item.nama_pelanggaran}" berhasil dihapus.`);
      setDeletingItem(null);
    } catch (error: any) {
      console.error('Error deleting pelanggaran:', error);
      showToast('error', 'Gagal menghapus pelanggaran: ' + (error.message || String(error)));
    } finally {
      setIsDeleting(false);
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
          showToast('error', 'File Excel kosong atau tidak terbaca.');
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
          showToast('error', 'Tidak ada data yang valid ditemukan. Pastikan header kolom benar (Contoh: NAMA PELANGGARAN, KATEGORI, POIN)');
          return;
        }

        if (supabase) {
          setLoading(true);
          const { error } = await supabase.from('master_pelanggaran').insert(formattedData);
          if (error) {
            showToast('error', 'Gagal menyimpan ke database: ' + error.message);
          } else {
            showToast('success', `Berhasil mengupload ${formattedData.length} data!`);
            await fetchKasus();
          }
        } else {
          showToast('error', 'Koneksi database tidak tersedia.');
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        showToast('error', 'Terjadi kesalahan saat memproses file: ' + err.message);
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
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:bg-black/5 rounded">
            <X size={16} />
          </button>
        </div>
      )}

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
                        onClick={() => setDeletingItem(k)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Pelanggaran"
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

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Hapus Pelanggaran?</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              Apakah Anda yakin ingin menghapus data pelanggaran ini?
            </p>
            <div className="p-3 bg-slate-50 rounded-xl mb-6 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div><span className="font-semibold text-slate-500">Nama:</span> <span className="font-bold text-slate-800">{deletingItem.nama_pelanggaran}</span></div>
              <div><span className="font-semibold text-slate-500">Kategori:</span> {deletingItem.kategori} ({deletingItem.poin} poin)</div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deletingItem)}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Database size={16} className="animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
