import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Upload, Save, Users, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MasterIzin() {
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const checkDuplicates = async () => {
    setLoading(true);
    setNotification(null);
    try {
      let allData: any[] = [];
      if (supabase) {
        const { data, error } = await supabase.from('izin_siswa').select('*');
        if (error) throw error;
        allData = data || [];
      } else {
        allData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
      }

      // Group by identifying fields
      const groups: { [key: string]: any[] } = {};
      allData.forEach(item => {
        const key = `${item.siswa_id}-${item.tanggal}-${item.jam_mulai}-${item.jam_selesai}-${item.keterangan}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      // Find groups with more than 1 item
      const duplicateGroups = Object.values(groups).filter(g => g.length > 1);
      
      if (duplicateGroups.length === 0) {
        setNotification({ type: 'success', message: 'Tidak ditemukan data double!' });
      } else {
        setDuplicates(duplicateGroups);
        setShowDuplicateModal(true);
      }
    } catch (error: any) {
      setNotification({ type: 'error', message: `Gagal mengecek data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanDuplicates = async () => {
    setLoading(true);
    try {
      const idsToDelete: string[] = [];
      duplicates.forEach(group => {
        // Keep the first one, delete the rest
        const toDelete = group.slice(1).map((item: any) => item.id);
        idsToDelete.push(...toDelete);
      });

      if (supabase) {
        const { error } = await supabase.from('izin_siswa').delete().in('id', idsToDelete);
        if (error) throw error;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const updated = localData.filter((item: any) => !idsToDelete.includes(item.id));
        localStorage.setItem('izinsiswa_data', JSON.stringify(updated));
      }

      setShowDuplicateModal(false);
      setNotification({ type: 'success', message: `Berhasil menghapus ${idsToDelete.length} data double!` });
    } catch (error: any) {
      alert(`Gagal menghapus data double: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setNotification(null);
    try {
      if (supabase) {
        const { error } = await supabase
          .from('izin_siswa')
          .update({ diajukan_oleh: 'Wiwik Ismiati, S.Pd' })
          .neq('diajukan_oleh', 'Wali Murid');
        if (error) throw error;
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const updated = localData.map((d: any) => d.diajukan_oleh !== 'Wali Murid' ? { ...d, diajukan_oleh: 'Wiwik Ismiati, S.Pd' } : d);
        localStorage.setItem('izinsiswa_data', JSON.stringify(updated));
      }
      setNotification({ type: 'success', message: 'Berhasil memperbarui seluruh data pengaju!' });
    } catch (error: any) {
      setNotification({ type: 'error', message: `Gagal memperbarui data: ${error.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Pemeliharaan Data</h3>
          <p className="text-sm text-slate-600 mb-4">
            Gunakan fitur ini untuk memperbarui nama pengaju pada seluruh data izin yang ada menjadi <strong>Wiwik Ismiati, S.Pd</strong>.
          </p>
          
          {notification && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {notification.message}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Save size={18} /> {loading ? 'Memproses...' : 'Update Seluruh Pengaju ke Wiwik Ismiati'}
            </button>

            <button
              onClick={checkDuplicates}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Users size={18} /> {loading ? 'Mengecek...' : 'Cek & Hapus Data Double'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Pembaruan</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin memperbarui seluruh data pengaju menjadi <strong>Wiwik Ismiati, S.Pd</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleBulkUpdate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                Ya, Perbarui Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Data Double Ditemukan</h3>
            <p className="text-slate-600 mb-4">
              Ditemukan <strong>{duplicates.length} grup</strong> data double. Sistem akan menghapus duplikat dan menyisakan 1 data yang benar untuk setiap grup.
            </p>
            
            <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2">
              {duplicates.map((group, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 text-sm">{group[0].nama_siswa} ({group[0].kelas})</p>
                  <p className="text-xs text-slate-500">{group[0].tanggal} | {group[0].jam_mulai} - {group[0].jam_selesai}</p>
                  <p className="text-xs text-slate-600 mt-1 italic">"{group[0].keterangan}"</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                      {group.length} Data
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Akan dihapus: {group.length - 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCleanDuplicates}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-amber-100"
              >
                Hapus Data Double
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Memproses Update...</h3>
            <p className="text-sm text-slate-500 mt-1">Mohon tunggu sebentar, sedang memperbarui data.</p>
          </div>
        </div>
      )}
    </div>
  );
}
