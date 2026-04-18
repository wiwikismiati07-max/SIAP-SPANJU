import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa } from '../../types/izinsiswa';
import { Save, Search, User, AlertCircle, Clock, Calendar, BookOpen, ShieldAlert, CheckCircle2, Trash2, Edit2, X, ClipboardList, Plus, Paperclip, FileText as FileIcon, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DisiplinTransaksi({ user }: { user?: any }) {
  const isAdmin = user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const [loading, setLoading] = useState(false);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [pelanggaran, setPelanggaran] = useState<any[]>([]);
  const [guru, setGuru] = useState<any[]>([]);
  const [transaksi, setTransaksi] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: string[];
  }>({ show: false, type: 'success', message: '' });

  const initialFormData = {
    tanggal: new Date().toISOString().split('T')[0],
    jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
    siswa_id: '',
    pelanggaran_id: '',
    alasan: '',
    penanganan: 'Observasi langsung Oleh guru BK',
    catatan: '',
    konsekuensi: 'Surat pernyataan Siswa',
    tindak_lanjut: 'Konseling Individu',
    wali_kelas: '',
    guru_bk: 'Wiwik Ismiati S.pd',
    status: 'Proses'
  };

  const [formData, setFormData] = useState(initialFormData);

  const PENANGANAN_OPTIONS = [
    'Observasi langsung Oleh guru BK',
    'Pendampingan Berkelanjutan oleh guru BK',
    'Pendekatan Prefentif (Pencegahan)',
    'Pendekatan Kuratif (Penanganan langsung)',
    'Pendekatan Kolaboratif',
    'Pemberian sangsi edukatif',
    'Pemantauan dan Efaluasi'
  ];
  const KONSEKUENSI_OPTIONS = ['Surat pernyataan orang tua', 'Surat pernyataan Siswa', 'Sangsi ditempat', 'Skorsing'];
  const TINDAK_LANJUT_OPTIONS = ['Konseling Individu', 'Konseling Kelompok', 'Mediasi', 'Home visit', 'Panggilan Orang Tua'];
  const GURU_BK_OPTIONS = ['Wiwik Ismiati S.pd', 'Eki Febriani S.pd'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      if (supabase) {
        const { data: sData } = await supabase.from('master_siswa').select('*').order('nama', { ascending: true });
        const { data: pData } = await supabase.from('master_pelanggaran').select('*').order('nama_pelanggaran', { ascending: true });
        const { data: gData } = await supabase.from('master_guru').select('*').order('nama_guru', { ascending: true });
        
        setSiswa(sData || []);
        setPelanggaran(pData || []);
        setGuru(gData || []);
        fetchTransaksi();
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTransaksi = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('transaksi_pelanggaran')
          .select(`
            *,
            siswa:master_siswa(*),
            pelanggaran:master_pelanggaran(*)
          `)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        setTransaksi(data || []);
      }
    } catch (error) {
      console.error('Error fetching transaksi:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.pelanggaran_id) {
      alert('Pilih siswa dan jenis pelanggaran!');
      return;
    }

    setLoading(true);
    try {
      if (supabase) {
        if (editingId) {
          const { error } = await supabase
            .from('transaksi_pelanggaran')
            .update(formData)
            .eq('id', editingId);
          if (error) throw error;
          
          setSuccessMsg('Data pelanggaran berhasil diperbarui!');
        } else {
          const { error } = await supabase.from('transaksi_pelanggaran').insert([formData]);
          if (error) throw error;
          setSuccessMsg('Data pelanggaran berhasil disimpan!');
        }

        setFormData(initialFormData);
        setSelectedSiswa(null);
        setEditingId(null);
        fetchTransaksi();
        
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setFormData({
      tanggal: t.tanggal,
      jam: t.jam,
      siswa_id: t.siswa_id,
      pelanggaran_id: t.pelanggaran_id,
      alasan: t.alasan || '',
      penanganan: t.penanganan || 'Observasi langsung Oleh guru BK',
      catatan: t.catatan || '',
      konsekuensi: t.konsekuensi || 'Surat pernyataan Siswa',
      tindak_lanjut: t.tindak_lanjut || 'Konseling Individu',
      wali_kelas: t.wali_kelas || '',
      guru_bk: t.guru_bk || 'Wiwik Ismiati S.pd',
      status: t.status || 'Proses'
    });
    const s = siswa.find(s => s.id === t.siswa_id);
    if (s) setSelectedSiswa(s);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('transaksi_pelanggaran').delete().eq('id', deleteConfirmId);
        if (error) throw error;
        fetchTransaksi();
        setSuccessMsg('Data pelanggaran berhasil dihapus!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (error: any) {
      alert('Error deleting data: ' + error.message);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        'Nama Siswa': 'Budi Santoso',
        'Kelas': '7A',
        'Nama Pelanggaran': 'Terlambat',
        'Tanggal': '2023-10-25',
        'Jam': '07:15',
        'Alasan': 'Siswa datang terlambat 15 menit karena macet.',
        'Penanganan': 'Observasi langsung Oleh guru BK',
        'Catatan': '',
        'Konsekuensi': 'Surat pernyataan Siswa',
        'Tindak Lanjut': 'Konseling Individu',
        'Wali Kelas': 'Nama Wali Kelas',
        'Guru BK': 'Wiwik Ismiati S.pd',
        'Status': 'Selesai'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Pelanggaran');
    XLSX.writeFile(wb, 'Template_Upload_Pelanggaran_Lama.xlsx');
  };

  const handleUploadOldData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const bstr = event.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          if (data.length === 0) {
            setUploadResult({ show: true, type: 'error', message: 'File Excel kosong!' });
            return;
          }

          const newTransactions: any[] = [];
          const errors: string[] = [];
          
          for (let i = 0; i < data.length; i++) {
            const row = data[i] as any;
            const namaSiswa = String(row['Nama Siswa'] || '').trim();
            const kelas = String(row['Kelas'] || '').trim();
            const namaPelanggaran = String(row['Nama Pelanggaran'] || '').trim();
            
            if (!namaSiswa || !kelas || !namaPelanggaran) {
              errors.push(`Baris ${i + 2}: Data tidak lengkap (Nama, Kelas, atau Pelanggaran kosong)`);
              continue;
            }

            // Find Siswa
            const s = siswa.find(item => 
              item.nama.toLowerCase() === namaSiswa.toLowerCase() && 
              item.kelas === kelas
            );

            // Find Pelanggaran
            const p = pelanggaran.find(item => 
              item.nama_pelanggaran.toLowerCase() === namaPelanggaran.toLowerCase()
            );

            if (!s) {
              errors.push(`Baris ${i + 2}: Siswa "${namaSiswa}" di kelas "${kelas}" tidak ditemukan di Master Siswa.`);
            } else if (!p) {
              errors.push(`Baris ${i + 2}: Pelanggaran "${namaPelanggaran}" tidak ditemukan di Master Pelanggaran.`);
            } else {
              newTransactions.push({
                tanggal: row['Tanggal'] || new Date().toISOString().split('T')[0],
                jam: row['Jam'] || '00:00',
                siswa_id: s.id,
                pelanggaran_id: p.id,
                alasan: row['Alasan'] || '',
                penanganan: row['Penanganan'] || 'Observasi langsung Oleh guru BK',
                catatan: row['Catatan'] || '',
                konsekuensi: row['Konsekuensi'] || 'Surat pernyataan Siswa',
                tindak_lanjut: row['Tindak Lanjut'] || 'Konseling Individu',
                wali_kelas: row['Wali Kelas'] || '',
                guru_bk: row['Guru BK'] || 'Wiwik Ismiati S.pd',
                status: row['Status'] || 'Selesai'
              });
            }
          }

          if (newTransactions.length > 0) {
            if (supabase) {
              const { error } = await supabase.from('transaksi_pelanggaran').insert(newTransactions);
              if (error) throw error;
              
              fetchTransaksi();
              
              if (errors.length > 0) {
                setUploadResult({ 
                  show: true, 
                  type: 'warning', 
                  message: `Berhasil mengupload ${newTransactions.length} data, namun ada ${errors.length} baris yang gagal:`,
                  details: errors
                });
              } else {
                setUploadResult({ 
                  show: true, 
                  type: 'success', 
                  message: `Berhasil mengupload ${newTransactions.length} data pelanggaran!` 
                });
              }
            }
          } else {
            setUploadResult({ 
              show: true, 
              type: 'error', 
              message: 'Tidak ada data valid yang bisa diupload.',
              details: errors
            });
          }
        } catch (err: any) {
          setUploadResult({ show: true, type: 'error', message: 'Error memproses file: ' + err.message });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      setUploadResult({ show: true, type: 'error', message: 'Error membaca file: ' + error.message });
      setLoading(false);
    }
    e.target.value = '';
  };

  const filteredSiswa = siswa.filter(s => 
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Input Pelanggaran Siswa</h2>
          <p className="text-sm text-slate-500">Catat kasus pelanggaran ringan siswa</p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || canEdit) && (
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
              title="Download Template Excel"
            >
              <Download size={18} />
              Template
            </button>
          )}
          {(isAdmin || canEdit) && (
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-100 cursor-pointer transition-colors">
              <Upload size={18} />
              Upload Data Lama
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleUploadOldData} />
            </label>
          )}
        </div>
      </div>

      {uploadResult.show && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-4 ${
          uploadResult.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          uploadResult.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="shrink-0 mt-0.5">
            {uploadResult.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> :
             uploadResult.type === 'warning' ? <AlertCircle size={20} className="text-amber-500" /> :
             <AlertCircle size={20} className="text-rose-500" />}
          </div>
          <div className="flex-1">
            <p className="font-bold">{uploadResult.message}</p>
            {uploadResult.details && uploadResult.details.length > 0 && (
              <ul className="mt-2 text-sm space-y-1 list-disc list-inside opacity-80 max-h-32 overflow-y-auto">
                {uploadResult.details.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
          <button 
            onClick={() => setUploadResult({ ...uploadResult, show: false })}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList size={20} className="text-blue-600" />
                {editingId ? 'Edit Data Pelanggaran' : 'Form Pencatatan Pelanggaran'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Waktu Kejadian */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Calendar size={14} /> Tanggal Kejadian
                  </label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.tanggal}
                    onChange={e => setFormData({...formData, tanggal: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <Clock size={14} /> Jam Kejadian
                  </label>
                  <input 
                    type="time" 
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.jam}
                    onChange={e => setFormData({...formData, jam: e.target.value})}
                  />
                </div>
              </div>

              {/* Data Siswa (Readonly if selected) */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                  <User size={14} /> Siswa Terlibat
                </label>
                {selectedSiswa ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                    <div>
                      <p className="font-bold text-slate-800">{selectedSiswa.nama}</p>
                      <p className="text-xs text-slate-500">Kelas {selectedSiswa.kelas}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedSiswa(null);
                        setFormData({...formData, siswa_id: '', wali_kelas: ''});
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Silakan pilih siswa dari daftar di sebelah kanan.</p>
                )}
              </div>

              {/* Wali Kelas */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                  <User size={14} className="text-indigo-400" /> Wali Kelas
                </label>
                <select 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.wali_kelas}
                  onChange={e => setFormData({...formData, wali_kelas: e.target.value})}
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {guru.map(g => (
                    <option key={g.id} value={g.nama_guru}>{g.nama_guru}</option>
                  ))}
                </select>
              </div>

              {/* Detail Kasus */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    <ShieldAlert size={14} /> Jenis Pelanggaran
                  </label>
                  <select 
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.pelanggaran_id}
                    onChange={e => setFormData({...formData, pelanggaran_id: e.target.value})}
                  >
                    <option value="">-- Pilih Pelanggaran --</option>
                    {pelanggaran.map(p => (
                      <option key={p.id} value={p.id}>{p.nama_pelanggaran} ({p.kategori}) - {p.poin} Poin</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Alasan / Kronologi</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Ceritakan kronologi kejadian secara singkat..."
                    value={formData.alasan}
                    onChange={e => setFormData({...formData, alasan: e.target.value})}
                  />
                </div>
              </div>

              {/* Penanganan & Tindak Lanjut */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Penanganan</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.penanganan}
                    onChange={e => setFormData({...formData, penanganan: e.target.value})}
                  >
                    {PENANGANAN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Konsekuensi</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.konsekuensi}
                    onChange={e => setFormData({...formData, konsekuensi: e.target.value})}
                  >
                    {KONSEKUENSI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Catatan Penanganan</label>
                  <textarea 
                    rows={2}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Catatan tambahan (opsional, maks 500 karakter)..."
                    value={formData.catatan}
                    onChange={e => setFormData({...formData, catatan: e.target.value})}
                  />
                  <div className="text-right text-xs text-slate-400 mt-1">
                    {formData.catatan.length}/500
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tindak Lanjut</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.tindak_lanjut}
                    onChange={e => setFormData({...formData, tindak_lanjut: e.target.value})}
                  >
                    {TINDAK_LANJUT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Guru BK / Penindak</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.guru_bk}
                    onChange={e => setFormData({...formData, guru_bk: e.target.value})}
                  >
                    {GURU_BK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status Penanganan</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Proses" className="text-amber-600">Dalam Proses</option>
                    <option value="Selesai" className="text-emerald-600">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                {editingId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData(initialFormData);
                      setSelectedSiswa(null);
                    }}
                    className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal Edit
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={20} />}
                  {editingId ? 'Simpan Perubahan' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Data Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">10 Data Terakhir</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Siswa</th>
                    <th className="px-4 py-3">Pelanggaran</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transaksi.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">{t.tanggal}</td>
                      <td className="px-4 py-3 font-medium">{t.siswa?.nama} <span className="text-xs text-slate-500">({t.siswa?.kelas})</span></td>
                      <td className="px-4 py-3">{t.pelanggaran?.nama_pelanggaran}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit2 size={16} />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transaksi.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">Belum ada data transaksi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Cari Siswa */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Search size={18} className="text-slate-400" />
                Cari Siswa
              </h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ketik nama atau kelas..." 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredSiswa.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSiswa(s);
                    setFormData({...formData, siswa_id: s.id, wali_kelas: ''}); // Assuming no wali_kelas in master_siswa for now
                  }}
                  className={`w-full text-left p-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${
                    selectedSiswa?.id === s.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    selectedSiswa?.id === s.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {s.nama.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold truncate ${selectedSiswa?.id === s.id ? 'text-blue-800' : 'text-slate-800'}`}>
                      {s.nama}
                    </p>
                    <p className="text-xs text-slate-500">Kelas {s.kelas}</p>
                  </div>
                </button>
              ))}
              {filteredSiswa.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic">
                  Siswa tidak ditemukan
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
            <p className="text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus data pelanggaran ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
