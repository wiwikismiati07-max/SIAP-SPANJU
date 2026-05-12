import React, { useState } from 'react';
import { Upload, Trash2, FileSpreadsheet, AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { StudentGraduation } from './types';

export default function KelulusanSetup() {
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        // Map data from Excel
        const mappedData: StudentGraduation[] = jsonData.map((row: any) => {
          const normalizedRow: any = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.toString().toUpperCase().trim();
            normalizedRow[cleanKey] = row[key];
          });

          return {
            nis: String(normalizedRow['NIS'] || normalizedRow['NO INDUK'] || row['NIS'] || '').trim(),
            nama: String(normalizedRow['NAMA'] || normalizedRow['NAMA LENGKAP'] || row['NAMA'] || '').trim(),
            kelas: String(normalizedRow['KELAS'] || row['KELAS'] || '').trim(),
            jenis_kelamin: String(normalizedRow['L/P'] || normalizedRow['JEKEL'] || row['L/P'] || '').trim(),
            no_peserta: String(normalizedRow['NO. PESERTA'] || normalizedRow['NO PESERTA'] || row['NO. PESERTA'] || '').trim(),
            ruang: String(normalizedRow['RUANG'] || row['RUANG'] || '').trim(),
            keterangan: String(normalizedRow['KET'] || normalizedRow['KETERANGAN'] || row['KET'] || 'Lulus').trim(),
          };
        }).filter(s => s.nis && s.nis !== 'undefined' && s.nama && s.nama !== 'undefined');

        if (mappedData.length === 0) {
          throw new Error('Data tidak terbaca. Pastikan kolom NIS dan NAMA ada di baris pertama Excel.');
        }

        if (!supabase) throw new Error('Database tidak terhubung.');

        const { error: upsertError } = await supabase
          .from('kelulusan')
          .upsert(mappedData, { onConflict: 'nis' });

        if (upsertError) {
          if (upsertError.message.includes('relation "public.kelulusan" does not exist')) {
            throw new Error('Tabel "kelulusan" belum dibuat di Supabase.');
          }
          throw upsertError;
        }

        setSuccess(`Berhasil mengunggah ${mappedData.length} data kelulusan.`);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearData = async () => {
    if (!window.confirm('Hapus semua data kelulusan? Tindakan ini tidak dapat dibatalkan.')) return;

    setClearing(true);
    setError(null);
    setSuccess(null);
    try {
      if (!supabase) throw new Error('Database tidak terhubung.');
      const { error: deleteError } = await supabase
        .from('kelulusan')
        .delete()
        .neq('nis', '0');

      if (deleteError) throw deleteError;
      setSuccess('Semua data berhasil dihapus.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
          <Settings size={40} />
        </div>
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">Setup Kelulusan</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Konfigurasi Data Kelulusan Siswa Kelas 9</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 flex flex-col items-center text-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors" />
          
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-2">
            <Upload size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-800">Unggah Data</h3>
            <p className="text-slate-500 text-sm font-medium">Impor data dari file Excel (.xlsx) sesuai format.</p>
          </div>
          
          <label className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-blue-200 transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-95">
            {uploading ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FileSpreadsheet size={20} />
                Pilih File Excel
              </>
            )}
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </motion.div>

        {/* Clear Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 flex flex-col items-center text-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-rose-100 transition-colors" />
          
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-2">
            <Trash2 size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-800">Kosongkan Data</h3>
            <p className="text-slate-500 text-sm font-medium">Hapus seluruh data kelulusan yang tersimpan.</p>
          </div>
          
          <button 
            onClick={clearData}
            disabled={clearing}
            className="w-full py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase tracking-[0.2em] border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3"
          >
            {clearing ? (
              <div className="w-6 h-6 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 size={20} />
                Hapus Semua Data
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-700"
          >
            <AlertCircle size={32} className="shrink-0" />
            <div>
              <p className="font-black uppercase tracking-widest text-xs mb-1">Terjadi Kesalahan</p>
              <p className="font-bold text-lg">{error}</p>
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex items-center gap-4 text-emerald-700"
          >
            <CheckCircle2 size={32} className="shrink-0" />
            <div>
              <p className="font-black uppercase tracking-widest text-xs mb-1">Berhasil</p>
              <p className="font-bold text-lg">{success}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guide */}
      <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-500">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-800">Panduan Unggah</h4>
            <p className="text-slate-500 text-sm font-medium">Pastikan file Excel memiliki kolom berikut:</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'NIS', desc: 'Nomor Induk Siswa' },
            { label: 'NAMA', desc: 'Nama Lengkap' },
            { label: 'KELAS', desc: 'Kelas (9A-9I)' },
            { label: 'KET', desc: 'Lulus/Tidak Lulus' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200">
              <p className="text-sm font-black text-slate-800 mb-1">{item.label}</p>
              <p className="text-[10px] font-bold text-slate-400 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
