import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Clock, 
  PlusCircle, 
  FileBarChart, 
  UserCheck, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  Database,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  School,
  RotateCcw,
  Filter,
  CalendarDays,
  Search,
  AlertCircle,
  User,
  Plus
} from 'lucide-react';
import { JurnalPembelajaran } from '../../types/jurnalpembelajaran';

interface JurnalDashboardProps {
  jurnalList: JurnalPembelajaran[];
  onNavigateTab: (tab: 'input' | 'laporan') => void;
  onViewDetail: (jurnal: JurnalPembelajaran) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const JurnalDashboard: React.FC<JurnalDashboardProps> = ({ 
  jurnalList, 
  onNavigateTab,
  onViewDetail,
  onRefresh,
  isLoading = false
}) => {
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [sqlPassword, setSqlPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Rekap Kelas 7, 8, 9 State
  const [selectedTingkatTab, setSelectedTingkatTab] = useState<'semua' | '7' | '8' | '9'>('semua');
  const [showRombelDetails, setShowRombelDetails] = useState<boolean>(false);

  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const [calendarAnimClass, setCalendarAnimClass] = useState('');

  const handleSqlButtonClick = () => {
    setShowPasswordPrompt(true);
    setSqlPassword('');
    setPasswordError(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sqlPassword === 'admin123') {
      setShowPasswordPrompt(false);
      setShowSqlModal(true);
    } else {
      setPasswordError(true);
    }
  };

  const SQL_SCRIPT = `-- =========================================================================
-- SKRIP TABEL DATABASE: JURNAL PEMBELAJARAN (SMPN 7 PASURUAN)
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. BUAT TABEL JURNAL PEMBELAJARAN
CREATE TABLE IF NOT EXISTS public.jurnal_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_ke TEXT NOT NULL,
    jam_mulai TEXT,
    jam_selesai TEXT,
    mapel_id TEXT,
    nama_mapel TEXT NOT NULL,
    guru_id TEXT,
    nama_guru TEXT NOT NULL,
    kelas TEXT NOT NULL,
    materi TEXT NOT NULL,
    kegiatan TEXT,
    foto_kegiatan JSONB DEFAULT '[]'::jsonb,
    siswa_list JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATUR HAK AKSES DAN KEAMANAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.jurnal_pembelajaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access Jurnal Pembelajaran" ON public.jurnal_pembelajaran;
CREATE POLICY "Public Full Access Jurnal Pembelajaran" 
ON public.jurnal_pembelajaran 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Berikan izin akses penuh kepada peran anon & authenticated
GRANT ALL ON TABLE public.jurnal_pembelajaran TO anon, authenticated, service_role;

-- 3. BUAT INDEKS UNTUK PENCARIAN & LAPORAN SUPER CEPAT
CREATE INDEX IF NOT EXISTS idx_jurnal_tanggal ON public.jurnal_pembelajaran (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_jurnal_kelas ON public.jurnal_pembelajaran (kelas);
CREATE INDEX IF NOT EXISTS idx_jurnal_guru ON public.jurnal_pembelajaran (nama_guru);
CREATE INDEX IF NOT EXISTS idx_jurnal_mapel ON public.jurnal_pembelajaran (nama_mapel);
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Helper formatting local date string YYYY-MM-DD
  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Preset Date Filter Modes
  type DateFilterMode = 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'custom' | 'all';

  const todayStr = useMemo(() => getLocalDateString(), []);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('today');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Sub-filter untuk monitoring kelas hari ini
  const [classFilterStatus, setClassFilterStatus] = useState<'semua' | 'terisi' | 'belum'>('semua');
  const [classTingkatFilter, setClassTingkatFilter] = useState<'semua' | '7' | '8' | '9'>('semua');
  const [searchGuruQuery, setSearchGuruQuery] = useState<string>('');
  const [showAllTeachersModal, setShowAllTeachersModal] = useState<boolean>(false);

  // Quick preset selector
  const handleSelectPreset = (mode: DateFilterMode) => {
    const now = new Date();
    setDateFilterMode(mode);

    if (mode === 'today') {
      const today = getLocalDateString(now);
      setStartDate(today);
      setEndDate(today);
    } else if (mode === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yesterday = getLocalDateString(y);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (mode === 'last_7_days') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      setStartDate(getLocalDateString(past7));
      setEndDate(getLocalDateString(now));
    } else if (mode === 'this_month') {
      const startM = new Date(now.getFullYear(), now.getMonth(), 1);
      const endM = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(getLocalDateString(startM));
      setEndDate(getLocalDateString(endM));
    } else if (mode === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Formatted date label for current view
  const getFilterDateLabel = () => {
    if (dateFilterMode === 'all') return 'Semua Waktu (Seluruh Sesi Jurnal)';
    if (startDate === endDate && startDate === todayStr) {
      const parts = todayStr.split('-');
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `Hari Ini • ${dayNames[dt.getDay()]}, ${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
    }
    if (startDate === endDate && startDate) {
      return `Tanggal: ${startDate}`;
    }
    return `Periode: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`;
  };

  // Filtered Jurnal List based on Date Range
  const filteredJurnalList = useMemo(() => {
    if (dateFilterMode === 'all') return jurnalList;
    return jurnalList.filter(j => {
      if (!j.tanggal) return false;
      if (startDate && j.tanggal < startDate) return false;
      if (endDate && j.tanggal > endDate) return false;
      return true;
    });
  }, [jurnalList, dateFilterMode, startDate, endDate]);

  // Total Sesi on Filtered Data
  const totalSesi = filteredJurnalList.length;

  // Calculate overall attendance on Filtered Data
  let grandTotalSiswa = 0;
  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;
  let totalCatatanTindakan = 0;

  filteredJurnalList.forEach(j => {
    j.siswa_list?.forEach(s => {
      grandTotalSiswa++;
      if (s.absensi === 'Hadir') totalHadir++;
      else if (s.absensi === 'Sakit') totalSakit++;
      else if (s.absensi === 'Izin') totalIzin++;
      else if (s.absensi === 'Alpa') totalAlpa++;

      if ((s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) {
        totalCatatanTindakan++;
      }
    });
  });

  const persentaseHadir = grandTotalSiswa > 0 
    ? Math.round((totalHadir / grandTotalSiswa) * 100) 
    : 100;

  // 24 Rombel List Configuration (7A - 9H)
  const ALL_ROMBELS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
  ];

  // Monitoring Keterisian Jurnal Per Kelas (24 Rombel) pada Filter Aktif
  const classEntryData = useMemo(() => {
    return ALL_ROMBELS.map(kelas => {
      const tingkat = (kelas.startsWith('7') ? '7' : kelas.startsWith('8') ? '8' : '9') as '7' | '8' | '9';
      const jInClass = filteredJurnalList.filter(j => j.kelas?.trim().toUpperCase() === kelas);
      
      let totalHadirInClass = 0;
      let totalSiswaInClass = 0;
      const guruSet = new Set<string>();

      jInClass.forEach(j => {
        if (j.nama_guru) guruSet.add(j.nama_guru);
        j.siswa_list?.forEach(s => {
          totalSiswaInClass++;
          if (s.absensi === 'Hadir') totalHadirInClass++;
        });
      });

      return {
        kelas,
        tingkat,
        hasEntry: jInClass.length > 0,
        totalSesi: jInClass.length,
        jurnals: jInClass,
        totalHadir: totalHadirInClass,
        totalSiswa: totalSiswaInClass,
        persenHadir: totalSiswaInClass > 0 ? Math.round((totalHadirInClass / totalSiswaInClass) * 100) : 0,
        uniqueGurus: Array.from(guruSet)
      };
    });
  }, [filteredJurnalList]);

  const totalKelasTerisi = classEntryData.filter(c => c.hasEntry).length;
  const totalKelasKosong = 24 - totalKelasTerisi;
  const totalGuruAktif = useMemo(() => {
    const s = new Set<string>();
    filteredJurnalList.forEach(j => {
      if (j.nama_guru) s.add(j.nama_guru.trim());
    });
    return s.size;
  }, [filteredJurnalList]);

  // Daftar ringkasan guru yang sudah mengajar pada filter terpilih
  const activeTeachersList = useMemo(() => {
    const map = new Map<string, {
      nama_guru: string;
      mapels: Set<string>;
      kelases: Set<string>;
      totalSesi: number;
    }>();

    filteredJurnalList.forEach(j => {
      if (!j.nama_guru) return;
      const key = j.nama_guru.trim();
      if (!map.has(key)) {
        map.set(key, {
          nama_guru: key,
          mapels: new Set(),
          kelases: new Set(),
          totalSesi: 0
        });
      }
      const rec = map.get(key)!;
      if (j.nama_mapel) rec.mapels.add(j.nama_mapel);
      if (j.kelas) rec.kelases.add(j.kelas);
      rec.totalSesi++;
    });

    return Array.from(map.values()).sort((a, b) => b.totalSesi - a.totalSesi || a.nama_guru.localeCompare(b.nama_guru));
  }, [filteredJurnalList]);

  // Helper to extract grade level ('7' | '8' | '9')
  const getTingkat = (kelasStr: string): '7' | '8' | '9' | 'other' => {
    if (!kelasStr) return 'other';
    const clean = kelasStr.trim().toUpperCase();
    if (clean.startsWith('7') || clean.startsWith('VII')) return '7';
    if (clean.startsWith('8') || clean.startsWith('VIII')) return '8';
    if (clean.startsWith('9') || clean.startsWith('IX')) return '9';
    return 'other';
  };

  // Detailed Recap per Grade (Kelas 7, Kelas 8, Kelas 9)
  const tingkatStats = useMemo(() => {
    const rombelConfig = {
      '7': ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'],
      '8': ['8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H'],
      '9': ['9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H']
    };

    const stats = {
      '7': {
        tingkat: '7' as const,
        label: 'Kelas 7',
        fase: 'Fase D (Tingkat Awal)',
        color: 'from-blue-600 to-indigo-700',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
        accentBg: 'bg-blue-50/70',
        borderColor: 'border-blue-200/80',
        progressColor: 'bg-blue-600',
        totalJurnal: 0,
        totalSiswa: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        persenHadir: 0,
        catatanTindakan: 0,
        fotoCount: 0,
        rombelList: [] as {
          rombel: string;
          totalJurnal: number;
          hadir: number;
          totalSiswa: number;
          persenHadir: number;
          sakit: number;
          izin: number;
          alpa: number;
          catatanCount: number;
          lastDate?: string;
        }[]
      },
      '8': {
        tingkat: '8' as const,
        label: 'Kelas 8',
        fase: 'Fase D (Tingkat Menengah)',
        color: 'from-emerald-600 to-teal-700',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        accentBg: 'bg-emerald-50/70',
        borderColor: 'border-emerald-200/80',
        progressColor: 'bg-emerald-600',
        totalJurnal: 0,
        totalSiswa: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        persenHadir: 0,
        catatanTindakan: 0,
        fotoCount: 0,
        rombelList: [] as {
          rombel: string;
          totalJurnal: number;
          hadir: number;
          totalSiswa: number;
          persenHadir: number;
          sakit: number;
          izin: number;
          alpa: number;
          catatanCount: number;
          lastDate?: string;
        }[]
      },
      '9': {
        tingkat: '9' as const,
        label: 'Kelas 9',
        fase: 'Fase D (Tingkat Akhir)',
        color: 'from-amber-500 to-orange-600',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        accentBg: 'bg-amber-50/70',
        borderColor: 'border-amber-200/80',
        progressColor: 'bg-amber-500',
        totalJurnal: 0,
        totalSiswa: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        persenHadir: 0,
        catatanTindakan: 0,
        fotoCount: 0,
        rombelList: [] as {
          rombel: string;
          totalJurnal: number;
          hadir: number;
          totalSiswa: number;
          persenHadir: number;
          sakit: number;
          izin: number;
          alpa: number;
          catatanCount: number;
          lastDate?: string;
        }[]
      }
    };

    (['7', '8', '9'] as const).forEach(t => {
      const rombelNames = rombelConfig[t];
      stats[t].rombelList = rombelNames.map(rombel => {
        const jInRombel = filteredJurnalList.filter(j => j.kelas?.trim().toUpperCase() === rombel);
        let rHadir = 0;
        let rTotalSiswa = 0;
        let rSakit = 0;
        let rIzin = 0;
        let rAlpa = 0;
        let rCatatan = 0;
        const lastDate = jInRombel.length > 0 ? jInRombel[0].tanggal : undefined;

        jInRombel.forEach(j => {
          j.siswa_list?.forEach(s => {
            rTotalSiswa++;
            if (s.absensi === 'Hadir') rHadir++;
            else if (s.absensi === 'Sakit') rSakit++;
            else if (s.absensi === 'Izin') rIzin++;
            else if (s.absensi === 'Alpa') rAlpa++;

            if ((s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) {
              rCatatan++;
            }
          });
        });

        return {
          rombel,
          totalJurnal: jInRombel.length,
          hadir: rHadir,
          totalSiswa: rTotalSiswa,
          persenHadir: rTotalSiswa > 0 ? Math.round((rHadir / rTotalSiswa) * 100) : 0,
          sakit: rSakit,
          izin: rIzin,
          alpa: rAlpa,
          catatanCount: rCatatan,
          lastDate
        };
      });

      // Total journals for this grade
      const journalsInTingkat = filteredJurnalList.filter(j => getTingkat(j.kelas) === t);
      stats[t].totalJurnal = journalsInTingkat.length;

      journalsInTingkat.forEach(j => {
        stats[t].fotoCount += j.foto_kegiatan?.length || 0;
        j.siswa_list?.forEach(s => {
          stats[t].totalSiswa++;
          if (s.absensi === 'Hadir') stats[t].hadir++;
          else if (s.absensi === 'Sakit') stats[t].sakit++;
          else if (s.absensi === 'Izin') stats[t].izin++;
          else if (s.absensi === 'Alpa') stats[t].alpa++;

          if ((s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) {
            stats[t].catatanTindakan++;
          }
        });
      });

      stats[t].persenHadir = stats[t].totalSiswa > 0 
        ? Math.round((stats[t].hadir / stats[t].totalSiswa) * 100) 
        : (stats[t].totalJurnal > 0 ? 100 : 0);
    });

    return stats;
  }, [filteredJurnalList]);

  // --- Academic Period Logic ---
  const getCurrentPeriode = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    if (month >= 7) {
      return `${year}/${year + 1} (Semester Ganjil)`;
    } else {
      return `${year - 1}/${year} (Semester Genap)`;
    }
  };
  const currentPeriode = getCurrentPeriode();

  // --- Calendar Logic ---
  const todayDate = new Date();
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthName = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const datesWithJurnal = new Set(jurnalList.map(j => j.tanggal)); // Format YYYY-MM-DD
  
  // Indonesian National Holidays Mapping (Static/Example for 2026-2027)
  const INDONESIAN_HOLIDAYS: Record<string, string> = {
    "01-01": "Tahun Baru Masehi",
    "05-01": "Hari Buruh Internasional",
    "06-01": "Hari Lahir Pancasila",
    "08-17": "Hari Kemerdekaan RI",
    "12-25": "Hari Raya Natal",
    // 2026 specific dates
    "2026-02-17": "Isra Mi'raj",
    "2026-03-20": "Hari Raya Idul Fitri",
    "2026-03-21": "Hari Raya Idul Fitri",
    "2026-04-03": "Wafat Isa Al Masih",
    "2026-05-14": "Kenaikan Isa Al Masih",
    "2026-05-27": "Hari Raya Idul Adha",
    "2026-06-16": "Tahun Baru Islam",
    "2026-08-25": "Maulid Nabi Muhammad SAW",
    // 2027 specific dates
    "2027-02-06": "Isra Mi'raj",
    "2027-03-10": "Hari Raya Idul Fitri",
    "2027-03-11": "Hari Raya Idul Fitri",
    "2027-03-26": "Wafat Isa Al Masih",
    "2027-05-06": "Kenaikan Isa Al Masih",
    "2027-05-17": "Hari Raya Idul Adha",
    "2027-06-05": "Tahun Baru Islam",
    "2027-08-15": "Maulid Nabi Muhammad SAW",
  };

  const getHolidayInfo = (dStr: string) => {
    const mmdd = dStr.substring(5);
    return INDONESIAN_HOLIDAYS[dStr] || INDONESIAN_HOLIDAYS[mmdd] || null;
  };

  const calendarDays: { date: number, hasJurnal: boolean, isToday: boolean, dateString: string, holiday: string | null }[] = [];
  // Adjust so Monday is 0
  const startDayIndex = firstDay === 0 ? 6 : firstDay - 1;
  
  for (let i = 0; i < startDayIndex; i++) {
    calendarDays.push({ date: 0, hasJurnal: false, isToday: false, dateString: '', holiday: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isToday = i === todayDate.getDate() && currentMonth === todayDate.getMonth() && currentYear === todayDate.getFullYear();
    calendarDays.push({ 
      date: i, 
      hasJurnal: datesWithJurnal.has(dStr), 
      isToday, 
      dateString: dStr,
      holiday: getHolidayInfo(dStr)
    });
  }

  const handlePrevMonth = () => {
    setCalendarAnimClass('flip-out-left');
    setTimeout(() => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
      setCalendarAnimClass('flip-in-right');
      setTimeout(() => setCalendarAnimClass(''), 500);
    }, 500);
  };

  const handleNextMonth = () => {
    setCalendarAnimClass('flip-out-right');
    setTimeout(() => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
      setCalendarAnimClass('flip-in-left');
      setTimeout(() => setCalendarAnimClass(''), 500);
    }, 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-6 md:p-10 text-white shadow-xl shadow-amber-500/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider text-amber-100">
              <BookOpen size={14} /> JURNAL PEMBELAJARAN
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider text-white">
              <Calendar size={13} /> {currentPeriode}
            </div>
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
            Agenda Mengajar & Evaluasi Siswa Terintegrasi
          </h2>
          <p className="text-xs md:text-sm text-amber-100/90 font-medium">
            Dokumentasikan proses belajar mengajar kelas 7A-9H, rekap kehadiran, catatan tindakan guru, dan foto aktivitas pembelajaran secara rapi dan akuntabel.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('input')}
              className="px-5 py-2.5 bg-white text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <PlusCircle size={16} /> Isi Jurnal Baru
            </button>
            <button
              onClick={() => onNavigateTab('laporan')}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <FileBarChart size={16} /> Buka Laporan
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/20 shadow-sm disabled:opacity-50"
                title="Sinkronisasi data langsung dengan server Supabase"
              >
                <RotateCcw size={15} className={isLoading ? "animate-spin" : ""} /> 
                <span>{isLoading ? "Menyinkronkan..." : "Segarkan Data"}</span>
              </button>
            )}
            <button
              onClick={handleSqlButtonClick}
              className="px-4 py-2.5 bg-black/30 hover:bg-black/40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/20 shadow-sm"
            >
              <Database size={15} /> Skrip SQL Tabel
            </button>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Cloud Sync Status Banner */}
      {jurnalList.length > 0 ? (
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Database Cloud Supabase Terhubung: <strong className="text-emerald-950 font-black">{jurnalList.length} Sesi Pembelajaran</strong> tersinkronisasi akurat.</span>
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh} 
              disabled={isLoading} 
              className="text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-1 shrink-0 ml-2 disabled:opacity-50 text-[11px]"
            >
              <RotateCcw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>{isLoading ? "Sedang menyinkronkan data dengan Supabase..." : "Data jurnal pembelajaran sedang dimuat atau belum tersinkron."}</span>
          </div>
          {onRefresh && (
            <button 
              onClick={onRefresh} 
              disabled={isLoading}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-sm transition-all shrink-0 ml-2"
            >
              Muat Ulang Data
            </button>
          )}
        </div>
      )}

      {/* DATE RANGE FILTER BAR */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center font-bold">
              <CalendarDays size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-800">
                  Filter Periode Jurnal Pembelajaran
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  {dateFilterMode === 'today' ? 'Default: Hari Ini' : 'Filter Aktif'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {getFilterDateLabel()}
              </p>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl">
            <button
              onClick={() => handleSelectPreset('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                dateFilterMode === 'today'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Calendar size={13} />
              <span>Hari Ini</span>
            </button>
            <button
              onClick={() => handleSelectPreset('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'yesterday'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Kemarin
            </button>
            <button
              onClick={() => handleSelectPreset('last_7_days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'last_7_days'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => handleSelectPreset('this_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'this_month'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handleSelectPreset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'all'
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Semua ({jurnalList.length})
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker (Input Tanggal Awal & Tanggal Akhir) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700 font-medium">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Filter size={14} className="text-amber-600" /> Rentang Tanggal:
            </span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-400">
              <label className="text-[10px] uppercase font-bold text-slate-400">Awal:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              />
            </div>
            <span className="text-slate-400 font-bold">s/d</span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-400">
              <label className="text-[10px] uppercase font-bold text-slate-400">Akhir:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              />
            </div>
            {dateFilterMode !== 'today' && (
              <button
                onClick={() => handleSelectPreset('today')}
                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                title="Kembalikan ke tampilan default hari ini"
              >
                <RotateCcw size={12} /> Reset Hari Ini
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <span>Ditemukan:</span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-black rounded-lg border border-amber-200">
              {filteredJurnalList.length} Sesi Pembelajaran
            </span>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Jurnal</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900">{totalSesi}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {dateFilterMode === 'today' ? 'Sesi mengajar hari ini' : 'Sesi mengajar periode ini'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Hadir</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-black text-emerald-600">{persentaseHadir}%</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{totalHadir} presensi hadir</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ketidakhadiran</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900">{totalSakit + totalIzin + totalAlpa}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              S:{totalSakit} | I:{totalIzin} | A:{totalAlpa}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan & Tindakan</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-black text-purple-700">{totalCatatanTindakan}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Evaluasi & tindak lanjut guru</p>
          </div>
        </div>
      </div>

      {/* MONITORING ENTRY JURNAL HARI INI PER KELAS (24 ROMBEL) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
        {/* Header Monitoring Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <School size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Status Entry Jurnal Mengajar Per Kelas
                </h3>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[10px] font-black tracking-wide uppercase">
                  24 Rombel (7A - 9H)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monitoring nama guru yang sudah entry jurnal {dateFilterMode === 'today' ? 'hari ini' : 'pada periode terpilih'} per rombongan belajar
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>{totalKelasTerisi} / 24 Kelas Terisi</span>
              <span className="text-[10px] font-black bg-emerald-200/80 px-1.5 py-0.2 rounded-md">
                {Math.round((totalKelasTerisi / 24) * 100)}%
              </span>
            </div>

            {totalKelasKosong > 0 && (
              <div className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <AlertCircle size={15} className="text-amber-600" />
                <span>{totalKelasKosong} Belum Terisi</span>
              </div>
            )}

            <button
              onClick={() => setShowAllTeachersModal(true)}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Users size={14} className="text-indigo-600" />
              <span>{totalGuruAktif} Guru Sudah Entry</span>
            </button>
          </div>
        </div>

        {/* Toolbar Filter Tingkat, Status, & Pencarian Guru */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tingkat */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {(['semua', '7', '8', '9'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setClassTingkatFilter(t)}
                  className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                    classTingkatFilter === t
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t === 'semua' ? 'Semua Tingkat' : `Kelas ${t}`}
                </button>
              ))}
            </div>

            {/* Filter Status Keterisian */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                onClick={() => setClassFilterStatus('semua')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  classFilterStatus === 'semua'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setClassFilterStatus('terisi')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  classFilterStatus === 'terisi'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                ✓ Sudah Entry ({totalKelasTerisi})
              </button>
              <button
                onClick={() => setClassFilterStatus('belum')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  classFilterStatus === 'belum'
                    ? 'bg-rose-600 text-white shadow-2xs font-black'
                    : 'text-slate-500 hover:text-rose-700'
                }`}
              >
                ⏳ Belum ({totalKelasKosong})
              </button>
            </div>
          </div>

          {/* Search Box Guru atau Mapel */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru / mapel..."
              value={searchGuruQuery}
              onChange={(e) => setSearchGuruQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-400"
            />
            {searchGuruQuery && (
              <button
                onClick={() => setSearchGuruQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 24 Rombel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classEntryData
            .filter((c) => {
              if (classTingkatFilter !== 'semua' && c.tingkat !== classTingkatFilter) return false;
              if (classFilterStatus === 'terisi' && !c.hasEntry) return false;
              if (classFilterStatus === 'belum' && c.hasEntry) return false;
              if (searchGuruQuery.trim()) {
                const q = searchGuruQuery.toLowerCase().trim();
                const matchGuru = c.uniqueGurus.some((g) => g.toLowerCase().includes(q));
                const matchMapel = c.jurnals.some((j) => j.nama_mapel?.toLowerCase().includes(q));
                const matchKelas = c.kelas.toLowerCase().includes(q);
                if (!matchGuru && !matchMapel && !matchKelas) return false;
              }
              return true;
            })
            .map((c) => {
              return (
                <div
                  key={c.kelas}
                  className={`rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-3.5 ${
                    c.hasEntry
                      ? 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                      : 'bg-slate-50/70 border-dashed border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shadow-2xs ${
                          c.hasEntry
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {c.kelas}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">
                          Rombel {c.kelas}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold">
                          Kelas Tingkat {c.tingkat}
                        </span>
                      </div>
                    </div>

                    {c.hasEntry ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>{c.totalSesi} Sesi Entry</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        Belum Ada Entry
                      </span>
                    )}
                  </div>

                  {/* Card Body: List of teachers who filled journals */}
                  {c.hasEntry ? (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Guru Pengajar</span>
                        <span>Jam & Mapel</span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {c.jurnals.map((j) => {
                          const hadirSiswa = j.siswa_list?.filter((s) => s.absensi === 'Hadir').length || 0;
                          const totalSiswa = j.siswa_list?.length || 0;

                          return (
                            <div
                              key={j.id}
                              className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-blue-50/50 hover:border-blue-200 transition-colors space-y-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <User size={13} className="text-blue-600 shrink-0" />
                                  <span className="text-xs font-black text-slate-800 truncate" title={j.nama_guru}>
                                    {j.nama_guru}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md shrink-0">
                                  {j.jam_ke.toLowerCase().startsWith('jam') || j.jam_ke.toLowerCase() === 'istirahat' ? j.jam_ke : `Jam ${j.jam_ke}`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span className="font-bold text-slate-700 truncate mr-2" title={j.nama_mapel}>
                                  {j.nama_mapel}
                                </span>
                                <span className="text-[10px] text-emerald-700 font-bold shrink-0">
                                  {hadirSiswa}/{totalSiswa} Hadir
                                </span>
                              </div>

                              {j.materi && (
                                <p className="text-[10px] text-slate-500 italic line-clamp-1">
                                  Materi: {j.materi}
                                </p>
                              )}

                              <div className="flex items-center justify-end pt-1">
                                <button
                                  onClick={() => onViewDetail(j)}
                                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
                                >
                                  <Eye size={11} /> Lihat Detail Sesi
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-2 border-t border-slate-100/80 pt-3">
                      <p className="text-xs text-slate-400 font-medium">
                        Belum ada guru yang entry jurnal di kelas {c.kelas} untuk tanggal ini.
                      </p>
                      <button
                        onClick={() => onNavigateTab('input')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs"
                      >
                        <Plus size={12} className="text-amber-600" />
                        <span>Isi Jurnal Kelas Ini</span>
                      </button>
                    </div>
                  )}

                  {/* Card Footer */}
                  {c.hasEntry && (
                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Kehadiran Kelas:</span>
                      <span className="font-bold text-emerald-700">
                        {c.persenHadir}% ({c.totalHadir}/{c.totalSiswa} Siswa)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* REKAP JURNAL PEMBELAJARAN BERDASARKAN TINGKAT KELAS 7, 8, 9 */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
        {/* Header with Title and Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Rekap Jurnal Pembelajaran Tingkat Kelas (7, 8, 9)
                </h3>
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black tracking-wide uppercase">
                  24 Rombel (7A - 9H)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monitoring sebaran KBM, kehadiran peserta didik, dan keaktifan jurnal per jenjang kelas 7, 8, dan 9
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* Filter Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/70 text-xs font-bold">
              <button
                onClick={() => setSelectedTingkatTab('semua')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  selectedTingkatTab === 'semua'
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Tingkat
              </button>
              {(['7', '8', '9'] as const).map(t => {
                const s = tingkatStats[t];
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTingkatTab(t)}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                      selectedTingkatTab === t
                        ? 'bg-white text-slate-900 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-extrabold ${
                      selectedTingkatTab === t ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.totalJurnal}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Toggle Table Details */}
            <button
              onClick={() => setShowRombelDetails(!showRombelDetails)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Layers size={14} className="text-amber-600" />
              <span>{showRombelDetails ? 'Tutup Rincian' : 'Rincian Rombel'}</span>
              {showRombelDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* 3 Grade Cards (Kelas 7, Kelas 8, Kelas 9) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['7', '8', '9'] as const).map(t => {
            const stat = tingkatStats[t];
            const isSelected = selectedTingkatTab === t || selectedTingkatTab === 'semua';
            const rombelsWithJurnal = stat.rombelList.filter(r => r.totalJurnal > 0).length;

            return (
              <div
                key={t}
                className={`relative rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                  selectedTingkatTab === t 
                    ? `ring-2 ring-amber-500 shadow-lg ${stat.accentBg} ${stat.borderColor}` 
                    : `bg-slate-50/40 hover:bg-slate-50/80 ${stat.borderColor} shadow-sm`
                } ${!isSelected ? 'opacity-50 hover:opacity-100' : ''}`}
              >
                <div>
                  {/* Top Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center font-black shadow-sm`}>
                        <GraduationCap size={18} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                          {stat.label}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-500">{stat.fase}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${stat.badgeBg}`}>
                      {rombelsWithJurnal}/8 Rombel Aktif
                    </span>
                  </div>

                  {/* Primary Stats: Total Sesi & Persentase Hadir */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Jurnal</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-slate-900">{stat.totalJurnal}</span>
                        <span className="text-xs font-semibold text-slate-500">Sesi</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tingkat Hadir</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className={`text-2xl font-black ${stat.persenHadir >= 95 ? 'text-emerald-600' : stat.totalJurnal > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {stat.totalJurnal > 0 ? `${stat.persenHadir}%` : '0%'}
                        </span>
                        <span className="text-[10px] text-slate-400">Rata-rata</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar Kehadiran */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>Capaian Kehadiran Siswa</span>
                      <span className="text-slate-900">{stat.hadir}/{stat.totalSiswa} Siswa</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${stat.progressColor}`}
                        style={{ width: `${Math.min(stat.persenHadir, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 4 Attendance Chips */}
                  <div className="grid grid-cols-4 gap-1.5 text-center mb-4">
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/70 py-1.5 px-1 rounded-xl">
                      <span className="text-[9px] font-bold uppercase block text-emerald-600">Hadir</span>
                      <span className="text-xs font-black">{stat.hadir}</span>
                    </div>
                    <div className="bg-amber-50 text-amber-800 border border-amber-200/70 py-1.5 px-1 rounded-xl">
                      <span className="text-[9px] font-bold uppercase block text-amber-600">Sakit</span>
                      <span className="text-xs font-black">{stat.sakit}</span>
                    </div>
                    <div className="bg-blue-50 text-blue-800 border border-blue-200/70 py-1.5 px-1 rounded-xl">
                      <span className="text-[9px] font-bold uppercase block text-blue-600">Izin</span>
                      <span className="text-xs font-black">{stat.izin}</span>
                    </div>
                    <div className="bg-rose-50 text-rose-800 border border-rose-200/70 py-1.5 px-1 rounded-xl">
                      <span className="text-[9px] font-bold uppercase block text-rose-600">Alpa</span>
                      <span className="text-xs font-black">{stat.alpa}</span>
                    </div>
                  </div>

                  {/* Evaluasi Catatan & Foto Kegiatan */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 mb-3">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-purple-600 shrink-0" />
                      <span>{stat.catatanTindakan} Evaluasi Siswa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-amber-600 shrink-0" />
                      <span>{stat.fotoCount} Foto</span>
                    </div>
                  </div>

                  {/* Rombel Mini Badges (e.g. 7A - 7H) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Rombel {stat.label}</span>
                      <span>Sesi KBM</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {stat.rombelList.map(r => (
                        <div
                          key={r.rombel}
                          title={`${r.rombel}: ${r.totalJurnal} sesi jurnal, hadir: ${r.persenHadir}%`}
                          className={`p-1.5 rounded-lg text-center transition-all border ${
                            r.totalJurnal > 0
                              ? 'bg-white border-slate-300 text-slate-900 font-black shadow-2xs'
                              : 'bg-slate-100/60 border-slate-200/60 text-slate-400 font-medium'
                          }`}
                        >
                          <div className="text-[10px]">{r.rombel}</div>
                          <div className={`text-[11px] font-black ${r.totalJurnal > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                            {r.totalJurnal}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Button */}
                <div className="pt-4 mt-3 border-t border-slate-200/60">
                  <button
                    onClick={() => {
                      setSelectedTingkatTab(t);
                      setShowRombelDetails(true);
                    }}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>Rincian Rombel {stat.label}</span>
                    <ArrowRight size={13} className="text-amber-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible / Expandable Rombel Detailed Table */}
        {showRombelDetails && (
          <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <School size={16} className="text-amber-600" />
                <h4 className="text-sm font-black text-slate-800">
                  Rincian KBM per Rombongan Belajar {selectedTingkatTab !== 'semua' ? `Kelas ${selectedTingkatTab}` : '(Kelas 7, 8, dan 9)'}
                </h4>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedTingkatTab === 'semua' ? '24 Rombel' : '8 Rombel'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab('laporan')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <FileBarChart size={13} /> Buka Laporan Lengkap
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Rombel</th>
                    <th className="p-3 text-center">Tingkat</th>
                    <th className="p-3 text-center">Total Jurnal</th>
                    <th className="p-3 text-center">Kehadiran (%)</th>
                    <th className="p-3 text-center">Rincian Presensi (H/S/I/A)</th>
                    <th className="p-3 text-center">Catatan Evaluasi</th>
                    <th className="p-3 text-center">KBM Terakhir</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(['7', '8', '9'] as const)
                    .filter(t => selectedTingkatTab === 'semua' || selectedTingkatTab === t)
                    .flatMap(t => tingkatStats[t].rombelList.map(r => ({ ...r, tingkatLabel: tingkatStats[t].label, tingkat: t })))
                    .map((r, idx) => (
                      <tr key={`${r.rombel}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-black text-xs">
                            {r.rombel}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            r.tingkat === '7' ? 'bg-blue-100 text-blue-800' :
                            r.tingkat === '8' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {r.tingkatLabel}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black text-slate-800 text-sm">
                          {r.totalJurnal}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-bold ${r.persenHadir >= 95 ? 'text-emerald-700' : r.totalJurnal > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                              {r.totalSiswa > 0 ? `${r.persenHadir}%` : '-'}
                            </span>
                            {r.totalSiswa > 0 && (
                              <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full rounded-full ${r.persenHadir >= 95 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                                  style={{ width: `${r.persenHadir}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {r.totalSiswa > 0 ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold">
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">H:{r.hadir}</span>
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">S:{r.sakit}</span>
                              <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">I:{r.izin}</span>
                              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">A:{r.alpa}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {r.catatanCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[11px]">
                              {r.catatanCount} Siswa
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-500 text-[11px]">
                          {r.lastDate || '-'}
                        </td>
                        <td className="p-3 text-center">
                          {r.totalJurnal > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                              <CheckCircle2 size={11} /> Aktif
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px]">
                              Belum Ada
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CALENDAR */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col perspective-1000 relative overflow-hidden group">
          {/* Beautiful Background Overlay */}
          <div 
            className="absolute inset-0 z-0 opacity-80 group-hover:scale-105 transition-transform duration-1000"
            style={{ 
              backgroundImage: 'url("https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=100")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/95 via-white/50 to-white/95" />

          <div className="relative z-10 p-6 flex flex-col h-full">
            <div className="border-b border-slate-200/50 pb-4 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 drop-shadow-sm">
                  <Calendar size={16} className="text-amber-600" /> Kalender Aktivitas
                </h3>
                <p className="text-xs text-slate-600 font-bold drop-shadow-sm">Bulan {currentMonthName}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handlePrevMonth} className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-white/70 rounded-lg transition-colors backdrop-blur-sm">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={handleNextMonth} className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-white/70 rounded-lg transition-colors backdrop-blur-sm">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className={`flex-1 flex flex-col ${calendarAnimClass}`}>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, idx) => (
                  <div key={idx} className={`text-xs font-black uppercase tracking-wider py-2 ${idx === 6 ? 'text-rose-600 drop-shadow-md' : 'text-slate-800 drop-shadow-md'}`}>{day}</div>
                ))}
              </div>
            <div className="grid grid-cols-7 gap-1 text-center flex-1">
              {calendarDays.map((cDay, idx) => (
                <div key={idx} className="flex justify-center items-center p-0.5 relative">
                  {cDay.date > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (cDay.dateString) {
                          setDateFilterMode('custom');
                          setStartDate(cDay.dateString);
                          setEndDate(cDay.dateString);
                        }
                      }}
                      title={
                        cDay.holiday 
                          ? `Libur: ${cDay.holiday} (Klik untuk filter tanggal ini)` 
                          : cDay.hasJurnal 
                            ? `Ada jurnal di tanggal ${cDay.dateString} (Klik untuk filter tanggal ini)` 
                            : `Tanggal ${cDay.dateString} (Klik untuk filter tanggal ini)`
                      }
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                        startDate === cDay.dateString && endDate === cDay.dateString
                          ? 'ring-2 ring-blue-600 bg-blue-600 text-white shadow-md font-black z-20 scale-105'
                          : cDay.hasJurnal 
                            ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400 shadow-md font-black z-10 relative hover:bg-amber-200' 
                            : cDay.holiday || idx % 7 === 6
                              ? 'text-rose-700 bg-rose-50/80 hover:bg-rose-100 font-black shadow-sm'
                              : cDay.isToday 
                                ? 'bg-slate-800 text-white shadow-md font-black hover:bg-slate-700' 
                                : 'text-slate-800 hover:bg-white/80 font-black drop-shadow-md'
                      }`}
                    >
                      {cDay.date}
                      {cDay.holiday && !cDay.hasJurnal && (
                        <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500 border border-white"></div>
                      )}
                    </button>
                  ) : (
                    <div className="w-8 h-8"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-800 border-t border-slate-300/50 pt-4 flex-wrap drop-shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-100 ring-1 ring-amber-400"></div> Ada Jurnal
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-800"></div> Hari Ini
            </div>
            <div className="flex items-center gap-1.5 text-rose-800 font-black">
              <div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300 relative">
                <div className="absolute top-[-2px] right-[-2px] w-1.5 h-1.5 rounded-full bg-rose-500"></div>
              </div> Libur Nasional
            </div>
          </div>
          </div>
        </div>

        {/* RECENT JURNAL LIST (FILTERED) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800">
                  {dateFilterMode === 'today' ? 'Jurnal Pembelajaran Hari Ini' : 'Aktivitas Jurnal Terpilih'}
                </h3>
                {filteredJurnalList.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                    {filteredJurnalList.length} Sesi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {getFilterDateLabel()}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('laporan')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0 transition-colors"
            >
              Lihat Laporan Penuh <ArrowRight size={14} />
            </button>
          </div>

          {filteredJurnalList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <BookOpen size={40} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">
                Belum ada jurnal pembelajaran untuk {dateFilterMode === 'today' ? 'hari ini' : 'periode yang dipilih'}.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => onNavigateTab('input')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <PlusCircle size={14} /> Input Jurnal Sekarang
                </button>
                {dateFilterMode !== 'all' && (
                  <button
                    onClick={() => handleSelectPreset('all')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Lihat Semua Riwayat
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Scrollable container with max height */}
              <div 
                className="space-y-3 overflow-y-auto pr-1.5 custom-scrollbar overscroll-contain"
                style={{ maxHeight: '485px' }}
              >
                {filteredJurnalList.map((item) => {
                  const hadir = item.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
                  const total = item.siswa_list?.length || 0;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex flex-col items-center justify-center shrink-0 font-black shadow-sm">
                          <span className="text-[10px] uppercase">{item.kelas}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{item.nama_mapel}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                              {item.jam_ke.toLowerCase().startsWith('jam') || item.jam_ke.toLowerCase() === 'istirahat' ? item.jam_ke : `Jam Ke ${item.jam_ke}`}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-600 mt-0.5">
                            Materi: <span className="font-semibold text-slate-800">{item.materi}</span>
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="font-medium text-slate-600">Guru: {item.nama_guru}</span>
                            <span>•</span>
                            <span>{item.tanggal}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-700">
                            {hadir}/{total} Hadir
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.foto_kegiatan?.length || 0} Foto Dokumentasi
                          </div>
                        </div>

                        <button
                          onClick={() => onViewDetail(item)}
                          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Eye size={14} /> Detail
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indicator if more than 5 items exist */}
              {filteredJurnalList.length > 5 && (
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/60">
                    <ChevronDown size={14} className="animate-bounce text-amber-600" />
                    Menampilkan 5 baris pertama • Scroll ke bawah untuk {filteredJurnalList.length - 5} sesi lainnya
                  </span>
                  <button
                    onClick={() => onNavigateTab('laporan')}
                    className="font-bold text-slate-700 hover:text-amber-700 flex items-center gap-1 transition-colors"
                  >
                    Buka Laporan Penuh <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DAFTAR SELURUH GURU YANG SUDAH ENTRY JURNAL */}
      {showAllTeachersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header Modal */}
            <div className="p-5 md:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Daftar Guru yang Sudah Entry Jurnal
                  </h3>
                  <p className="text-xs text-slate-400">
                    {getFilterDateLabel()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllTeachersModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick stats in modal */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Total: <strong className="text-slate-900 font-black">{activeTeachersList.length} Guru</strong> telah mengisi jurnal</span>
              <span>Total: <strong className="text-slate-900 font-black">{filteredJurnalList.length} Sesi KBM</strong></span>
            </div>

            {/* Teacher list */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3 custom-scrollbar">
              {activeTeachersList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">Belum ada guru yang entry jurnal pada periode ini.</p>
                </div>
              ) : (
                activeTeachersList.map((t, idx) => (
                  <div
                    key={t.nama_guru}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{t.nama_guru}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Mapel: <strong className="text-slate-800">{Array.from(t.mapels).join(', ') || '-'}</strong>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Kelas yang diajar:</span>
                          {Array.from(t.kelases).sort().map(k => (
                            <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-black rounded-md">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black">
                        {t.totalSesi} Sesi KBM
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowAllTeachersModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SKRIP SQL DATABASE */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 md:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Skrip SQL: Tabel Jurnal Pembelajaran</h3>
                  <p className="text-xs text-slate-400">PostgreSQL / Supabase Schema & Security Rules</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    copiedSql ? 'bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                  }`}
                >
                  {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                  {copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Semua SQL'}
                </button>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Instruction Notice */}
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-amber-900 text-xs flex items-center gap-2">
              <span className="font-black bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">PANDUAN</span>
              <span>
                Buka <strong>Supabase Dashboard</strong> &rarr; Pilih menu <strong>SQL Editor</strong> &rarr; Klik <strong>New Query</strong> &rarr; Tempel (Paste) skrip di bawah &rarr; Klik <strong>Run</strong>.
              </span>
            </div>

            {/* SQL Content Codeblock */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs leading-relaxed text-emerald-400 selection:bg-amber-500 selection:text-slate-950">
              <pre className="whitespace-pre overflow-x-auto">{SQL_SCRIPT}</pre>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Mencakup DDL tabel, Row Level Security (RLS), izin peran publik, dan indeks query.</span>
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PASSWORD PROMPT MODAL */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-100">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} /> Autentikasi Admin
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Masukkan kata sandi untuk mengakses skrip SQL.
              </p>
              
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <input
                    type="password"
                    value={sqlPassword}
                    onChange={(e) => {
                      setSqlPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="Masukkan password..."
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm font-medium ${
                      passwordError ? 'border-rose-300 focus:ring-rose-500/50 focus:border-rose-500' : 'border-slate-200 focus:ring-amber-500/50 focus:border-amber-500'
                    }`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-xs text-rose-500 mt-2 font-bold flex items-center gap-1">
                      <X size={12} /> Password salah. Akses ditolak.
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPasswordPrompt(false)}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer"
                  >
                    Akses Skrip
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
