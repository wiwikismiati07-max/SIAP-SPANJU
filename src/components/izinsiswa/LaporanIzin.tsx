import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { Download, Search, Calendar as CalendarIcon, Edit, Trash2, X, FileText, Users, BarChart3, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfYear } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }

    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType === 'detail' ? 'Detail Izin' : 'Absensi Harian');

      // Set Column Widths
      if (reportType === 'detail') {
        worksheet.columns = [
          { width: 5 },   // No
          { width: 30 },  // Nama
          { width: 10 },  // Kelas
          { width: 25 },  // Tanggal
          { width: 30 },  // Alasan
          { width: 15 },  // Status
          { width: 20 },  // Diajukan Oleh
          { width: 25 },  // Guru/Wali
        ];
      } else {
        worksheet.columns = [
          { width: 5 },   // No
          { width: 40 },  // Nama Siswa
          { width: 12 },  // Masuk
          { width: 12 },  // Izin
          { width: 12 },  // Sakit
          { width: 12 },  // Alpha
        ];
      }

      // --- HEADER SECTION ---
      const totalCols = reportType === 'detail' ? 8 : 6;
      const title = reportType === 'detail' ? 'Laporan Dispensasi Siswa' : `Laporan Absensi Harian - Kelas ${selectedKelas || 'Semua'}`;
      
      await addExcelHeaderAndLogos(worksheet, workbook, title, totalCols);

      // Subtitle for period
      worksheet.mergeCells(`A9:${String.fromCharCode(64 + totalCols)}9`);
      const subTitleCell = worksheet.getCell('A9');
      subTitleCell.value = `Periode: ${dateRange.start} s/d ${dateRange.end}`;
      subTitleCell.alignment = { horizontal: 'center' };

      // --- TABLE SECTION ---
      const headerRow = worksheet.getRow(11);
      let headers = [];
      if (reportType === 'detail') {
        headers = ['NO', 'NAMA SISWA', 'KELAS', 'TANGGAL', 'ALASAN', 'STATUS', 'PENGAJU', 'GURU/WALI'];
      } else {
        headers = ['NO', 'NAMA SISWA', 'MASUK (X)', 'IZIN (V)', 'SAKIT (V)', 'ALPHA (V)'];
      }
      
      headerRow.values = headers;

      let dataRowCount = 0;
      // Data Rows
      if (reportType === 'detail') {
        filteredData.forEach((item, index) => {
          const row = worksheet.getRow(12 + index);
          const dateStr = item.tanggal_mulai === item.tanggal_selesai 
            ? item.tanggal_mulai 
            : `${item.tanggal_mulai} - ${item.tanggal_selesai}`;
          
          const values = [
            index + 1,
            item.siswa?.nama || '-',
            item.siswa?.kelas || '-',
            dateStr,
            item.alasan,
            item.status,
            item.diajukan_oleh,
            item.diajukan_oleh === 'Wali Murid' ? item.nama_wali : (item.guru?.nama_guru || '-')
          ];

          values.forEach((v, i) => {
            const cell = row.getCell(i + 1);
            cell.value = v;
            cell.alignment = { horizontal: i === 0 || i === 2 || i === 5 ? 'center' : 'left', vertical: 'middle' };
          });
          dataRowCount++;
        });
      } else {
        // Absensi Logic
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

        studentsInClass.forEach((student, index) => {
          const studentIzins = data.filter(i => i.siswa_id === student.id && i.status === 'Disetujui');
          const isSakit = studentIzins.some(i => i.alasan === 'Sakit');
          const isIzin = studentIzins.some(i => i.alasan === 'Izin' || i.alasan === 'Acara Keluarga' || i.alasan === 'Keperluan Mendesak');
          const isAlpa = studentIzins.some(i => i.alasan === 'Alpa');
          const isMasuk = studentIzins.length === 0;

          const row = worksheet.getRow(12 + index);
          const values = [
            index + 1,
            student.nama,
            isMasuk ? 'X' : '',
            isIzin ? 'V' : '',
            isSakit ? 'V' : '',
            isAlpa ? 'V' : ''
          ];

          values.forEach((v, i) => {
            const cell = row.getCell(i + 1);
            cell.value = v;
            cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
          });
        });
      }

      const dataCount = reportType === 'detail' ? filteredData.length : (worksheet.lastRow?.number ? worksheet.lastRow.number - 11 : 0);
      applyColorfulTableStyle(worksheet, 11, dataCount, totalCols);

      // --- FOOTER SECTION ---
      const footerStartRow = 12 + dataCount + 3;

      // Left Signature
      const leftColStart = 2;
      const leftColEnd = 3;
      worksheet.mergeCells(footerStartRow, leftColStart, footerStartRow, leftColEnd);
      worksheet.getCell(footerStartRow, leftColStart).value = 'Mengetahui';
      worksheet.getCell(footerStartRow, leftColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, leftColStart, footerStartRow + 1, leftColEnd);
      worksheet.getCell(footerStartRow + 1, leftColStart).value = 'Kepala Sekolah';
      worksheet.getCell(footerStartRow + 1, leftColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, leftColStart, footerStartRow + 6, leftColEnd);
      const kasekName = worksheet.getCell(footerStartRow + 6, leftColStart);
      kasekName.value = 'WIWIK ISMIATI, S.Pd';
      kasekName.font = { bold: true, underline: true };
      kasekName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, leftColStart, footerStartRow + 7, leftColEnd);
      worksheet.getCell(footerStartRow + 7, leftColStart).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(footerStartRow + 7, leftColStart).alignment = { horizontal: 'center' };

      // Right Signature
      const rightColStart = totalCols - 2;
      const rightColEnd = totalCols;
      const today = format(new Date(), 'd MMMM yyyy', { locale: idLocale });
      worksheet.mergeCells(footerStartRow, rightColStart, footerStartRow, rightColEnd);
      worksheet.getCell(footerStartRow, rightColStart).value = `Pasuruan, ${today}`;
      worksheet.getCell(footerStartRow, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, rightColStart, footerStartRow + 1, rightColEnd);
      worksheet.getCell(footerStartRow + 1, rightColStart).value = 'Guru BK';
      worksheet.getCell(footerStartRow + 1, rightColStart).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, rightColStart, footerStartRow + 6, rightColEnd);
      const bkName = worksheet.getCell(footerStartRow + 6, rightColStart);
      bkName.value = '........................................';
      bkName.font = { bold: true, underline: true };
      bkName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, rightColStart, footerStartRow + 7, rightColEnd);
      worksheet.getCell(footerStartRow + 7, rightColStart).value = 'NIP. ........................................';
      worksheet.getCell(footerStartRow + 7, rightColStart).alignment = { horizontal: 'center' };

      // Generate and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Dispensasi_${dateRange.start}_sd_${dateRange.end}.xlsx`);

    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Gagal mengekspor Excel');
    } finally {
      setLoading(false);
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800">Edit Data Izin</h3>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
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
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
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
