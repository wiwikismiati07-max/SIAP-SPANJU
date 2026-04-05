import React, { useState, useEffect, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Keterlambatan');

    // Fetch logo image
    let logoId;
    try {
      // Using a CORS proxy just in case, but the main issue was likely the falsy check (logoId = 0)
      const response = await fetch('https://api.allorigins.win/raw?url=https://iili.io/KDFk4fI.png');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      logoId = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
    } catch (error) {
      console.error('Failed to load logo image:', error);
    }

    // Add Image to Worksheet
    if (logoId !== undefined) {
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 90, height: 90 }
      });
    }

    // Header text
    worksheet.mergeCells('B1:G1');
    worksheet.getCell('B1').value = 'PEMERINTAH KOTA PASURUAN';
    worksheet.getCell('B1').font = { bold: true, size: 14, name: 'Times New Roman' };
    worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B2:G2');
    worksheet.getCell('B2').value = 'SMP NEGERI 7';
    worksheet.getCell('B2').font = { bold: true, size: 16, name: 'Times New Roman' };
    worksheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B3:G3');
    worksheet.getCell('B3').value = 'Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139';
    worksheet.getCell('B3').font = { size: 11, name: 'Times New Roman' };
    worksheet.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B4:G4');
    worksheet.getCell('B4').value = 'Telepon (0343) 426845';
    worksheet.getCell('B4').font = { size: 11, name: 'Times New Roman' };
    worksheet.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('B5:G5');
    worksheet.getCell('B5').value = 'Pos-el smp7pas@yahoo.co.id , Laman www.smpn7pasuruan.sch.id';
    worksheet.getCell('B5').font = { size: 11, name: 'Times New Roman' };
    worksheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };

    // Double border under header
    for (let i = 1; i <= 7; i++) {
      worksheet.getCell(6, i).border = {
        bottom: { style: 'double' },
        top: { style: 'thin' }
      };
    }

    // Report Title
    worksheet.mergeCells('B8:G8');
    worksheet.getCell('B8').value = 'Laporan Siswa Terlambat Hadir';
    worksheet.getCell('B8').font = { bold: true, size: 12, name: 'Times New Roman' };
    worksheet.getCell('B8').alignment = { horizontal: 'center', vertical: 'middle' };

    // Table Headers
    const headers = ['NO', 'NAMA SISWA', 'KELAS', 'TANGGAL', 'JAM', 'STATUS', 'ALASAN'];
    const headerRow = worksheet.getRow(10);
    headerRow.values = headers;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

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
      
      const isAlt = index % 2 !== 0;
      
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri' };
        if (isAlt) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        }
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        if ([1, 3, 4, 5].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

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
  };

  const filteredTransaksi = transaksi.filter(t => 
    t.siswa?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.siswa?.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tanggal.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Keterlambatan</h2>
          <p className="text-slate-500 text-sm">Kelola dan unduh laporan transaksi keterlambatan</p>
        </div>
        <div className="flex gap-2">
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download size={16} /> Download Excel
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
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama, kelas, tanggal..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total: {filteredTransaksi.length} Data
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
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
                filteredTransaksi.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-semibold text-slate-800">{t.tanggal}</p>
                      <p className="text-xs text-slate-500">{t.jam}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-semibold text-slate-800">{t.siswa?.nama || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">Kelas {t.siswa?.kelas || '-'}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        {t.alasan}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
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
}
