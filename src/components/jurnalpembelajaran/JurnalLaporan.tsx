import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  Users, 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  UserCheck, 
  MessageSquare,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  CalendarCheck,
  Building,
  GraduationCap
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { JurnalPembelajaran, DAFTAR_KELAS } from '../../types/jurnalpembelajaran';
import { JurnalDetailModal } from './JurnalDetailModal';
import { JurnalPrintModal } from './JurnalPrintModal';
import { deleteJurnal, fetchGuruList, findGuruNip } from '../../lib/jurnalService';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';

interface JurnalLaporanProps {
  jurnalList: JurnalPembelajaran[];
  onRefresh: () => void;
  onEditJurnal: (jurnal: JurnalPembelajaran) => void;
}

export const JurnalLaporan: React.FC<JurnalLaporanProps> = ({ jurnalList, onRefresh, onEditJurnal }) => {
  // Active Report Sub-tab:
  // 0 = 'harian_guru' (Laporan harian guru yang input jurnal pembelajaran)
  // 1 = 'mingguan_bulanan' (Laporan Jurnal Pembelajaran mingguan, bulanan)
  // 2 = 'absensi' (Laporan siswa yang absensi)
  // 3 = 'catatan_tindakan' (Laporan Catatan siswa dan Tindakan)
  // 4 = 'siswa_bercatatan' (Laporan siswa yang ada Catatan)
  const [activeReportTab, setActiveReportTab] = useState<'harian_guru' | 'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan'>('harian_guru');

  // Daily Report Specific State
  const [dailyDate, setDailyDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dailySubTab, setDailySubTab] = useState<'rincian' | 'rekap_guru' | 'belum_input'>('rincian');
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Filter States
  const [filterPeriod, setFilterPeriod] = useState<'semua' | 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'kustom'>('bulan_ini');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [filterKelas, setFilterKelas] = useState<string>('semua');
  const [filterMapel, setFilterMapel] = useState<string>('semua');
  const [filterGuru, setFilterGuru] = useState<string>('semua');
  const [filterPeriode, setFilterPeriode] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatusAbsen, setFilterStatusAbsen] = useState<'semua' | 'Sakit' | 'Izin' | 'Alpa'>('semua');
  const [guruMasterList, setGuruMasterList] = useState<{ id: string; nama_guru: string; nip?: string }[]>([]);

  useEffect(() => {
    fetchGuruList().then(data => {
      if (data) setGuruMasterList(data);
    }).catch(console.error);
  }, []);

  // Detail Modal
  const [selectedJurnal, setSelectedJurnal] = useState<JurnalPembelajaran | null>(null);

  // Print Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printModalMode, setPrintModalMode] = useState<'harian_guru' | 'semua' | 'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan'>('harian_guru');

  // Quick Date Period Handler
  const handlePeriodChange = (type: 'semua' | 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'kustom') => {
    setFilterPeriod(type);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (type === 'hari_ini') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'minggu_ini') {
      const firstDay = new Date(today);
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      firstDay.setDate(diff);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'bulan_ini') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Distinct Lists for Select Filter
  const distinctPeriode = useMemo(() => {
    const set = new Set<string>();
    jurnalList.forEach(j => { 
      if (j.periode) set.add(j.periode.toString().trim()); 
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [jurnalList]);

  const distinctMapel = useMemo(() => {
    const set = new Set<string>();
    jurnalList.forEach(j => { if (j.nama_mapel) set.add(j.nama_mapel); });
    return Array.from(set).sort();
  }, [jurnalList]);

  const distinctGuru = useMemo(() => {
    const set = new Set<string>();
    jurnalList.forEach(j => { if (j.nama_guru) set.add(j.nama_guru); });
    return Array.from(set).sort();
  }, [jurnalList]);

  // Filtered Jurnal List
  const filteredJurnal = useMemo(() => {
    return jurnalList.filter(j => {
      // Periode filter
      if (filterPeriode !== 'semua' && j.periode && j.periode !== filterPeriode) return false;

      // Date filter
      if (filterPeriod !== 'semua') {
        if (startDate && j.tanggal < startDate) return false;
        if (endDate && j.tanggal > endDate) return false;
      }

      // Kelas filter
      if (filterKelas !== 'semua' && j.kelas !== filterKelas) return false;

      // Mapel filter
      if (filterMapel !== 'semua' && j.nama_mapel !== filterMapel) return false;

      // Guru filter
      if (filterGuru !== 'semua' && j.nama_guru !== filterGuru) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMain = 
          j.nama_mapel.toLowerCase().includes(q) ||
          j.nama_guru.toLowerCase().includes(q) ||
          j.kelas.toLowerCase().includes(q) ||
          j.materi.toLowerCase().includes(q) ||
          (j.kegiatan && j.kegiatan.toLowerCase().includes(q));

        const matchesStudent = j.siswa_list?.some(s => 
          s.nama.toLowerCase().includes(q) || 
          (s.catatan_siswa && s.catatan_siswa.toLowerCase().includes(q)) ||
          (s.tindakan && s.tindakan.toLowerCase().includes(q))
        );

        if (!matchesMain && !matchesStudent) return false;
      }

      return true;
    });
  }, [jurnalList, filterPeriode, filterPeriod, startDate, endDate, filterKelas, filterMapel, filterGuru, searchQuery]);

  // Filtered Absence Records (Sakit, Izin, Alpa)
  const absensiRecords = useMemo(() => {
    const records: {
      jurnalId: string;
      tanggal: string;
      jam_ke: string;
      kelas: string;
      nama_mapel: string;
      nama_guru: string;
      nama_siswa: string;
      nis?: string;
      status: 'Sakit' | 'Izin' | 'Alpa';
      catatan: string;
    }[] = [];

    filteredJurnal.forEach(j => {
      j.siswa_list?.forEach(s => {
        if (s.absensi !== 'Hadir') {
          if (filterStatusAbsen === 'semua' || s.absensi === filterStatusAbsen) {
            records.push({
              jurnalId: j.id,
              tanggal: j.tanggal,
              jam_ke: j.jam_ke,
              kelas: j.kelas,
              nama_mapel: j.nama_mapel,
              nama_guru: j.nama_guru,
              nama_siswa: s.nama,
              nis: s.nis,
              status: s.absensi as 'Sakit' | 'Izin' | 'Alpa',
              catatan: s.catatan_siswa || '-'
            });
          }
        }
      });
    });

    return records;
  }, [filteredJurnal, filterStatusAbsen]);

  // Aggregate stats per student for frequent absences
  const frequentAbsenceSummary = useMemo(() => {
    const map = new Map<string, {
      nama: string;
      kelas: string;
      nis?: string;
      totalAbsen: number;
      sakit: number;
      izin: number;
      alpa: number;
    }>();

    absensiRecords.forEach(r => {
      const key = `${r.nama_siswa}_${r.kelas}`;
      if (!map.has(key)) {
        map.set(key, {
          nama: r.nama_siswa,
          kelas: r.kelas,
          nis: r.nis,
          totalAbsen: 0,
          sakit: 0,
          izin: 0,
          alpa: 0
        });
      }
      
      const student = map.get(key)!;
      student.totalAbsen += 1;
      if (r.status === 'Sakit') student.sakit += 1;
      else if (r.status === 'Izin') student.izin += 1;
      else if (r.status === 'Alpa') student.alpa += 1;
    });

    // Convert to array and sort by total absences (descending)
    return Array.from(map.values())
      .sort((a, b) => b.totalAbsen - a.totalAbsen);
  }, [absensiRecords]);

  // Filtered Student Notes & Actions Records
  const catatanTindakanRecords = useMemo(() => {
    const records: {
      jurnalId: string;
      tanggal: string;
      jam_ke: string;
      kelas: string;
      nama_mapel: string;
      nama_guru: string;
      nama_siswa: string;
      nis?: string;
      nilai: string | number;
      catatan_siswa: string;
      tindakan: string;
    }[] = [];

    filteredJurnal.forEach(j => {
      j.siswa_list?.forEach(s => {
        if ((s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) {
          records.push({
            jurnalId: j.id,
            tanggal: j.tanggal,
            jam_ke: j.jam_ke,
            kelas: j.kelas,
            nama_mapel: j.nama_mapel,
            nama_guru: j.nama_guru,
            nama_siswa: s.nama,
            nis: s.nis,
            nilai: s.nilai || '-',
            catatan_siswa: s.catatan_siswa || '-',
            tindakan: s.tindakan || '-'
          });
        }
      });
    });

    return records;
  }, [filteredJurnal]);

  // Aggregate stats per student who has notes
  const studentNoteSummary = useMemo(() => {
    const map = new Map<string, {
      nama: string;
      kelas: string;
      nis?: string;
      totalCatatan: number;
      daftarCatatan: {
        tanggal: string;
        mapel: string;
        guru: string;
        catatan: string;
        tindakan: string;
      }[];
    }>();

    catatanTindakanRecords.forEach(r => {
      const key = `${r.nama_siswa}_${r.kelas}`;
      if (!map.has(key)) {
        map.set(key, {
          nama: r.nama_siswa,
          kelas: r.kelas,
          nis: r.nis,
          totalCatatan: 0,
          daftarCatatan: []
        });
      }
      const item = map.get(key)!;
      item.totalCatatan++;
      item.daftarCatatan.push({
        tanggal: r.tanggal,
        mapel: r.nama_mapel,
        guru: r.nama_guru,
        catatan: r.catatan_siswa,
        tindakan: r.tindakan
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalCatatan - a.totalCatatan);
  }, [catatanTindakanRecords]);

  // Delete Jurnal handler
  const handleDeleteJurnal = async (id: string, kelas: string, tgl: string) => {
    if (confirm(`Yakin ingin menghapus jurnal pembelajaran kelas ${kelas} tanggal ${tgl}?`)) {
      await deleteJurnal(id);
      onRefresh();
    }
  };

  // Aggregated Daily Records for "Laporan Harian Guru"
  const dailyJurnalList = useMemo(() => {
    return jurnalList.filter(j => {
      if (j.tanggal !== dailyDate) return false;
      if (filterKelas !== 'semua' && j.kelas !== filterKelas) return false;
      if (filterMapel !== 'semua' && j.nama_mapel !== filterMapel) return false;
      if (filterGuru !== 'semua' && j.nama_guru !== filterGuru) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          j.nama_guru.toLowerCase().includes(q) ||
          j.nama_mapel.toLowerCase().includes(q) ||
          j.kelas.toLowerCase().includes(q) ||
          (j.materi && j.materi.toLowerCase().includes(q)) ||
          (j.kegiatan && j.kegiatan.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => (a.jam_ke || '').localeCompare(b.jam_ke || '', undefined, { numeric: true }));
  }, [jurnalList, dailyDate, filterKelas, filterMapel, filterGuru, searchQuery]);

  const dailyGuruSummary = useMemo(() => {
    const map = new Map<string, {
      nama_guru: string;
      nip: string;
      mapelList: Set<string>;
      kelasList: Set<string>;
      jamList: string[];
      totalJurnal: number;
      totalHadir: number;
      totalSakit: number;
      totalIzin: number;
      totalAlpa: number;
      daftarMateri: string[];
    }>();

    dailyJurnalList.forEach(j => {
      const key = j.nama_guru.trim();
      if (!map.has(key)) {
        map.set(key, {
          nama_guru: j.nama_guru,
          nip: findGuruNip(j.nama_guru, guruMasterList, j.nip_guru) || '-',
          mapelList: new Set(),
          kelasList: new Set(),
          jamList: [],
          totalJurnal: 0,
          totalHadir: 0,
          totalSakit: 0,
          totalIzin: 0,
          totalAlpa: 0,
          daftarMateri: []
        });
      }
      const item = map.get(key)!;
      item.mapelList.add(j.nama_mapel);
      item.kelasList.add(j.kelas);
      item.jamList.push(j.jam_ke);
      item.totalJurnal++;
      if (j.materi) item.daftarMateri.push(j.materi);
      j.siswa_list?.forEach(s => {
        if (s.absensi === 'Hadir') item.totalHadir++;
        else if (s.absensi === 'Sakit') item.totalSakit++;
        else if (s.absensi === 'Izin') item.totalIzin++;
        else if (s.absensi === 'Alpa') item.totalAlpa++;
      });
    });

    return Array.from(map.values()).sort((a, b) => a.nama_guru.localeCompare(b.nama_guru));
  }, [dailyJurnalList, guruMasterList]);

  const dailyPresensiStats = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let total = 0;
    dailyJurnalList.forEach(j => {
      j.siswa_list?.forEach(s => {
        total++;
        if (s.absensi === 'Hadir') hadir++;
        else if (s.absensi === 'Sakit') sakit++;
        else if (s.absensi === 'Izin') izin++;
        else if (s.absensi === 'Alpa') alpa++;
      });
    });
    const percent = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0';
    return { hadir, sakit, izin, alpa, total, percent };
  }, [dailyJurnalList]);

  const guruBelumInputHarian = useMemo(() => {
    if (!guruMasterList || guruMasterList.length === 0) return [];
    const guruSudahInput = new Set(dailyJurnalList.map(j => j.nama_guru.toLowerCase().trim()));
    return guruMasterList.filter(g => !guruSudahInput.has(g.nama_guru.toLowerCase().trim()));
  }, [guruMasterList, dailyJurnalList]);

  const formatTanggalLengkap = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  const handleDailyPrevDay = () => {
    const d = new Date(dailyDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setDailyDate(d.toISOString().split('T')[0]);
  };

  const handleDailyNextDay = () => {
    const d = new Date(dailyDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setDailyDate(d.toISOString().split('T')[0]);
  };

  const handleDailyToday = () => {
    setDailyDate(new Date().toISOString().split('T')[0]);
  };

  // EXCEL EXPORT HANDLER (WITH OFFICIAL LOGO, KOP SURAT & SIGNATURES VIA EXCELJS)
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SMPN 7 Pasuruan';
      workbook.lastModifiedBy = 'SIAP SPANJU';
      workbook.created = new Date();
      workbook.modified = new Date();

      const todayStrIndo = format(new Date(), 'd MMMM yyyy', { locale: idLocale });

      if (activeReportTab === 'harian_guru') {
        const formattedDateIndo = formatTanggalLengkap(dailyDate);
        const titleHarian = `LAPORAN HARIAN GURU INPUT JURNAL PEMBELAJARAN (${formattedDateIndo.toUpperCase()})`;

        // ==========================================
        // SHEET 1: RINCIAN JURNAL HARIAN
        // ==========================================
        const wsRincian = workbook.addWorksheet('Rincian Jurnal Harian');
        const colCount = 10;
        await addExcelHeaderAndLogos(wsRincian, workbook, titleHarian, colCount);

        // Sub-info
        wsRincian.getCell('A9').value = `Hari / Tanggal: ${formattedDateIndo}`;
        wsRincian.getCell('A9').font = { bold: true, size: 10, name: 'Times New Roman' };
        wsRincian.getCell('J9').value = `Waktu Ekspor: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
        wsRincian.getCell('J9').font = { italic: true, size: 9, name: 'Times New Roman' };
        wsRincian.getCell('J9').alignment = { horizontal: 'right' };

        // Table Header
        const headerRow = wsRincian.getRow(11);
        headerRow.values = [
          'NO',
          'JAM KE',
          'KELAS',
          'MATA PELAJARAN',
          'NAMA GURU',
          'NIP GURU',
          'MATERI PEMBELAJARAN',
          'HADIR',
          'ABSEN (S/I/A)',
          'URAIAN KEGIATAN'
        ];

        // Data Rows
        dailyJurnalList.forEach((j, idx) => {
          const row = wsRincian.getRow(12 + idx);
          const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
          const sakit = j.siswa_list?.filter(s => s.absensi === 'Sakit').length || 0;
          const izin = j.siswa_list?.filter(s => s.absensi === 'Izin').length || 0;
          const alpa = j.siswa_list?.filter(s => s.absensi === 'Alpa').length || 0;
          const nip = findGuruNip(j.nama_guru, guruMasterList, j.nip_guru) || '-';

          const values = [
            idx + 1,
            `${j.jam_ke} (${j.jam_mulai} - ${j.jam_selesai})`,
            j.kelas,
            j.nama_mapel,
            j.nama_guru,
            nip,
            j.materi || '-',
            hadir,
            `S:${sakit} I:${izin} A:${alpa}`,
            j.kegiatan || '-'
          ];

          values.forEach((v, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = v;
            cell.font = { name: 'Times New Roman', size: 10 };
            cell.alignment = {
              horizontal: [0, 1, 2, 7, 8].includes(colIdx) ? 'center' : 'left',
              vertical: 'middle',
              wrapText: [6, 9].includes(colIdx)
            };
          });
        });

        applyColorfulTableStyle(wsRincian, 11, Math.max(1, dailyJurnalList.length), colCount);

        // Column Widths
        wsRincian.getColumn(1).width = 6;
        wsRincian.getColumn(2).width = 18;
        wsRincian.getColumn(3).width = 10;
        wsRincian.getColumn(4).width = 28;
        wsRincian.getColumn(5).width = 26;
        wsRincian.getColumn(6).width = 24;
        wsRincian.getColumn(7).width = 35;
        wsRincian.getColumn(8).width = 10;
        wsRincian.getColumn(9).width = 16;
        wsRincian.getColumn(10).width = 35;

        // Signatures
        const lastRowRincian = 12 + Math.max(1, dailyJurnalList.length);
        const footerRow1 = lastRowRincian + 3;

        wsRincian.mergeCells(footerRow1, 2, footerRow1, 4);
        wsRincian.getCell(footerRow1, 2).value = 'Mengetahui,';
        wsRincian.getCell(footerRow1, 2).alignment = { horizontal: 'center' };
        wsRincian.getCell(footerRow1, 2).font = { name: 'Times New Roman', size: 11 };

        wsRincian.mergeCells(footerRow1 + 1, 2, footerRow1 + 1, 4);
        wsRincian.getCell(footerRow1 + 1, 2).value = 'Kepala SMP Negeri 7 Pasuruan';
        wsRincian.getCell(footerRow1 + 1, 2).alignment = { horizontal: 'center' };
        wsRincian.getCell(footerRow1 + 1, 2).font = { name: 'Times New Roman', size: 11, bold: true };

        wsRincian.mergeCells(footerRow1 + 5, 2, footerRow1 + 5, 4);
        const kasekCell = wsRincian.getCell(footerRow1 + 5, 2);
        kasekCell.value = 'NUR FADILAH, S.Pd';
        kasekCell.font = { name: 'Times New Roman', size: 11, bold: true, underline: true };
        kasekCell.alignment = { horizontal: 'center' };

        wsRincian.mergeCells(footerRow1 + 6, 2, footerRow1 + 6, 4);
        const nipCell = wsRincian.getCell(footerRow1 + 6, 2);
        nipCell.value = 'NIP. 19860410 201001 2 030';
        nipCell.font = { name: 'Times New Roman', size: 10 };
        nipCell.alignment = { horizontal: 'center' };

        // Right signature
        wsRincian.mergeCells(footerRow1, 7, footerRow1, 9);
        wsRincian.getCell(footerRow1, 7).value = `Pasuruan, ${todayStrIndo}`;
        wsRincian.getCell(footerRow1, 7).alignment = { horizontal: 'center' };
        wsRincian.getCell(footerRow1, 7).font = { name: 'Times New Roman', size: 11 };

        wsRincian.mergeCells(footerRow1 + 1, 7, footerRow1 + 1, 9);
        wsRincian.getCell(footerRow1 + 1, 7).value = 'Guru Piket / Kurikulum';
        wsRincian.getCell(footerRow1 + 1, 7).alignment = { horizontal: 'center' };
        wsRincian.getCell(footerRow1 + 1, 7).font = { name: 'Times New Roman', size: 11, bold: true };

        wsRincian.mergeCells(footerRow1 + 5, 7, footerRow1 + 5, 9);
        const piketCell = wsRincian.getCell(footerRow1 + 5, 7);
        piketCell.value = '( .................................................... )';
        piketCell.font = { name: 'Times New Roman', size: 11, bold: true };
        piketCell.alignment = { horizontal: 'center' };

        wsRincian.mergeCells(footerRow1 + 6, 7, footerRow1 + 6, 9);
        const piketNipCell = wsRincian.getCell(footerRow1 + 6, 7);
        piketNipCell.value = 'NIP. ....................................................';
        piketNipCell.font = { name: 'Times New Roman', size: 10 };
        piketNipCell.alignment = { horizontal: 'center' };

        // ==========================================
        // SHEET 2: REKAPITULASI GURU
        // ==========================================
        const wsRekap = workbook.addWorksheet('Rekapitulasi Guru');
        await addExcelHeaderAndLogos(wsRekap, workbook, `REKAPITULASI KEAKTIFAN GURU INPUT JURNAL (${formattedDateIndo.toUpperCase()})`, 9);

        wsRekap.getCell('A9').value = `Hari / Tanggal: ${formattedDateIndo}`;
        wsRekap.getCell('A9').font = { bold: true, size: 10, name: 'Times New Roman' };

        const rekapHeaderRow = wsRekap.getRow(11);
        rekapHeaderRow.values = [
          'NO',
          'NAMA GURU',
          'NIP GURU',
          'MATA PELAJARAN',
          'KELAS DIAJAR',
          'TOTAL KBM',
          'SISWA HADIR',
          'SISWA ABSEN (S/I/A)',
          'STATUS'
        ];

        dailyGuruSummary.forEach((g, idx) => {
          const row = wsRekap.getRow(12 + idx);
          const values = [
            idx + 1,
            g.nama_guru,
            g.nip,
            Array.from(g.mapelList).join(', '),
            Array.from(g.kelasList).join(', '),
            g.totalJurnal,
            g.totalHadir,
            `S:${g.totalSakit} I:${g.totalIzin} A:${g.totalAlpa}`,
            'Sudah Input'
          ];
          values.forEach((v, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = v;
            cell.font = { name: 'Times New Roman', size: 10 };
            cell.alignment = {
              horizontal: [0, 4, 5, 6, 7, 8].includes(colIdx) ? 'center' : 'left',
              vertical: 'middle'
            };
          });
        });

        applyColorfulTableStyle(wsRekap, 11, Math.max(1, dailyGuruSummary.length), 9);
        wsRekap.getColumn(1).width = 6;
        wsRekap.getColumn(2).width = 28;
        wsRekap.getColumn(3).width = 24;
        wsRekap.getColumn(4).width = 30;
        wsRekap.getColumn(5).width = 18;
        wsRekap.getColumn(6).width = 12;
        wsRekap.getColumn(7).width = 14;
        wsRekap.getColumn(8).width = 20;
        wsRekap.getColumn(9).width = 14;

        // Signatures on Sheet 2
        const lastRowRekap = 12 + Math.max(1, dailyGuruSummary.length);
        const footerRow2 = lastRowRekap + 3;

        wsRekap.mergeCells(footerRow2, 2, footerRow2, 3);
        wsRekap.getCell(footerRow2, 2).value = 'Mengetahui,';
        wsRekap.getCell(footerRow2, 2).alignment = { horizontal: 'center' };
        wsRekap.getCell(footerRow2, 2).font = { name: 'Times New Roman', size: 11 };

        wsRekap.mergeCells(footerRow2 + 1, 2, footerRow2 + 1, 3);
        wsRekap.getCell(footerRow2 + 1, 2).value = 'Kepala SMP Negeri 7 Pasuruan';
        wsRekap.getCell(footerRow2 + 1, 2).alignment = { horizontal: 'center' };
        wsRekap.getCell(footerRow2 + 1, 2).font = { name: 'Times New Roman', size: 11, bold: true };

        wsRekap.mergeCells(footerRow2 + 5, 2, footerRow2 + 5, 3);
        const k2 = wsRekap.getCell(footerRow2 + 5, 2);
        k2.value = 'NUR FADILAH, S.Pd';
        k2.font = { name: 'Times New Roman', size: 11, bold: true, underline: true };
        k2.alignment = { horizontal: 'center' };

        wsRekap.mergeCells(footerRow2 + 6, 2, footerRow2 + 6, 3);
        const nip2 = wsRekap.getCell(footerRow2 + 6, 2);
        nip2.value = 'NIP. 19860410 201001 2 030';
        nip2.font = { name: 'Times New Roman', size: 10 };
        nip2.alignment = { horizontal: 'center' };

        wsRekap.mergeCells(footerRow2, 6, footerRow2, 8);
        wsRekap.getCell(footerRow2, 6).value = `Pasuruan, ${todayStrIndo}`;
        wsRekap.getCell(footerRow2, 6).alignment = { horizontal: 'center' };
        wsRekap.getCell(footerRow2, 6).font = { name: 'Times New Roman', size: 11 };

        wsRekap.mergeCells(footerRow2 + 1, 6, footerRow2 + 1, 8);
        wsRekap.getCell(footerRow2 + 1, 6).value = 'Guru Piket / Kurikulum';
        wsRekap.getCell(footerRow2 + 1, 6).alignment = { horizontal: 'center' };
        wsRekap.getCell(footerRow2 + 1, 6).font = { name: 'Times New Roman', size: 11, bold: true };

        wsRekap.mergeCells(footerRow2 + 5, 6, footerRow2 + 5, 8);
        const piket2 = wsRekap.getCell(footerRow2 + 5, 6);
        piket2.value = '( .................................................... )';
        piket2.font = { name: 'Times New Roman', size: 11, bold: true };
        piket2.alignment = { horizontal: 'center' };

        wsRekap.mergeCells(footerRow2 + 6, 6, footerRow2 + 6, 8);
        const piketNip2 = wsRekap.getCell(footerRow2 + 6, 6);
        piketNip2.value = 'NIP. ....................................................';
        piketNip2.font = { name: 'Times New Roman', size: 10 };
        piketNip2.alignment = { horizontal: 'center' };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Harian_Guru_Input_Jurnal_${dailyDate}.xlsx`);
      } else if (activeReportTab === 'mingguan_bulanan') {
        const ws = workbook.addWorksheet('Jurnal Pembelajaran');
        const colCount = 11;
        await addExcelHeaderAndLogos(ws, workbook, `LAPORAN JURNAL PEMBELAJARAN (${startDate} s/d ${endDate})`, colCount);

        const headerRow = ws.getRow(11);
        headerRow.values = [
          'NO',
          'TANGGAL',
          'JAM KE',
          'KELAS',
          'MATA PELAJARAN',
          'NAMA GURU',
          'NIP GURU',
          'MATERI PEMBELAJARAN',
          'HADIR',
          'ABSEN',
          'URAIAN KEGIATAN'
        ];

        filteredJurnal.forEach((j, idx) => {
          const row = ws.getRow(12 + idx);
          const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
          const sakit = j.siswa_list?.filter(s => s.absensi === 'Sakit').length || 0;
          const izin = j.siswa_list?.filter(s => s.absensi === 'Izin').length || 0;
          const alpa = j.siswa_list?.filter(s => s.absensi === 'Alpa').length || 0;
          const nip = findGuruNip(j.nama_guru, guruMasterList, j.nip_guru) || '-';

          const values = [
            idx + 1,
            j.tanggal,
            `${j.jam_ke} (${j.jam_mulai} - ${j.jam_selesai})`,
            j.kelas,
            j.nama_mapel,
            j.nama_guru,
            nip,
            j.materi || '-',
            hadir,
            `S:${sakit} I:${izin} A:${alpa}`,
            j.kegiatan || '-'
          ];

          values.forEach((v, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = v;
            cell.font = { name: 'Times New Roman', size: 10 };
            cell.alignment = {
              horizontal: [0, 1, 2, 3, 8, 9].includes(colIdx) ? 'center' : 'left',
              vertical: 'middle',
              wrapText: [7, 10].includes(colIdx)
            };
          });
        });

        applyColorfulTableStyle(ws, 11, Math.max(1, filteredJurnal.length), colCount);
        ws.getColumn(1).width = 6;
        ws.getColumn(2).width = 14;
        ws.getColumn(3).width = 18;
        ws.getColumn(4).width = 10;
        ws.getColumn(5).width = 26;
        ws.getColumn(6).width = 24;
        ws.getColumn(7).width = 24;
        ws.getColumn(8).width = 30;
        ws.getColumn(9).width = 10;
        ws.getColumn(10).width = 14;
        ws.getColumn(11).width = 32;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Jurnal_Pembelajaran_${startDate}_sd_${endDate}.xlsx`);
      } else if (activeReportTab === 'absensi') {
        const ws = workbook.addWorksheet('Rekap Absensi');
        const colCount = 10;
        await addExcelHeaderAndLogos(ws, workbook, `LAPORAN KETIDAKHADIRAN SISWA (${startDate} s/d ${endDate})`, colCount);

        const headerRow = ws.getRow(11);
        headerRow.values = [
          'NO',
          'TANGGAL',
          'JAM',
          'KELAS',
          'NAMA SISWA',
          'STATUS',
          'MATA PELAJARAN',
          'GURU PENGAJAR',
          'NIP GURU',
          'CATATAN'
        ];

        absensiRecords.forEach((r, idx) => {
          const row = ws.getRow(12 + idx);
          const values = [
            idx + 1,
            r.tanggal,
            r.jam_ke,
            r.kelas,
            r.nama_siswa,
            r.status,
            r.nama_mapel,
            r.nama_guru,
            findGuruNip(r.nama_guru, guruMasterList) || '-',
            r.catatan
          ];
          values.forEach((v, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = v;
            cell.font = { name: 'Times New Roman', size: 10 };
            cell.alignment = {
              horizontal: [0, 1, 2, 3, 5].includes(colIdx) ? 'center' : 'left',
              vertical: 'middle'
            };
          });
        });

        applyColorfulTableStyle(ws, 11, Math.max(1, absensiRecords.length), colCount);
        ws.getColumn(1).width = 6;
        ws.getColumn(2).width = 14;
        ws.getColumn(3).width = 12;
        ws.getColumn(4).width = 10;
        ws.getColumn(5).width = 28;
        ws.getColumn(6).width = 12;
        ws.getColumn(7).width = 24;
        ws.getColumn(8).width = 24;
        ws.getColumn(9).width = 22;
        ws.getColumn(10).width = 30;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Absensi_Siswa_${startDate}_sd_${endDate}.xlsx`);
      } else if (activeReportTab === 'catatan_tindakan') {
        const ws = workbook.addWorksheet('Catatan & Tindakan');
        const colCount = 10;
        await addExcelHeaderAndLogos(ws, workbook, `LAPORAN CATATAN KHUSUS & TINDAKAN GURU (${startDate} s/d ${endDate})`, colCount);

        const headerRow = ws.getRow(11);
        headerRow.values = [
          'NO',
          'TANGGAL',
          'KELAS',
          'NAMA SISWA',
          'NILAI',
          'CATATAN PERILAKU / SISWA',
          'TINDAKAN GURU',
          'MATA PELAJARAN',
          'GURU PENGAJAR',
          'NIP GURU'
        ];

        catatanTindakanRecords.forEach((r, idx) => {
          const row = ws.getRow(12 + idx);
          const values = [
            idx + 1,
            r.tanggal,
            r.kelas,
            r.nama_siswa,
            r.nilai ?? '-',
            r.catatan_siswa,
            r.tindakan,
            r.nama_mapel,
            r.nama_guru,
            findGuruNip(r.nama_guru, guruMasterList) || '-'
          ];
          values.forEach((v, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = v;
            cell.font = { name: 'Times New Roman', size: 10 };
            cell.alignment = {
              horizontal: [0, 1, 2, 4].includes(colIdx) ? 'center' : 'left',
              vertical: 'middle',
              wrapText: [5, 6].includes(colIdx)
            };
          });
        });

        applyColorfulTableStyle(ws, 11, Math.max(1, catatanTindakanRecords.length), colCount);
        ws.getColumn(1).width = 6;
        ws.getColumn(2).width = 14;
        ws.getColumn(3).width = 10;
        ws.getColumn(4).width = 28;
        ws.getColumn(5).width = 10;
        ws.getColumn(6).width = 35;
        ws.getColumn(7).width = 35;
        ws.getColumn(8).width = 24;
        ws.getColumn(9).width = 24;
        ws.getColumn(10).width = 22;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Catatan_dan_Tindakan_${startDate}_sd_${endDate}.xlsx`);
      } else if (activeReportTab === 'siswa_bercatatan') {
        const ws = workbook.addWorksheet('Siswa Ada Catatan');
        const colCount = 5;
        await addExcelHeaderAndLogos(ws, workbook, `REKAPITULASI SISWA MEMILIKI CATATAN PERILAKU (${startDate} s/d ${endDate})`, colCount);

        const headerRow = ws.getRow(11);
        headerRow.values = [
          'NO',
          'KELAS',
          'NAMA SISWA',
          'TOTAL CATATAN',
          'RINCIAN CATATAN & TINDAKAN'
        ];

        studentNoteSummary.forEach((s, idx) => {
          const row = ws.getRow(12 + idx);
          const detailStr = s.daftarCatatan.map(c => `[${c.tanggal} - ${c.mapel} (${c.guru})]\nCatatan: ${c.catatan}\nTindakan: ${c.tindakan}`).join('\n---\n');
          const values = [
            idx + 1,
            s.kelas,
            s.nama,
            s.totalCatatan,
            detailStr
          ];
          values.forEach((v, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = v;
            cell.font = { name: 'Times New Roman', size: 10 };
            cell.alignment = {
              horizontal: [0, 1, 3].includes(colIdx) ? 'center' : 'left',
              vertical: 'middle',
              wrapText: colIdx === 4
            };
          });
        });

        applyColorfulTableStyle(ws, 11, Math.max(1, studentNoteSummary.length), colCount);
        ws.getColumn(1).width = 6;
        ws.getColumn(2).width = 12;
        ws.getColumn(3).width = 30;
        ws.getColumn(4).width = 16;
        ws.getColumn(5).width = 60;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Laporan_Siswa_Bercatatan_${startDate}_sd_${endDate}.xlsx`);
      }
    } catch (err) {
      console.error('Error exporting excel:', err);
      alert('Gagal mengekspor data ke Excel. Silakan coba lagi.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // PRINT REPORT HANDLER (Opens Complete or Specific Print Modal)
  const handlePrintReport = (mode: 'harian_guru' | 'semua' | 'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan' = 'harian_guru') => {
    setPrintModalMode(mode);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 5 REPORT SUB-TABS */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveReportTab('harian_guru')}
          className={`flex-1 min-w-[190px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeReportTab === 'harian_guru'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarCheck size={16} /> Laporan Harian Guru
          {dailyJurnalList.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              activeReportTab === 'harian_guru' ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {dailyJurnalList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveReportTab('mingguan_bulanan')}
          className={`flex-1 min-w-[190px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeReportTab === 'mingguan_bulanan'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar size={16} /> Jurnal Mingguan & Bulanan
        </button>
        <button
          onClick={() => setActiveReportTab('absensi')}
          className={`flex-1 min-w-[170px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeReportTab === 'absensi'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserCheck size={16} /> Rekap Siswa Absensi
          {absensiRecords.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              activeReportTab === 'absensi' ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-700'
            }`}>
              {absensiRecords.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveReportTab('catatan_tindakan')}
          className={`flex-1 min-w-[180px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeReportTab === 'catatan_tindakan'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MessageSquare size={16} /> Catatan Siswa & Tindakan
          {catatanTindakanRecords.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              activeReportTab === 'catatan_tindakan' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {catatanTindakanRecords.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveReportTab('siswa_bercatatan')}
          className={`flex-1 min-w-[170px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeReportTab === 'siswa_bercatatan'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={16} /> Siswa Ada Catatan
          {studentNoteSummary.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              activeReportTab === 'siswa_bercatatan' ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'
            }`}>
              {studentNoteSummary.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* FILTER CONTROLS BAR (FOR NON-HARIAN TABS) */}
      {/* ========================================================================= */}
      {activeReportTab !== 'harian_guru' && (
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 space-y-4">
          {/* Quick Period Tabs & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={14} /> Periode:
              </span>
              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => handlePeriodChange('hari_ini')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    filterPeriod === 'hari_ini' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('minggu_ini')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    filterPeriod === 'minggu_ini' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Minggu Ini
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('bulan_ini')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    filterPeriod === 'bulan_ini' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('semua')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    filterPeriod === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>

            {/* Action Buttons: Export Excel & Print */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                <FileSpreadsheet size={15} />
                {isExportingExcel ? 'Mengekspor Excel...' : 'Download Excel (.xlsx)'}
              </button>
              <button
                type="button"
                onClick={() => handlePrintReport(activeReportTab)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
              >
                <Printer size={15} />
                Cetak Dokumen
              </button>
            </div>
          </div>

          {/* Date Range, Periode, Kelas, Mapel, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            {/* Filter Periode */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Periode</label>
              <select
                value={filterPeriode}
                onChange={e => setFilterPeriode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/50 text-xs font-bold text-amber-800 focus:bg-white outline-none"
              >
                <option value="semua">Semua Periode</option>
                {distinctPeriode.map(p => (
                  <option key={p} value={p}>Periode {p}</option>
                ))}
              </select>
            </div>

            {/* Tanggal Dari - Sampai */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setFilterPeriod('kustom');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setFilterPeriod('kustom');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white outline-none"
              />
            </div>

            {/* Filter Kelas */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Kelas</label>
              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white outline-none"
              >
                <option value="semua">Semua Kelas</option>
                {DAFTAR_KELAS.map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>

            {/* Filter Mapel */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Mata Pelajaran</label>
              <select
                value={filterMapel}
                onChange={e => setFilterMapel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white outline-none truncate"
              >
                <option value="semua">Semua Mapel</option>
                {distinctMapel.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Search Query */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Cari Kata Kunci</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari materi / guru / siswa..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Optional Extra Filter for Absensi Tab */}
          {activeReportTab === 'absensi' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500">Filter Presensi:</span>
              {(['semua', 'Sakit', 'Izin', 'Alpa'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatusAbsen(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterStatusAbsen === st
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'semua' ? 'Semua (S/I/A)' : st}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 0: LAPORAN HARIAN GURU YANG INPUT JURNAL PEMBELAJARAN */}
      {/* ========================================================================= */}
      {activeReportTab === 'harian_guru' && (
        <div className="space-y-6">
          {/* OFFICIAL SCHOOL KOP SURAT CARD */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
            {/* Kop Surat Header with Logos */}
            <div className="flex items-center justify-between gap-4 pb-4">
              <img
                src="https://i.ibb.co/677QPVHY/logo.png"
                alt="Logo Pemkot Pasuruan"
                className="w-16 h-20 sm:w-20 sm:h-24 object-contain flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="text-center flex-1 px-2 font-serif text-slate-900">
                <h4 className="text-sm sm:text-base md:text-lg font-bold tracking-wider leading-tight">
                  PEMERINTAH KOTA PASURUAN
                </h4>
                <h4 className="text-sm sm:text-base md:text-lg font-bold tracking-wider leading-tight">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </h4>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-wide my-0.5 text-slate-950">
                  SMP NEGERI 7 PASURUAN
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-700 leading-snug">
                  Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139
                </p>
                <p className="text-[10px] sm:text-xs text-slate-700 leading-snug">
                  Telepon (0343) 426845 • Pos-el smp7pas@yahoo.co.id • Laman www.smpn7pasuruan.sch.id
                </p>
              </div>
              <img
                src="https://iili.io/KDFk4fI.png"
                alt="Logo SMPN 7 Pasuruan"
                className="w-16 h-20 sm:w-20 sm:h-24 object-contain flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Official Double Border Line */}
            <div className="border-b-4 border-double border-slate-900 -mt-2 mb-4" />

            {/* Document Title Banner */}
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-xl font-black uppercase text-slate-900 tracking-wider">
                LAPORAN HARIAN GURU INPUT JURNAL PEMBELAJARAN
              </h3>
              <p className="text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200/80 inline-block px-4 py-1 rounded-full shadow-xs">
                Hari / Tanggal: {formatTanggalLengkap(dailyDate)}
              </p>
            </div>

            {/* DATE NAVIGATION & ACTION CONTROLS */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              {/* Date Nav Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDailyPrevDay}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-xs transition-all"
                  title="Hari Sebelumnya"
                >
                  <ChevronLeft size={16} /> Kemarin
                </button>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                  <Calendar size={15} className="text-amber-600" />
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={e => setDailyDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDailyNextDay}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-xs transition-all"
                  title="Hari Berikutnya"
                >
                  Besok <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleDailyToday}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all"
                >
                  Hari Ini
                </button>
              </div>

              {/* Primary Action Buttons: Download Excel (.xlsx) & Cetak */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  title="Download File Excel (.xlsx) Lengkap dengan Kop Surat dan Rekapitulasi Guru"
                >
                  <FileSpreadsheet size={16} />
                  {isExportingExcel ? 'Mengekspor...' : 'Download Excel (.xlsx)'}
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintReport('harian_guru')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                  title="Cetak atau Simpan PDF Laporan Harian Guru"
                >
                  <Printer size={16} />
                  Cetak Dokumen
                </button>
              </div>
            </div>

            {/* Quick Filters for Daily View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Kelas</label>
                <select
                  value={filterKelas}
                  onChange={e => setFilterKelas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="semua">Semua Kelas</option>
                  {DAFTAR_KELAS.map(k => (
                    <option key={k} value={k}>Kelas {k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Mata Pelajaran</label>
                <select
                  value={filterMapel}
                  onChange={e => setFilterMapel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none truncate"
                >
                  <option value="semua">Semua Mata Pelajaran</option>
                  {distinctMapel.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Guru</label>
                <select
                  value={filterGuru}
                  onChange={e => setFilterGuru(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none truncate"
                >
                  <option value="semua">Semua Guru</option>
                  {distinctGuru.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Cari Kata Kunci</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Materi / guru / kegiatan..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* DAILY STATS KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-200/70">
                <div className="flex items-center justify-between text-amber-700 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Sesi KBM</span>
                  <Clock size={16} />
                </div>
                <div className="text-2xl font-black text-slate-900">{dailyJurnalList.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Pertemuan pembelajaran masuk</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 rounded-2xl border border-emerald-200/70">
                <div className="flex items-center justify-between text-emerald-700 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Guru Menginput</span>
                  <Users size={16} />
                </div>
                <div className="text-2xl font-black text-slate-900">{dailyGuruSummary.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Dari {guruMasterList.length > 0 ? `${guruMasterList.length} total guru` : 'daftar pengajar'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-4 rounded-2xl border border-blue-200/70">
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Kelas Terlayani</span>
                  <Building size={16} />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {new Set(dailyJurnalList.map(j => j.kelas)).size}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Rombongan belajar aktif</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-4 rounded-2xl border border-purple-200/70">
                <div className="flex items-center justify-between text-purple-700 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Kehadiran Siswa</span>
                  <UserCheck size={16} />
                </div>
                <div className="text-2xl font-black text-slate-900">{dailyPresensiStats.percent}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-semibold">
                  <span className="text-emerald-600">H:{dailyPresensiStats.hadir}</span>
                  <span className="text-amber-600">S:{dailyPresensiStats.sakit}</span>
                  <span className="text-blue-600">I:{dailyPresensiStats.izin}</span>
                  <span className="text-rose-600">A:{dailyPresensiStats.alpa}</span>
                </div>
              </div>
            </div>

            {/* DAILY SUB-TABS SELECTOR */}
            <div className="border-b border-slate-200 flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDailySubTab('rincian')}
                className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  dailySubTab === 'rincian'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText size={15} /> Rincian Jurnal Per Sesi ({dailyJurnalList.length})
              </button>
              <button
                type="button"
                onClick={() => setDailySubTab('rekap_guru')}
                className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  dailySubTab === 'rekap_guru'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users size={15} /> Rekapitulasi Keaktifan Per Guru ({dailyGuruSummary.length})
              </button>
              <button
                type="button"
                onClick={() => setDailySubTab('belum_input')}
                className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
                  dailySubTab === 'belum_input'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertCircle size={15} /> Monitoring Guru Belum Input ({guruBelumInputHarian.length})
              </button>
            </div>

            {/* TAB VIEW 1: RINCIAN JURNAL PER SESI */}
            {dailySubTab === 'rincian' && (
              <div className="space-y-4">
                {dailyJurnalList.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-sm text-slate-700">
                      Belum ada jurnal pembelajaran yang diinput pada hari ini
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tanggal {formatTanggalLengkap(dailyDate)} belum memiliki rekaman KBM atau tidak cocok dengan filter.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-center w-10">No</th>
                          <th className="p-3 w-36">Jam Pelajaran</th>
                          <th className="p-3 w-16 text-center">Kelas</th>
                          <th className="p-3 min-w-[180px]">Mata Pelajaran & Guru</th>
                          <th className="p-3 min-w-[220px]">Materi & Kegiatan</th>
                          <th className="p-3 w-36 text-center">Presensi Siswa</th>
                          <th className="p-3 w-20 text-center">Dokumentasi</th>
                          <th className="p-3 w-20 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailyJurnalList.map((j, idx) => {
                          const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
                          const sakit = j.siswa_list?.filter(s => s.absensi === 'Sakit').length || 0;
                          const izin = j.siswa_list?.filter(s => s.absensi === 'Izin').length || 0;
                          const alpa = j.siswa_list?.filter(s => s.absensi === 'Alpa').length || 0;
                          const nip = findGuruNip(j.nama_guru, guruMasterList, j.nip_guru);

                          return (
                            <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3">
                                <div className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded-md border border-amber-200/60 mb-0.5 text-[11px]">
                                  Jam Ke-{j.jam_ke}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock size={11} /> {j.jam_mulai} - {j.jam_selesai}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg border border-slate-200">
                                  {j.kelas}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900 text-xs">{j.nama_mapel}</div>
                                <div className="text-slate-600 font-medium text-[11px] mt-0.5">{j.nama_guru}</div>
                                {nip && <div className="text-[10px] text-slate-400">NIP. {nip}</div>}
                              </td>
                              <td className="p-3 space-y-1">
                                <div className="font-semibold text-slate-800 leading-snug">{j.materi}</div>
                                {j.kegiatan && (
                                  <div className="text-[11px] text-slate-500 line-clamp-2 italic">
                                    "{j.kegiatan}"
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold text-[10px] border border-emerald-200/60">
                                    H:{hadir}
                                  </span>
                                  {sakit > 0 && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-bold text-[10px] border border-amber-200/60">
                                      S:{sakit}
                                    </span>
                                  )}
                                  {izin > 0 && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-bold text-[10px] border border-blue-200/60">
                                      I:{izin}
                                    </span>
                                  )}
                                  {alpa > 0 && (
                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded font-bold text-[10px] border border-rose-200/60">
                                      A:{alpa}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                {j.foto_kegiatan ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedJurnal(j)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                    title="Lihat Foto Dokumentasi"
                                  >
                                    <ImageIcon size={14} className="text-amber-600" />
                                  </button>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedJurnal(j)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                    title="Lihat Detail Jurnal"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onEditJurnal(j)}
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                                    title="Edit Jurnal"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 2: REKAPITULASI KEAKTIFAN PER GURU */}
            {dailySubTab === 'rekap_guru' && (
              <div className="space-y-4">
                {dailyGuruSummary.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Users size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-sm text-slate-700">Belum ada guru yang menginput jurnal pada hari ini</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-center w-12">No</th>
                          <th className="p-3 min-w-[200px]">Nama Guru & NIP</th>
                          <th className="p-3 min-w-[180px]">Mata Pelajaran</th>
                          <th className="p-3 w-32">Kelas yang Diajar</th>
                          <th className="p-3 w-28 text-center">Total KBM</th>
                          <th className="p-3 w-40 text-center">Rekap Presensi Siswa</th>
                          <th className="p-3 w-28 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dailyGuruSummary.map((g, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 text-xs">{g.nama_guru}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">NIP. {g.nip}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-700">
                                {Array.from(g.mapelList).join(', ')}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {Array.from(g.kelasList).map(k => (
                                  <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px] border border-slate-200">
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800">
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                                {g.totalJurnal} Sesi
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold">
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  H:{g.totalHadir}
                                </span>
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  S:{g.totalSakit}
                                </span>
                                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  I:{g.totalIzin}
                                </span>
                                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  A:{g.totalAlpa}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px] border border-emerald-200">
                                <CheckCircle2 size={11} /> Sudah Input
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 3: MONITORING GURU BELUM INPUT */}
            {dailySubTab === 'belum_input' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">Monitoring Penginputan Jurnal Harian</div>
                    <div className="mt-0.5 text-amber-800">
                      Terdapat <strong>{guruBelumInputHarian.length}</strong> guru terdaftar di sekolah yang belum tercatat menginput jurnal pembelajaran pada tanggal {formatTanggalLengkap(dailyDate)}.
                    </div>
                  </div>
                </div>

                {guruBelumInputHarian.length === 0 ? (
                  <div className="py-12 text-center text-emerald-600 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <CheckCircle2 size={48} className="mx-auto mb-2 text-emerald-500" />
                    <p className="font-bold text-sm">Luar biasa! Seluruh guru telah menginput jurnal pembelajaran hari ini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-center w-12">No</th>
                          <th className="p-3">Nama Lengkap Guru</th>
                          <th className="p-3 w-48">NIP</th>
                          <th className="p-3 w-36 text-center">Status Jurnal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {guruBelumInputHarian.map((g, idx) => (
                          <tr key={g.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-800">{g.nama_guru}</td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">{g.nip || '-'}</td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-full text-[10px] border border-rose-200">
                                Belum Input
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* OFFICIAL SIGNATURE PREVIEW */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-center gap-6 font-serif text-slate-900 text-xs">
              <div className="space-y-1">
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala SMP Negeri 7 Pasuruan</p>
                <div className="h-16" />
                <p className="font-bold underline text-sm">NUR FADILAH, S.Pd</p>
                <p className="text-[11px] text-slate-600">NIP. 19860410 201001 2 030</p>
              </div>

              <div className="space-y-1">
                <p>Pasuruan, {format(new Date(), 'd MMMM yyyy', { locale: idLocale })}</p>
                <p className="font-bold">Guru Piket / Kurikulum</p>
                <div className="h-16" />
                <p className="font-bold text-sm">( .................................................... )</p>
                <p className="text-[11px] text-slate-600">NIP. ....................................................</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: LAPORAN JURNAL PEMBELAJARAN MINGGUAN & BULANAN */}
      {/* ========================================================================= */}
      {activeReportTab === 'mingguan_bulanan' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Rekapitulasi Jurnal Pembelajaran ({filteredJurnal.length} Pertemuan)
              </h3>
              <p className="text-xs text-slate-400">
                Periode {startDate} s/d {endDate} • Kelas: {filterKelas === 'semua' ? 'Semua Kelas' : filterKelas}
              </p>
            </div>
          </div>

          {filteredJurnal.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-600">Belum ada jurnal pembelajaran pada filter ini</p>
              <p className="text-xs text-slate-400 mt-1">Ubah rentang tanggal atau input jurnal pembelajaran baru</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3 w-28">Tanggal & Jam</th>
                    <th className="p-3 w-20 text-center">Kelas</th>
                    <th className="p-3 min-w-[160px]">Mata Pelajaran & Guru</th>
                    <th className="p-3 min-w-[200px]">Materi & Kegiatan</th>
                    <th className="p-3 text-center w-28">Presensi</th>
                    <th className="p-3 text-center w-24">Foto</th>
                    <th className="p-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJurnal.map((j, idx) => {
                    const totalSiswa = j.siswa_list?.length || 0;
                    const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
                    const sakit = j.siswa_list?.filter(s => s.absensi === 'Sakit').length || 0;
                    const izin = j.siswa_list?.filter(s => s.absensi === 'Izin').length || 0;
                    const alpa = j.siswa_list?.filter(s => s.absensi === 'Alpa').length || 0;

                    return (
                      <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center font-medium text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{j.tanggal}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {j.jam_ke.toLowerCase().startsWith('jam') || j.jam_ke.toLowerCase() === 'istirahat' ? j.jam_ke : `Jam Ke ${j.jam_ke}`}
                          </div>
                          <div className="text-[10px] text-slate-400">{j.jam_mulai} - {j.jam_selesai}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg font-black border border-amber-200/80">
                            {j.kelas}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{j.nama_mapel}</div>
                          <div className="text-xs text-slate-600 font-medium flex items-center flex-wrap gap-1 mt-0.5">
                            <span className="text-slate-400">Guru:</span> <span>{j.nama_guru}</span>
                            {(() => {
                              const tNip = findGuruNip(j.nama_guru, guruMasterList, j.nip_guru);
                              return tNip ? <span className="text-[10px] text-slate-500 font-normal">(NIP: {tNip})</span> : null;
                            })()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{j.materi}</div>
                          {j.kegiatan && (
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">{j.kegiatan}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="space-y-1">
                            <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Hadir: {hadir}/{totalSiswa}
                            </div>
                            {(sakit > 0 || izin > 0 || alpa > 0) && (
                              <div className="text-[10px] font-semibold text-slate-500">
                                {sakit > 0 && <span className="text-amber-600 mr-1">S:{sakit}</span>}
                                {izin > 0 && <span className="text-blue-600 mr-1">I:{izin}</span>}
                                {alpa > 0 && <span className="text-rose-600">A:{alpa}</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {j.foto_kegiatan && j.foto_kegiatan.length > 0 ? (
                            <button
                              onClick={() => setSelectedJurnal(j)}
                              className="relative inline-block rounded-lg overflow-hidden border border-slate-200 w-14 h-10 group"
                            >
                              <img src={j.foto_kegiatan[0]} alt="Foto" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white font-bold">
                                {j.foto_kegiatan.length} Foto
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedJurnal(j)}
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Lihat Detail & Cetak"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => setSelectedJurnal(j)}
                              className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Cetak Jurnal Ini"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              onClick={() => onEditJurnal(j)}
                              className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                              title="Edit Jurnal"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteJurnal(j.id, j.kelas, j.tanggal)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Hapus Jurnal"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: LAPORAN SISWA YANG ABSENSI */}
      {/* ========================================================================= */}
      {activeReportTab === 'absensi' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Rekapitulasi Siswa Absensi ({absensiRecords.length} Catatan Ketidakhadiran)
              </h3>
              <p className="text-xs text-slate-400">
                Daftar siswa yang berstatus Sakit (S), Izin (I), atau Alpa (A) pada sesi pembelajaran
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintReport('absensi')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                <Printer size={15} /> Cetak Laporan
              </button>
            </div>
          </div>

          {/* Quick Absence Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Sakit (S)</p>
                <h4 className="text-2xl font-black text-amber-700 mt-1">
                  {absensiRecords.filter(r => r.status === 'Sakit').length} Siswa
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-200/60 text-amber-800 flex items-center justify-center font-bold">S</div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total Izin (I)</p>
                <h4 className="text-2xl font-black text-blue-700 mt-1">
                  {absensiRecords.filter(r => r.status === 'Izin').length} Siswa
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-200/60 text-blue-800 flex items-center justify-center font-bold">I</div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Alpa (A)</p>
                <h4 className="text-2xl font-black text-rose-700 mt-1">
                  {absensiRecords.filter(r => r.status === 'Alpa').length} Siswa
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-200/60 text-rose-800 flex items-center justify-center font-bold">A</div>
            </div>
          </div>

          {/* Frequent Absences Summary */}
          {frequentAbsenceSummary.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-2">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" /> 
                Frekuensi Ketidakhadiran per Siswa
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {frequentAbsenceSummary.map((student, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{student.nama}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                          {student.kelas}
                        </span>
                        S: {student.sakit} • I: {student.izin} • A: {student.alpa}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">
                      {student.totalAbsen}x
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {absensiRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-3" />
              <p className="font-bold text-sm text-slate-600">Tidak ada siswa yang absen pada filter ini</p>
              <p className="text-xs text-slate-400 mt-1">Semua siswa hadir atau belum ada data pada periode ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3 w-28">Tanggal & Jam</th>
                    <th className="p-3 text-center w-20">Kelas</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center w-24">Status Presensi</th>
                    <th className="p-3 min-w-[160px]">Mata Pelajaran & Guru</th>
                    <th className="p-3 min-w-[160px]">Keterangan / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absensiRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{r.tanggal}</div>
                        <div className="text-[10px] text-slate-400">{r.jam_ke}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-700">
                          {r.kelas}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{r.nama_siswa}</div>
                        {r.nis && <div className="text-[10px] text-slate-400">NIS: {r.nis}</div>}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg font-black text-[11px] ${
                          r.status === 'Sakit' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          r.status === 'Izin' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{r.nama_mapel}</div>
                        <div className="text-[10px] text-slate-500">Guru: {r.nama_guru}</div>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {r.catatan !== '-' ? r.catatan : <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: LAPORAN CATATAN SISWA DAN TINDAKAN */}
      {/* ========================================================================= */}
      {activeReportTab === 'catatan_tindakan' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Laporan Catatan Siswa & Tindakan Guru ({catatanTindakanRecords.length} Catatan)
              </h3>
              <p className="text-xs text-slate-400">
                Rekapitulasi evaluasi perilaku, keaktifan, kendala, dan tindakan bimbingan yang dilakukan guru
              </p>
            </div>
          </div>

          {catatanTindakanRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <MessageSquare size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-600">Belum ada catatan siswa dan tindakan pada filter ini</p>
              <p className="text-xs text-slate-400 mt-1">Catatan dan tindakan dapat diinput saat mengisi Jurnal Pembelajaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3 w-28">Tanggal & Jam</th>
                    <th className="p-3 text-center w-16">Kelas</th>
                    <th className="p-3 min-w-[150px]">Nama Siswa</th>
                    <th className="p-3 min-w-[150px]">Mata Pelajaran & Guru</th>
                    <th className="p-3 text-center w-16">Nilai</th>
                    <th className="p-3 min-w-[180px]">Catatan Siswa</th>
                    <th className="p-3 min-w-[180px]">Tindakan Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catatanTindakanRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{r.tanggal}</div>
                        <div className="text-[10px] text-slate-400">{r.jam_ke}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-700">
                          {r.kelas}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{r.nama_siswa}</div>
                        {r.nis && <div className="text-[10px] text-slate-400">NIS: {r.nis}</div>}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{r.nama_mapel}</div>
                        <div className="text-[10px] text-slate-500">Guru: {r.nama_guru}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">
                        {r.nilai}
                      </td>
                      <td className="p-3">
                        <div className="p-2 bg-amber-50/80 rounded-xl border border-amber-200/60 text-amber-900 font-medium text-[11px] leading-relaxed">
                          {r.catatan_siswa}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="p-2 bg-blue-50/80 rounded-xl border border-blue-200/60 text-blue-900 font-medium text-[11px] leading-relaxed">
                          {r.tindakan}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: LAPORAN SISWA YANG ADA CATATAN */}
      {/* ========================================================================= */}
      {activeReportTab === 'siswa_bercatatan' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Daftar Siswa yang Memiliki Catatan Khusus ({studentNoteSummary.length} Siswa)
              </h3>
              <p className="text-xs text-slate-400">
                Peringkasan otomatis siswa-siswa yang memerlukan perhatian, bimbingan lanjutan, atau apresiasi prestasi
              </p>
            </div>
          </div>

          {studentNoteSummary.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-3" />
              <p className="font-bold text-sm text-slate-600">Tidak ada siswa dengan catatan pada filter ini</p>
              <p className="text-xs text-slate-400 mt-1">Semua proses belajar berjalan lancar tanpa kendala khusus</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentNoteSummary.map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-5 transition-all shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-800">{item.nama}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-black text-[10px]">
                          Kelas {item.kelas}
                        </span>
                      </div>
                      {item.nis && <p className="text-[10px] text-slate-400 mt-0.5">NIS: {item.nis}</p>}
                    </div>
                    <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-black shrink-0">
                      {item.totalCatatan} Catatan
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {item.daftarCatatan.map((c, cIdx) => (
                      <div key={cIdx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                          <span>{c.tanggal} • {c.mapel}</span>
                          <span>Guru: {c.guru}</span>
                        </div>
                        <div className="text-xs font-semibold text-amber-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200/40">
                          <span className="font-bold text-amber-800 mr-1">Catatan:</span> {c.catatan}
                        </div>
                        <div className="text-xs font-semibold text-blue-900 bg-blue-50/60 p-2 rounded-lg border border-blue-200/40">
                          <span className="font-bold text-blue-800 mr-1">Tindakan:</span> {c.tindakan}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      <JurnalDetailModal
        jurnal={selectedJurnal}
        onClose={() => setSelectedJurnal(null)}
        onEdit={(j) => {
          setSelectedJurnal(null);
          onEditJurnal(j);
        }}
      />

      {/* FULL REPORT PRINT PREVIEW MODAL */}
      <JurnalPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        jurnalList={printModalMode === 'harian_guru' ? dailyJurnalList : filteredJurnal}
        filterPeriod={printModalMode === 'harian_guru' ? 'hari_ini' : filterPeriod}
        startDate={printModalMode === 'harian_guru' ? dailyDate : startDate}
        endDate={printModalMode === 'harian_guru' ? dailyDate : endDate}
        filterKelas={filterKelas}
        filterMapel={filterMapel}
        filterGuru={filterGuru}
        filterPeriode={filterPeriode}
        defaultMode={printModalMode}
      />
    </div>
  );
};
