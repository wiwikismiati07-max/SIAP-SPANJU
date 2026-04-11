import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Users, Activity, Save, X, Edit2, Trash2, Search, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AgamaAbsensi, AgamaProgram } from '../../types/keagamaan';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const KeagamaanAbsensi: React.FC = () => {
  const [absensiList, setAbsensiList] = useState<AgamaAbsensi[]>([]);
  const [programs, setPrograms] = useState<AgamaProgram[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterKeterangan, setFilterKeterangan] = useState('');

  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH.mm'),
    kegiatan_id: '',
    wali_kelas_id: '',
    alasan: 'Hadir' as any,
    kelas: ''
  });

  const classes = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  const reasons = [
    { id: 'Hadir', label: 'Hadir', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'Izin', label: 'Izin', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'Sakit', label: 'Sakit', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { id: 'Alpa', label: 'Alpa', color: 'bg-slate-50 text-slate-600 border-slate-200' },
    { id: 'Haid', label: 'Haid', color: 'bg-rose-50 text-rose-600 border-rose-200' },
    { id: 'Pulang sebelum waktunya', label: 'Pulang sebelum waktunya', color: 'bg-purple-50 text-purple-600 border-purple-200' }
  ];

  useEffect(() => {
    fetchInitialData();
    fetchAbsensi();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [pRes, tRes, sRes] = await Promise.all([
        supabase.from('agama_program').select('*').order('nama_kegiatan'),
        supabase.from('master_guru').select('*').order('nama_guru'),
        supabase.from('master_siswa').select('*').order('nama')
      ]);

      setPrograms(pRes.data || []);
      setTeachers(tRes.data || []);
      setStudents(sRes.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchAbsensi = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agama_absensi')
        .select(`
          *,
          siswa:master_siswa(nama, kelas),
          kegiatan:agama_program(nama_kegiatan),
          wali_kelas:master_guru(nama_guru)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setAbsensiList(data || []);
    } catch (error) {
      console.error('Error fetching absensi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.kelas) {
      setFilteredStudents(students.filter(s => s.kelas === formData.kelas));
    } else {
      setFilteredStudents([]);
    }
  }, [formData.kelas, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.kegiatan_id || !formData.wali_kelas_id) {
      alert('Mohon lengkapi data');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        siswa_id: formData.siswa_id,
        tanggal: formData.tanggal,
        jam: formData.jam,
        kegiatan_id: formData.kegiatan_id,
        wali_kelas_id: formData.wali_kelas_id,
        alasan: formData.alasan
      };

      if (editingId) {
        const { error } = await supabase
          .from('agama_absensi')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agama_absensi')
          .insert([payload]);
        if (error) throw error;
      }

      setFormData({
        ...formData,
        siswa_id: '',
        alasan: 'Hadir'
      });
      setEditingId(null);
      fetchAbsensi();
      alert('Berhasil menyimpan absensi');
    } catch (error: any) {
      console.error('Error saving absensi:', error);
      alert(`Gagal menyimpan absensi: ${error.message || 'Pastikan tabel agama_absensi sudah dibuat di Supabase'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (abs: AgamaAbsensi) => {
    setEditingId(abs.id);
    setFormData({
      siswa_id: abs.siswa_id,
      tanggal: abs.tanggal,
      jam: abs.jam,
      kegiatan_id: abs.kegiatan_id,
      wali_kelas_id: abs.wali_kelas_id,
      alasan: abs.alasan,
      kelas: abs.siswa?.kelas || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data absensi ini?')) return;
    try {
      const { error } = await supabase
        .from('agama_absensi')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchAbsensi();
    } catch (error) {
      console.error('Error deleting absensi:', error);
      alert('Gagal menghapus absensi');
    }
  };

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
          const namaKegiatan = getValue(['kegiatan', 'nama kegiatan']);
          const namaGuru = getValue(['wali kelas', 'guru', 'wali']);
          const tanggal = getValue(['tanggal']);
          const jam = getValue(['jam']);
          let alasan = getValue(['alasan', 'keterangan']) || 'Hadir';

          if (!namaSiswa && !kelasSiswa) return null; // Skip empty rows

          // Handle common variations/typos
          if (alasan.toLowerCase() === 'alpha') alasan = 'Alpa';

          const student = students.find(s => 
            normalize(s.nama) === normalize(namaSiswa) && 
            normalize(String(s.kelas)) === normalize(String(kelasSiswa))
          );
          const program = programs.find(p => normalize(p.nama_kegiatan) === normalize(namaKegiatan));
          const teacher = teachers.find(t => normalize(t.nama_guru) === normalize(namaGuru));

          if (!student || !program || !teacher) {
            const missing = [];
            if (!student) missing.push(`Siswa "${namaSiswa}" Kelas "${kelasSiswa}"`);
            if (!program) missing.push(`Kegiatan "${namaKegiatan}"`);
            if (!teacher) missing.push(`Wali Kelas "${namaGuru}"`);
            
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
            kegiatan_id: program.id,
            wali_kelas_id: teacher.id,
            tanggal: formattedDate,
            jam: jam || format(new Date(), 'HH.mm'),
            alasan: reasons.find(r => normalize(r.label) === normalize(alasan))?.id || 
                    reasons.find(r => normalize(r.id) === normalize(alasan))?.id || 
                    'Hadir'
          };
        }).filter(Boolean);

        if (mappedData.length === 0) {
          let errorMsg = 'Tidak ada data valid untuk diupload.\n\nBeberapa masalah yang ditemukan:\n';
          errorMsg += failedRows.slice(0, 5).join('\n');
          if (failedRows.length > 5) errorMsg += `\n...dan ${failedRows.length - 5} baris lainnya.`;
          errorMsg += '\n\nPastikan penulisan Nama, Kelas, Kegiatan, dan Wali Kelas sama persis dengan yang ada di Data Master.';
          alert(errorMsg);
          return;
        }

        if (failedRows.length > 0) {
          const proceed = confirm(`${mappedData.length} data valid ditemukan, tetapi ${failedRows.length} baris bermasalah.\n\nContoh masalah:\n${failedRows.slice(0, 3).join('\n')}\n\nLanjutkan upload data yang valid saja?`);
          if (!proceed) return;
        }

        // Implement "Tindih" (Overwrite) logic
        // We'll process in chunks to avoid payload limits and handle upsert manually if needed
        // But Supabase upsert with onConflict is best if we have a unique constraint.
        // Since we might not have one, we'll do it by checking existing records.
        
        setSubmitting(true);
        let successCount = 0;
        let errorCount = 0;

        // Fetch existing records for the students and dates to check for duplicates
        const studentIds = [...new Set(mappedData.map(d => d.siswa_id))];
        const dates = [...new Set(mappedData.map(d => d.tanggal))];

        const { data: existingRecords } = await supabase
          .from('agama_absensi')
          .select('id, siswa_id, tanggal, kegiatan_id')
          .in('siswa_id', studentIds)
          .in('tanggal', dates);

        const toUpsert = mappedData.map(newItem => {
          const existing = existingRecords?.find(ex => 
            ex.siswa_id === newItem.siswa_id && 
            ex.tanggal === newItem.tanggal && 
            ex.kegiatan_id === newItem.kegiatan_id
          );
          if (existing) {
            return { ...newItem, id: existing.id }; // Include ID to trigger update
          }
          return newItem;
        });

        // Perform upsert
        const { error: upsertError } = await supabase
          .from('agama_absensi')
          .upsert(toUpsert);

        if (upsertError) throw upsertError;

        alert(`Berhasil memproses ${toUpsert.length} data (Termasuk update data yang sudah ada).`);
        fetchAbsensi();
      } catch (error: any) {
        console.error('Upload error:', error);
        alert('Error processing upload: ' + error.message);
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredAbsensi = absensiList.filter(abs => {
    const matchesSearch = abs.siswa?.nama.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKelas = filterKelas ? abs.siswa?.kelas === filterKelas : true;
    const matchesKeterangan = filterKeterangan ? abs.alasan === filterKeterangan : true;
    return matchesSearch && matchesKelas && matchesKeterangan;
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Form Section */}
      <div className="bg-emerald-600 rounded-[40px] shadow-xl shadow-emerald-200 overflow-hidden">
        <div className="p-10 text-white">
          <h2 className="text-3xl font-black mb-2">Formulir Input Ketidakhadiran</h2>
          <p className="text-emerald-100/80 font-medium tracking-wide">Catat ketidakhadiran siswa pada kegiatan keagamaan</p>
        </div>
        
        <div className="bg-white m-2 rounded-[32px] p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tanggal Kegiatan</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="date"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                    value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Jam Pelaksanaan</label>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                    placeholder="Contoh: 07.30"
                    value={formData.jam}
                    onChange={e => setFormData({ ...formData, jam: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Kelas</label>
                <div className="relative group">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                    value={formData.kelas}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value, siswa_id: '' })}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Siswa</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    disabled={!formData.kelas}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    value={formData.siswa_id}
                    onChange={e => setFormData({ ...formData, siswa_id: e.target.value })}
                  >
                    <option value="">{formData.kelas ? '-- Pilih Siswa --' : '-- Pilih Kelas Dulu --'}</option>
                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nama Kegiatan</label>
                <div className="relative group">
                  <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                    value={formData.kegiatan_id}
                    onChange={e => setFormData({ ...formData, kegiatan_id: e.target.value })}
                  >
                    <option value="">-- Pilih Kegiatan --</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nama_kegiatan}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Wali Kelas</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
                    value={formData.wali_kelas_id}
                    onChange={e => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                  >
                    <option value="">-- Pilih Wali Kelas --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.nama_guru}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Alasan Tidak Mengikuti</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {reasons.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, alasan: r.id as any })}
                    className={`px-4 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                      formData.alasan === r.id 
                        ? `${r.color} ring-4 ring-emerald-50` 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ ...formData, siswa_id: '', alasan: 'Hadir' });
                  }}
                  className="px-8 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <X size={20} /> Batal
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-12 py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : editingId ? <Save size={20} /> : <Save size={20} />}
                {editingId ? 'Simpan Perubahan' : 'Simpan Absensi'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800">Riwayat Absensi Terbaru</h3>
            <p className="text-sm text-slate-400">Menampilkan 50 data terakhir</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Template Absensi');
                worksheet.columns = [
                  { header: 'Nama Siswa', key: 'nama', width: 30 },
                  { header: 'Kelas', key: 'kelas', width: 10 },
                  { header: 'Kegiatan', key: 'kegiatan', width: 25 },
                  { header: 'Wali Kelas', key: 'wali_kelas', width: 30 },
                  { header: 'Tanggal', key: 'tanggal', width: 15 },
                  { header: 'Jam', key: 'jam', width: 10 },
                  { header: 'Alasan', key: 'alasan', width: 15 }
                ];
                
                // Add example row
                worksheet.addRow({
                  nama: 'Contoh Nama Siswa',
                  kelas: '7A',
                  kegiatan: 'Pondok Ramadhan',
                  wali_kelas: 'Nama Guru Wali Kelas',
                  tanggal: '2026-04-11',
                  jam: '07.30',
                  alasan: 'Hadir'
                });

                workbook.xlsx.writeBuffer().then(buffer => {
                  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Template_Upload_Keagamaan.xlsx';
                  a.click();
                  window.URL.revokeObjectURL(url);
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all"
            >
              <Download size={16} />
              <span>Template</span>
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold cursor-pointer hover:bg-emerald-100 transition-all">
              <Upload size={16} />
              <span>Upload Data</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
            <div className="flex items-center gap-2">
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-bold text-slate-600"
              >
                <option value="">Semua Kelas</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterKeterangan}
                onChange={(e) => setFilterKeterangan(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white font-bold text-slate-600"
              >
                <option value="">Semua Keterangan</option>
                {reasons.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari nama..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Siswa</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kegiatan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keterangan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Memuat data...</td>
                </tr>
              ) : filteredAbsensi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">Data tidak ditemukan.</td>
                </tr>
              ) : (
                filteredAbsensi.map(abs => (
                  <tr key={abs.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                          {abs.siswa?.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{abs.siswa?.nama}</p>
                          <p className="text-xs text-slate-400">Kelas {abs.siswa?.kelas}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">
                        {abs.kegiatan?.nama_kegiatan}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-600">{format(new Date(abs.tanggal), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-slate-400">{abs.jam}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        abs.alasan === 'Hadir' ? 'bg-emerald-50 text-emerald-600' :
                        abs.alasan === 'Haid' ? 'bg-rose-50 text-rose-600' :
                        abs.alasan === 'Alpa' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {abs.alasan}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleEdit(abs)}
                          className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(abs.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
};

export default KeagamaanAbsensi;
