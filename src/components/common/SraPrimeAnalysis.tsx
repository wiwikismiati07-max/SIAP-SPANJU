import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Clock,
  CalendarCheck,
  HeartPulse,
  ShieldAlert,
  MessageSquare,
  Printer,
  Download,
  FileText,
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { getSupabase, normalizeKelasKey } from '../../lib/supabase';

interface SraPrimeAnalysisProps {
  onNavigate?: (appId: string) => void;
}

interface ModuleMetric {
  id: string;
  name: string;
  shortLabel: string;
  percentage: number;
  hasData: boolean;
  numeratorLabel: string;
  formulaNote: string;
  primePillar: string;
  icon: React.ElementType;
  accentColor: string;
  barColor: string;
}

type AnalysisScope = 'all_periode' | 'this_month' | 'today';

interface CachedAnalysis {
  periode: string;
  scope: AnalysisScope;
  modules: Omit<ModuleMetric, 'icon'>[];
  totalSiswa: number;
  updatedAt: string;
}

const CACHE_KEY = 'local_sra_prime_analysis_cache_v1';

const normalizePeriode = (p: any, fallback = '2026'): string => {
  const raw = String(p || fallback).replace(/^Periode\s*/i, '').trim();
  return raw || fallback;
};

const escapeHtml = (value: string): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getScopeLabel = (scope: AnalysisScope): string => {
  if (scope === 'today') return 'Hari Ini';
  if (scope === 'this_month') return 'Bulan Ini';
  return 'Sepanjang Periode';
};

const getBarHex = (pct: number): string => {
  if (pct >= 90) return '#059669';
  if (pct >= 75) return '#2563eb';
  if (pct >= 60) return '#f59e0b';
  return '#e11d48';
};

const getBarRgb = (pct: number): [number, number, number] => {
  if (pct >= 90) return [5, 150, 105];
  if (pct >= 75) return [37, 99, 235];
  if (pct >= 60) return [245, 158, 11];
  return [225, 29, 72];
};

const getPredicate = (pct: number, hasAnyData: boolean) => {
  if (!hasAnyData) {
    return {
      label: 'Menunggu Data Operasional',
      sublabel: 'Belum ada data transaksi tercatat pada rentang yang dipilih',
      textClass: 'text-slate-600',
      barClass: 'bg-slate-400',
      borderClass: 'border-slate-200',
      bgTint: 'bg-slate-50'
    };
  }
  if (pct >= 90) {
    return {
      label: 'Sangat Berhasil (Sekolah Ramah Anak Unggul)',
      sublabel: 'Ekosistem layanan digital & karakter PRIME berjalan sangat efektif',
      textClass: 'text-emerald-700',
      barClass: 'bg-emerald-600',
      borderClass: 'border-emerald-200',
      bgTint: 'bg-emerald-50/70'
    };
  }
  if (pct >= 75) {
    return {
      label: 'Berhasil (Sekolah Ramah Anak Optimal)',
      sublabel: 'Implementasi layanan & pembinaan karakter PRIME berjalan baik',
      textClass: 'text-blue-700',
      barClass: 'bg-blue-600',
      borderClass: 'border-blue-200',
      bgTint: 'bg-blue-50/70'
    };
  }
  if (pct >= 60) {
    return {
      label: 'Cukup Berhasil (Perlu Penguatan)',
      sublabel: 'Layanan berjalan cukup baik namun butuh konsistensi pendampingan',
      textClass: 'text-amber-700',
      barClass: 'bg-amber-500',
      borderClass: 'border-amber-200',
      bgTint: 'bg-amber-50/70'
    };
  }
  return {
    label: 'Perlu Pembinaan Terpadu',
    sublabel: 'Diperlukan evaluasi dan intervensi lintas modul secara terkoordinasi',
    textClass: 'text-rose-700',
    barClass: 'bg-rose-600',
    borderClass: 'border-rose-200',
    bgTint: 'bg-rose-50/70'
  };
};

const ICON_BY_MODULE: Record<string, React.ElementType> = {
  survey: MessageSquare,
  sitelat: Clock,
  izinsiswa: CalendarCheck,
  keagamaan: BookOpen,
  uks: HeartPulse,
  disiplinsiswa: ShieldAlert
};

