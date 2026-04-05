import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa } from '../../types/sitelat';
import { CheckCircle2, ArrowLeft, Database } from 'lucide-react';
import { format } from 'date-fns';

const ALASAN_OPTIONS = [
  "Ketiduran",
  "Ban Bocor",
  "Mengantar adik",
  "Tugas dari Guru",
  "Lainnya"
];

const KELAS_OPTIONS = [
  ...Array.from({length: 8}, (_, i) => `7${String.fromCharCode(65+i)}`),
  ...Array.from({length: 8}, (_, i) => `8${String.fromCharCode(65+i)}`),
  ...Array.from({length: 8}, (_, i) => `9${String.fromCharCode(65+i)}`)
];

export default function Pencatatan() {
  const [step, setStep] = useState(1);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Selection State
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [selectedAlasan, setSelectedAlasan] = useState('');
  const [alasanLainnya, setAlasanLainnya] = useState('');

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data: sData, error } = await supabase.from('master_siswa').select('*');
        if (!error) {
          setIsConnected(true);
          if (sData) setSiswaList(sData);
        } else {
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        setSiswaList(localSiswa);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKelas = (kelas: string) => {
    setSelectedKelas(kelas);
    setStep(2);
  };

  const handleSelectSiswa = (siswa: Siswa) => {
    setSelectedSiswa(siswa);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedSiswa || !selectedAlasan) return;
    
    const finalAlasan = selectedAlasan === 'Lainnya' ? alasanLainnya : selectedAlasan;
    if (selectedAlasan === 'Lainnya' && !alasanLainnya) {
      alert('Mohon ketik alasan lainnya');
      return;
    }

    setLoading(true);
    const newRecord = {
      id: crypto.randomUUID(),
      siswa_id: selectedSiswa.id,
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      jam: format(new Date(), 'HH:mm:ss'), // Use HH:mm:ss for Supabase time column
      alasan: finalAlasan
    };

    try {
      if (supabase) {
        const { error } = await supabase.from('transaksi_terlambat').insert([{
          siswa_id: selectedSiswa.id,
          tanggal: format(new Date(), 'yyyy-MM-dd'),
          jam: format(new Date(), 'HH:mm:ss'), // Use HH:mm:ss for Supabase time column
          alasan: finalAlasan
        }]);
        if (error) {
          console.error("Supabase insert error:", error);
          alert(`Gagal menyimpan data: ${error.message}`);
          setLoading(false);
          return;
        }
      } else {
        const localTrans = JSON.parse(localStorage.getItem('sitelat_transaksi') || '[]');
        localTrans.push(newRecord);
        localStorage.setItem('sitelat_transaksi', JSON.stringify(localTrans));
      }
      
      alert('Data keterlambatan berhasil dicatat!');
      resetForm();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(`Terjadi kesalahan sistem: ${error.message || 'Gagal menyimpan data'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedKelas('');
    setSelectedSiswa(null);
    setSelectedAlasan('');
    setAlasanLainnya('');
  };

  const filteredSiswaList = siswaList.filter(s => s.kelas === selectedKelas);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col relative">
      {/* Connection Status */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs font-medium">
        <Database size={14} className={isConnected ? "text-emerald-500" : "text-amber-500"} />
        <span className={isConnected ? "text-emerald-700" : "text-amber-700"}>
          {isConnected ? 'Terhubung dengan Supabase' : 'Mode Lokal (Offline)'}
        </span>
      </div>

      <div className="p-8 md:p-12 text-center space-y-4 border-b border-slate-100">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Input Kehadiran Mandiri</h2>
        <p className="text-slate-500">Silakan ikuti langkah-langkah di bawah ini.</p>
        
        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mt-8">
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step === num ? 'bg-blue-600 text-white shadow-md' : 
                step > num ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {step > num ? <CheckCircle2 size={20} /> : num}
              </div>
              {num < 3 && (
                <div className={`w-12 h-1 rounded-full transition-colors ${
                  step > num ? 'bg-emerald-500' : 'bg-slate-100'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-8 md:p-12 flex-1 flex flex-col">
        {step > 1 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="self-start mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-center text-slate-800 uppercase tracking-widest mb-8">Pilih Kelas Kamu</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {KELAS_OPTIONS.map(k => (
                <button
                  key={k}
                  onClick={() => handleSelectKelas(k)}
                  className="py-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-700 font-bold text-lg transition-all hover:scale-105 hover:shadow-md active:scale-95"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-center text-slate-800 uppercase tracking-widest mb-8">Pilih Nama Kamu</h3>
            {filteredSiswaList.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>Belum ada data siswa untuk kelas {selectedKelas}.</p>
                <p className="text-sm mt-2">Silakan hubungi operator untuk menambahkan data.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredSiswaList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSiswa(s)}
                    className="p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-left transition-all hover:scale-105 hover:shadow-md active:scale-95 flex flex-col gap-1"
                  >
                    <span className="font-bold text-slate-800">{s.nama}</span>
                    <span className="text-xs font-medium text-slate-500">Kelas {s.kelas}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
            <h3 className="text-xl font-bold text-center text-slate-800 uppercase tracking-widest mb-8">Pilih Alasan Keterlambatan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ALASAN_OPTIONS.filter(a => a !== 'Lainnya').map(a => (
                <button
                  key={a}
                  onClick={() => setSelectedAlasan(a)}
                  disabled={loading}
                  className={`p-4 rounded-2xl border-2 transition-all hover:scale-105 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-bold text-center ${
                    selectedAlasan === a 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-700'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            
            <div 
              className={`mt-4 p-6 rounded-2xl border-2 transition-colors space-y-4 cursor-pointer ${
                selectedAlasan === 'Lainnya' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-blue-500 hover:bg-blue-50'
              }`}
              onClick={() => setSelectedAlasan('Lainnya')}
            >
              <div className="flex items-center justify-between">
                <h4 className={`font-bold ${selectedAlasan === 'Lainnya' ? 'text-blue-700' : 'text-slate-700'}`}>Alasan Lainnya</h4>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedAlasan === 'Lainnya' ? 'border-blue-500' : 'border-slate-300'
                }`}>
                  {selectedAlasan === 'Lainnya' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
              </div>
              
              {selectedAlasan === 'Lainnya' && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                  <input 
                    type="text" 
                    placeholder="Ketik alasan manual..." 
                    value={alasanLainnya}
                    onChange={(e) => setAlasanLainnya(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading || !selectedAlasan || (selectedAlasan === 'Lainnya' && !alasanLainnya.trim())}
              className="w-full mt-8 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:bg-slate-300 shadow-sm text-lg"
            >
              {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
