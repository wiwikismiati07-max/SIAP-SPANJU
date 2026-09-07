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
  UserCheck, 
  MessageSquare,
  Image as ImageIcon,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { JurnalPembelajaran, DAFTAR_KELAS } from '../../types/jurnalpembelajaran';
import { JurnalDetailModal } from './JurnalDetailModal';
import { JurnalPrintModal } from './JurnalPrintModal';
import { deleteJurnal, fetchGuruList, findGuruNip } from '../../lib/jurnalService';

interface JurnalLaporanProps {
  jurnalList: JurnalPembelajaran[];
  onRefresh: () => void;
  onEditJurnal: (jurnal: JurnalPembelajaran) => void;
}

export const JurnalLaporan: React.FC<JurnalLaporanProps> = ({ jurnalList, onRefresh, onEditJurnal }) => {
  // Active Report Sub-tab:
  // 1 = 'mingguan_bulanan' (Laporan Jurnal Pembelajaran mingguan, bulanan)
  // 2 = 'absensi' (Laporan siswa yang absensi)
  // 3 = 'catatan_tindakan' (Laporan Catatan siswa dan Tindakan)
  // 4 = 'siswa_bercatatan' (Laporan siswa yang ada Catatan)
  const [activeReportTab, setActiveReportTab] = useState<'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan'>('mingguan_bulanan');

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
  const [printModalMode, setPrintModalMode] = useState<'semua' | 'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan'>('semua');

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

  // EXCEL EXPORT HANDLER
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeReportTab === 'mingguan_bulanan') {
      const data = filteredJurnal.map((j, idx) => {
        const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
        const sakit = j.siswa_list?.filter(s => s.absensi === 'Sakit').length || 0;
        const izin = j.siswa_list?.filter(s => s.absensi === 'Izin').length || 0;
        const alpa = j.siswa_list?.filter(s => s.absensi === 'Alpa').length || 0;
        return {
          'No': idx + 1,
          'Periode': j.periode || '-',
          'Tanggal': j.tanggal,
          'Jam Pelajaran': `${j.jam_ke} (${j.jam_mulai} - ${j.jam_selesai})`,
          'Kelas': j.kelas,
          'Mata Pelajaran': j.nama_mapel,
          'Guru Pengajar': j.nama_guru,
          'NIP Guru': findGuruNip(j.nama_guru, guruMasterList, j.nip_guru) || '-',
          'Materi Pembelajaran': j.materi,
          'Uraian Kegiatan': j.kegiatan || '-',
          'Hadir': hadir,
          'Sakit': sakit,
          'Izin': izin,
          'Alpa': alpa,
          'Total Siswa': j.siswa_list?.length || 0
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Pembelajaran');
      XLSX.writeFile(wb, `Laporan_Jurnal_Pembelajaran_${startDate}_sd_${endDate}.xlsx`);
    } else if (activeReportTab === 'absensi') {
      const data = absensiRecords.map((r, idx) => ({
        'No': idx + 1,
        'Tanggal': r.tanggal,
        'Jam': r.jam_ke,
        'Kelas': r.kelas,
        'Mata Pelajaran': r.nama_mapel,
        'Guru Pengajar': r.nama_guru,
        'NIP Guru': findGuruNip(r.nama_guru, guruMasterList) || '-',
        'NIS': r.nis || '-',
        'Nama Siswa': r.nama_siswa,
        'Status Presensi': r.status,
        'Catatan / Alasan': r.catatan
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi Siswa');
      XLSX.writeFile(wb, `Laporan_Absensi_Siswa_${startDate}_sd_${endDate}.xlsx`);
    } else if (activeReportTab === 'catatan_tindakan') {
      const data = catatanTindakanRecords.map((r, idx) => ({
        'No': idx + 1,
        'Tanggal': r.tanggal,
        'Jam': r.jam_ke,
        'Kelas': r.kelas,
        'Mata Pelajaran': r.nama_mapel,
        'Guru Pengajar': r.nama_guru,
        'NIP Guru': findGuruNip(r.nama_guru, guruMasterList) || '-',
        'Nama Siswa': r.nama_siswa,
        'Nilai': r.nilai,
        'Catatan Siswa': r.catatan_siswa,
        'Tindakan Guru': r.tindakan
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Catatan & Tindakan');
      XLSX.writeFile(wb, `Laporan_Catatan_dan_Tindakan_Siswa_${startDate}_sd_${endDate}.xlsx`);
    } else if (activeReportTab === 'siswa_bercatatan') {
      const data = studentNoteSummary.map((s, idx) => ({
        'No': idx + 1,
        'Kelas': s.kelas,
        'Nama Siswa': s.nama,
        'Total Catatan Masuk': s.totalCatatan,
        'Rincian Catatan': s.daftarCatatan.map(c => `[${c.tanggal} - ${c.mapel}] Catatan: ${c.catatan} | Tindakan: ${c.tindakan}`).join('\n')
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Siswa Dengan Catatan');
      XLSX.writeFile(wb, `Laporan_Siswa_Ada_Catatan_${startDate}_sd_${endDate}.xlsx`);
    }
  };

  // PRINT REPORT HANDLER (Opens Complete or Specific Print Modal)
  const handlePrintReport = (mode: 'semua' | 'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan' = 'semua') => {
    setPrintModalMode(mode);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 REPORT SUB-TABS (As requested by user) */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveReportTab('mingguan_bulanan')}
          className={`flex-1 min-w-[200px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            activeReportTab === 'mingguan_bulanan'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar size={16} /> Jurnal Mingguan & Bulanan
        </button>
        <button
          onClick={() => setActiveReportTab('absensi')}
          className={`flex-1 min-w-[180px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
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
          className={`flex-1 min-w-[190px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
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
          className={`flex-1 min-w-[180px] px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
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

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 space-y-4">
        {/* Quick Period Tabs */}
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
        jurnalList={filteredJurnal}
        filterPeriod={filterPeriod}
        startDate={startDate}
        endDate={endDate}
        filterKelas={filterKelas}
        filterMapel={filterMapel}
        filterGuru={filterGuru}
        filterPeriode={filterPeriode}
        defaultMode={printModalMode}
      />
    </div>
  );
};
