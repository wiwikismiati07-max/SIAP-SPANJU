import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { TransaksiWithSiswa, Siswa } from '../../types/sitelat';
import { Search, Trash2, Edit2, Save, X, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ALASAN_OPTIONS = [
  "Ketiduran",
  "Ban Bocor",
  "Mengantar adik",
  "Tugas dari Guru",
  "Lainnya"
];

export default function Laporan() {
  const [transaksi, setTransaksi] = useState<TransaksiWithSiswa[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'perKelas'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  
  // Form State for Edit
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tanggal: '',
    jam: '',
    alasan: '',
    alasanLainnya: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data: sData, error: sError } = await supabase.from('master_siswa').select('*');
        if (sError) console.error("Error fetching master_siswa:", sError);
        if (sData) setSiswaList(sData);

        const { data: tData, error: tError } = await supabase
          .from('transaksi_terlambat')
          .select(`*`)
          .order('tanggal', { ascending: false })
          .order('jam', { ascending: false });
          
        if (tError) {
          console.error("Error fetching transaksi_terlambat:", tError);
          alert(`Gagal memuat data laporan: ${tError.message}`);
        }
        
        if (tData) {
          const joinedData = tData.map(t => ({
            ...t,
            siswa: sData?.find(s => s.id === t.siswa_id) || { id: t.siswa_id, nama: 'Unknown', kelas: '-' }
          }));
          setTransaksi(joinedData as TransaksiWithSiswa[]);
        }
      } else {
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        setSiswaList(localSiswa);
        
        const localTrans = JSON.parse(localStorage.getItem('sitelat_transaksi') || '[]');
        const transWithSiswa = localTrans.map((t: any) => ({
          ...t,
          siswa: localSiswa.find((s: any) => s.id === t.siswa_id)
        })).sort((a: any, b: any) => new Date(`${b.tanggal}T${b.jam}`).getTime() - new Date(`${a.tanggal}T${a.jam}`).getTime());
        setTransaksi(transWithSiswa);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.alasan || (formData.alasan === 'Lainnya' && !formData.alasanLainnya)) {
      alert('Mohon lengkapi data!');
      return;
    }

    const finalAlasan = formData.alasan === 'Lainnya' ? formData.alasanLainnya : formData.alasan;
    
    const updateData = {
      tanggal: formData.tanggal,
      jam: formData.jam,
      alasan: finalAlasan
    };

    try {
      if (supabase && editingId) {
        await supabase.from('transaksi_terlambat').update(updateData).eq('id', editingId);
      } else if (editingId) {
        const localTrans = JSON.parse(localStorage.getItem('sitelat_transaksi') || '[]');
        const idx = localTrans.findIndex((t: any) => t.id === editingId);
        if (idx !== -1) {
          localTrans[idx] = { ...localTrans[idx], ...updateData };
          localStorage.setItem('sitelat_transaksi', JSON.stringify(localTrans));
        }
      }
      
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    
    try {
      if (supabase) {
        await supabase.from('transaksi_terlambat').delete().eq('id', id);
      } else {
        const localTrans = JSON.parse(localStorage.getItem('sitelat_transaksi') || '[]');
        const updated = localTrans.filter((t: any) => t.id !== id);
        localStorage.setItem('sitelat_transaksi', JSON.stringify(updated));
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleEdit = (t: TransaksiWithSiswa) => {
    const isLainnya = !ALASAN_OPTIONS.includes(t.alasan) && t.alasan !== 'Lainnya';
    setFormData({
      tanggal: t.tanggal,
      jam: t.jam,
      alasan: isLainnya ? 'Lainnya' : t.alasan,
      alasanLainnya: isLainnya ? t.alasan : ''
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error("Worksheet tidak ditemukan");
      
      const newTransactions: any[] = [];
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < 2) return; // Skip header row (Row 1)
        
        const nama = row.getCell(1).text?.trim();
        const kelas = row.getCell(2).text?.trim();
        let tanggal = row.getCell(3).text?.trim();
        let jam = row.getCell(4).text?.trim();
        const alasan = row.getCell(5).text?.trim();

        if (!nama || !kelas || !tanggal || !jam) return; // Skip empty or invalid rows

        // Format date if it's an excel date object
        const tglCell = row.getCell(3).value;
        if (tglCell instanceof Date) {
          tanggal = format(tglCell, 'yyyy-MM-dd');
        } else if (typeof tglCell === 'string') {
           // Handle DD/MM/YYYY or YYYY-MM-DD
           if (tglCell.includes('/')) {
             const parts = tglCell.split('/');
             if (parts[0].length === 2 && parts[2].length === 4) {
               tanggal = `${parts[2]}-${parts[1]}-${parts[0]}`;
             } else {
               tanggal = tglCell;
             }
           } else {
             tanggal = tglCell;
           }
        }

        const jamCell = row.getCell(4).value;
        if (jamCell instanceof Date) {
          jam = format(jamCell, 'HH:mm');
        } else if (typeof jamCell === 'number') {
           // Excel time fraction
           const totalSeconds = Math.floor(jamCell * 86400);
           const h = Math.floor(totalSeconds / 3600);
           const m = Math.floor((totalSeconds % 3600) / 60);
           jam = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        } else if (typeof jamCell === 'string') {
           jam = jamCell;
        }

        newTransactions.push({ nama, kelas, tanggal, jam, alasan });
      });

      if (newTransactions.length === 0) {
        alert("Tidak ada data valid yang ditemukan di file Excel.");
        return;
      }

      // Process data
      if (supabase) {
        // 1. Get existing students
        const { data: existingStudents, error: fetchError } = await supabase.from('master_siswa').select('*');
        if (fetchError) throw new Error(`Gagal mengambil data siswa: ${fetchError.message}`);
        
        const studentMap = new Map(existingStudents?.map(s => [`${s.nama}-${s.kelas}`, s.id]) || []);

        for (const t of newTransactions) {
          const studentKey = `${t.nama}-${t.kelas}`;
          let siswa_id = studentMap.get(studentKey);

          if (!siswa_id) {
            // Create new student
            const newId = crypto.randomUUID();
            const { data: newSiswa, error: insertError } = await supabase
              .from('master_siswa')
              .insert([{ id: newId, nama: t.nama, kelas: t.kelas }])
              .select('id')
              .single();
              
            if (insertError) {
              console.error("Failed to create student", t.nama, insertError);
              throw new Error(`Gagal membuat data siswa ${t.nama}: ${insertError.message}`);
            }
            if (newSiswa) {
              siswa_id = newSiswa.id;
              studentMap.set(studentKey, siswa_id);
            }
          }

          // Insert transaction
          const { error: txError } = await supabase.from('transaksi_terlambat').insert([{
            id: crypto.randomUUID(),
            siswa_id,
            tanggal: t.tanggal,
            jam: t.jam,
            alasan: t.alasan || 'Lainnya'
          }]);
          
          if (txError) {
            console.error("Failed to insert transaction", t, txError);
            throw new Error(`Gagal menyimpan transaksi untuk ${t.nama}: ${txError.message}`);
          }
        }
      } else {
        // Offline mode
        let localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        let localTrans = JSON.parse(localStorage.getItem('sitelat_transaksi') || '[]');
        
        for (const t of newTransactions) {
          let siswa = localSiswa.find((s: any) => s.nama === t.nama && s.kelas === t.kelas);
          if (!siswa) {
            siswa = { id: crypto.randomUUID(), nama: t.nama, kelas: t.kelas };
            localSiswa.push(siswa);
          }
          
          localTrans.push({
            id: crypto.randomUUID(),
            siswa_id: siswa.id,
            tanggal: t.tanggal,
            jam: t.jam,
            alasan: t.alasan || 'Lainnya'
          });
        }
        
        localStorage.setItem('sitelat_siswa', JSON.stringify(localSiswa));
        localStorage.setItem('sitelat_transaksi', JSON.stringify(localTrans));
      }

      alert(`Berhasil mengimpor ${newTransactions.length} data!`);
      fetchData();
    } catch (error: any) {
      console.error('Error importing data:', error);
      alert(`Gagal mengimpor data: ${error.message || 'Pastikan format Excel sesuai dengan template unduhan.'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportToExcel = async () => {
    if (filteredTransaksi.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }

    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Keterlambatan');

      const colCount = 7;
      await addExcelHeaderAndLogos(worksheet, workbook, 'Laporan Siswa Terlambat Hadir', colCount);

      // Table Headers
      const headers = ['NO', 'NAMA SISWA', 'KELAS', 'TANGGAL', 'JAM', 'STATUS', 'ALASAN'];
      const headerRow = worksheet.getRow(10);
      headerRow.values = headers;

      // Table Data
      filteredTransaksi.forEach((t, index) => {
        const row = worksheet.addRow([
          index + 1,
          t.siswa?.nama || 'Unknown',
          t.siswa?.kelas || '-',
          t.tanggal,
          t.jam,
          'Terlambat',
          t.alasan
        ]);
        
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri' };
          if ([1, 3, 4, 5].includes(colNumber)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      applyColorfulTableStyle(worksheet, 10, filteredTransaksi.length, colCount);

      // Column Widths
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 35;
      worksheet.getColumn(3).width = 10;
      worksheet.getColumn(4).width = 15;
      worksheet.getColumn(5).width = 10;
      worksheet.getColumn(6).width = 15;
      worksheet.getColumn(7).width = 35;

      // Footer
      const lastRow = 11 + filteredTransaksi.length + 2;
      
      worksheet.getCell(`B${lastRow}`).value = 'Mengetahui';
      worksheet.getCell(`B${lastRow}`).font = { name: 'Times New Roman' };
      worksheet.getCell(`F${lastRow}`).value = `Pasuruan, ${format(new Date(), 'd MMMM yyyy')}`;
      worksheet.getCell(`F${lastRow}`).font = { name: 'Times New Roman' };
      
      worksheet.getCell(`B${lastRow + 1}`).value = 'Kepala Sekolah';
      worksheet.getCell(`B${lastRow + 1}`).font = { name: 'Times New Roman' };
      worksheet.getCell(`F${lastRow + 1}`).value = 'Guru BK';
      worksheet.getCell(`F${lastRow + 1}`).font = { name: 'Times New Roman' };
      
      worksheet.getCell(`B${lastRow + 5}`).value = 'NUR FADILAH, S.Pd';
      worksheet.getCell(`B${lastRow + 5}`).font = { bold: true, underline: true, name: 'Times New Roman' };
      worksheet.getCell(`F${lastRow + 5}`).value = 'WIWIK ISMIATI, S.Pd';
      worksheet.getCell(`F${lastRow + 5}`).font = { bold: true, underline: true, name: 'Times New Roman' };
      
      worksheet.getCell(`B${lastRow + 6}`).value = 'NIP. 19860410 201001 2 030';
      worksheet.getCell(`B${lastRow + 6}`).font = { name: 'Times New Roman' };
      worksheet.getCell(`F${lastRow + 6}`).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(`F${lastRow + 6}`).font = { name: 'Times New Roman' };

      // Save File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Keterlambatan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      setShowDownloadSuccess(true);
      setTimeout(() => setShowDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Export Excel Error:', error);
      alert('Gagal mengunduh Excel. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const exportPivotToExcel = async () => {
    if (filteredTransaksi.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }

    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Pivot Keterlambatan');

      const colCount = 6;
      await addExcelHeaderAndLogos(worksheet, workbook, 'Rekapitulasi Keterlambatan Siswa', colCount);

      // Grouping data: Kelas -> Nama -> Transaksi
      const groupedData: { [kelas: string]: { [nama: string]: TransaksiWithSiswa[] } } = {};
      
      filteredTransaksi.forEach(t => {
        const kelas = t.siswa?.kelas || 'Tanpa Kelas';
        const nama = t.siswa?.nama || 'Unknown';
        
        if (!groupedData[kelas]) groupedData[kelas] = {};
        if (!groupedData[kelas][nama]) groupedData[kelas][nama] = [];
        
        groupedData[kelas][nama].push(t);
      });

      // Pivot Title Row
      const pivotTitleRow = worksheet.getRow(9);
      pivotTitleRow.height = 30;
      worksheet.mergeCells(`A9:F9`);
      const titleCell = worksheet.getCell('A9');
      titleCell.value = 'Pivot Siswa Terlambat Hadir Per Kelas';
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC0504D' } // Reddish color from image
      };
      titleCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14, name: 'Calibri' };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      let currentRow = 10;

      // Sort Kelas
      const sortedKelas = Object.keys(groupedData).sort();

      const levelColors = {
        kelas: 'FFDBEAFE',   // Soft Blue
        student: 'FFD1FAE5', // Soft Green
        date: 'FFFEF3C7',    // Soft Yellow
        reason: 'FFFCE7F3'   // Soft Pink
      };

      const applyRowStyle = (row: ExcelJS.Row, color: string) => {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color }
        };
        for (let i = 1; i <= colCount; i++) {
          row.getCell(i).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      };

      sortedKelas.forEach(kelas => {
        // Kelas Row
        const kelasRow = worksheet.getRow(currentRow);
        kelasRow.getCell(1).value = `[-] ${kelas}`;
        kelasRow.getCell(1).font = { bold: true, name: 'Calibri' };
        applyRowStyle(kelasRow, levelColors.kelas);
        worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
        currentRow++;

        // Sort Students in Kelas
        const sortedStudents = Object.keys(groupedData[kelas]).sort();

        sortedStudents.forEach(nama => {
          // Student Row
          const studentRow = worksheet.getRow(currentRow);
          studentRow.getCell(1).value = `    [-] ${nama}`;
          studentRow.getCell(1).font = { bold: true, name: 'Calibri' };
          applyRowStyle(studentRow, levelColors.student);
          worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
          currentRow++;

          // Transactions for Student
          groupedData[kelas][nama].forEach(t => {
            // Date Row
            const dateRow = worksheet.getRow(currentRow);
            dateRow.getCell(1).value = `        [-] ${t.tanggal}`;
            applyRowStyle(dateRow, levelColors.date);
            worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
            currentRow++;

            // Reason Row
            const reasonRow = worksheet.getRow(currentRow);
            reasonRow.getCell(1).value = `            ${t.alasan}`;
            applyRowStyle(reasonRow, levelColors.reason);
            worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
            currentRow++;
          });
        });
      });

      // Column Widths
      worksheet.getColumn(1).width = 80;

      // Footer
      const footerStartRow = currentRow + 2;
      
      worksheet.getCell(`B${footerStartRow}`).value = 'Mengetahui';
      worksheet.getCell(`B${footerStartRow}`).font = { name: 'Times New Roman' };
      worksheet.getCell(`E${footerStartRow}`).value = `Pasuruan, ${format(new Date(), 'd MMMM yyyy')}`;
      worksheet.getCell(`E${footerStartRow}`).font = { name: 'Times New Roman' };
      
      worksheet.getCell(`B${footerStartRow + 1}`).value = 'Kepala Sekolah';
      worksheet.getCell(`B${footerStartRow + 1}`).font = { name: 'Times New Roman' };
      worksheet.getCell(`E${footerStartRow + 1}`).value = 'Guru BK';
      worksheet.getCell(`E${footerStartRow + 1}`).font = { name: 'Times New Roman' };
      
      worksheet.getCell(`B${footerStartRow + 5}`).value = 'NUR FADILAH, S.Pd';
      worksheet.getCell(`B${footerStartRow + 5}`).font = { bold: true, underline: true, name: 'Times New Roman' };
      worksheet.getCell(`E${footerStartRow + 5}`).value = 'WIWIK ISMIATI, S.Pd';
      worksheet.getCell(`E${footerStartRow + 5}`).font = { bold: true, underline: true, name: 'Times New Roman' };
      
      worksheet.getCell(`B${footerStartRow + 6}`).value = 'NIP. 19860410 201001 2 030';
      worksheet.getCell(`B${footerStartRow + 6}`).font = { name: 'Times New Roman' };
      worksheet.getCell(`E${footerStartRow + 6}`).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(`E${footerStartRow + 6}`).font = { name: 'Times New Roman' };

      // Save File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Pivot_Keterlambatan_Per_Kelas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      setShowDownloadSuccess(true);
      setTimeout(() => setShowDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Export Pivot Error:', error);
      alert('Gagal mengunduh Pivot Excel.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransaksi = transaksi.filter(t => {
    const matchSearch = t.siswa?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.siswa?.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tanggal.includes(searchTerm);
    
    const matchStartDate = startDate ? t.tanggal >= startDate : true;
    const matchEndDate = endDate ? t.tanggal <= endDate : true;

    return matchSearch && matchStartDate && matchEndDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Keterlambatan</h2>
          <p className="text-slate-500 text-sm">Kelola dan unduh laporan transaksi keterlambatan</p>
        </div>
        <div className="flex gap-2 relative">
          <AnimatePresence>
            {showDownloadSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute -top-12 right-0 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 z-50"
              >
                <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">✓</div>
                Download Berhasil!
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Daftar
            </button>
            <button
              onClick={() => setViewMode('perKelas')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'perKelas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Per Kelas
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Upload size={16} /> {isUploading ? 'Mengimpor...' : 'Upload Data Lama'}
          </button>
          <button 
            onClick={exportToExcel}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> {loading ? 'Memproses...' : 'Download Excel'}
          </button>
          <button 
            onClick={exportPivotToExcel}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> {loading ? 'Memproses...' : 'Download Pivot'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Edit Data Transaksi</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal</label>
              <input type="date" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jam</label>
              <input type="time" value={formData.jam} onChange={e => setFormData({...formData, jam: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alasan</label>
              <select value={formData.alasan} onChange={e => setFormData({...formData, alasan: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none">
                <option value="">Pilih Alasan</option>
                {ALASAN_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {formData.alasan === 'Lainnya' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alasan Lainnya</label>
                <input type="text" placeholder="Ketik alasan manual..." value={formData.alasanLainnya} onChange={e => setFormData({...formData, alasanLainnya: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors">Batal</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
              <Save size={16} /> Simpan
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama, kelas, tanggal..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
            </div>
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 outline-none text-sm font-medium text-slate-700 bg-transparent w-full md:w-auto"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 outline-none text-sm font-medium text-slate-700 bg-transparent w-full md:w-auto"
              />
            </div>
          </div>
          <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
            Total: {filteredTransaksi.length} Data
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'list' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal & Waktu</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Siswa</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Alasan</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading data...</td></tr>
                ) : filteredTransaksi.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Belum ada data.</td></tr>
                ) : (
                  filteredTransaksi.map((t, idx) => {
                    const rowColors = [
                      'bg-rose-50/30', 'bg-emerald-50/30', 'bg-blue-50/30', 
                      'bg-amber-50/30', 'bg-violet-50/30', 'bg-indigo-50/30',
                      'bg-cyan-50/30', 'bg-orange-50/30'
                    ];
                    const textColors = [
                      'text-rose-600', 'text-emerald-600', 'text-blue-600', 
                      'text-amber-600', 'text-violet-600', 'text-indigo-600',
                      'text-cyan-600', 'text-orange-600'
                    ];
                    const colorIdx = idx % rowColors.length;

                    return (
                      <tr key={t.id} className={`${rowColors[colorIdx]} hover:bg-white transition-colors`}>
                        <td className="p-4">
                          <p className={`text-sm font-bold ${textColors[colorIdx]}`}>{t.tanggal}</p>
                          <p className="text-xs text-slate-500">{t.jam}</p>
                        </td>
                        <td className="p-4">
                          <p className={`text-sm font-bold ${textColors[colorIdx]}`}>{t.siswa?.nama || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">Kelas {t.siswa?.kelas || '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${rowColors[colorIdx].replace('/30', '')} ${textColors[colorIdx]}`}>
                            {t.alasan}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(t)} className={`p-1.5 ${textColors[colorIdx]} hover:bg-white rounded-lg transition-colors`}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(t.id)} className={`p-1.5 ${textColors[colorIdx]} hover:bg-white rounded-lg transition-colors`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <div className="p-6 flex flex-col gap-6">
              {Array.from(new Set(siswaList.map(s => s.kelas))).sort().map((kelas, kIdx) => {
                const dataKelas = filteredTransaksi.filter(t => t.siswa?.kelas === kelas);
                if (dataKelas.length === 0) return null;

                const kelasColors = ['bg-blue-50', 'bg-emerald-50', 'bg-violet-50', 'bg-amber-50', 'bg-rose-50'];
                const kelasTextColors = ['text-blue-600', 'text-emerald-600', 'text-violet-600', 'text-amber-600', 'text-rose-600'];
                const kelasBorderColors = ['border-blue-100', 'border-emerald-100', 'border-violet-100', 'border-amber-100', 'border-rose-100'];
                const cIdx = kIdx % kelasColors.length;

                return (
                  <div key={kelas} className={`bg-white rounded-2xl border ${kelasBorderColors[cIdx]} shadow-sm flex flex-col overflow-hidden`}>
                    <div className={`p-4 border-b ${kelasBorderColors[cIdx]} flex items-center justify-between ${kelasColors[cIdx]}/50`}>
                      <h4 className={`font-black ${kelasTextColors[cIdx]} uppercase tracking-tight`}>Kelas {kelas}</h4>
                      <span className={`px-3 py-1 ${kelasColors[cIdx]} ${kelasTextColors[cIdx]} text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm`}>
                        {dataKelas.length} Terlambat
                      </span>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 border-b border-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Tanggal</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Jam</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alasan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {dataKelas.map((t, tIdx) => {
                            const rowColors = [
                              'bg-rose-50/20', 'bg-emerald-50/20', 'bg-blue-50/20', 
                              'bg-amber-50/20', 'bg-violet-50/20', 'bg-indigo-50/20',
                              'bg-cyan-50/20', 'bg-orange-50/20'
                            ];
                            const rowTextColors = [
                              'text-rose-600', 'text-emerald-600', 'text-blue-600', 
                              'text-amber-600', 'text-violet-600', 'text-indigo-600',
                              'text-cyan-600', 'text-orange-600'
                            ];
                            const rIdx = tIdx % rowColors.length;

                            return (
                              <tr key={t.id} className={`${rowColors[rIdx]} hover:bg-white transition-colors group`}>
                                <td className={`px-6 py-3 text-sm font-bold ${rowTextColors[rIdx]}`}>{t.tanggal}</td>
                                <td className={`px-6 py-3 text-[10px] font-mono ${rowTextColors[rIdx]} font-bold`}>{t.jam}</td>
                                <td className="px-6 py-3">
                                  <p className={`text-sm font-bold ${rowTextColors[rIdx]} transition-colors uppercase`}>
                                    {t.siswa?.nama}
                                  </p>
                                </td>
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-0.5 ${rowColors[rIdx].replace('/20', '')} ${rowTextColors[rIdx]} text-[9px] font-black rounded uppercase`}>
                                    {t.alasan}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
