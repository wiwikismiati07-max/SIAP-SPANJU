import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ClipboardList, AlertCircle, CheckCircle2, Search, User, Clock, Pill, X, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UksKeluhan, UksObat, UksKunjungan } from '../../types/uks';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const UksPeriksa: React.FC<{ user?: any }> = ({ user }) => {
  const canDelete = user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const [keluhan, setKeluhan] = useState<UksKeluhan[]>([]);
  const [obat, setObat] = useState<UksObat[]>([]);
  const [siswa, setSiswa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kunjunganList, setKunjunganList] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
    keluhan_id: '',
    penanganan: 'Istirahat' as 'Minum Obat' | 'Pulang' | 'Istirahat',
    catatan: ''
  });

  const [selectedObat, setSelectedObat] = useState<{ obat_id: string, jumlah: number }[]>([]);

  const classes = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [keluhanRes, obatRes, siswaRes, kunjunganRes] = await Promise.all([
        supabase.from('uks_keluhan').select('*').order('nama_keluhan'),
        supabase.from('uks_obat').select('*').order('nama_obat'),
        supabase.from('master_siswa').select('id, nama, kelas').order('nama'),
        supabase.from('uks_kunjungan').select(`
          *,
          siswa:master_siswa(nama, kelas),
          keluhan:uks_keluhan(nama_keluhan),
          obat_digunakan:uks_kunjungan_obat(
            obat_id,
            jumlah,
            obat:uks_obat(nama_obat, satuan)
          )
        `).order('created_at', { ascending: false }).limit(10)
      ]);

      setKeluhan(keluhanRes.data || []);
      setObat(obatRes.data || []);
      setSiswa(siswaRes.data || []);
      setKunjunganList(kunjunganRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddObat = () => {
    setSelectedObat([...selectedObat, { obat_id: '', jumlah: 1 }]);
  };

  const handleRemoveObat = (index: number) => {
    setSelectedObat(selectedObat.filter((_, i) => i !== index));
  };

  const handleObatChange = (index: number, field: string, value: any) => {
    const newSelected = [...selectedObat];
    newSelected[index] = { ...newSelected[index], [field]: value };
    setSelectedObat(newSelected);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pemeriksaan ini?')) return;

    try {
      const { error } = await supabase.from('uks_kunjungan').delete().eq('id', id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Data berhasil dihapus!' });
      fetchInitialData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menghapus data' });
    }
  };

  const handleEdit = (item: any) => {
    setIsEditing(item.id);
    setSelectedClass(item.siswa?.kelas || '');
    setSelectedSiswaId(item.siswa_id);
    setFormData({
      tanggal: item.tanggal,
      jam: item.jam,
      keluhan_id: item.keluhan_id,
      penanganan: item.penanganan,
      catatan: item.catatan || ''
    });
    setSelectedObat(item.obat_digunakan?.map((o: any) => ({
      obat_id: o.obat_id,
      jumlah: o.jumlah
    })) || []);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswaId || !formData.keluhan_id) {
      setMessage({ type: 'error', text: 'Mohon lengkapi data siswa dan keluhan.' });
      return;
    }

    try {
      let kunjunganId = isEditing;

      if (isEditing) {
        // Update Kunjungan
        const { error: updateError } = await supabase
          .from('uks_kunjungan')
          .update({
            ...formData,
            siswa_id: selectedSiswaId
          })
          .eq('id', isEditing);

        if (updateError) throw updateError;

        // Delete old obat usage
        await supabase.from('uks_kunjungan_obat').delete().eq('kunjungan_id', isEditing);
      } else {
        // Insert Kunjungan
        const { data: kunjunganData, error: kunjunganError } = await supabase
          .from('uks_kunjungan')
          .insert([{
            ...formData,
            siswa_id: selectedSiswaId
          }])
          .select()
          .single();

        if (kunjunganError) throw kunjunganError;
        kunjunganId = kunjunganData.id;
      }

      // 2. Insert Obat Usage if any
      if (formData.penanganan === 'Minum Obat' && selectedObat.length > 0) {
        const validObat = selectedObat.filter(o => o.obat_id && o.jumlah > 0);
        if (validObat.length > 0) {
          const { error: usageError } = await supabase
            .from('uks_kunjungan_obat')
            .insert(validObat.map(o => ({
              kunjungan_id: kunjunganId,
              obat_id: o.obat_id,
              jumlah: o.jumlah
            })));

          if (usageError) throw usageError;

          // Note: Stock management on edit is tricky (need to revert old stock first)
          // For simplicity in this version, we only subtract new stock on new entry
          if (!isEditing) {
            for (const o of validObat) {
              const currentObat = obat.find(item => item.id === o.obat_id);
              if (currentObat) {
                await supabase
                  .from('uks_obat')
                  .update({ stok: currentObat.stok - o.jumlah })
                  .eq('id', o.obat_id);
              }
            }
          }
        }
      }

      setMessage({ type: 'success', text: isEditing ? 'Data berhasil diperbarui!' : 'Data pemeriksaan berhasil disimpan!' });
      resetForm();
      fetchInitialData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menyimpan data pemeriksaan' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      jam: format(new Date(), 'HH:mm'),
      keluhan_id: '',
      penanganan: 'Istirahat',
      catatan: ''
    });
    setSelectedSiswaId('');
    setSelectedClass('');
    setSelectedObat([]);
    setIsEditing(null);
  };

  const filteredSiswa = siswa.filter(s => s.kelas === selectedClass);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const failedRows: string[] = [];
        const mappedData = data.map((row: any, index: number) => {
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim());
              if (foundKey) return String(row[foundKey]).trim();
            }
            return '';
          };

          const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();

          const namaSiswa = getValue(['nama', 'nama siswa', 'siswa']);
          const kelasSiswa = getValue(['kelas']);
          const namaKeluhan = getValue(['keluhan']);
          const penanganan = getValue(['penanganan']) || 'Istirahat';
          const tanggal = getValue(['tanggal']);
          const jam = getValue(['jam']);
          const catatan = getValue(['catatan', 'keterangan']) || '';

          if (!namaSiswa && !kelasSiswa) return null;

          const student = siswa.find(s => 
            normalize(s.nama) === normalize(namaSiswa) && 
            normalize(String(s.kelas)) === normalize(String(kelasSiswa))
          );
          const keluhanItem = keluhan.find(k => normalize(k.nama_keluhan) === normalize(namaKeluhan));

          if (!student || !keluhanItem) {
            const missing = [];
            if (!student) missing.push(`Siswa "${namaSiswa}" Kelas "${kelasSiswa}"`);
            if (!keluhanItem) missing.push(`Keluhan "${namaKeluhan}"`);
            
            failedRows.push(`Baris ${index + 2}: ${missing.join(', ')} tidak ditemukan di data master.`);
            return null;
          }

          let formattedDate = format(new Date(), 'yyyy-MM-dd');
          if (tanggal) {
            try {
              const d = new Date(tanggal);
              if (!isNaN(d.getTime())) {
                formattedDate = format(d, 'yyyy-MM-dd');
              } else if (typeof tanggal === 'number') {
                const excelDate = new Date((tanggal - 25569) * 86400 * 1000);
                formattedDate = format(excelDate, 'yyyy-MM-dd');
              }
            } catch (e) {}
          }

          return {
            siswa_id: student.id,
            keluhan_id: keluhanItem.id,
            tanggal: formattedDate,
            jam: jam || format(new Date(), 'HH:mm'),
            penanganan: ['Minum Obat', 'Pulang', 'Istirahat'].includes(penanganan) ? penanganan : 'Istirahat',
            catatan: catatan
          };
        }).filter(Boolean);

        if (mappedData.length === 0) {
          let errorMsg = 'Tidak ada data valid untuk diupload.\n\nBeberapa masalah yang ditemukan:\n';
          errorMsg += failedRows.slice(0, 5).join('\n');
          if (failedRows.length > 5) errorMsg += `\n...dan ${failedRows.length - 5} baris lainnya.`;
          errorMsg += '\n\nPastikan penulisan Nama, Kelas, dan Keluhan sama persis dengan yang ada di Data Master.';
          alert(errorMsg);
          return;
        }

        if (failedRows.length > 0) {
          const proceed = confirm(`${mappedData.length} data valid ditemukan, tetapi ${failedRows.length} baris bermasalah.\n\nContoh masalah:\n${failedRows.slice(0, 3).join('\n')}\n\nLanjutkan upload data yang valid saja?`);
          if (!proceed) return;
        }

        setLoading(true);
        // Fetch existing records to handle "Tindih" (Overwrite)
        const studentIds = [...new Set(mappedData.map(d => d.siswa_id))];
        const dates = [...new Set(mappedData.map(d => d.tanggal))];

        const { data: existingRecords } = await supabase
          .from('uks_kunjungan')
          .select('id, siswa_id, tanggal, keluhan_id')
          .in('siswa_id', studentIds)
          .in('tanggal', dates);

        const toUpsert = mappedData.map(newItem => {
          const existing = existingRecords?.find(ex => 
            ex.siswa_id === newItem.siswa_id && 
            ex.tanggal === newItem.tanggal && 
            ex.keluhan_id === newItem.keluhan_id
          );
          if (existing) {
            return { ...newItem, id: existing.id };
          }
          return newItem;
        });

        const { error: upsertError } = await supabase
          .from('uks_kunjungan')
          .upsert(toUpsert);

        if (upsertError) throw upsertError;
        alert(`Berhasil memproses ${toUpsert.length} data UKS (Termasuk update data yang sudah ada).`);
        fetchInitialData();
      } catch (error: any) {
        console.error('UKS Upload error:', error);
        alert('Error reading Excel: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template UKS');
    worksheet.columns = [
      { header: 'Nama Siswa', key: 'nama', width: 30 },
      { header: 'Kelas', key: 'kelas', width: 10 },
      { header: 'Tanggal (YYYY-MM-DD)', key: 'tanggal', width: 20 },
      { header: 'Jam (HH:mm)', key: 'jam', width: 15 },
      { header: 'Keluhan', key: 'keluhan', width: 25 },
      { header: 'Penanganan', key: 'penanganan', width: 20 },
      { header: 'Catatan', key: 'catatan', width: 40 }
    ];
    
    // Add example row
    worksheet.addRow({
      nama: 'Contoh Nama Siswa',
      kelas: '7A',
      tanggal: '2026-04-11',
      jam: '09:30',
      keluhan: 'Pusing',
      penanganan: 'Istirahat',
      catatan: 'Siswa beristirahat di UKS selama 30 menit'
    });

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Upload_UKS.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isEditing ? 'Edit Pemeriksaan' : 'Form Pemeriksaan Siswa'}</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Catat hasil pemeriksaan kesehatan siswa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Tanggal</label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Jam</label>
              <input
                type="time"
                value={formData.jam}
                onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedSiswaId(''); }}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Siswa</label>
              <select
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 disabled:opacity-50"
              >
                <option value="">-- Pilih Siswa --</option>
                {filteredSiswa.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Keluhan</label>
              <select
                value={formData.keluhan_id}
                onChange={(e) => setFormData({ ...formData, keluhan_id: e.target.value })}
                className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
              >
                <option value="">-- Pilih Keluhan --</option>
                {keluhan.map(k => <option key={k.id} value={k.id}>{k.nama_keluhan}</option>)}
              </select>
            </div>
          </div>

          {/* Penanganan */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Penanganan</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Minum Obat', 'Pulang', 'Istirahat'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, penanganan: p as any })}
                  className={`px-8 py-5 rounded-3xl font-black transition-all duration-300 flex items-center justify-center gap-3 ${
                    formData.penanganan === p 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 scale-105' 
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {p === 'Minum Obat' && <Pill size={20} />}
                  {p === 'Pulang' && <User size={20} />}
                  {p === 'Istirahat' && <Clock size={20} />}
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine Usage Form */}
          {formData.penanganan === 'Minum Obat' && (
            <div className="bg-rose-50/50 p-8 rounded-[32px] border border-rose-100 space-y-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-rose-800 flex items-center gap-2">
                  <Pill size={18} />
                  Penggunaan Obat
                </h4>
                <button
                  type="button"
                  onClick={handleAddObat}
                  className="px-6 py-2 bg-rose-600 text-white rounded-full text-xs font-black hover:bg-rose-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  Tambah Obat
                </button>
              </div>

              {selectedObat.length === 0 ? (
                <p className="text-sm text-rose-400 italic text-center py-4">Klik "Tambah Obat" untuk mencatat obat yang diberikan.</p>
              ) : (
                <div className="space-y-4">
                  {selectedObat.map((o, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Obat</label>
                        <select
                          value={o.obat_id}
                          onChange={(e) => handleObatChange(index, 'obat_id', e.target.value)}
                          className="w-full px-6 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                        >
                          <option value="">-- Pilih Obat --</option>
                          {obat.map(item => (
                            <option key={item.id} value={item.id} disabled={item.stok <= 0}>
                              {item.nama_obat} (Stok: {item.stok})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jumlah</label>
                        <input
                          type="number"
                          value={o.jumlah}
                          onChange={(e) => handleObatChange(index, 'jumlah', parseInt(e.target.value) || 0)}
                          className="w-full px-6 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Satuan</label>
                          <div className="px-6 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-sm">
                            {obat.find(item => item.id === o.obat_id)?.satuan || '-'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveObat(index)}
                          className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Catatan Tambahan</label>
            <textarea
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
              placeholder="Catatan hasil pemeriksaan atau keterangan tambahan..."
              rows={4}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-rose-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300 resize-none"
            />
          </div>

          <div className="flex justify-end gap-4 pt-6">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-10 py-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[32px] font-black transition-all duration-300"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="px-12 py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-[32px] font-black flex items-center gap-4 transition-all duration-300 shadow-xl shadow-rose-600/20 hover:scale-105 active:scale-95"
            >
              <Save size={24} />
              {isEditing ? 'Simpan Perubahan' : 'Simpan Hasil Pemeriksaan'}
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-10 p-8 rounded-[32px] flex items-center gap-6 animate-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            <div>
              <p className="font-black text-lg">{message.type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan'}</p>
              <p className="font-bold opacity-80">{message.text}</p>
            </div>
          </div>
        )}
      </div>

      {/* List Section */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Daftar Pemeriksaan Terakhir</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Menampilkan 10 data pemeriksaan terbaru</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
            >
              <Download size={16} />
              <span>Template</span>
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold cursor-pointer hover:bg-rose-100 transition-all">
              <Upload size={16} />
              <span>Upload Data</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">Siswa</th>
                <th className="px-8 py-4">Waktu</th>
                <th className="px-8 py-4">Keluhan</th>
                <th className="px-8 py-4">Penanganan</th>
                <th className="px-8 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {kunjunganList.map((item) => (
                <tr key={item.id} className="group bg-slate-50 hover:bg-white rounded-[32px] border-2 border-transparent hover:border-rose-100 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-500">
                  <td className="px-8 py-6 rounded-l-[32px]">
                    <div>
                      <p className="font-bold text-slate-800">{item.siswa?.nama}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kelas {item.siswa?.kelas}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-slate-600">
                      <p>{format(new Date(item.tanggal), 'dd/MM/yyyy')}</p>
                      <p className="text-xs opacity-60">{item.jam}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-4 py-2 bg-white rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-100">
                      {item.keluhan?.nama_keluhan}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        item.penanganan === 'Minum Obat' ? 'text-amber-600' : 
                        item.penanganan === 'Pulang' ? 'text-rose-600' : 'text-blue-600'
                      }`}>
                        {item.penanganan}
                      </span>
                      {item.obat_digunakan?.length > 0 && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          {item.obat_digunakan.map((o: any) => `${o.obat?.nama_obat} (${o.jumlah})`).join(', ')}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 rounded-r-[32px] text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300"
                        >
                          <Search size={18} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {kunjunganList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">Belum ada data pemeriksaan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UksPeriksa;
