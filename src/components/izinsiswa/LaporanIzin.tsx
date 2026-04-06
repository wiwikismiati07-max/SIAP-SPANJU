import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { Download, Search, Calendar as CalendarIcon, Edit, Trash2, X, FileText, Users, BarChart3, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfYear } from 'date-fns';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function LaporanIzin() {
  const KELAS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  const [data, setData] = useState<IzinWithSiswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipe, setFilterTipe] = useState<'Semua' | 'Wali Murid'>('Semua');
  const [reportType, setReportType] = useState<'detail' | 'absensi' | 'statistik'>('detail');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Statistics calculations
  const statsPerKelas = KELAS_OPTIONS.map(kelas => ({
    name: kelas,
    count: data.filter(i => i.siswa?.kelas === kelas && i.status === 'Disetujui').length
  })).filter(s => s.count > 0);

  const statsPerBulan = Array.from({ length: 12 }).map((_, i) => {
    const monthDate = new Date(new Date().getFullYear(), i, 1);
    const monthName = format(monthDate, 'MMM');
    const count = data.filter(item => {
      const d = parseISO(item.tanggal_mulai);
      return d.getMonth() === i && d.getFullYear() === new Date().getFullYear() && item.status === 'Disetujui';
    }).length;
    return { name: monthName, count };
  });

  const topAbsentees = Array.from(new Set(data.map(i => i.siswa_id)))
    .map(id => {
      const student = data.find(i => i.siswa_id === id)?.siswa;
      const count = data.filter(i => i.siswa_id === id && i.status === 'Disetujui').length;
      return { ...student, count };
    })
    .filter(s => s.count >= 3)
    .sort((a, b) => b.count - a.count);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    tanggal_mulai: '',
    tanggal_selesai: '',
    alasan: '',
    status: 'Menunggu' as 'Menunggu' | 'Disetujui' | 'Ditolak'
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data: iData } = await supabase
          .from('izin_siswa')
          .select('*')
          .gte('tanggal_mulai', dateRange.start)
          .lte('tanggal_mulai', dateRange.end)
          .order('tanggal_mulai', { ascending: false });
          
        if (iData) {
          const { data: sData } = await supabase.from('master_siswa').select('*');
          const { data: gData } = await supabase.from('master_guru').select('*');
          const { data: mData } = await supabase.from('master_mapel').select('*');
          
          const joinedData = iData.map(i => ({
            ...i,
            siswa: sData?.find(s => s.id === i.siswa_id) || { id: i.siswa_id, nama: 'Unknown', kelas: '-' },
            guru: gData?.find(g => g.id === i.guru_id),
            mapel: mData?.find(m => m.id === i.mapel_id)
          }));
          setData(joinedData as IzinWithSiswa[]);
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        const localGuru = JSON.parse(localStorage.getItem('master_guru') || '[]');
        const localMapel = JSON.parse(localStorage.getItem('master_mapel') || '[]');
        
        const filtered = localData
          .filter((d: any) => d.tanggal_mulai >= dateRange.start && d.tanggal_mulai <= dateRange.end)
          .map((d: any) => ({
            ...d,
            siswa: localSiswa.find((s: any) => s.id === d.siswa_id) || { id: d.siswa_id, nama: 'Unknown', kelas: '-' },
            guru: localGuru.find((g: any) => g.id === d.guru_id),
            mapel: localMapel.find((m: any) => m.id === d.mapel_id)
          }))
          .sort((a: any, b: any) => new Date(b.tanggal_mulai).getTime() - new Date(a.tanggal_mulai).getTime());
          
        setData(filtered);
      }
    } catch (error) {
      console.error('Error fetching laporan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (reportType === 'detail') {
      const exportData = filteredData.map(d => ({
        'NAMA': d.siswa?.nama,
        'KELAS': d.siswa?.kelas,
        'TANGGAL MULAI': d.tanggal_mulai,
        'TANGGAL SELESAI': d.tanggal_selesai,
        'ALASAN': d.alasan,
        'STATUS': d.status,
        'DIAJUKAN OLEH': d.diajukan_oleh,
        'GURU PEMBERI IZIN': d.guru?.nama_guru || '-',
        'MATA PELAJARAN': d.mapel?.nama_mapel || '-',
        'NAMA WALI': d.nama_wali || '-',
        'NO TELP WALI': d.no_telp_wali || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Izin");
      XLSX.writeFile(wb, `Laporan_Izin_${dateRange.start}_sd_${dateRange.end}.xlsx`);
    } else {
      // Absensi Harian Report with ExcelJS for Logo and Styling
      if (!selectedKelas) {
        alert('Pilih kelas terlebih dahulu untuk laporan absensi harian');
        return;
      }

      setLoading(true);
      try {
        let studentsInClass: any[] = [];
        if (supabase) {
          const { data: sData } = await supabase
            .from('master_siswa')
            .select('*')
            .eq('kelas', selectedKelas)
            .order('nama', { ascending: true });
          studentsInClass = sData || [];
        } else {
          const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
          studentsInClass = localSiswa
            .filter((s: any) => s.kelas === selectedKelas)
            .sort((a: any, b: any) => a.nama.localeCompare(b.nama));
        }

        if (studentsInClass.length === 0) {
          alert('Tidak ada data siswa untuk kelas ini');
          return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Absensi Harian');

        // Add Logo
        try {
          const response = await fetch('https://iili.io/KDFk4fI.png');
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 60, height: 60 }
          });
        } catch (e) {
          console.error('Failed to load logo', e);
        }

        // Header
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'PEMERINTAH KOTA PASURUAN';
        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A2').value = 'SMP NEGERI 7';
        worksheet.mergeCells('A3:F3');
        worksheet.getCell('A3').value = 'Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139';
        worksheet.mergeCells('A4:F4');
        worksheet.getCell('A4').value = 'Telepon (0343) 426845';
        worksheet.mergeCells('A5:F5');
        worksheet.getCell('A5').value = 'Pos-el smp7pas@yahoo.co.id , Laman www.smpn7pasuruan.sch.id';

        // Title
        worksheet.mergeCells('A7:F7');
        worksheet.getCell('A7').value = 'LAPORAN ABSENSI HARIAN SISWA';
        worksheet.mergeCells('A8:F8');
        worksheet.getCell('A8').value = `Kelas: ${selectedKelas} | Periode: ${dateRange.start} s/d ${dateRange.end}`;

        // Styling Headers
        ['A1', 'A2', 'A3', 'A4', 'A5', 'A7', 'A8'].forEach(cell => {
          worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
          worksheet.getCell(cell).font = { bold: true, name: 'Arial' };
        });
        worksheet.getCell('A2').font.size = 14;
        worksheet.getCell('A7').font.size = 16;

        // Table Header
        const headerRow = worksheet.getRow(10);
        headerRow.values = ['NO', 'NAMA SISWA', 'MASUK (X)', 'IZIN ( )', 'SAKIT ( )', 'ALPHA ( )'];
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F4E78' } // Dark Blue
          };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Data Rows
        studentsInClass.forEach((student, index) => {
          const studentIzins = data.filter(i => i.siswa_id === student.id && i.status === 'Disetujui');
          const isSakit = studentIzins.some(i => i.alasan === 'Sakit');
          const isIzin = studentIzins.some(i => i.alasan === 'Izin' || i.alasan === 'Acara Keluarga' || i.alasan === 'Keperluan Mendesak');
          const isAlpa = studentIzins.some(i => i.alasan === 'Alpa');
          const isMasuk = studentIzins.length === 0;

          const row = worksheet.addRow([
            index + 1,
            student.nama,
            isMasuk ? 'X' : '',
            isIzin ? 'V' : '',
            isSakit ? 'V' : '',
            isAlpa ? 'V' : ''
          ]);

          row.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center' };
            
            // Alternating Light Blue
            if (index % 2 !== 0) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' } // Light Blue
              };
            }
          });
        });

        // Column Widths
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 40;
        worksheet.getColumn(3).width = 12;
        worksheet.getColumn(4).width = 12;
        worksheet.getColumn(5).width = 12;
        worksheet.getColumn(6).width = 12;

        // Footer
        const lastRow = worksheet.lastRow?.number || 10;
        const footerStart = lastRow + 2;
        
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const today = new Date();
        const formattedDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

        worksheet.getCell(`A${footerStart}`).value = 'Mengetahui,';
        worksheet.getCell(`D${footerStart}`).value = `Pasuruan, ${formattedDate}`;
        worksheet.getCell(`A${footerStart + 1}`).value = 'Kepala Sekolah,';
        worksheet.getCell(`D${footerStart + 1}`).value = 'Guru BK,';
        
        worksheet.getCell(`A${footerStart + 5}`).value = 'NUR FADILAH, S.Pd';
        worksheet.getCell(`D${footerStart + 5}`).value = 'WIWIK ISMIATI, S.Pd';
        worksheet.getCell(`A${footerStart + 5}`).font = { bold: true, underline: true };
        worksheet.getCell(`D${footerStart + 5}`).font = { bold: true, underline: true };
        
        worksheet.getCell(`A${footerStart + 6}`).value = 'NIP. 19860410 201001 2 030';
        worksheet.getCell(`D${footerStart + 6}`).value = 'NIP. 19831116 200904 2 003';

        // Generate and Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Absensi_Harian_${selectedKelas}_${dateRange.start}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
        alert('Gagal membuat laporan');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data izin ini?')) return;
    try {
      if (supabase) {
        await supabase.from('izin_siswa').delete().eq('id', id);
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        localStorage.setItem('izinsiswa_data', JSON.stringify(localData.filter((d:any) => d.id !== id)));
      }
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus data');
    }
  };

  const startEdit = (izin: IzinWithSiswa) => {
    setEditingId(izin.id);
    setEditForm({
      tanggal_mulai: izin.tanggal_mulai,
      tanggal_selesai: izin.tanggal_selesai,
      alasan: izin.alasan,
      status: izin.status
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      if (supabase) {
        await supabase.from('izin_siswa').update(editForm).eq('id', editingId);
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const updated = localData.map((d:any) => d.id === editingId ? { ...d, ...editForm } : d);
        localStorage.setItem('izinsiswa_data', JSON.stringify(updated));
      }
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan perubahan');
    }
  };

  const filteredData = data.filter(d => {
    const matchSearch = d.siswa?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.siswa?.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.alasan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipe = filterTipe === 'Semua' || d.diajukan_oleh === filterTipe;
    const matchKelas = selectedKelas ? d.siswa?.kelas === selectedKelas : true;
    return matchSearch && matchTipe && matchKelas;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Laporan Perizinan</h2>
        <button
          onClick={handleDownloadExcel}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-medium transition-colors"
        >
          <Download size={18} /> Download Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe Laporan</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setReportType('detail')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                  reportType === 'detail' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText size={16} />
                Detail Izin
              </button>
              <button
                onClick={() => setReportType('absensi')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                  reportType === 'absensi' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={16} />
                Absensi Harian
              </button>
              <button
                onClick={() => setReportType('statistik')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                  reportType === 'statistik' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 size={16} />
                Statistik
              </button>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Filter Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
            >
              <option value="">Semua Kelas</option>
              {KELAS_OPTIONS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama, kelas, atau alasan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <CalendarIcon className="text-slate-400" size={20} />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <select
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value as any)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="Semua">Semua Pengajuan</option>
            <option value="Wali Murid">Laporan Izin Wali</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Tidak ada data izin pada periode ini.</div>
        ) : reportType === 'detail' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Siswa</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Tanggal</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Alasan</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Diajukan Oleh</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Lampiran</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((izin) => (
                  <tr key={izin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{izin.siswa?.nama}</div>
                      <div className="text-xs text-slate-500">Kelas {izin.siswa?.kelas}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">
                        {izin.tanggal_mulai === izin.tanggal_selesai 
                          ? format(new Date(izin.tanggal_mulai), 'dd MMM yyyy')
                          : `${format(new Date(izin.tanggal_mulai), 'dd MMM')} - ${format(new Date(izin.tanggal_selesai), 'dd MMM yyyy')}`
                        }
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{izin.alasan}</div>
                      {izin.mapel && <div className="text-[10px] text-blue-600 font-bold uppercase mt-1">Mapel: {izin.mapel.nama_mapel}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        izin.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                        izin.status === 'Ditolak' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {izin.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                          {izin.diajukan_oleh}
                        </span>
                        {izin.guru && <span className="text-[10px] text-slate-500 font-bold">Guru: {izin.guru.nama_guru}</span>}
                        {izin.nama_wali && <span className="text-xs text-slate-500">Wali: {izin.nama_wali}</span>}
                        {izin.no_telp_wali && <span className="text-xs text-slate-500">Telp: {izin.no_telp_wali}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      {izin.lampiran_url ? (
                        <a href={izin.lampiran_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                          Lihat Surat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(izin)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(izin.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportType === 'absensi' ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Laporan Absensi Harian</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              Laporan ini menampilkan rekap Sakit, Izin, dan Alpa per siswa dalam rentang waktu tertentu.
              Silakan pilih kelas dan klik tombol <strong>Download Excel</strong> untuk melihat detail lengkapnya.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600" />
                  Statistik Izin Per Kelas
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsPerKelas}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        cursor={{fill: '#f1f5f9'}}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statsPerKelas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CalendarIcon size={20} className="text-emerald-600" />
                  Tren Izin Per Bulan
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsPerBulan}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        cursor={{fill: '#f1f5f9'}}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
              <h3 className="text-lg font-bold text-rose-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-rose-600" />
                Siswa Sering Izin (&gt;= 3x Per Bulan)
              </h3>
              {topAbsentees.length === 0 ? (
                <p className="text-rose-600/70 italic">Tidak ada siswa dengan frekuensi izin tinggi.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topAbsentees.map((s) => (
                    <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-rose-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{s.nama}</div>
                        <div className="text-xs text-slate-500">Kelas {s.kelas}</div>
                      </div>
                      <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm font-bold">
                        {s.count}x
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Edit Data Izin</h3>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={editForm.tanggal_mulai}
                  onChange={e => setEditForm({...editForm, tanggal_mulai: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  value={editForm.tanggal_selesai}
                  onChange={e => setEditForm({...editForm, tanggal_selesai: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alasan</label>
                <input
                  type="text"
                  value={editForm.alasan}
                  onChange={e => setEditForm({...editForm, alasan: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Menunggu">Menunggu</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