export default function SraPrimeAnalysis({ onNavigate }: SraPrimeAnalysisProps) {
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2026');
  const [availablePeriodes, setAvailablePeriodes] = useState<string[]>(['2026', '2025']);
  const [scope, setScope] = useState<AnalysisScope>('all_periode');
  const [modules, setModules] = useState<ModuleMetric[]>([]);
  const [totalSiswa, setTotalSiswa] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const kopImageRef = useRef<{ dataUrl: string; width: number; height: number } | null>(null);

  // Preload official Kop Surat image for synchronous PDF & Print rendering
  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1200;
        canvas.height = img.naturalHeight || 220;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          kopImageRef.current = {
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height
          };
        }
      } catch {
        // ignore canvas errors
      }
    };
    img.src = '/assets/aistudio/kop_surat_spanju_e20dffe4.png';
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: CachedAnalysis = JSON.parse(raw);
        if (parsed.modules?.length && parsed.periode === selectedPeriode && parsed.scope === scope) {
          setModules(
            parsed.modules.map((m) => ({
              ...m,
              icon: ICON_BY_MODULE[m.id] || ShieldCheck
            }))
          );
          setTotalSiswa(parsed.totalSiswa || 0);
          setLastUpdated(parsed.updatedAt || '');
          hasLoadedOnceRef.current = true;
          setLoading(false);
        }
      }
    } catch {
      // ignore cache errors
    }
  }, [selectedPeriode, scope]);

  const fetchAnalysis = useCallback(
    async (isManual = false, isSilent = false) => {
      if (isFetchingRef.current && isSilent) return;
      isFetchingRef.current = true;

      if (isManual) setRefreshing(true);
      else if (!isSilent && !hasLoadedOnceRef.current) setLoading(true);
      if (!isSilent) setErrorMsg(null);

      const client = getSupabase();
      if (!client) {
        if (!isSilent) setErrorMsg('Koneksi Supabase belum tersedia.');
        setLoading(false);
        setRefreshing(false);
        isFetchingRef.current = false;
        return;
      }

      const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) =>
        setTimeout(() => resolve({ isTimeout: true }), 12000)
      );

      try {
        const fetchAllPaginated = async (
          table: string,
          selectCols: string,
          extraHeaders?: Record<string, string>,
          dateFilter?: { column: string; start?: string; end?: string }
        ) => {
          const rows: any[] = [];
          const pageSize = 1000;
          let page = 0;

          while (page < 20) {
            let req = client
              .from(table)
              .select(selectCols)
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (dateFilter?.start) req = req.gte(dateFilter.column, dateFilter.start);
            if (dateFilter?.end) req = req.lte(dateFilter.column, dateFilter.end);

            if (extraHeaders) {
              Object.entries(extraHeaders).forEach(([k, v]) => {
                req = req.setHeader(k, v);
              });
            }

            const { data, error } = await req;
            if (error) throw error;
            if (!data || data.length === 0) break;

            rows.push(...data);
            if (data.length < pageSize) break;
            page++;
          }

          return rows;
        };

        const loadLogic = async () => {
          const now = new Date();
          const todayStr = format(now, 'yyyy-MM-dd');
          const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
          const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
          const dateRange =
            scope === 'today'
              ? { start: todayStr, end: todayStr }
              : scope === 'this_month'
                ? { start: monthStart, end: monthEnd }
                : selectedPeriode !== 'ALL'
                  ? { start: `${selectedPeriode}-01-01`, end: `${selectedPeriode}-12-31` }
                  : undefined;

          const [
            allSiswaRaw,
            surveyRows,
            terlambatRows,
            izinRows,
            agamaRows,
            uksRows,
            disiplinRows
          ] = await Promise.all([
            fetchAllPaginated('master_siswa', 'id, nama, kelas, periode, nis', {
              'x-raw-master-siswa': 'true'
            }),
            fetchAllPaginated('survey_responses', 'id, created_at, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10'),
            fetchAllPaginated(
              'transaksi_terlambat',
              'id, siswa_id, tanggal',
              undefined,
              dateRange ? { column: 'tanggal', ...dateRange } : undefined
            ),
            fetchAllPaginated(
              'izin_siswa',
              'id, siswa_id, tanggal_mulai, status',
              undefined,
              dateRange ? { column: 'tanggal_mulai', ...dateRange } : undefined
            ),
            fetchAllPaginated(
              'agama_absensi',
              'id, siswa_id, tanggal, alasan',
              undefined,
              dateRange ? { column: 'tanggal', ...dateRange } : undefined
            ),
            fetchAllPaginated(
              'uks_kunjungan',
              'id, siswa_id, tanggal, penanganan',
              undefined,
              dateRange ? { column: 'tanggal', ...dateRange } : undefined
            ),
            fetchAllPaginated('transaksi_pelanggaran', '*')
          ]);

          // Build distinct periodes & clean student map
          const realSiswa = allSiswaRaw.filter((s) => !String(s.id || '').startsWith('pad-'));
          const distinctPeriodes = Array.from(
            new Set(['2026', '2025', ...realSiswa.map((s) => normalizePeriode(s.periode))])
          )
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));

          const siswaMap = new Map<string, any>();
          allSiswaRaw.forEach((s) => {
            if (s.id) {
              siswaMap.set(String(s.id), {
                ...s,
                kelas: normalizeKelasKey(s.kelas || ''),
                periode: normalizePeriode(s.periode)
              });
            }
          });

          // Deduplicate real students in selected periode accurately
          const siswaInPeriodeRaw = realSiswa.filter(
            (s) => selectedPeriode === 'ALL' || normalizePeriode(s.periode) === selectedPeriode
          );
          const uniqueSiswaKeys = new Map<string, any>();
          siswaInPeriodeRaw.forEach((s) => {
            const p = normalizePeriode(s.periode);
            const nis = String(s.nis || '').trim();
            const nama = String(s.nama || '').toLowerCase().replace(/\s+/g, ' ').trim();
            const kls = normalizeKelasKey(s.kelas || '');
            const key = nis ? `NIS_${nis}_${p}` : `NAME_${nama}_${kls}_${p}`;
            if (!uniqueSiswaKeys.has(key)) uniqueSiswaKeys.set(key, s);
          });
          const siswaCount = uniqueSiswaKeys.size;

          const belongsToPeriode = (siswaId: any) => {
            if (selectedPeriode === 'ALL') return true;
            const st = siswaMap.get(String(siswaId));
            return st ? normalizePeriode(st.periode) === selectedPeriode : true;
          };

          // 1. Survey Kepuasan Layanan
          const filteredSurveys =
            scope === 'today'
              ? surveyRows.filter((r) => String(r.created_at || '').slice(0, 10) === todayStr)
              : scope === 'this_month'
                ? surveyRows.filter((r) => {
                    const d = String(r.created_at || '').slice(0, 10);
                    return d >= monthStart && d <= monthEnd;
                  })
                : surveyRows;
          const totalResponden = filteredSurveys.length;
          let surveyScoreSum = 0;
          filteredSurveys.forEach((r) => {
            for (let q = 1; q <= 10; q++) {
              surveyScoreSum += Number(r[`q${q}`]) || 0;
            }
          });
          const surveyMaxScore = totalResponden * 10 * 5;
          const surveyPct = surveyMaxScore > 0 ? (surveyScoreSum / surveyMaxScore) * 100 : 0;

          // 2. Si-Telat
          const terlambatInPeriode = terlambatRows.filter((t) => belongsToPeriode(t.siswa_id));
          const uniqueTerlambat = new Set(terlambatInPeriode.map((t) => String(t.siswa_id))).size;
          const tepatWaktu = Math.max(0, siswaCount - uniqueTerlambat);
          const sitelatPct = siswaCount > 0 ? (tepatWaktu / siswaCount) * 100 : 0;

          // 3. Izin Siswa
          const izinInPeriode = izinRows.filter((i) => belongsToPeriode(i.siswa_id));
          const uniqueIzinDisetujui = new Set(
            izinInPeriode.filter((i) => i.status === 'Disetujui').map((i) => String(i.siswa_id))
          ).size;
          const siswaMasuk = Math.max(0, siswaCount - uniqueIzinDisetujui);
          const izinPct = siswaCount > 0 ? (siswaMasuk / siswaCount) * 100 : 0;

          // 4. Keagamaan
          const agamaInPeriode = agamaRows.filter((a) => belongsToPeriode(a.siswa_id));
          const agamaTotal = agamaInPeriode.length;
          const agamaHadir = agamaInPeriode.filter((a) => !a.alasan || a.alasan === 'Hadir').length;
          const keagamaanPct = agamaTotal > 0 ? (agamaHadir / agamaTotal) * 100 : 0;

          // 5. UKS / Kesehatan
          const uksInPeriode = uksRows.filter((u) => belongsToPeriode(u.siswa_id));
          const uniqueBerobat = new Set(uksInPeriode.map((u) => String(u.siswa_id))).size;
          const siswaSehat = Math.max(0, siswaCount - uniqueBerobat);
          const uksPct = siswaCount > 0 ? (siswaSehat / siswaCount) * 100 : 0;

          // 6. Disiplin Siswa
          let disiplinInScope = disiplinRows.filter((d) => belongsToPeriode(d.siswa_id));
          if (dateRange) {
            disiplinInScope = disiplinInScope.filter((d) => {
              const tgl = String(d.tanggal || '').slice(0, 10);
              if (!tgl) return true;
              return tgl >= dateRange.start && tgl <= dateRange.end;
            });
          }
          const totalKasus = disiplinInScope.length;
          const kasusSelesai = disiplinInScope.filter((k) => {
            const st = String(k.status || '').trim().toLowerCase();
            return st === 'selesai' || st === 'terselesaikan';
          }).length;
          const uniquePelanggar = new Set(disiplinInScope.map((k) => String(k.siswa_id))).size;
          const disiplinPct =
            totalKasus > 0
              ? (kasusSelesai / totalKasus) * 100
              : siswaCount > 0
                ? (Math.max(0, siswaCount - uniquePelanggar) / siswaCount) * 100
                : 0;

          const computedModules: ModuleMetric[] = [
            {
              id: 'survey',
              name: 'Survey Kepuasan Layanan',
              shortLabel: 'Survey',
              percentage: surveyPct,
              hasData: totalResponden > 0,
              numeratorLabel:
                totalResponden > 0
                  ? `${totalResponden} responden (skor ${(surveyScoreSum / (totalResponden * 10)).toFixed(2)}/5)`
                  : 'Belum ada responden',
              formulaNote: 'Skor kepuasan total ÷ skor maksimal',
              primePillar: 'Mentalitas & Empan Papan',
              icon: MessageSquare,
              accentColor: 'text-fuchsia-700',
              barColor: 'bg-fuchsia-600'
            },
            {
              id: 'sitelat',
              name: 'Si-Telat (Kedisiplinan Waktu)',
              shortLabel: 'Si-Telat',
              percentage: sitelatPct,
              hasData: siswaCount > 0,
              numeratorLabel: `${tepatWaktu.toLocaleString('id-ID')} / ${siswaCount.toLocaleString('id-ID')} siswa tepat waktu`,
              formulaNote: 'Siswa tidak terlambat ÷ total siswa',
              primePillar: 'Prefentif',
              icon: Clock,
              accentColor: 'text-emerald-700',
              barColor: 'bg-emerald-600'
            },
            {
              id: 'izinsiswa',
              name: 'Izin Siswa (Kehadiran)',
              shortLabel: 'Izin Siswa',
              percentage: izinPct,
              hasData: siswaCount > 0,
              numeratorLabel: `${siswaMasuk.toLocaleString('id-ID')} / ${siswaCount.toLocaleString('id-ID')} siswa aktif hadir`,
              formulaNote: 'Siswa tanpa izin absen disetujui ÷ total siswa',
              primePillar: 'Prefentif & Empan Papan',
              icon: CalendarCheck,
              accentColor: 'text-blue-700',
              barColor: 'bg-blue-600'
            },
            {
              id: 'keagamaan',
              name: 'Keagamaan (SIM-AGAMA)',
              shortLabel: 'Keagamaan',
              percentage: keagamaanPct,
              hasData: agamaTotal > 0,
              numeratorLabel:
                agamaTotal > 0
                  ? `${agamaHadir.toLocaleString('id-ID')} / ${agamaTotal.toLocaleString('id-ID')} catatan hadir ibadah`
                  : 'Belum ada absensi ibadah tercatat',
              formulaNote: 'Kehadiran ibadah ÷ total catatan absensi',
              primePillar: 'Religius',
              icon: BookOpen,
              accentColor: 'text-teal-700',
              barColor: 'bg-teal-600'
            },
            {
              id: 'uks',
              name: 'UKS / Kesehatan',
              shortLabel: 'UKS / Kesehatan',
              percentage: uksPct,
              hasData: siswaCount > 0,
              numeratorLabel: `${siswaSehat.toLocaleString('id-ID')} / ${siswaCount.toLocaleString('id-ID')} siswa sehat`,
              formulaNote: 'Siswa tidak berobat ÷ total siswa',
              primePillar: 'Empan Papan / Sadar Diri',
              icon: HeartPulse,
              accentColor: 'text-rose-700',
              barColor: 'bg-rose-600'
            },
            {
              id: 'disiplinsiswa',
              name: 'Disiplin Siswa',
              shortLabel: 'Disiplin Siswa',
              percentage: disiplinPct,
              hasData: totalKasus > 0 || siswaCount > 0,
              numeratorLabel:
                totalKasus > 0
                  ? `${kasusSelesai.toLocaleString('id-ID')} / ${totalKasus.toLocaleString('id-ID')} kasus terselesaikan`
                  : `${siswaCount.toLocaleString('id-ID')} siswa tertib (0 kasus)`,
              formulaNote:
                totalKasus > 0
                  ? 'Kasus selesai dibina ÷ total kasus'
                  : 'Siswa tertib ÷ total siswa',
              primePillar: 'Prefentif & Mentalitas',
              icon: ShieldAlert,
              accentColor: 'text-indigo-700',
              barColor: 'bg-indigo-600'
            }
          ];

          const timestamp = format(new Date(), 'dd MMM yyyy HH:mm:ss', { locale: idLocale });
          return { computedModules, distinctPeriodes, siswaCount, timestamp };
        };

        const result = await Promise.race([loadLogic(), timeoutPromise]);
        if ('isTimeout' in result) {
          if (!isSilent) {
            setErrorMsg('Sinkronisasi data memerlukan waktu lebih lama. Menampilkan data tersimpan jika ada.');
          }
        } else {
          hasLoadedOnceRef.current = true;
          setErrorMsg(null);
          setModules(result.computedModules);
          setAvailablePeriodes(result.distinctPeriodes);
          setTotalSiswa(result.siswaCount);
          setLastUpdated(result.timestamp);

          try {
            const payload: CachedAnalysis = {
              periode: selectedPeriode,
              scope,
              modules: result.computedModules.map(({ icon: _icon, ...rest }) => rest),
              totalSiswa: result.siswaCount,
              updatedAt: result.timestamp
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
          } catch {
            // ignore storage errors
          }
        }
      } catch (err: any) {
        console.error('Error computing SRA x PRIME analysis:', err);
        if (!isSilent) setErrorMsg('Sebagian data belum dapat dimuat dari server.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [selectedPeriode, scope]
  );

  useEffect(() => {
    fetchAnalysis(false, false);
  }, [fetchAnalysis]);

  // Automatic real-time recalculation when any of the 6 core service tables change
  useEffect(() => {
    const client = getSupabase();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerSilentSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAnalysis(false, true);
      }, 350);
    };

    const watchedTables = [
      'survey_responses',
      'transaksi_terlambat',
      'izin_siswa',
      'agama_absensi',
      'uks_kunjungan',
      'transaksi_pelanggaran',
      'master_siswa'
    ];

    let channel: any = null;
    if (client) {
      try {
        let ch = client.channel(`sra-prime-realtime-${selectedPeriode}-${scope}`);
        watchedTables.forEach((table) => {
          ch = ch.on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            triggerSilentSync
          );
        });
        channel = ch.subscribe();
      } catch {
        // Ignore if Realtime is unavailable in current project
      }
    }

    const pollInterval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchAnalysis(false, true);
      }
    }, 10000);

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchAnalysis(false, true);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key !== CACHE_KEY) {
        triggerSilentSync();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageChange);
      if (client && channel) {
        try {
          client.removeChannel(channel);
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [fetchAnalysis, selectedPeriode, scope]);

  // All benchmark figures derive automatically & reactively from the 6 service modules
  const {
    moduleSum,
    hasAnyData,
    compositePercentage,
    predicate,
    primePillars,
    strongestModule,
    weakestModule,
    strongestPrime,
    modulesNeedAttention
  } = useMemo(() => {
    const sum = modules.reduce((acc, m) => acc + m.percentage, 0);
    const anyData = modules.some((m) => m.hasData);
    const composite = modules.length > 0 ? sum / modules.length : 0;
    const pred = getPredicate(composite, anyData);

    const getPct = (id: string) => modules.find((m) => m.id === id)?.percentage ?? 0;

    const pillars = [
      {
        code: 'P',
        title: 'Prefentif',
        modulesLabel: 'Si-Telat · Izin Siswa · Disiplin Siswa',
        score: modules.length > 0 ? (getPct('sitelat') + getPct('izinsiswa') + getPct('disiplinsiswa')) / 3 : 0,
        description:
          'Deteksi dini dan pencegahan keterlambatan, ketidakhadiran tanpa kejelasan, serta pelanggaran ringan sebelum berkembang lebih jauh.'
      },
      {
        code: 'R',
        title: 'Religius',
        modulesLabel: 'Keagamaan (SIM-AGAMA)',
        score: modules.length > 0 ? getPct('keagamaan') : 0,
        description:
          'Pembiasaan ibadah harian, penguatan akhlak mulia, dan pemantauan partisipasi kegiatan keagamaan secara konsisten dan humanis.'
      },
      {
        code: 'M',
        title: 'Mentalitas',
        modulesLabel: 'Disiplin Siswa · Survey Kepuasan Layanan',
        score: modules.length > 0 ? (getPct('disiplinsiswa') + getPct('survey')) / 2 : 0,
        description:
          'Pembinaan karakter positif, ketangguhan mental dalam menaati tata tertib, dan keterbukaan suara warga sekolah tanpa rasa takut.'
      },
      {
        code: 'E',
        title: 'Empan Papan / Sadar Diri',
        modulesLabel: 'UKS / Kesehatan · Izin Siswa · Survey Kepuasan',
        score: modules.length > 0 ? (getPct('uks') + getPct('izinsiswa') + getPct('survey')) / 3 : 0,
        description:
          'Kesadaran diri menjaga kesehatan fisik, ketertiban menempatkan hak dan kewajiban (perizinan), serta kepedulian terhadap lingkungan belajar aman.'
      }
    ];

    const sortedMods = [...modules].sort((a, b) => b.percentage - a.percentage);
    const sortedP = [...pillars].sort((a, b) => b.score - a.score);

    return {
      moduleSum: sum,
      hasAnyData: anyData,
      compositePercentage: composite,
      predicate: pred,
      primePillars: pillars,
      strongestModule: sortedMods[0],
      weakestModule: sortedMods[sortedMods.length - 1],
      strongestPrime: sortedP[0],
      modulesNeedAttention: modules.filter((m) => m.percentage < 75)
    };
  }, [modules]);

  const conclusionPlainText = useMemo(() => {
    if (!hasAnyData) {
      return 'Belum terdapat data layanan yang cukup pada periode terpilih. Silakan mulai mencatat kehadiran, keterlambatan, kegiatan keagamaan, kunjungan UKS, pembinaan disiplin, serta mengajak warga sekolah mengisi Survey Kepuasan Layanan agar indeks SRA × PRIME dapat terhitung otomatis.';
    }
    const baseText = `Dengan capaian gabungan ${compositePercentage.toFixed(1)}% (${predicate.label}), sinergi aplikasi SIAP SPANJU menunjukkan kontribusi paling kuat pada dimensi ${strongestPrime.code} (${strongestPrime.title}: ${strongestPrime.score.toFixed(1)}%) dan layanan ${strongestModule?.name} (${strongestModule?.percentage.toFixed(1)}%). `;
    if (modulesNeedAttention.length > 0) {
      const attentionList = modulesNeedAttention
        .map((m) => `${m.shortLabel} (${m.percentage.toFixed(1)}%)`)
        .join(', ');
      return (
        baseText +
        `Aspek yang masih perlu penguatan terarah adalah ${attentionList} melalui pendampingan wali kelas, guru BK, dan pembiasaan karakter PRIME agar iklim Sekolah Ramah Anak merata di seluruh layanan.`
      );
    }
    return (
      baseText +
      `Seluruh keenam layanan berada pada kategori optimal (≥75%), menandakan ekosistem Sekolah Ramah Anak berbasis karakter PRIME berjalan seimbang — perlu dijaga konsistensinya pada layanan dengan skor terendah relatif (${weakestModule?.shortLabel}: ${weakestModule?.percentage.toFixed(1)}%).`
    );
  }, [hasAnyData, compositePercentage, predicate, strongestPrime, strongestModule, modulesNeedAttention, weakestModule]);

  const handleExportExcel = () => {
    if (modules.length === 0) return;

    try {
      const periodeText = selectedPeriode === 'ALL' ? 'Semua Periode' : `Periode ${selectedPeriode}`;
      const scopeText = getScopeLabel(scope);
      const printedAt = format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale });
      const formulaValues =
        modules.length === 6
          ? `(${modules.map((m) => `${m.percentage.toFixed(1)}%`).join(' + ')}) / 600 × 100% = ${compositePercentage.toFixed(1)}%`
          : `${compositePercentage.toFixed(1)}%`;

      const summaryRows = [
        { Keterangan: 'Judul Laporan', Nilai: 'Analisis Keberhasilan Penggunaan SIAP SPANJU (SRA × Karakter PRIME)' },
        { Keterangan: 'Sekolah', Nilai: 'UPT SMP Negeri 7 Pasuruan' },
        { Keterangan: 'Periode Analisis', Nilai: periodeText },
        { Keterangan: 'Cakupan Waktu', Nilai: scopeText },
        { Keterangan: 'Total Siswa Terdata', Nilai: totalSiswa },
        { Keterangan: 'Indeks Gabungan SRA × PRIME', Nilai: `${compositePercentage.toFixed(1)}%` },
        { Keterangan: 'Predikat Keberhasilan', Nilai: predicate.label },
        { Keterangan: 'Ringkasan Predikat', Nilai: predicate.sublabel },
        { Keterangan: 'Rumus Perhitungan', Nilai: '((% Survey + % Si-Telat + % Izin Siswa + % Keagamaan + % UKS/Kesehatan + % Disiplin Siswa) / 600) × 100%' },
        { Keterangan: 'Hasil Perhitungan', Nilai: formulaValues },
        { Keterangan: 'Sinkronisasi Terakhir', Nilai: lastUpdated || '-' },
        { Keterangan: 'Tanggal Ekspor', Nilai: printedAt },
        { Keterangan: 'Kesimpulan & Rekomendasi', Nilai: conclusionPlainText },
        { Keterangan: '', Nilai: '' },
        { Keterangan: 'Mengetahui', Nilai: 'Kepala SMP Negeri 7 Pasuruan' },
        { Keterangan: 'Nama Kepala Sekolah', Nilai: 'NUR FADILAH, S.Pd' },
        { Keterangan: 'NIP', Nilai: '19860410 201001 2 030' }
      ];

      const moduleRows = modules.map((m, index) => ({
        No: index + 1,
        'Layanan Utama': m.name,
        'Capaian (%)': Number(m.percentage.toFixed(1)),
        'Pilar Karakter PRIME': m.primePillar,
        'Data Terukur': m.numeratorLabel,
        'Rumus Layanan': m.formulaNote
      }));

      const primeRows = primePillars.map((p) => ({
        Kode: p.code,
        'Pilar Karakter PRIME': p.title,
        'Layanan Pendukung': p.modulesLabel,
        'Capaian (%)': Number(p.score.toFixed(1)),
        Status: !hasAnyData
          ? 'Menunggu Data'
          : p.score >= 90
            ? 'Sangat Baik'
            : p.score >= 75
              ? 'Baik'
              : p.score >= 60
                ? 'Cukup'
                : 'Perlu Penguatan',
        Deskripsi: p.description
      }));

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsModules = XLSX.utils.json_to_sheet(moduleRows);
      const wsPrime = XLSX.utils.json_to_sheet(primeRows);

      wsSummary['!cols'] = [{ wch: 28 }, { wch: 85 }];
      wsModules['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 14 }, { wch: 28 }, { wch: 36 }, { wch: 38 }];
      wsPrime['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 38 }, { wch: 14 }, { wch: 18 }, { wch: 70 }];

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan SRA x PRIME');
      XLSX.utils.book_append_sheet(wb, wsModules, 'Rincian 6 Layanan');
      XLSX.utils.book_append_sheet(wb, wsPrime, 'Pilar Karakter PRIME');

      const safePeriode = selectedPeriode === 'ALL' ? 'Semua_Periode' : `Periode_${selectedPeriode}`;
      const dateStamp = format(new Date(), 'yyyyMMdd_HHmm');
      const fileName = `Analisis_Keberhasilan_SIAP_SPANJU_${safePeriode}_${dateStamp}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(blob, fileName);
      setActionNotice(`File Excel (${fileName}) berhasil diunduh.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Error exporting Excel:', err);
      setActionNotice('Gagal mengekspor Excel. Silakan coba lagi.');
    }
  };

  const handleDownloadPdf = () => {
    if (modules.length === 0 || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const periodeText = selectedPeriode === 'ALL' ? 'Semua Periode' : `Periode ${selectedPeriode}`;
      const scopeText = getScopeLabel(scope);
      const tanggalCetak = format(new Date(), 'dd MMMM yyyy', { locale: idLocale });
      const waktuCetak = format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale });
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const margin = 12;
      const contentW = pageW - margin * 2;
      let y = 10;

      // Kop Surat
      if (kopImageRef.current) {
        const { dataUrl, width, height } = kopImageRef.current;
        const kopH = Math.min(34, (contentW * height) / width);
        doc.addImage(dataUrl, 'PNG', margin, y, contentW, kopH);
        y += kopH + 4;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('PEMERINTAH KOTA PASURUAN — UPT SMP NEGERI 7 PASURUAN', pageW / 2, y + 5, { align: 'center' });
        y += 10;
      }

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text('LAPORAN HASIL ANALISIS KEBERHASILAN PENGGUNAAN SIAP SPANJU', pageW / 2, y + 3, { align: 'center' });
      y += 6.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Tolak Ukur Sekolah Ramah Anak (SRA) × Karakter Sekolah PRIME (Prefentif, Religius, Mentalitas, Empan Papan)', pageW / 2, y + 1.5, { align: 'center' });
      y += 4;

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 4;

      // Meta Grid (4 boxes)
      const metaItems = [
        { label: 'PERIODE', value: periodeText },
        { label: 'CAKUPAN DATA', value: scopeText },
        { label: 'SISWA TERDATA', value: totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} Siswa` : '-' },
        { label: 'SINKRONISASI', value: lastUpdated || waktuCetak }
      ];
      const boxGap = 2.5;
      const boxW = (contentW - boxGap * 3) / 4;
      metaItems.forEach((item, i) => {
        const bx = margin + i * (boxW + boxGap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.25);
        doc.roundedRect(bx, y, boxW, 11.5, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label, bx + 2.5, y + 4);
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(String(item.value).slice(0, 26), bx + 2.5, y + 9);
      });
      y += 15;

      // Composite Hero Box
      const [cr, cg, cb] = getBarRgb(compositePercentage);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentW, 25, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('INDEKS GABUNGAN SRA × PRIME', margin + 4, y + 5.5);

      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text(`${compositePercentage.toFixed(1)}%`, margin + 4, y + 14.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(cr, cg, cb);
      const predLines = doc.splitTextToSize(predicate.label, 68);
      doc.text(predLines, margin + 4, y + 19.5);

      const rightX = margin + 78;
      const rightW = contentW - 82;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Capaian Gabungan 6 Modul Layanan', rightX, y + 5.5);
      doc.text(`${moduleSum.toFixed(1)}% / 600% = ${compositePercentage.toFixed(1)}%`, rightX + rightW, y + 5.5, { align: 'right' });

      // Composite bar
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(rightX, y + 7.5, rightW, 3, 1.5, 1.5, 'F');
      const fillW = Math.max(2, (rightW * Math.min(100, Math.max(0, compositePercentage))) / 100);
      doc.setFillColor(cr, cg, cb);
      doc.roundedRect(rightX, y + 7.5, fillW, 3, 1.5, 1.5, 'F');

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(rightX, y + 12.5, rightW, 10, 1.2, 1.2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(15, 23, 42);
      const formulaHeaderLines = doc.splitTextToSize(
        'Rumus: ((% Survey + % Si-Telat + % Izin + % Keagamaan + % UKS + % Disiplin) / 600) × 100%',
        rightW - 4
      );
      doc.text(formulaHeaderLines[0], rightX + 2, y + 16);
      doc.setFont('helvetica', 'normal');
      const valLine = modules.length === 6
        ? `(${modules.map((m) => `${m.percentage.toFixed(1)}%`).join(' + ')}) / 600 × 100% = ${compositePercentage.toFixed(1)}%`
        : `${compositePercentage.toFixed(1)}%`;
      const valLines = doc.splitTextToSize(valLine, rightW - 4);
      doc.text(valLines[0], rightX + 2, y + 20);

      y += 30;

      // Section 1: 6 Modules Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('1. RINCIAN PERSENTASE KEBERHASILAN 6 LAYANAN UTAMA', margin, y);
      y += 3;

      const cols = [8, 52, 36, 56, 34]; // sums to 186mm
      const headers = ['No', 'Layanan Utama', 'Pilar PRIME', 'Data Terukur', 'Capaian'];
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, contentW, 7, 'FD');
      let cx = margin;
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      headers.forEach((h, idx) => {
        doc.text(h, idx === 0 ? cx + 4 : cx + 2, y + 4.7, idx === 0 ? { align: 'center' } : undefined);
        cx += cols[idx];
      });
      y += 7;

      modules.forEach((m, idx) => {
        const rowH = 11;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin, y, contentW, rowH, 'FD');

        let rx = margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(String(idx + 1), rx + 4, y + 6.2, { align: 'center' });
        doc.line(rx + cols[0], y, rx + cols[0], y + rowH);
        rx += cols[0];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(doc.splitTextToSize(m.name, cols[1] - 4)[0], rx + 2, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(doc.splitTextToSize(m.formulaNote, cols[1] - 4)[0], rx + 2, y + 8.6);
        doc.line(rx + cols[1], y, rx + cols[1], y + rowH);
        rx += cols[1];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        const pilarLines = doc.splitTextToSize(m.primePillar, cols[2] - 4);
        doc.text(pilarLines.slice(0, 2), rx + 2, y + 4.8);
        doc.line(rx + cols[2], y, rx + cols[2], y + rowH);
        rx += cols[2];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const dataLines = doc.splitTextToSize(m.numeratorLabel, cols[3] - 4);
        doc.text(dataLines.slice(0, 2), rx + 2, y + 4.8);
        doc.line(rx + cols[3], y, rx + cols[3], y + rowH);
        rx += cols[3];

        const [mr, mg, mb] = getBarRgb(m.percentage);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`${m.percentage.toFixed(1)}%`, rx + 2, y + 4.7);
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(rx + 2, y + 6.6, cols[4] - 5, 2.2, 1, 1, 'F');
        const mw = Math.max(1.5, ((cols[4] - 5) * Math.min(100, Math.max(0, m.percentage))) / 100);
        doc.setFillColor(mr, mg, mb);
        doc.roundedRect(rx + 2, y + 6.6, mw, 2.2, 1, 1, 'F');

        y += rowH;
      });
      y += 6;

      // Section 2: 4 PRIME Pillars (2x2 grid)
      if (y > 205) {
        doc.addPage();
        y = 14;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('2. PEMETAAN INTEGRASI KARAKTER SEKOLAH PRIME', margin, y);
      y += 3.5;

      const cardGap = 4;
      const cardW = (contentW - cardGap) / 2;
      const cardH = 26;
      primePillars.forEach((p, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const px = margin + col * (cardW + cardGap);
        const py = y + row * (cardH + 3);
        const [pr, pg, pb] = !hasAnyData ? [100, 116, 139] : getBarRgb(p.score);
        const statusLabel = !hasAnyData
          ? 'Menunggu Data'
          : p.score >= 90
            ? 'Sangat Baik'
            : p.score >= 75
              ? 'Baik'
              : p.score >= 60
                ? 'Cukup'
                : 'Perlu Penguatan';

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(px, py, cardW, cardH, 2, 2, 'FD');

        doc.setFillColor(15, 23, 42);
        doc.roundedRect(px + 3, py + 3, 6.5, 6.5, 1.2, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(p.code, px + 6.25, py + 7.5, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(p.title, px + 11.5, py + 5.8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(doc.splitTextToSize(p.modulesLabel, cardW - 32)[0], px + 11.5, py + 9.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${p.score.toFixed(1)}%`, px + cardW - 3, py + 6, { align: 'right' });
        doc.setFontSize(6.5);
        doc.setTextColor(pr, pg, pb);
        doc.text(statusLabel, px + cardW - 3, py + 9.5, { align: 'right' });

        doc.setFillColor(226, 232, 240);
        doc.roundedRect(px + 3, py + 11.5, cardW - 6, 2, 1, 1, 'F');
        const pw = Math.max(1.5, ((cardW - 6) * Math.min(100, Math.max(0, p.score))) / 100);
        doc.setFillColor(pr, pg, pb);
        doc.roundedRect(px + 3, py + 11.5, pw, 2, 1, 1, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(71, 85, 105);
        const descLines = doc.splitTextToSize(p.description, cardW - 6);
        doc.text(descLines.slice(0, 3), px + 3, py + 16.5);
      });
      y += cardH * 2 + 8;

      // Section 3: Conclusion (set font & size BEFORE splitTextToSize so text never overflows box!)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      const concMaxW = contentW - 11;
      const concLines = doc.splitTextToSize(conclusionPlainText, concMaxW);
      const concLineH = 4.2;
      const concH = Math.max(16, concLines.length * concLineH + 7);
      if (y + concH + 40 > 285) {
        doc.addPage();
        y = 14;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('3. KESIMPULAN & REKOMENDASI OTOMATIS', margin, y);
      y += 3;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, y, contentW, concH, 2, 2, 'FD');
      doc.setFillColor(cr, cg, cb);
      doc.roundedRect(margin, y, 1.8, concH, 0.8, 0.8, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(30, 41, 59);
      doc.text(concLines, margin + 5.5, y + 5.5);
      y += concH + 6;

      // Footer note & Kepala Sekolah Signature Block
      if (y + 34 > 286) {
        doc.addPage();
        y = 16;
      }

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Dokumen dihasilkan otomatis dari Sistem SIAP SPANJU · UPT SMP Negeri 7 Pasuruan', margin, y + 2);

      const sigCenterX = pageW - margin - 34;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Pasuruan, ${tanggalCetak}`, sigCenterX, y + 2, { align: 'center' });
      doc.text('Mengetahui,', sigCenterX, y + 6.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text('Kepala SMP Negeri 7 Pasuruan', sigCenterX, y + 10.8, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('NUR FADILAH, S.Pd', sigCenterX, y + 27, { align: 'center' });
      const nameW = doc.getTextWidth('NUR FADILAH, S.Pd');
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.3);
      doc.line(sigCenterX - nameW / 2, y + 27.8, sigCenterX + nameW / 2, y + 27.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(71, 85, 105);
      doc.text('NIP. 19860410 201001 2 030', sigCenterX, y + 31.5, { align: 'center' });

      const safePeriode = selectedPeriode === 'ALL' ? 'Semua_Periode' : `Periode_${selectedPeriode}`;
      const dateStamp = format(new Date(), 'yyyyMMdd_HHmm');
      const fileName = `Laporan_Analisis_SIAP_SPANJU_${safePeriode}_${dateStamp}.pdf`;
      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, fileName);
      setActionNotice(`File PDF (${fileName}) berhasil disimpan.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setActionNotice('Gagal membuat file PDF. Silakan gunakan tombol Cetak.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleTriggerBrowserPrint = () => {
    window.print();
  };

  const periodeLabelText = selectedPeriode === 'ALL' ? 'Semua Periode' : `Periode ${selectedPeriode}`;
  const scopeLabelText = getScopeLabel(scope);
  const tanggalCetakText = format(new Date(), 'dd MMMM yyyy', { locale: idLocale });
  const compositeColorHex = getBarHex(compositePercentage);

  const printableReportNode = (
    <div id="printable-full-report" className="bg-white text-slate-900 p-6 md:p-8 max-w-[820px] mx-auto space-y-5">
      <div className="w-full">
        <img
          src="/assets/aistudio/kop_surat_spanju_e20dffe4.png"
          alt="Kop Surat UPT SMP Negeri 7 Pasuruan"
          className="w-full h-auto object-contain block"
        />
      </div>

      <div className="text-center border-b-2 border-slate-900 pb-3">
        <h2 className="text-base md:text-lg font-black uppercase tracking-wide text-slate-900">
          Laporan Hasil Analisis Keberhasilan Penggunaan SIAP SPANJU
        </h2>
        <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
          Integrasi Sekolah Ramah Anak (SRA) × Karakter Sekolah PRIME (Prefentif, Religius, Mentalitas, Empan Papan / Sadar Diri)
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Periode</p>
          <p className="text-xs font-extrabold text-slate-900 mt-0.5">{periodeLabelText}</p>
        </div>
        <div className="border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Cakupan Data</p>
          <p className="text-xs font-extrabold text-slate-900 mt-0.5">{scopeLabelText}</p>
        </div>
        <div className="border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Siswa Terdata</p>
          <p className="text-xs font-extrabold text-slate-900 mt-0.5">
            {totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} Siswa` : '-'}
          </p>
        </div>
        <div className="border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Sinkronisasi</p>
          <p className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">{lastUpdated || tanggalCetakText}</p>
        </div>
      </div>

      <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 avoid-break">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Indeks Gabungan SRA × PRIME</p>
            <p className="text-3xl font-black text-slate-900 tabular-nums mt-0.5">{compositePercentage.toFixed(1)}%</p>
            <p className="text-xs font-extrabold mt-1" style={{ color: compositeColorHex }}>{predicate.label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{predicate.sublabel}</p>
          </div>
          <div className="sm:col-span-7 space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-slate-700">
              <span>Capaian Gabungan 6 Modul Layanan</span>
              <span className="tabular-nums">{moduleSum.toFixed(1)}% / 600% = {compositePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, compositePercentage))}%`,
                  backgroundColor: compositeColorHex
                }}
              />
            </div>
            <div className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-700">
              <p className="font-bold text-slate-900">
                Rumus: ((% Survey + % Si-Telat + % Izin Siswa + % Keagamaan + % UKS + % Disiplin) ÷ 600) × 100%
              </p>
              {modules.length === 6 && (
                <p className="font-mono mt-0.5">
                  ({modules.map((m) => `${m.percentage.toFixed(1)}%`).join(' + ')}) ÷ 600 × 100% ={' '}
                  <strong>{compositePercentage.toFixed(1)}%</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-2">
          1. Rincian Persentase Keberhasilan 6 Layanan Utama
        </h4>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1.5 text-center w-8">No</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-left">Layanan Utama</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-left">Pilar PRIME</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-left">Data Terukur</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-left w-28">Capaian (%)</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, idx) => (
              <tr key={mod.id}>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{idx + 1}</td>
                <td className="border border-slate-300 px-2.5 py-1.5">
                  <div className="font-bold text-slate-900">{mod.name}</div>
                  <div className="text-[10px] text-slate-500">{mod.formulaNote}</div>
                </td>
                <td className="border border-slate-300 px-2.5 py-1.5 text-[11px] text-slate-700">{mod.primePillar}</td>
                <td className="border border-slate-300 px-2.5 py-1.5 text-[11px] text-slate-700">{mod.numeratorLabel}</td>
                <td className="border border-slate-300 px-2.5 py-1.5">
                  <div className="font-extrabold text-slate-900 text-xs tabular-nums mb-1">{mod.percentage.toFixed(1)}%</div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, mod.percentage))}%`,
                        backgroundColor: getBarHex(mod.percentage)
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-2">
          2. Pemetaan Integrasi Karakter Sekolah PRIME
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {primePillars.map((pillar) => {
            const pStatus = !hasAnyData
              ? 'Menunggu Data'
              : pillar.score >= 90
                ? 'Sangat Baik'
                : pillar.score >= 75
                  ? 'Baik'
                  : pillar.score >= 60
                    ? 'Cukup'
                    : 'Perlu Penguatan';
            const pHex = !hasAnyData ? '#64748b' : getBarHex(pillar.score);
            return (
              <div key={pillar.code} className="border border-slate-300 rounded-lg p-3 bg-white avoid-break">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {pillar.code}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{pillar.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{pillar.modulesLabel}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-slate-900 tabular-nums leading-none">{pillar.score.toFixed(1)}%</p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: pHex }}>{pStatus}</p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, pillar.score))}%`, backgroundColor: pHex }}
                  />
                </div>
                <p className="text-[10px] text-slate-600 leading-snug">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="border border-slate-300 rounded-xl p-4 bg-slate-50 avoid-break overflow-hidden"
        style={{ borderLeftWidth: '5px', borderLeftColor: compositeColorHex }}
      >
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
          3. Kesimpulan & Rekomendasi Otomatis
        </h4>
        <p className="text-xs text-slate-800 leading-relaxed break-words text-justify">
          {conclusionPlainText}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-6 avoid-break">
        <p className="text-[10px] text-slate-500">
          Dokumen dihasilkan otomatis dari Sistem SIAP SPANJU · UPT SMP Negeri 7 Pasuruan
        </p>

        <div className="text-center text-xs text-slate-900 min-w-[220px] sm:ml-auto">
          <p>Pasuruan, {tanggalCetakText}</p>
          <p>Mengetahui,</p>
          <p className="font-bold">Kepala SMP Negeri 7 Pasuruan</p>
          <div className="h-16" />
          <p className="font-bold underline">NUR FADILAH, S.Pd</p>
          <p className="text-[11px] text-slate-600">NIP. 19860410 201001 2 030</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
    {/* Printable sheet when printing directly from main view (when modal is closed) */}
    {!isPrintPreviewOpen && modules.length > 0 && (
      <div className="hidden print:block">{printableReportNode}</div>
    )}

    <section
      aria-label="Tolak Ukur Analisis Keberhasilan SIAP SPANJU SRA dan Karakter PRIME"
      className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden print:hidden"
    >
      {/* Top Bar */}
      <div className="px-5 py-5 md:px-8 md:py-6 border-b border-slate-200 flex flex-col gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Tolak Ukur Analisis Keberhasilan · Sekolah Ramah Anak (SRA) × Karakter PRIME
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-display">
              Analisis Keberhasilan Penggunaan SIAP SPANJU
            </h3>
          </div>
          <p className="text-xs md:text-sm text-slate-600 max-w-4xl">
            Evaluasi terintegrasi pembentukan Sekolah Ramah Anak berlandaskan Karakter Sekolah{' '}
            <span className="font-bold text-slate-800">
              PRIME (Prefentif, Religius, Mentalitas, dan Empan Papan / Sadar Diri)
            </span>{' '}
            yang dihitung otomatis dari 6 layanan utama.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Toggle */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope('all_periode')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  scope === 'all_periode'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sepanjang Periode
              </button>
              <button
                type="button"
                onClick={() => setScope('this_month')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  scope === 'this_month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setScope('today')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  scope === 'today'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hari Ini
              </button>
            </div>

            {/* Periode Selector */}
            <select
              aria-label="Pilih Periode Analisis"
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 whitespace-nowrap"
            >
              {availablePeriodes.map((p) => (
                <option key={p} value={p}>
                  Periode {p}
                </option>
              ))}
              <option value="ALL">Semua Periode</option>
            </select>

            <button
              type="button"
              onClick={() => fetchAnalysis(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors whitespace-nowrap disabled:opacity-60"
              title="Perbarui data analisis"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintPreviewOpen(true)}
              disabled={modules.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors whitespace-nowrap shadow-xs disabled:opacity-50"
              title="Buka Pratinjau Cetak Laporan A4"
            >
              <Printer size={14} />
              <span>Cetak / Pratinjau</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={modules.length === 0 || isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors whitespace-nowrap shadow-xs disabled:opacity-50"
              title="Unduh langsung hasil analisis sebagai file PDF"
            >
              <FileText size={14} />
              <span>{isGeneratingPdf ? 'Menyimpan...' : 'Simpan PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={modules.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors whitespace-nowrap shadow-xs disabled:opacity-50"
              title="Unduh hasil analisis ke file Excel (.xlsx)"
            >
              <Download size={14} />
              <span>Simpan Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors whitespace-nowrap"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Ringkas' : 'Detail'}</span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2">
            <span>{actionNotice}</span>
            <button type="button" onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Composite Benchmark Hero */}
      <div className="px-6 py-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b border-slate-200 bg-slate-50/40">
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-baseline gap-3">
            {loading && modules.length === 0 ? (
              <div className="h-12 w-36 bg-slate-200 animate-pulse rounded-lg" />
            ) : (
              <span className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 tabular-nums font-display">
                {compositePercentage.toFixed(1)}%
              </span>
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Indeks Gabungan SRA × PRIME
            </span>
          </div>

          <p className={`text-sm font-extrabold ${predicate.textClass}`}>{predicate.label}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{predicate.sublabel}</p>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Capaian Gabungan 6 Modul Layanan</span>
              <span className="font-mono tabular-nums font-bold text-slate-800">
                {moduleSum.toFixed(1)}% / 600% = {compositePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${predicate.barClass}`}
                style={{ width: `${Math.min(100, Math.max(0, compositePercentage))}%` }}
              />
            </div>
          </div>

          {/* Transparent Formula Box */}
          <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-1.5">
            <p className="font-bold text-slate-800">
              Rumus Tolak Ukur Analisis (Otomatis dari 6 Layanan Utama):
            </p>
            <p className="font-mono text-[11px] md:text-xs text-slate-700 leading-relaxed tabular-nums">
              ((% Survey + % Si-Telat + % Izin Siswa + % Keagamaan + % UKS/Kesehatan + % Disiplin Siswa) ÷ 600) × 100%
            </p>
            {modules.length === 6 && (
              <p className="font-mono text-[11px] text-slate-900 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 tabular-nums">
                ({modules.map((m) => `${m.percentage.toFixed(1)}%`).join(' + ')}) ÷ 600 × 100% ={' '}
                <span className="font-black">{compositePercentage.toFixed(1)}%</span>
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-500">
              <span>
                Ambang batas: ≥90% Sangat Berhasil · 75–89.9% Berhasil · 60–74.9% Cukup · &lt;60% Pembinaan
              </span>
              <span className="tabular-nums">
                {totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} siswa terdata` : ''}
                {lastUpdated ? ` · Sinkron otomatis ${lastUpdated}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs font-medium text-amber-800 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Detailed Analysis Body */}
      {isExpanded && (
        <div className="divide-y divide-slate-200">
          {/* 1. Breakdown 6 Modul */}
          <div className="p-6 md:px-8 md:py-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                1. Rincian Persentase Keberhasilan 6 Layanan Utama
              </h4>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Klik modul untuk membuka dashboard layanan
              </span>
            </div>

            {loading && modules.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="bg-white p-4 space-y-2.5">
                    <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
                    <div className="h-6 w-1/3 bg-slate-100 animate-pulse rounded" />
                    <div className="h-2 w-full bg-slate-100 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {modules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => onNavigate?.(mod.id)}
                      className="bg-white hover:bg-slate-50/90 transition-colors p-4 text-left flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon size={16} className={`${mod.accentColor} shrink-0`} />
                          <span className="text-sm font-bold text-slate-800 truncate">
                            {mod.name}
                          </span>
                        </div>
                        <ArrowUpRight
                          size={15}
                          className="text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-2xl font-black text-slate-900 tabular-nums">
                            {mod.percentage.toFixed(1)}%
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 truncate">
                            Pilar: {mod.primePillar}
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${mod.barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, mod.percentage))}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                        <span className="tabular-nums truncate">{mod.numeratorLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Integrasi Karakter Sekolah PRIME */}
          <div className="p-6 md:px-8 md:py-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                2. Pemetaan Integrasi Karakter Sekolah PRIME dalam Sekolah Ramah Anak
              </h4>
              <span className="text-xs text-slate-500">
                Prefentif · Religius · Mentalitas · Empan Papan / Sadar Diri
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {primePillars.map((pillar) => {
                const statusLabel =
                  !hasAnyData
                    ? 'Menunggu Data'
                    : pillar.score >= 90
                      ? 'Sangat Baik'
                      : pillar.score >= 75
                        ? 'Baik'
                        : pillar.score >= 60
                          ? 'Cukup'
                          : 'Perlu Penguatan';
                const statusColor =
                  !hasAnyData
                    ? 'text-slate-500'
                    : pillar.score >= 90
                      ? 'text-emerald-700'
                      : pillar.score >= 75
                        ? 'text-blue-700'
                        : pillar.score >= 60
                          ? 'text-amber-700'
                          : 'text-rose-700';

                return (
                  <div key={pillar.code} className="bg-white p-4 md:p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                          {pillar.code}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 truncate">
                            {pillar.title}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 truncate">
                            {pillar.modulesLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black text-slate-900 tabular-nums leading-none">
                          {pillar.score.toFixed(1)}%
                        </p>
                        <p className={`text-[11px] font-bold mt-1 ${statusColor}`}>{statusLabel}</p>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pillar.score >= 90
                            ? 'bg-emerald-600'
                            : pillar.score >= 75
                              ? 'bg-blue-600'
                              : pillar.score >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pillar.score))}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Kesimpulan & Rekomendasi Otomatis */}
          <div className="px-6 py-5 md:px-8 bg-slate-50/70 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-4xl">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                {compositePercentage >= 75 ? (
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                ) : (
                  <Sparkles size={15} className="text-amber-600 shrink-0" />
                )}
                <span>Kesimpulan Analisis Sekolah Ramah Anak & Karakter PRIME</span>
              </div>

              {!hasAnyData ? (
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  Belum terdapat data layanan yang cukup pada periode terpilih. Silakan mulai mencatat
                  kehadiran, keterlambatan, kegiatan keagamaan, kunjungan UKS, pembinaan disiplin, serta
                  mengajak warga sekolah mengisi Survey Kepuasan Layanan agar indeks SRA × PRIME dapat
                  terhitung otomatis.
                </p>
              ) : (
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                  Dengan capaian gabungan{' '}
                  <strong className="tabular-nums text-slate-900">
                    {compositePercentage.toFixed(1)}%
                  </strong>{' '}
                  ({predicate.label}), sinergi aplikasi SIAP SPANJU menunjukkan kontribusi paling kuat
                  pada dimensi{' '}
                  <strong className="text-slate-900">
                    {strongestPrime.code} ({strongestPrime.title}: {strongestPrime.score.toFixed(1)}%)
                  </strong>{' '}
                  dan layanan{' '}
                  <strong className="text-slate-900">
                    {strongestModule?.name} ({strongestModule?.percentage.toFixed(1)}%)
                  </strong>
                  .{' '}
                  {modulesNeedAttention.length > 0 ? (
                    <>
                      Aspek yang masih perlu penguatan terarah adalah{' '}
                      <strong className="text-rose-700">
                        {modulesNeedAttention
                          .map((m) => `${m.shortLabel} (${m.percentage.toFixed(1)}%)`)
                          .join(', ')}
                      </strong>{' '}
                      melalui pendampingan wali kelas, guru BK, dan pembiasaan karakter PRIME agar iklim
                      Sekolah Ramah Anak merata di seluruh layanan.
                    </>
                  ) : (
                    <>
                      Seluruh keenam layanan berada pada kategori optimal (≥75%), menandakan ekosistem
                      Sekolah Ramah Anak berbasis karakter PRIME berjalan seimbang — perlu dijaga
                      konsistensinya pada layanan dengan skor terendah relatif (
                      <strong className="text-slate-900">
                        {weakestModule?.shortLabel}: {weakestModule?.percentage.toFixed(1)}%
                      </strong>
                      ).
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>

    {/* Print Preview & Export Modal */}
    {isPrintPreviewOpen && (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-start p-3 md:p-6 overflow-y-auto">
        <div className="w-full max-w-[860px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
          <div className="px-4 py-3 md:px-6 md:py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print print:hidden">
            <div>
              <h4 className="text-sm font-black text-slate-900">Pratinjau Cetak & Simpan Laporan A4</h4>
              <p className="text-[11px] text-slate-500">Pilih Cetak untuk ke printer, atau Simpan PDF / Excel untuk mengunduh berkas langsung.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerBrowserPrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors"
              >
                <Printer size={14} />
                <span>Cetak</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors disabled:opacity-50"
              >
                <FileText size={14} />
                <span>{isGeneratingPdf ? 'Menyimpan...' : 'Simpan PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors"
              >
                <Download size={14} />
                <span>Simpan Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
              >
                <X size={14} />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-100/60 p-2 md:p-4 overflow-y-auto max-h-[80vh] print:max-h-none print:p-0 print:bg-white print:overflow-visible">
            <div className="shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white print:shadow-none print:border-none print:rounded-none">
              {printableReportNode}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
