import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Check, Calendar, Clock, Trophy, Medal, MapPin, Link as LinkIcon, User, Users, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PrestasiSiswa } from '../../types/prestasi';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

const PrestasiInput: React.FC<{ user?: any }> = ({ user }) => {
  const isAdmin = user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const [data, setData] = useState<PrestasiSiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PrestasiSiswa | null>(null);
  const [classes] = useState(['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H']);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
    siswa_id: '',
    kelas: '',
    jenis_prestasi: 'Akademik' as 'Akademik' | 'Non Akademik',
    nama_lomba: '',
    juara: 'Juara 1',
    tingkat: 'Antar Sekolah',
    bukti_url: '',
    wali_kelas_id: '',
    guru_bk: 'WiwikIsmiati S.pd'
  });

  const BK_GURU = ['WiwikIsmiati S.pd', 'Eki Febriani S.pd'];
  const JUARA_OPTIONS = ['Juara 1', 'Juara 2', 'Juara 3', 'Harapan 1', 'Harapan 2', 'Harapan 3', 'Partisipasi'];
  const TINGKAT_OPTIONS = ['Antar Sekolah', 'Kabupaten/Kota', 'Propinsi', 'Nasional'];

  useEffect(() => {
    fetchData();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: prestasiData, error } = await supabase
        .from('prestasi_siswa')
        .select('*, siswa:master_siswa(nama)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setData(prestasiData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data: teacherData } = await supabase
        .from('master_guru')
        .select('id, nama_guru')
        .order('nama_guru');
      setTeachers(teacherData || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchStudents = async (className: string) => {
    try {
      const { data: studentData } = await supabase
        .from('master_siswa')
        .select('id, nama')
        .eq('kelas', className)
        .order('nama');
      setStudents(studentData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, kelas: selectedClass };
      if (editingItem) {
        const { error } = await supabase
          .from('prestasi_siswa')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prestasi_siswa')
          .insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingItem(null);
      fetchData();
      alert('Data berhasil disimpan');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data prestasi ini?')) return;
    try {
      const { error } = await supabase
        .from('prestasi_siswa')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Gagal menghapus data');
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Prestasi');

    const columns = [
      { header: 'Tanggal (YYYY-MM-DD)', key: 'tanggal', width: 20 },
      { header: 'Jam (HH:mm)', key: 'jam', width: 10 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 30 },
      { header: 'Kelas', key: 'kelas', width: 10 },
      { header: 'Jenis Prestasi (Akademik/Non Akademik)', key: 'jenis', width: 25 },
      { header: 'Nama Lomba', key: 'lomba', width: 30 },
      { header: 'Juara', key: 'juara', width: 15 },
      { header: 'Tingkat', key: 'tingkat', width: 20 },
      { header: 'Wali Kelas', key: 'wali_kelas', width: 30 },
      { header: 'Guru BK', key: 'guru_bk', width: 20 },
      { header: 'Link Bukti', key: 'bukti', width: 40 }
    ];

    worksheet.columns = columns;

    // Add example row
    worksheet.addRow({
      tanggal: '2026-04-12',
      jam: '08:00',
      nama_siswa: 'Nama Siswa Contoh',
      kelas: '7A',
      jenis: 'Akademik',
      lomba: 'Olimpiade Matematika',
      juara: 'Juara 1',
      tingkat: 'Kabupaten/Kota',
      wali_kelas: 'Nama Guru Wali Kelas',
      guru_bk: 'WiwikIsmiati S.pd',
      bukti: 'https://link-sertifikat.com'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Upload_Prestasi.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Fetch all students for matching
        const { data: allStudents } = await supabase.from('master_siswa').select('id, nama, kelas');
        
        const normalize = (str: string) => str?.toLowerCase().trim().replace(/\s+/g, ' ') || '';

        const mappedData = data.map((row: any) => {
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const foundKey = rowKeys.find(rk => normalize(rk) === normalize(key));
              if (foundKey) return String(row[foundKey]).trim();
            }
            return '';
          };

          let tgl = getValue(['tanggal', 'tanggal (yyyy-mm-dd)']);
          
          // Handle Excel serial date format
          if (tgl && !isNaN(Number(tgl)) && Number(tgl) > 1000) {
            const serial = Number(tgl);
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            tgl = format(date, 'yyyy-MM-dd');
          }

          let jam = getValue(['jam', 'jam (hh:mm)']);
          
          // Handle Excel serial time format
          if (jam && !isNaN(Number(jam)) && Number(jam) < 1) {
            const serial = Number(jam);
            const totalSeconds = Math.round(serial * 24 * 60 * 60);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            jam = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }

          const namaSiswa = getValue(['nama siswa', 'siswa']);
          const kelas = getValue(['kelas']);
          const jenis = getValue(['jenis prestasi', 'jenis']);
          const lomba = getValue(['nama lomba', 'lomba']);
          const juara = getValue(['juara']);
          const tingkat = getValue(['tingkat']);
          const waliKelas = getValue(['wali kelas']);
          const guruBk = getValue(['guru bk']);
          const bukti = getValue(['link bukti', 'bukti']);

          if (!namaSiswa || !kelas || !lomba) return null;

          const student = allStudents?.find(s => 
            normalize(s.nama) === normalize(namaSiswa) && 
            normalize(s.kelas) === normalize(kelas)
          );
          if (!student) return null;

          const teacher = teachers.find(t => normalize(t.nama_guru) === normalize(waliKelas));

          return {
            tanggal: tgl || format(new Date(), 'yyyy-MM-dd'),
            jam: jam || format(new Date(), 'HH:mm'),
            siswa_id: student.id,
            kelas: student.kelas,
            jenis_prestasi: jenis.includes('Non') ? 'Non Akademik' : 'Akademik',
            nama_lomba: lomba,
            juara: juara || 'Juara 1',
            tingkat: tingkat || 'Antar Sekolah',
            bukti_url: bukti,
            wali_kelas_id: teacher?.id || null,
            guru_bk: guruBk || 'WiwikIsmiati S.pd'
          };
        }).filter(Boolean);

        if (mappedData.length === 0) {
          alert('Tidak ada data valid untuk diupload. Pastikan Nama Siswa dan Kelas sesuai dengan Data Master.');
          return;
        }

        const { error } = await supabase.from('prestasi_siswa').insert(mappedData);
        if (error) throw error;

        alert(`Berhasil mengupload ${mappedData.length} data prestasi.`);
        fetchData();
      } catch (error: any) {
        console.error('Upload error:', error);
        alert('Gagal mengupload data: ' + error.message);
      } finally {
        setLoading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Input Prestasi Siswa</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Catat pencapaian gemilang siswa</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} className="text-blue-500" />
            <span className="font-bold text-xs uppercase tracking-wider">Template</span>
          </button>
          <label className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <Upload size={18} className="text-amber-500" />
            <span className="font-bold text-xs uppercase tracking-wider">Upload Data</span>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
          </label>
          {(isAdmin || canEdit) && (
            <button 
              onClick={() => {
                setEditingItem(null);
                setSelectedClass('');
                setFormData({
                  tanggal: format(new Date(), 'yyyy-MM-dd'),
                  jam: format(new Date(), 'HH:mm'),
                  siswa_id: '',
                  kelas: '',
                  jenis_prestasi: 'Akademik',
                  nama_lomba: '',
                  juara: 'Juara 1',
                  tingkat: 'Antar Sekolah',
                  bukti_url: '',
                  wali_kelas_id: '',
                  guru_bk: 'WiwikIsmiati S.pd'
                });
                setShowModal(true);
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-200"
            >
              <Plus size={20} />
              <span className="font-black uppercase tracking-wider text-sm">Tambah Prestasi</span>
            </button>
          )}
        </div>
      </div>

      {/* Recent Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Medal className="text-purple-600" size={24} />
            <h3 className="font-black text-slate-800">Riwayat Prestasi</h3>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scroll kebawah</span>
        </div>
        <div className="overflow-auto max-h-[450px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Tanggal</th>
                <th className="px-8 py-5">Siswa</th>
                <th className="px-8 py-5">Lomba</th>
                <th className="px-8 py-5">Juara/Tingkat</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
                  </td>
                </tr>
              ) : data.map((item) => (
                <tr key={item.id} className="group hover:bg-purple-50/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-700">{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}</span>
                      <span className="text-[10px] font-bold text-slate-400">{item.jam}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800">{item.siswa?.nama}</span>
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{item.kelas}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{item.nama_lomba}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full w-fit mt-1 ${
                        item.jenis_prestasi === 'Akademik' ? 'bg-blue-100 text-blue-600' : 'bg-cyan-100 text-cyan-600'
                      }`}>
                        {item.jenis_prestasi}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-amber-600">{item.juara}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.tingkat}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && (
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setSelectedClass(item.kelas);
                            setFormData({
                              tanggal: item.tanggal,
                              jam: item.jam,
                              siswa_id: item.siswa_id,
                              kelas: item.kelas,
                              jenis_prestasi: item.jenis_prestasi,
                              nama_lomba: item.nama_lomba,
                              juara: item.juara,
                              tingkat: item.tingkat,
                              bukti_url: item.bukti_url || '',
                              wali_kelas_id: item.wali_kelas_id,
                              guru_bk: item.guru_bk
                            });
                            setShowModal(true);
                          }}
                          className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2.5 text-pink-600 hover:bg-pink-100 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold">Belum ada data prestasi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <Trophy size={20} />
                </div>
                <h3 className="font-black text-xl text-slate-800">{editingItem ? 'Edit Prestasi' : 'Tambah Prestasi Baru'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tanggal & Jam */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tanggal & Jam</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date" 
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        value={formData.tanggal}
                        onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      />
                    </div>
                    <div className="relative w-32">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="time" 
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        value={formData.jam}
                        onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Kelas & Siswa */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kelas & Nama Siswa</label>
                  <div className="flex space-x-2">
                    <select 
                      required
                      className="w-24 px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                    >
                      <option value="">Kelas</option>
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select 
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                        value={formData.siswa_id}
                        onChange={(e) => setFormData({ ...formData, siswa_id: e.target.value })}
                        disabled={!selectedClass}
                      >
                        <option value="">Pilih Siswa</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Jenis & Nama Lomba */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Jenis & Nama Lomba</label>
                  <div className="flex space-x-2">
                    <select 
                      required
                      className="w-32 px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                      value={formData.jenis_prestasi}
                      onChange={(e) => setFormData({ ...formData, jenis_prestasi: e.target.value as any })}
                    >
                      <option value="Akademik">Akademik</option>
                      <option value="Non Akademik">Non Akademik</option>
                    </select>
                    <input 
                      type="text" 
                      required
                      placeholder="Nama Lomba / Kegiatan"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      value={formData.nama_lomba}
                      onChange={(e) => setFormData({ ...formData, nama_lomba: e.target.value })}
                    />
                  </div>
                </div>

                {/* Juara & Tingkat */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Juara & Tingkat Lomba</label>
                  <div className="flex space-x-2">
                    <select 
                      required
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                      value={formData.juara}
                      onChange={(e) => setFormData({ ...formData, juara: e.target.value })}
                    >
                      {JUARA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <select 
                      required
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                      value={formData.tingkat}
                      onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                    >
                      {TINGKAT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                {/* Wali Kelas & Guru BK */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Wali Kelas</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                      value={formData.wali_kelas_id}
                      onChange={(e) => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                    >
                      <option value="">Pilih Wali Kelas</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.nama_guru}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Guru BK</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                    value={formData.guru_bk}
                    onChange={(e) => setFormData({ ...formData, guru_bk: e.target.value })}
                  >
                    {BK_GURU.map(bk => <option key={bk} value={bk}>{bk}</option>)}
                  </select>
                </div>

                {/* Bukti Sertifikat */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Link Bukti Sertifikat (Opsional)</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="url" 
                      placeholder="https://drive.google.com/..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      value={formData.bukti_url}
                      onChange={(e) => setFormData({ ...formData, bukti_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-10">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3 text-sm font-black text-slate-500 hover:bg-slate-100 rounded-2xl transition-all uppercase tracking-widest"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex items-center space-x-2 px-10 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-200"
                >
                  <Check size={20} />
                  <span className="text-sm font-black uppercase tracking-widest">Simpan Prestasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrestasiInput;
