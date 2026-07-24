import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Filter,
  Phone,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Pencil,
  X,
  Save,
  CheckCircle2,
  Plus,
  FileText,
  User,
  MapPin,
  School,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Send,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import { supabase } from '../../lib/supabase';
import { AlumniTracing } from './types';
import AlumniReport from './AlumniReport';

export default function AlumniTracingAdmin() {
  const [data, setData] = useState<AlumniTracing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'data' | 'form' | 'report'>('data');

  // Edit & Delete states
  const [editingItem, setEditingItem] = useState<AlumniTracing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<AlumniTracing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Alumni states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newAlumni, setNewAlumni] = useState<AlumniTracing>({
    nama_lengkap: '',
    jenis_kelamin: 'Laki-laki',
    tahun_lulus: new Date().getFullYear().toString(),
    wa_number: '',
    alamat: '',
    lanjut_ke: 'SMA',
    nama_sekolah_lanjutan: '',
    jurusan: '',
    alasan: ''
  });

  const handleCreateAlumni = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNew(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Database tidak terhubung.');

      const dataToSubmit = {
        ...newAlumni,
        nama_lengkap: newAlumni.nama_lengkap.toUpperCase(),
        tahun_lulus: parseInt(String(newAlumni.tahun_lulus)) || new Date().getFullYear()
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('alumni_tracing')
        .insert([dataToSubmit])
        .select();

      if (insertError) throw insertError;

      if (insertedData && insertedData.length > 0) {
        setData(prev => [insertedData[0], ...prev]);
      } else {
        await fetchData();
      }

      setIsAddModalOpen(false);
      setSuccessMsg('Data alumni baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(null), 3000);

      // Reset form
      setNewAlumni({
        nama_lengkap: '',
        jenis_kelamin: 'Laki-laki',
        tahun_lulus: new Date().getFullYear().toString(),
        wa_number: '',
        alamat: '',
        lanjut_ke: 'SMA',
        nama_sekolah_lanjutan: '',
        jurusan: '',
        alasan: ''
      });
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan data alumni.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Database tidak terhubung.');
      const { data: tracings, error: queryError } = await supabase
        .from('alumni_tracing')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (queryError) {
        if (queryError.message.includes('relation "public.alumni_tracing" does not exist') || queryError.message.includes('schema cache')) {
          throw new Error('Tabel "alumni_tracing" tidak ditemukan. Pastikan Anda sudah menjalankan script SQL di Supabase SQL Editor.');
        }
        throw queryError;
      }
      setData(tracings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.id) return;
    setIsSaving(true);
    setError(null);

    try {
      if (!supabase) throw new Error('Database tidak terhubung.');
      
      const { error: updateError } = await supabase
        .from('alumni_tracing')
        .update({
          nama_lengkap: editingItem.nama_lengkap,
          jenis_kelamin: editingItem.jenis_kelamin,
          tahun_lulus: editingItem.tahun_lulus,
          wa_number: editingItem.wa_number,
          alamat: editingItem.alamat,
          lanjut_ke: editingItem.lanjut_ke,
          nama_sekolah_lanjutan: editingItem.nama_sekolah_lanjutan,
          jurusan: editingItem.jurusan,
          alasan: editingItem.alasan,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id);

      if (updateError) throw updateError;

      setData(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
      setEditingItem(null);
      setSuccessMsg('Data alumni berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui data alumni.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem || !deletingItem.id) return;
    setIsDeleting(true);
    setError(null);

    try {
      if (!supabase) throw new Error('Database tidak terhubung.');

      const { error: deleteError } = await supabase
        .from('alumni_tracing')
        .delete()
        .eq('id', deletingItem.id);

      if (deleteError) throw deleteError;

      setData(prev => prev.filter(item => item.id !== deletingItem.id));
      setDeletingItem(null);
      setSuccessMsg('Data alumni berhasil dihapus!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus data alumni.');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToExcel = async () => {
    if (filteredData.length === 0) return;
    
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tracing Alumni');
      const totalCols = 10;
      
      await addExcelHeaderAndLogos(worksheet, workbook, 'LAPORAN PENELUSURAN ALUMNI (TRACING ALUMNI)', totalCols);

      // Table Headers
      const headers = [
        'NO', 
        'NAMA LENGKAP', 
        'JENIS KELAMIN', 
        'TAHUN LULUS', 
        'NO. WA / HP', 
        'LANJUT KE', 
        'NAMA SEKOLAH LANJUTAN', 
        'JURUSAN / PROGRAM', 
        'ALASAN',
        'ALAMAT'
      ];

      const headerRow = worksheet.getRow(10);
      headerRow.values = headers;

      // Table Data
      filteredData.forEach((item, index) => {
        worksheet.addRow([
          index + 1,
          item.nama_lengkap,
          item.jenis_kelamin,
          item.tahun_lulus,
          item.wa_number,
          item.lanjut_ke,
          item.nama_sekolah_lanjutan || '-',
          item.jurusan || '-',
          item.alasan || '-',
          item.alamat || '-'
        ]);
      });

      applyColorfulTableStyle(worksheet, 10, filteredData.length, totalCols);

      // Set column widths
      worksheet.columns = [
        { width: 5 },   // NO
        { width: 30 },  // NAMA LENGKAP
        { width: 15 },  // JENIS KELAMIN
        { width: 12 },  // TAHUN LULUS
        { width: 18 },  // WA NUMBER
        { width: 20 },  // LANJUT KE
        { width: 30 },  // NAMA SEKOLAH
        { width: 25 },  // JURUSAN
        { width: 35 },  // ALASAN
        { width: 40 }   // ALAMAT
      ];

      // Signature Section
      const footerStartRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 12;
      const leftColStart = 2;
      const leftColEnd = 4;
      const rightColStart = 7;
      const rightColEnd = 9;

      // Left Signature (Kepala Sekolah)
      worksheet.mergeCells(footerStartRow, leftColStart, footerStartRow, leftColEnd);
      worksheet.getCell(footerStartRow, leftColStart).value = 'Mengetahui';
      worksheet.getCell(footerStartRow, leftColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, leftColStart, footerStartRow + 1, leftColEnd);
      worksheet.getCell(footerStartRow + 1, leftColStart).value = 'Kepala Sekolah';
      worksheet.getCell(footerStartRow + 1, leftColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, leftColStart, footerStartRow + 6, leftColEnd);
      const kasekName = worksheet.getCell(footerStartRow + 6, leftColStart);
      kasekName.value = 'NUR FADILAH, S.Pd';
      kasekName.font = { bold: true, underline: true };
      kasekName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, leftColStart, footerStartRow + 7, leftColEnd);
      worksheet.getCell(footerStartRow + 7, leftColStart).value = 'NIP. 19860410 201001 2 030';
      worksheet.getCell(footerStartRow + 7, leftColStart).alignment = { horizontal: 'center' };

      // Right Signature (Guru BK)
      const today = new Date();
      const formattedDate = format(today, 'd MMMM yyyy', { locale: idLocale });
      
      worksheet.mergeCells(footerStartRow, rightColStart, footerStartRow, rightColEnd);
      worksheet.getCell(footerStartRow, rightColStart).value = `Pasuruan, ${formattedDate}`;
      worksheet.getCell(footerStartRow, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, rightColStart, footerStartRow + 1, rightColEnd);
      worksheet.getCell(footerStartRow + 1, rightColStart).value = 'Guru BK';
      worksheet.getCell(footerStartRow + 1, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, rightColStart, footerStartRow + 6, rightColEnd);
      const bkName = worksheet.getCell(footerStartRow + 6, rightColStart);
      bkName.value = 'WIWIK ISMIATI, S.Pd';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, rightColStart, footerStartRow + 7, rightColEnd);
      worksheet.getCell(footerStartRow + 7, rightColStart).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(footerStartRow + 7, rightColStart).alignment = { horizontal: 'center' };

      // Generate File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Tracing_Alumni_Full_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      console.error('Export Error:', err);
      alert('Gagal mengekspor data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(s => {
    const matchesSearch = s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.wa_number.includes(searchTerm) ||
                          s.nama_sekolah_lanjutan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    return matchesSearch && s.lanjut_ke === filterType;
  });

  return (
    <div className="p-6 md:p-12 space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Tracing Alumni</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">Monitoring & Laporan Kelanjutan Studi Alumni Spanju</p>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'data'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon size={18} />
            Data Alumni
          </button>
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'form'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={18} />
            Form Input Baru
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'report'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChartIcon size={18} />
            Report Alumni
          </button>
        </div>
      </div>

      {activeTab === 'report' ? (
        <AlumniReport />
      ) : activeTab === 'form' ? (
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleCreateAlumni} className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <Plus size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Form Input Data Alumni Baru</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Masukkan informasi tracing kelanjutan studi alumni</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Nama Lengkap</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newAlumni.nama_lengkap}
                    onChange={(e) => setNewAlumni({ ...newAlumni, nama_lengkap: e.target.value })}
                    placeholder="NAMA LENGKAP ALUMNI"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Jenis Kelamin</label>
                <select
                  value={newAlumni.jenis_kelamin}
                  onChange={(e) => setNewAlumni({ ...newAlumni, jenis_kelamin: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Tahun Lulus</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    required
                    min="1990"
                    max="2030"
                    value={newAlumni.tahun_lulus}
                    onChange={(e) => setNewAlumni({ ...newAlumni, tahun_lulus: e.target.value })}
                    placeholder="e.g. 2024"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">No. WhatsApp / HP</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={newAlumni.wa_number}
                    onChange={(e) => setNewAlumni({ ...newAlumni, wa_number: e.target.value })}
                    placeholder="0812XXXXXXXX"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Melanjutkan Ke</label>
                <select
                  value={newAlumni.lanjut_ke}
                  onChange={(e) => setNewAlumni({ ...newAlumni, lanjut_ke: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="SMA">SMA</option>
                  <option value="SMK">SMK</option>
                  <option value="MA">MA</option>
                  <option value="Pondok Pesantren">Pondok Pesantren</option>
                  <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                  <option value="Bekerja">Bekerja</option>
                  <option value="Tidak Melanjutkan">Tidak Melanjutkan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Nama Sekolah / Instansi Lanjutan</label>
                <div className="relative">
                  <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newAlumni.nama_sekolah_lanjutan || ''}
                    onChange={(e) => setNewAlumni({ ...newAlumni, nama_sekolah_lanjutan: e.target.value })}
                    placeholder="e.g. SMAN 1 Pasuruan"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Jurusan / Program</label>
                <div className="relative">
                  <GraduationCap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newAlumni.jurusan || ''}
                    onChange={(e) => setNewAlumni({ ...newAlumni, jurusan: e.target.value })}
                    placeholder="e.g. MIPA / Teknik Komputer"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Alamat Tempat Tinggal</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-4 text-slate-400" />
                  <textarea
                    rows={2}
                    value={newAlumni.alamat || ''}
                    onChange={(e) => setNewAlumni({ ...newAlumni, alamat: e.target.value })}
                    placeholder="ALAMAT LENGKAP SAAT INI"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Alasan Memilih</label>
                <div className="relative">
                  <MessageSquare size={18} className="absolute left-4 top-4 text-slate-400" />
                  <textarea
                    rows={2}
                    value={newAlumni.alasan || ''}
                    onChange={(e) => setNewAlumni({ ...newAlumni, alasan: e.target.value })}
                    placeholder="ALASAN MEMILIH SEKOLAH / INSTANSI TERSEBUT"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('data')}
                className="px-8 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingNew}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50"
              >
                {isSubmittingNew ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                {isSubmittingNew ? 'Menyimpan...' : 'Simpan Data Alumni'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Header Action Tools */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
            >
              <Plus size={20} />
              Tambah Alumni Baru
            </button>
            <button 
              onClick={fetchData}
              className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={exportToExcel}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl"
            >
              <Download size={20} /> Export Excel
            </button>
          </div>

      {/* Tools & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 relative group">
          <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, WA, atau sekolah lanjutan..."
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold text-lg"
          />
        </div>

        <div className="relative">
          <Filter size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-12 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all font-bold appearance-none cursor-pointer text-slate-600"
          >
            <option value="all">SEMUA KATEGORI</option>
            <option value="SMA">SMA</option>
            <option value="SMK">SMK</option>
            <option value="MA">MA</option>
            <option value="Pondok Pesantren">PESANTREN</option>
            <option value="Tidak Melanjutkan">TIDAK MELANJUTKAN</option>
          </select>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Alumni</p>
            <p className="text-3xl font-black text-slate-800">{data.length}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600">
            <AlertCircle size={24} />
            <p className="font-bold">{error}</p>
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-700 font-bold">
            <CheckCircle2 size={24} />
            <p>{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-200 text-center sticky top-0 z-10">
                <th className="px-6 py-6 text-left">Alumni & WA</th>
                <th className="px-6 py-6">Lulusan</th>
                <th className="px-6 py-6">Melanjutkan Ke</th>
                <th className="px-6 py-6 text-left">Sekolah Lanjutan</th>
                <th className="px-6 py-6 text-left">Jurusan</th>
                <th className="px-6 py-6 text-left">Alasan</th>
                <th className="px-6 py-6">Aksi</th>
              </tr>
            </thead>
          </table>
        </div>
        <div className="overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-6">
                      <div className="space-y-1">
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{item.nama_lengkap}</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Phone size={10} /> {item.wa_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <p className="text-sm font-black text-slate-800">{item.tahun_lulus}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.jenis_kelamin}</p>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                        {item.lanjut_ke}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <p className="font-bold text-slate-800 text-sm">{item.nama_sekolah_lanjutan || '-'}</p>
                    </td>
                    <td className="px-6 py-6">
                      <p className="font-bold text-slate-500 text-xs">{item.jurusan || '-'}</p>
                    </td>
                    <td className="px-6 py-6 group relative">
                      <p className="text-xs text-slate-400 truncate max-w-[150px]">{item.alasan || '-'}</p>
                      {item.alasan && (
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 p-4 bg-slate-900 text-white rounded-xl text-[10px] font-medium leading-relaxed z-50 w-64 shadow-2xl mb-2">
                          {item.alasan}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 rounded-xl transition-all shadow-sm"
                          title="Edit Data Alumni"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingItem(item)}
                          className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all shadow-sm"
                          title="Hapus Data Alumni"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Users size={64} strokeWidth={1} />
                      <p className="font-black uppercase tracking-[0.3em] text-xs">Belum ada data tracing alumni</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT ALUMNI */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                    <Pencil size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Edit Data Alumni</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Perbarui Informasi Tracing Alumni</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveEdit} className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Lengkap */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nama_lengkap}
                      onChange={(e) => setEditingItem({ ...editingItem, nama_lengkap: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Jenis Kelamin</label>
                    <select
                      value={editingItem.jenis_kelamin}
                      onChange={(e) => setEditingItem({ ...editingItem, jenis_kelamin: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  {/* Tahun Lulus */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Tahun Lulus</label>
                    <input
                      type="text"
                      required
                      value={editingItem.tahun_lulus}
                      onChange={(e) => setEditingItem({ ...editingItem, tahun_lulus: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* No. WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      required
                      value={editingItem.wa_number}
                      onChange={(e) => setEditingItem({ ...editingItem, wa_number: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Melanjutkan Ke */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Melanjutkan Ke</label>
                    <select
                      value={editingItem.lanjut_ke}
                      onChange={(e) => setEditingItem({ ...editingItem, lanjut_ke: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="SMA">SMA</option>
                      <option value="SMK">SMK</option>
                      <option value="MA">MA</option>
                      <option value="Pondok Pesantren">Pondok Pesantren</option>
                      <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                      <option value="Bekerja">Bekerja</option>
                      <option value="Tidak Melanjutkan">Tidak Melanjutkan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  {/* Nama Sekolah / Instansi Lanjutan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Nama Sekolah / Instansi</label>
                    <input
                      type="text"
                      value={editingItem.nama_sekolah_lanjutan || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nama_sekolah_lanjutan: e.target.value })}
                      placeholder="e.g. SMAN 1 Pasuruan"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Jurusan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Jurusan / Program</label>
                    <input
                      type="text"
                      value={editingItem.jurusan || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, jurusan: e.target.value })}
                      placeholder="e.g. MIPA / Teknik Komputer"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Alamat */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Alamat Lengkap</label>
                    <input
                      type="text"
                      value={editingItem.alamat || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, alamat: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Alasan */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Alasan Memilih</label>
                    <textarea
                      rows={2}
                      value={editingItem.alasan || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, alasan: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DELETE CONFIRMATION */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 w-full max-w-md space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Hapus Data Alumni?</h3>
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data alumni <span className="text-slate-900 font-black">{deletingItem.nama_lengkap}</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="w-1/2 py-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-1/2 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-200 transition-all disabled:opacity-50"
                >
                  {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TAMBAH ALUMNI BARU */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 bg-indigo-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 text-white rounded-2xl">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Tambah Alumni Baru</h3>
                    <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">Input Tracing Kelanjutan Studi</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-indigo-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleCreateAlumni} className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Lengkap */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={newAlumni.nama_lengkap}
                      onChange={(e) => setNewAlumni({ ...newAlumni, nama_lengkap: e.target.value })}
                      placeholder="NAMA LENGKAP"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Jenis Kelamin</label>
                    <select
                      value={newAlumni.jenis_kelamin}
                      onChange={(e) => setNewAlumni({ ...newAlumni, jenis_kelamin: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  {/* Tahun Lulus */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Tahun Lulus</label>
                    <input
                      type="number"
                      required
                      min="1990"
                      max="2030"
                      value={newAlumni.tahun_lulus}
                      onChange={(e) => setNewAlumni({ ...newAlumni, tahun_lulus: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* No. WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">No. WhatsApp / HP</label>
                    <input
                      type="tel"
                      required
                      value={newAlumni.wa_number}
                      onChange={(e) => setNewAlumni({ ...newAlumni, wa_number: e.target.value })}
                      placeholder="0812XXXXXXXX"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Melanjutkan Ke */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Melanjutkan Ke</label>
                    <select
                      value={newAlumni.lanjut_ke}
                      onChange={(e) => setNewAlumni({ ...newAlumni, lanjut_ke: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="SMA">SMA</option>
                      <option value="SMK">SMK</option>
                      <option value="MA">MA</option>
                      <option value="Pondok Pesantren">Pondok Pesantren</option>
                      <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                      <option value="Bekerja">Bekerja</option>
                      <option value="Tidak Melanjutkan">Tidak Melanjutkan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  {/* Nama Sekolah / Instansi Lanjutan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Nama Sekolah / Instansi</label>
                    <input
                      type="text"
                      value={newAlumni.nama_sekolah_lanjutan || ''}
                      onChange={(e) => setNewAlumni({ ...newAlumni, nama_sekolah_lanjutan: e.target.value })}
                      placeholder="e.g. SMAN 1 Pasuruan"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Jurusan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Jurusan / Program</label>
                    <input
                      type="text"
                      value={newAlumni.jurusan || ''}
                      onChange={(e) => setNewAlumni({ ...newAlumni, jurusan: e.target.value })}
                      placeholder="e.g. MIPA / Teknik Komputer"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Alamat */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Alamat Lengkap</label>
                    <input
                      type="text"
                      value={newAlumni.alamat || ''}
                      onChange={(e) => setNewAlumni({ ...newAlumni, alamat: e.target.value })}
                      placeholder="Alamat lengkap saat ini"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Alasan */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Alasan Memilih</label>
                    <textarea
                      rows={2}
                      value={newAlumni.alasan || ''}
                      onChange={(e) => setNewAlumni({ ...newAlumni, alasan: e.target.value })}
                      placeholder="Alasan memilih sekolah/instansi tersebut"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {isSubmittingNew ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSubmittingNew ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )}
</div>
  );
}
