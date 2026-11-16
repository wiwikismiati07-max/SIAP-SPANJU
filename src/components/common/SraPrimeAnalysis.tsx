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

const getMetricBadge = (pct: number, hasData: boolean) => {
  if (!hasData) {
    return {
      label: 'Menunggu Data',
      hex: '#64748b',
      textClass: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }
  if (pct >= 90) {
    return {
      label: 'Sangat Baik',
      hex: '#059669',
      textClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  if (pct >= 75) {
    return {
      label: 'Baik',
      hex: '#2563eb',
      textClass: 'text-blue-700',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  }
  if (pct >= 60) {
    return {
      label: 'Cukup',
      hex: '#d97706',
      textClass: 'text-amber-700',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }
  return {
    label: 'Perlu Penguatan',
    hex: '#e11d48',
    textClass: 'text-rose-700',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
  };
};

const getShortPredicateStatus = (pct: number, hasAnyData: boolean): string => {
  if (!hasAnyData) return 'Menunggu Data';
  if (pct >= 90) return 'Sangat Berhasil (Unggul)';
  if (pct >= 75) return 'Berhasil (SRA Optimal)';
  if (pct >= 60) return 'Cukup (Perlu Penguatan)';
  return 'Perlu Pembinaan Terpadu';
};

const getModuleActionText = (id: string): string => {
  switch (id) {
    case 'izinsiswa':
      return 'Penertiban sistem absensi dan verifikasi administrasi perizinan secara terstruktur agar ketidakhadiran tervalidasi optimal.';
    case 'sitelat':
      return 'Penguatan kedisiplinan hadir tepat waktu melalui program monitoring preventif pagi hari dan pendampingan wali kelas.';
    case 'keagamaan':
      return 'Peningkatan konsistensi pencatatan ibadah harian dan pembiasaan spiritual bersama guru pembina.';
    case 'uks':
      return 'Edukasi pola hidup bersih dan sehat serta optimalisasi layanan kesehatan preventif di UKS.';
    case 'disiplinsiswa':
      return 'Penguatan pembinaan karakter restoratif serta pendampingan intensif siswa oleh wali kelas dan guru BK.';
    case 'survey':
      return 'Peningkatan sosialisasi pengisian survey kepuasan layanan dan tindak lanjut umpan balik warga sekolah.';
    default:
      return 'Penguatan koordinasi layanan dan pendampingan berkala bersama wali kelas serta tim terkait.';
  }
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
    shortStatusLabel,
    primePillars,
    strongestModule,
    weakestModule,
    strongestPrime,
    modulesNeedAttention,
    sortedModulesDesc,
    sortedPillarsDesc,
    section1Narrative,
    evaluationSummaryText,
    actionPlanItems
  } = useMemo(() => {
    const sum = modules.reduce((acc, m) => acc + m.percentage, 0);
    const anyData = modules.some((m) => m.hasData);
    const composite = modules.length > 0 ? sum / modules.length : 0;
    const pred = getPredicate(composite, anyData);
    const shortStat = getShortPredicateStatus(composite, anyData);

    const getPct = (id: string) => modules.find((m) => m.id === id)?.percentage ?? 0;

    const pillars = [
      {
        code: 'P',
        title: 'Prefentif',
        modulesLabel: 'Si-Telat, Izin Siswa, Disiplin Siswa',
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
        modulesLabel: 'Disiplin Siswa, Survey Kepuasan',
        score: modules.length > 0 ? (getPct('disiplinsiswa') + getPct('survey')) / 2 : 0,
        description:
          'Pembinaan karakter positif, ketangguhan mental dalam menaati tata tertib, dan keterbukaan suara warga sekolah tanpa rasa takut.'
      },
      {
        code: 'E',
        title: 'Empan Papan / Sadar Diri',
        modulesLabel: 'UKS / Kesehatan, Izin Siswa, Survey',
        score: modules.length > 0 ? (getPct('uks') + getPct('izinsiswa') + getPct('survey')) / 3 : 0,
        description:
          'Kesadaran diri menjaga kesehatan fisik, ketertiban menempatkan hak dan kewajiban (perizinan), serta kepedulian terhadap lingkungan belajar aman.'
      }
    ];

    const sortedMods = [...modules].sort((a, b) => b.percentage - a.percentage);
    const sortedP = [...pillars].sort((a, b) => b.score - a.score);
    const needAttention = modules.filter((m) => m.percentage < 75).sort((a, b) => a.percentage - b.percentage);
    const topMods = sortedMods.filter((m) => m.percentage >= 75);

    const formulaInline =
      '((% Survey + % Si-Telat + % Izin + % Keagamaan + % UKS + % Disiplin) / 600) × 100%';

    let s1Narrative = `Indeks gabungan dihitung berdasarkan formula akumulasi 6 modul layanan utama: ${formulaInline} = ${composite.toFixed(1)}%. `;
    if (!anyData) {
      s1Narrative += 'Data operasional dari masing-masing modul akan terakumulasi otomatis setelah transaksi tercatat.';
    } else if (topMods.length > 0 && needAttention.length > 0) {
      const topLabels = topMods.slice(0, 2).map((m) => m.shortLabel.toLowerCase()).join(' dan ');
      const focusLabels = needAttention.slice(0, 2).map((m) => m.shortLabel.toLowerCase()).join(' dan ');
      s1Narrative += `Hasil pengukuran menunjukkan efektivitas tinggi pada aspek ${topLabels}, namun memerlukan atensi khusus pada aspek ${focusLabels}.`;
    } else if (needAttention.length === 0 && anyData) {
      s1Narrative += 'Seluruh keenam layanan berada pada kategori optimal (≥75%) dengan performa merata di seluruh modul.';
    } else {
      s1Narrative += 'Perlu penguatan intensif lintas modul agar standar pelayanan Sekolah Ramah Anak tercapai optimal.';
    }

    let evalText = '';
    const planItems: Array<{ title: string; text: string }> = [];

    if (!anyData) {
      evalText =
        'Belum terdapat data layanan yang cukup pada periode terpilih. Silakan mulai mencatat kehadiran, keterlambatan, kegiatan keagamaan, kunjungan UKS, pembinaan disiplin, serta mengisi Survey Kepuasan Layanan agar indeks SRA × PRIME dapat terhitung otomatis.';
      planItems.push({
        title: 'Kolaborasi Terpadu',
        text: 'Memaksimalkan peran Wali Kelas, Guru BK, dan Satgas Ramah Anak dalam memulai pencatatan rutin di setiap layanan SIAP SPANJU.'
      });
    } else {
      const topServiceHighlights = topMods
        .slice(0, 3)
        .map((m) => `${m.name} (${m.percentage.toFixed(1)}%)`);
      const topPrime = sortedP[0];
      evalText = `Secara keseluruhan, integrasi SIAP SPANJU menghasilkan Indeks Gabungan SRA × PRIME sebesar ${composite.toFixed(1)}% dengan kategori "${shortStat}". Sinergi sistem memberikan dampak paling unggul pada dimensi ${topPrime?.title} (${topPrime?.score.toFixed(1)}%)`;
      if (topServiceHighlights.length > 0) {
        evalText += ` serta kinerja optimal pada modul ${topServiceHighlights.join(', ')}.`;
      } else {
        evalText += ` dengan layanan tertinggi saat ini pada ${sortedMods[0]?.name} (${sortedMods[0]?.percentage.toFixed(1)}%).`;
      }

      if (needAttention.length > 0) {
        needAttention.forEach((m) => {
          planItems.push({
            title: `${m.shortLabel} (${m.percentage.toFixed(1)}%)`,
            text: getModuleActionText(m.id)
          });
        });
      } else if (sortedMods[sortedMods.length - 1]) {
        const lowest = sortedMods[sortedMods.length - 1];
        planItems.push({
          title: `Pemeliharaan Konsistensi ${lowest.shortLabel} (${lowest.percentage.toFixed(1)}%)`,
          text: `Seluruh layanan telah mencapai kategori optimal (≥75%). Pertahankan stabilitas dan monitoring berkala terutama pada layanan ${lowest.name}.`
        });
      }

      planItems.push({
        title: 'Kolaborasi Terpadu',
        text: 'Memaksimalkan peran Wali Kelas, Guru BK, dan Satgas Ramah Anak dalam membudayakan karakter PRIME secara merata di seluruh jenjang.'
      });
    }

    return {
      moduleSum: sum,
      hasAnyData: anyData,
      compositePercentage: composite,
      predicate: pred,
      shortStatusLabel: shortStat,
      primePillars: pillars,
      strongestModule: sortedMods[0],
      weakestModule: sortedMods[sortedMods.length - 1],
      strongestPrime: sortedP[0],
      modulesNeedAttention: needAttention,
      sortedModulesDesc: sortedMods,
      sortedPillarsDesc: sortedP,
      section1Narrative: s1Narrative,
      evaluationSummaryText: evalText,
      actionPlanItems: planItems
    };
  }, [modules]);

  const conclusionPlainText = useMemo(() => {
    const bullets = actionPlanItems.map((item) => `• ${item.title}: ${item.text}`).join(' ');
    return `A. Evaluasi Keberhasilan: ${evaluationSummaryText} B. Area Prioritas Penguatan & Rencana Aksi: ${bullets}`;
  }, [evaluationSummaryText, actionPlanItems]);

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

      const summaryRows: Array<{ Keterangan: string; Nilai: string | number }> = [
        { Keterangan: 'Judul Laporan', Nilai: 'Ringkasan Eksekutif Analisis Keberhasilan SIAP SPANJU (SRA × Karakter PRIME)' },
        { Keterangan: 'Sekolah', Nilai: 'UPT SMP Negeri 7 Pasuruan' },
        { Keterangan: 'Periode Analisis', Nilai: periodeText },
        { Keterangan: 'Cakupan Waktu', Nilai: scopeText },
        { Keterangan: 'Total Siswa Terdata', Nilai: totalSiswa },
        { Keterangan: 'Indeks Gabungan SRA × PRIME', Nilai: `${compositePercentage.toFixed(1)}%` },
        { Keterangan: 'Total Capaian 6 Modul', Nilai: `${moduleSum.toFixed(1)}% / 600%` },
        { Keterangan: 'Predikat Keberhasilan', Nilai: predicate.label },
        { Keterangan: 'Pilar Tertinggi', Nilai: strongestPrime ? `${strongestPrime.title} (${strongestPrime.score.toFixed(1)}%)` : '-' },
        { Keterangan: 'Layanan Teratas', Nilai: strongestModule ? `${strongestModule.shortLabel} (${strongestModule.percentage.toFixed(1)}%)` : '-' },
        { Keterangan: 'Rumus Perhitungan', Nilai: '((% Survey + % Si-Telat + % Izin Siswa + % Keagamaan + % UKS/Kesehatan + % Disiplin Siswa) / 600) × 100%' },
        { Keterangan: 'Hasil Perhitungan', Nilai: formulaValues },
        { Keterangan: 'Sinkronisasi Terakhir', Nilai: lastUpdated || '-' },
        { Keterangan: 'Tanggal Ekspor', Nilai: printedAt },
        { Keterangan: '', Nilai: '' },
        { Keterangan: 'A. Evaluasi Keberhasilan', Nilai: evaluationSummaryText },
        ...actionPlanItems.map((item, i) => ({
          Keterangan: i === 0 ? `B. Rencana Aksi - ${item.title}` : `Rencana Aksi - ${item.title}`,
          Nilai: item.text
        })),
        { Keterangan: '', Nilai: '' },
        { Keterangan: 'Mengetahui', Nilai: 'Kepala SMP Negeri 7 Pasuruan' },
        { Keterangan: 'Nama Kepala Sekolah', Nilai: 'NUR FADILAH, S.Pd' },
        { Keterangan: 'NIP', Nilai: '19860410 201001 2 030' }
      ];

      const moduleRows = modules.map((m, index) => ({
        No: index + 1,
        'Layanan Utama': m.name,
        'Capaian (%)': Number(m.percentage.toFixed(1)),
        Predikat: getMetricBadge(m.percentage, m.hasData).label,
        'Pilar Karakter PRIME': m.primePillar,
        'Data Terukur': m.numeratorLabel,
        'Rumus Layanan': m.formulaNote
      }));

      const primeRows = primePillars.map((p) => ({
        Kode: p.code,
        'Pilar Karakter PRIME': p.title,
        'Layanan Pendukung': p.modulesLabel,
        'Capaian (%)': Number(p.score.toFixed(1)),
        Predikat: getMetricBadge(p.score, hasAnyData).label,
        Deskripsi: p.description
      }));

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsModules = XLSX.utils.json_to_sheet(moduleRows);
      const wsPrime = XLSX.utils.json_to_sheet(primeRows);

      wsSummary['!cols'] = [{ wch: 32 }, { wch: 90 }];
      wsModules['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 36 }, { wch: 38 }];
      wsPrime['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 38 }, { wch: 14 }, { wch: 18 }, { wch: 70 }];

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');
      XLSX.utils.book_append_sheet(wb, wsModules, 'Rincian 6 Layanan');
      XLSX.utils.book_append_sheet(wb, wsPrime, 'Pilar Karakter PRIME');

      const safePeriode = selectedPeriode === 'ALL' ? 'Semua_Periode' : `Periode_${selectedPeriode}`;
      const dateStamp = format(new Date(), 'yyyyMMdd_HHmm');
      const fileName = `Ringkasan_Eksekutif_SIAP_SPANJU_${safePeriode}_${dateStamp}.xlsx`;
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
      const contentW = pageW - margin * 2; // 186mm
      const navy: [number, number, number] = [30, 58, 95]; // #1e3a5f
      const teal: [number, number, number] = [13, 148, 136]; // #0d9488
      let y = 8;

      // ========== HALAMAN 1 ==========
      // Kop Surat
      if (kopImageRef.current) {
        const { dataUrl, width, height } = kopImageRef.current;
        const kopH = Math.min(28, (contentW * height) / width);
        doc.addImage(dataUrl, 'PNG', margin, y, contentW, kopH);
        y += kopH + 3;
      }

      // Header Executive Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('RINGKASAN EKSEKUTIF ANALISIS KEBERHASILAN SIAP SPANJU', pageW / 2, y + 3.5, { align: 'center' });
      y += 6.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text(
        `Integrasi Sekolah Ramah Anak (SRA) + Karakter PRIME (${periodeText} · ${scopeText})`,
        pageW / 2,
        y + 1,
        { align: 'center' }
      );
      y += 4;

      // 4-Card KPI Strip (framed)
      const stripH = 17.5;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(teal[0], teal[1], teal[2]);
      doc.setLineWidth(0.35);
      doc.rect(margin, y, contentW, stripH, 'FD');

      const kpis = [
        {
          value: `${compositePercentage.toFixed(1)}%`,
          label: 'INDEKS SRA × PRIME',
          sub: `Status: ${shortStatusLabel}`
        },
        {
          value: `${totalSiswa > 0 ? totalSiswa.toLocaleString('id-ID') : '0'} Siswa`,
          label: 'CAKUPAN DATA',
          sub: `Sinkron: ${(lastUpdated || waktuCetak).slice(0, 17)}`
        },
        {
          value: `${moduleSum.toFixed(1)}% / 600%`,
          label: 'TOTAL CAPAIAN 6 MODUL',
          sub: 'Rata-rata 6 Layanan Terpadu'
        },
        {
          value: strongestPrime ? `${strongestPrime.title.split(' ')[0]} (${strongestPrime.score.toFixed(1)}%)` : '-',
          label: 'PILAR TERTINGGI',
          sub: strongestModule
            ? `${strongestModule.shortLabel} (${strongestModule.percentage.toFixed(1)}%)`
            : '-'
        }
      ];

      const kpiW = contentW / 4;
      kpis.forEach((k, idx) => {
        const kx = margin + idx * kpiW;
        if (idx > 0) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.25);
          doc.line(kx, y + 1.5, kx, y + stripH - 1.5);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(idx === 3 ? 9.8 : 11.5);
        doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.text(k.value, kx + kpiW / 2, y + 6.5, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, kx + kpiW / 2, y + 10.6, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        const subLines = doc.splitTextToSize(k.sub, kpiW - 4);
        doc.text(subLines[0], kx + kpiW / 2, y + 14.8, { align: 'center' });
      });
      y += stripH + 5;

      // Section 1 Header & Narrative
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('1. Capaian Keberhasilan 6 Layanan Utama SIAP SPANJU', margin, y);
      y += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(51, 65, 85);
      const s1Lines = doc.splitTextToSize(section1Narrative, contentW);
      doc.text(s1Lines, margin, y);
      y += s1Lines.length * 3.4 + 2;

      // Section 1 Table (Navy Header)
      const cols1 = [9, 54, 38, 55, 30]; // 186mm
      const headers1 = ['No', 'Layanan Utama', 'Pilar PRIME', 'Data Terukur', 'Capaian'];
      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.rect(margin, y, contentW, 6.8, 'F');
      let cx = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(255, 255, 255);
      headers1.forEach((h, idx) => {
        if (idx === 0 || idx === 4) {
          doc.text(h, cx + cols1[idx] / 2, y + 4.5, { align: 'center' });
        } else {
          doc.text(h, cx + 2.2, y + 4.5);
        }
        cx += cols1[idx];
      });
      y += 6.8;

      modules.forEach((m, idx) => {
        const rowH = 10.2;
        doc.setFillColor(idx % 2 === 1 ? 248 : 255, idx % 2 === 1 ? 250 : 255, idx % 2 === 1 ? 252 : 255);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(margin, y, contentW, rowH, 'FD');

        let rx = margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(15, 23, 42);
        doc.text(String(idx + 1), rx + cols1[0] / 2, y + 5.8, { align: 'center' });
        doc.line(rx + cols1[0], y, rx + cols1[0], y + rowH);
        rx += cols1[0];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        doc.text(doc.splitTextToSize(m.name, cols1[1] - 4)[0], rx + 2.2, y + 4.2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.1);
        doc.setTextColor(100, 116, 139);
        doc.text(doc.splitTextToSize(m.formulaNote, cols1[1] - 4)[0], rx + 2.2, y + 8.0);
        doc.line(rx + cols1[1], y, rx + cols1[1], y + rowH);
        rx += cols1[1];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(51, 65, 85);
        doc.text(doc.splitTextToSize(m.primePillar, cols1[2] - 4).slice(0, 2), rx + 2.2, y + 4.4);
        doc.line(rx + cols1[2], y, rx + cols1[2], y + rowH);
        rx += cols1[2];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.text(doc.splitTextToSize(m.numeratorLabel, cols1[3] - 4).slice(0, 2), rx + 2.2, y + 4.4);
        doc.line(rx + cols1[3], y, rx + cols1[3], y + rowH);
        rx += cols1[3];

        const badge = getMetricBadge(m.percentage, m.hasData);
        const [br, bg, bb] = getBarRgb(m.percentage);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.6);
        doc.setTextColor(15, 23, 42);
        doc.text(`${m.percentage.toFixed(1)}%`, rx + cols1[4] / 2, y + 4.3, { align: 'center' });
        doc.setFontSize(6.3);
        doc.setTextColor(br, bg, bb);
        doc.text(badge.label, rx + cols1[4] / 2, y + 8.1, { align: 'center' });

        y += rowH;
      });
      y += 5;

      // Grafik 1: Horizontal Bar Chart (6 Modul Layanan)
      const g1LabelW = 46;
      const g1RightPad = 14;
      const g1PlotX = margin + g1LabelW;
      const g1PlotW = contentW - g1LabelW - g1RightPad;
      const g1RowH = 6.8;
      const g1ChartH = sortedModulesDesc.length * g1RowH;

      // Axis vertical gridlines
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      [0, 20, 40, 60, 80, 100].forEach((tick) => {
        const tx = g1PlotX + (g1PlotW * tick) / 100;
        doc.line(tx, y, tx, y + g1ChartH);
      });

      sortedModulesDesc.forEach((m, idx) => {
        const ry = y + idx * g1RowH;
        const [mr, mg, mb] = getBarRgb(m.percentage);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(30, 41, 59);
        doc.text(m.shortLabel, g1PlotX - 2.5, ry + 4.2, { align: 'right' });

        const bw = Math.max(1.5, (g1PlotW * Math.min(100, Math.max(0, m.percentage))) / 100);
        doc.setFillColor(mr, mg, mb);
        doc.roundedRect(g1PlotX, ry + 1.1, bw, 4.2, 0.7, 0.7, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(`${m.percentage.toFixed(1)}%`, g1PlotX + bw + 1.8, ry + 4.2);
      });

      y += g1ChartH;
      // Bottom axis baseline & ticks
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(g1PlotX, y, g1PlotX + g1PlotW, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      [0, 20, 40, 60, 80, 100].forEach((tick) => {
        const tx = g1PlotX + (g1PlotW * tick) / 100;
        doc.text(String(tick), tx, y + 3.2, { align: 'center' });
      });
      y += 6.2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(71, 85, 105);
      doc.text('Persentase Capaian (%)', g1PlotX + g1PlotW / 2, y, { align: 'center' });
      y += 3.8;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Grafik 1: Distribusi Persentase Capaian 6 Modul Layanan SIAP SPANJU ${periodeText}`,
        pageW / 2,
        y,
        { align: 'center' }
      );

      // Page 1 footer
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(margin, 283, pageW - margin, 283);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Dokumen analisis resmi Sekolah Ramah Anak (SRA) × Karakter PRIME', margin, 287);
      doc.text('Halaman 1 dari 2', pageW - margin, 287, { align: 'right' });

      // ========== HALAMAN 2 ==========
      doc.addPage();
      y = 11;

      // Mini running header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `UPT SMP NEGERI 7 PASURUAN — SISTEM SIAP SPANJU (${periodeText.toUpperCase()})`,
        margin,
        y
      );
      doc.text('RINGKASAN EKSEKUTIF', pageW - margin, y, { align: 'right' });
      y += 2;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      // Section 2 Header & Intro
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('2. Pemetaan Integrasi Karakter Sekolah PRIME', margin, y);
      y += 3.8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(51, 65, 85);
      const s2Intro = doc.splitTextToSize(
        'Aplikasi SIAP SPANJU mengintegrasikan pembentukan karakter sekolah melalui akronim PRIME (Prefentif, Religius, Mentalitas, Empan Papan / Sadar Diri). Evaluasi setiap pilar diperoleh melalui agregasi kinerja modul terkait:',
        contentW
      );
      doc.text(s2Intro, margin, y);
      y += s2Intro.length * 3.4 + 2;

      // Section 2 Table (Navy Header)
      const cols2 = [34, 18, 22, 42, 70]; // 186mm
      const headers2 = [
        'Pilar Karakter',
        'Capaian',
        'Predikat',
        'Modul Terkait',
        'Fokus & Deskripsi Pembinaan Karakter'
      ];
      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.rect(margin, y, contentW, 6.8, 'F');
      cx = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.0);
      doc.setTextColor(255, 255, 255);
      headers2.forEach((h, idx) => {
        if (idx === 1 || idx === 2) {
          doc.text(h, cx + cols2[idx] / 2, y + 4.5, { align: 'center' });
        } else {
          doc.text(h, cx + 2.2, y + 4.5);
        }
        cx += cols2[idx];
      });
      y += 6.8;

      primePillars.forEach((p, idx) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.6);
        const descLines = doc.splitTextToSize(p.description, cols2[4] - 4);
        const rowH = Math.max(12, descLines.length * 3.2 + 4.2);

        doc.setFillColor(idx % 2 === 1 ? 248 : 255, idx % 2 === 1 ? 250 : 255, idx % 2 === 1 ? 252 : 255);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(margin, y, contentW, rowH, 'FD');

        let rx = margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        const pillarTitle = `${p.code} - ${p.title}`;
        doc.text(doc.splitTextToSize(pillarTitle, cols2[0] - 4), rx + 2.2, y + 5.2);
        doc.line(rx + cols2[0], y, rx + cols2[0], y + rowH);
        rx += cols2[0];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${p.score.toFixed(1)}%`, rx + cols2[1] / 2, y + rowH / 2 + 1, { align: 'center' });
        doc.line(rx + cols2[1], y, rx + cols2[1], y + rowH);
        rx += cols2[1];

        const pBadge = getMetricBadge(p.score, hasAnyData);
        const [pr, pg, pb] = !hasAnyData ? [100, 116, 139] : getBarRgb(p.score);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(pr, pg, pb);
        doc.text(pBadge.label, rx + cols2[2] / 2, y + rowH / 2 + 1, { align: 'center' });
        doc.line(rx + cols2[2], y, rx + cols2[2], y + rowH);
        rx += cols2[2];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.6);
        doc.setTextColor(51, 65, 85);
        doc.text(doc.splitTextToSize(p.modulesLabel, cols2[3] - 4), rx + 2.2, y + 5.2);
        doc.line(rx + cols2[3], y, rx + cols2[3], y + rowH);
        rx += cols2[3];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.6);
        doc.setTextColor(71, 85, 105);
        doc.text(descLines, rx + 2.2, y + 4.4);

        y += rowH;
      });
      y += 6;

      // Grafik 2: Horizontal Bar Chart (4 Pilar PRIME)
      const g2LabelW = 46;
      const g2RightPad = 24;
      const g2PlotX = margin + g2LabelW;
      const g2PlotW = contentW - g2LabelW - g2RightPad;
      const g2RowH = 7.2;
      const g2ChartH = sortedPillarsDesc.length * g2RowH;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      [0, 20, 40, 60, 80, 100].forEach((tick) => {
        const tx = g2PlotX + (g2PlotW * tick) / 100;
        doc.line(tx, y, tx, y + g2ChartH);
      });

      sortedPillarsDesc.forEach((p, idx) => {
        const ry = y + idx * g2RowH;
        const [pr, pg, pb] = !hasAnyData ? [100, 116, 139] : getBarRgb(p.score);
        const pStatus = getMetricBadge(p.score, hasAnyData).label;
        const shortPTitle = `${p.title.split(' / ')[0]} (${p.code})`;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(30, 41, 59);
        doc.text(shortPTitle, g2PlotX - 2.5, ry + 4.4, { align: 'right' });

        const bw = Math.max(1.5, (g2PlotW * Math.min(100, Math.max(0, p.score))) / 100);
        doc.setFillColor(pr, pg, pb);
        doc.roundedRect(g2PlotX, ry + 1.2, bw, 4.4, 0.7, 0.7, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(15, 23, 42);
        doc.text(`${p.score.toFixed(1)}% (${pStatus})`, g2PlotX + bw + 1.8, ry + 4.4);
      });

      y += g2ChartH;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(g2PlotX, y, g2PlotX + g2PlotW, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      [0, 20, 40, 60, 80, 100].forEach((tick) => {
        const tx = g2PlotX + (g2PlotW * tick) / 100;
        doc.text(String(tick), tx, y + 3.2, { align: 'center' });
      });
      y += 6.2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(71, 85, 105);
      doc.text('Indeks Pilar Karakter PRIME (%)', g2PlotX + g2PlotW / 2, y, { align: 'center' });
      y += 3.8;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Grafik 2: Skor Capaian Empat Pilar Karakter Sekolah PRIME ${periodeText}`,
        pageW / 2,
        y,
        { align: 'center' }
      );
      y += 6;

      // Section 3: Kesimpulan Analisis & Rekomendasi Tindak Lanjut (Boxed A & B)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('3. Kesimpulan Analisis & Rekomendasi Tindak Lanjut', margin, y);
      y += 3.2;

      // Pre-calculate exact heights AFTER setting font & size!
      const innerPadX = 4.5;
      const innerTextW = contentW - innerPadX * 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      const evalLines = doc.splitTextToSize(evaluationSummaryText, innerTextW);
      const bulletWrapped = actionPlanItems.map((item) => {
        const fullBullet = `• ${item.title}: ${item.text}`;
        return doc.splitTextToSize(fullBullet, innerTextW - 1.5);
      });

      const lineH = 3.6;
      const totalBulletLines = bulletWrapped.reduce((acc, arr) => acc + arr.length, 0);
      const boxH =
        5 + // top pad
        4 + // "A. Evaluasi Keberhasilan:"
        evalLines.length * lineH +
        3.5 + // gap before B
        4 + // "B. Area Prioritas Penguatan & Rencana Aksi:"
        totalBulletLines * lineH +
        bulletWrapped.length * 1.0 +
        4; // bottom pad

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(navy[0], navy[1], navy[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, y, contentW, boxH, 1.5, 1.5, 'FD');

      let by = y + 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('A. Evaluasi Keberhasilan:', margin + innerPadX, by);
      by += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(30, 41, 59);
      doc.text(evalLines, margin + innerPadX, by);
      by += evalLines.length * lineH + 3;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('B. Area Prioritas Penguatan & Rencana Aksi:', margin + innerPadX, by);
      by += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(30, 41, 59);
      bulletWrapped.forEach((lines) => {
        doc.text(lines, margin + innerPadX + 1.5, by);
        by += lines.length * lineH + 1.0;
      });

      y += boxH + 6;

      // Footer Note & Official Signature
      if (y + 34 > 280) {
        y = Math.min(y, 244);
      }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.0);
      doc.setTextColor(100, 116, 139);
      doc.text('Dokumen dihasilkan secara resmi oleh', margin, y + 3);
      doc.text('Sistem Informasi SIAP SPANJU', margin, y + 6.5);
      doc.text('UPT SMP Negeri 7 Pasuruan', margin, y + 10);

      const sigCenterX = pageW - margin - 34;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.0);
      doc.setTextColor(15, 23, 42);
      doc.text(`Pasuruan, ${tanggalCetak}`, sigCenterX, y + 2, { align: 'center' });
      doc.text('Mengetahui,', sigCenterX, y + 6, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text('Kepala SMP Negeri 7 Pasuruan', sigCenterX, y + 10, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.text('NUR FADILAH, S.Pd', sigCenterX, y + 25.5, { align: 'center' });
      const nameW = doc.getTextWidth('NUR FADILAH, S.Pd');
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.3);
      doc.line(sigCenterX - nameW / 2, y + 26.3, sigCenterX + nameW / 2, y + 26.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(71, 85, 105);
      doc.text('NIP. 19860410 201001 2 030', sigCenterX, y + 30, { align: 'center' });

      // Page 2 bottom footer
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(margin, 283, pageW - margin, 283);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Dokumen analisis resmi Sekolah Ramah Anak (SRA) × Karakter PRIME', margin, 287);
      doc.text('Halaman 2 dari 2', pageW - margin, 287, { align: 'right' });

      const safePeriode = selectedPeriode === 'ALL' ? 'Semua_Periode' : `Periode_${selectedPeriode}`;
      const dateStamp = format(new Date(), 'yyyyMMdd_HHmm');
      const fileName = `Ringkasan_Eksekutif_SIAP_SPANJU_${safePeriode}_${dateStamp}.pdf`;
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

  const printableReportNode = (
    <div id="printable-full-report" className="bg-white text-slate-900 p-5 md:p-7 max-w-[820px] mx-auto space-y-5">
      <div className="w-full">
        <img
          src="/assets/aistudio/kop_surat_spanju_e20dffe4.png"
          alt="Kop Surat UPT SMP Negeri 7 Pasuruan"
          className="w-full h-auto object-contain block"
        />
      </div>

      {/* Executive Summary Title */}
      <div className="text-center space-y-1">
        <h2 className="text-base md:text-lg font-black uppercase tracking-wide text-[#1e3a5f]">
          RINGKASAN EKSEKUTIF ANALISIS KEBERHASILAN SIAP SPANJU
        </h2>
        <p className="text-[11px] font-bold text-teal-700">
          Integrasi Sekolah Ramah Anak (SRA) + Karakter PRIME (Prefentif, Religius, Mentalitas, Empan Papan) · {periodeLabelText} ({scopeLabelText})
        </p>
      </div>

      {/* 4-Card KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-2 border-teal-600/80 rounded-sm overflow-hidden bg-slate-50/40 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 avoid-break">
        <div className="p-3 text-center space-y-0.5">
          <p className="text-xl font-black text-[#1e3a5f] tabular-nums">{compositePercentage.toFixed(1)}%</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">INDEKS SRA × PRIME</p>
          <p className="text-[10px] text-slate-700 font-medium">Status: {shortStatusLabel}</p>
        </div>
        <div className="p-3 text-center space-y-0.5">
          <p className="text-xl font-black text-[#1e3a5f] tabular-nums">
            {totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} Siswa` : '0 Siswa'}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">CAKUPAN DATA</p>
          <p className="text-[10px] text-slate-600 truncate">Sinkronisasi: {lastUpdated || tanggalCetakText}</p>
        </div>
        <div className="p-3 text-center space-y-0.5">
          <p className="text-xl font-black text-[#1e3a5f] tabular-nums">{moduleSum.toFixed(1)}% / 600%</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">TOTAL CAPAIAN 6 MODUL</p>
          <p className="text-[10px] text-slate-600">Rata-rata 6 Layanan Terpadu</p>
        </div>
        <div className="p-3 text-center space-y-0.5">
          <p className="text-base sm:text-lg font-black text-[#1e3a5f] leading-tight">
            {strongestPrime ? `${strongestPrime.title.split(' / ')[0]} (${strongestPrime.score.toFixed(1)}%)` : '-'}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">PILAR TERTINGGI</p>
          <p className="text-[10px] text-slate-600">
            {strongestModule ? `${strongestModule.shortLabel} Teratas (${strongestModule.percentage.toFixed(1)}%)` : '-'}
          </p>
        </div>
      </div>

      {/* Section 1: 6 Layanan Utama */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-black text-[#1e3a5f]">
          1. Capaian Keberhasilan 6 Layanan Utama SIAP SPANJU
        </h3>
        <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
          {section1Narrative}
        </p>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="border border-slate-300 px-2 py-2 text-center w-9">No</th>
              <th className="border border-slate-300 px-2.5 py-2 text-left">Layanan Utama</th>
              <th className="border border-slate-300 px-2.5 py-2 text-left">Pilar PRIME</th>
              <th className="border border-slate-300 px-2.5 py-2 text-left">Data Terukur</th>
              <th className="border border-slate-300 px-2.5 py-2 text-center w-28">Capaian</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, idx) => {
              const badge = getMetricBadge(mod.percentage, mod.hasData);
              return (
                <tr key={mod.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5">
                    <div className="font-bold text-slate-900">{mod.name}</div>
                    <div className="text-[10px] text-slate-500">{mod.formulaNote}</div>
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-[11px] text-slate-700">{mod.primePillar}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-[11px] text-slate-700">{mod.numeratorLabel}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center">
                    <div className="font-extrabold text-slate-900 text-xs tabular-nums">{mod.percentage.toFixed(1)}%</div>
                    <div className="text-[10px] font-bold" style={{ color: badge.hex }}>{badge.label}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Grafik 1 Horizontal Bar Chart */}
        <div className="pt-2 space-y-2 avoid-break">
          <div className="space-y-1.5">
            {sortedModulesDesc.map((mod) => (
              <div key={mod.id} className="grid grid-cols-12 items-center gap-2 text-[11px]">
                <div className="col-span-4 text-right font-semibold text-slate-700 truncate">
                  {mod.shortLabel}
                </div>
                <div className="col-span-8 flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 h-4 rounded-xs relative overflow-hidden border border-slate-200/70">
                    <div
                      className="h-full rounded-r-xs"
                      style={{
                        width: `${Math.min(100, Math.max(0, mod.percentage))}%`,
                        backgroundColor: getBarHex(mod.percentage)
                      }}
                    />
                  </div>
                  <span className="w-12 font-extrabold text-slate-900 tabular-nums text-[11px]">
                    {mod.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4" />
            <div className="col-span-8 pr-14">
              <div className="flex justify-between text-[9px] text-slate-500 border-t border-slate-300 pt-1 tabular-nums">
                <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
              </div>
              <p className="text-center text-[10px] font-bold text-slate-600 mt-0.5">Persentase Capaian (%)</p>
            </div>
          </div>
          <p className="text-center text-[10px] italic text-slate-500">
            Grafik 1: Distribusi Persentase Capaian 6 Modul Layanan SIAP SPANJU {periodeLabelText}
          </p>
        </div>
      </div>

      {/* Section 2: Pemetaan Integrasi Karakter Sekolah PRIME */}
      <div className="space-y-2.5 avoid-break">
        <h3 className="text-sm font-black text-[#1e3a5f]">
          2. Pemetaan Integrasi Karakter Sekolah PRIME
        </h3>
        <p className="text-[11px] text-slate-700 leading-relaxed">
          Aplikasi SIAP SPANJU mengintegrasikan pembentukan karakter sekolah melalui akronim <strong>PRIME</strong> (Prefentif, Religius, Mentalitas, Empan Papan / Sadar Diri). Evaluasi setiap pilar diperoleh melalui agregasi kinerja modul terkait:
        </p>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="border border-slate-300 px-2.5 py-2 text-left w-36">Pilar Karakter</th>
              <th className="border border-slate-300 px-2 py-2 text-center w-20">Capaian</th>
              <th className="border border-slate-300 px-2 py-2 text-center w-24">Predikat</th>
              <th className="border border-slate-300 px-2.5 py-2 text-left w-40">Modul Terkait</th>
              <th className="border border-slate-300 px-2.5 py-2 text-left">Fokus &amp; Deskripsi Pembinaan Karakter</th>
            </tr>
          </thead>
          <tbody>
            {primePillars.map((pillar, idx) => {
              const pBadge = getMetricBadge(pillar.score, hasAnyData);
              return (
                <tr key={pillar.code} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="border border-slate-300 px-2.5 py-2 font-bold text-slate-900">
                    {pillar.code} - {pillar.title}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-extrabold text-slate-900 tabular-nums">
                    {pillar.score.toFixed(1)}%
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-bold" style={{ color: pBadge.hex }}>
                    {pBadge.label}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 text-[11px] text-slate-700">{pillar.modulesLabel}</td>
                  <td className="border border-slate-300 px-2.5 py-2 text-[11px] text-slate-600 leading-snug">{pillar.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Grafik 2 Horizontal Bar Chart */}
        <div className="pt-2 space-y-2 avoid-break">
          <div className="space-y-1.5">
            {sortedPillarsDesc.map((pillar) => {
              const pBadge = getMetricBadge(pillar.score, hasAnyData);
              return (
                <div key={pillar.code} className="grid grid-cols-12 items-center gap-2 text-[11px]">
                  <div className="col-span-4 text-right font-semibold text-slate-700 truncate">
                    {pillar.title.split(' / ')[0]} ({pillar.code})
                  </div>
                  <div className="col-span-8 flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 h-4 rounded-xs relative overflow-hidden border border-slate-200/70">
                      <div
                        className="h-full rounded-r-xs"
                        style={{
                          width: `${Math.min(100, Math.max(0, pillar.score))}%`,
                          backgroundColor: !hasAnyData ? '#64748b' : getBarHex(pillar.score)
                        }}
                      />
                    </div>
                    <span className="w-28 font-extrabold text-slate-900 tabular-nums text-[10px] whitespace-nowrap">
                      {pillar.score.toFixed(1)}% ({pBadge.label})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4" />
            <div className="col-span-8 pr-28">
              <div className="flex justify-between text-[9px] text-slate-500 border-t border-slate-300 pt-1 tabular-nums">
                <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
              </div>
              <p className="text-center text-[10px] font-bold text-slate-600 mt-0.5">Indeks Pilar Karakter PRIME (%)</p>
            </div>
          </div>
          <p className="text-center text-[10px] italic text-slate-500">
            Grafik 2: Skor Capaian Empat Pilar Karakter Sekolah PRIME {periodeLabelText}
          </p>
        </div>
      </div>

      {/* Section 3: Kesimpulan Analisis & Rekomendasi Tindak Lanjut */}
      <div className="space-y-2 avoid-break">
        <h3 className="text-sm font-black text-[#1e3a5f]">
          3. Kesimpulan Analisis &amp; Rekomendasi Tindak Lanjut
        </h3>
        <div className="border border-[#1e3a5f] rounded-md p-4 bg-slate-50/70 space-y-3 text-xs text-slate-800">
          <div className="space-y-1">
            <p className="font-extrabold text-[#1e3a5f]">A. Evaluasi Keberhasilan:</p>
            <p className="leading-relaxed text-justify">{evaluationSummaryText}</p>
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-[#1e3a5f]">B. Area Prioritas Penguatan &amp; Rencana Aksi:</p>
            <ul className="space-y-1 list-disc pl-5">
              {actionPlanItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  <strong>{item.title}:</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-6 avoid-break">
        <div className="text-[10px] italic text-slate-500 space-y-0.5">
          <p>Dokumen dihasilkan secara resmi oleh</p>
          <p>Sistem Informasi SIAP SPANJU · UPT SMP Negeri 7 Pasuruan</p>
        </div>

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

      {/* Ringkasan Eksekutif 4-Card KPI Strip */}
      <div className="px-6 pt-5 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-2 border-teal-600/75 rounded-2xl overflow-hidden bg-slate-50/40 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-4 text-center space-y-1">
            <p className="text-2xl font-black text-[#1e3a5f] tabular-nums">{compositePercentage.toFixed(1)}%</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">INDEKS SRA × PRIME</p>
            <p className="text-xs font-semibold text-slate-700">Status: {shortStatusLabel}</p>
          </div>
          <div className="p-4 text-center space-y-1">
            <p className="text-2xl font-black text-[#1e3a5f] tabular-nums">
              {totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} Siswa` : '0 Siswa'}
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">CAKUPAN DATA</p>
            <p className="text-xs text-slate-600 truncate">Sinkronisasi: {lastUpdated || tanggalCetakText}</p>
          </div>
          <div className="p-4 text-center space-y-1">
            <p className="text-2xl font-black text-[#1e3a5f] tabular-nums">{moduleSum.toFixed(1)}% / 600%</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">TOTAL CAPAIAN 6 MODUL</p>
            <p className="text-xs text-slate-600">Rata-rata 6 Layanan Terpadu</p>
          </div>
          <div className="p-4 text-center space-y-1">
            <p className="text-lg md:text-xl font-black text-[#1e3a5f] leading-tight">
              {strongestPrime ? `${strongestPrime.title.split(' / ')[0]} (${strongestPrime.score.toFixed(1)}%)` : '-'}
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">PILAR TERTINGGI</p>
            <p className="text-xs text-slate-600 truncate">
              {strongestModule ? `${strongestModule.shortLabel} Teratas (${strongestModule.percentage.toFixed(1)}%)` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Composite Benchmark Hero */}
      <div className="px-6 py-5 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b border-slate-200 bg-slate-50/40">
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
          {/* 1. Breakdown 6 Modul + Grafik 1 */}
          <div className="p-6 md:px-8 md:py-6 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1e3a5f]">
                  1. Capaian Keberhasilan 6 Layanan Utama SIAP SPANJU
                </h4>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Klik modul untuk membuka dashboard layanan
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{section1Narrative}</p>
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {modules.map((mod) => {
                    const Icon = mod.icon;
                    const badge = getMetricBadge(mod.percentage, mod.hasData);
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
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-slate-900 tabular-nums">
                                {mod.percentage.toFixed(1)}%
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.badgeClass}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, Math.max(0, mod.percentage))}%`,
                                backgroundColor: getBarHex(mod.percentage)
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 text-[11px] text-slate-500 pt-0.5">
                          <span className="tabular-nums truncate font-medium text-slate-600">{mod.numeratorLabel}</span>
                          <span className="truncate text-[10px]">Pilar PRIME: {mod.primePillar}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Grafik 1 Horizontal Bar Chart */}
                <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-[#1e3a5f]">
                      Grafik 1: Distribusi Persentase Capaian 6 Modul Layanan ({periodeLabelText})
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" /> ≥90% Sangat Baik</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-blue-600" /> 75–89.9% Baik</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> 60–74.9% Cukup</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-rose-600" /> &lt;60% Penguatan</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {sortedModulesDesc.map((mod) => (
                      <div key={mod.id} className="grid grid-cols-12 items-center gap-3 text-xs">
                        <div className="col-span-5 sm:col-span-4 text-right font-semibold text-slate-700 truncate">
                          {mod.shortLabel}
                        </div>
                        <div className="col-span-7 sm:col-span-8 flex items-center gap-2.5">
                          <div className="flex-1 bg-white h-5 rounded border border-slate-200 overflow-hidden">
                            <div
                              className="h-full transition-all duration-500 rounded-r"
                              style={{
                                width: `${Math.min(100, Math.max(0, mod.percentage))}%`,
                                backgroundColor: getBarHex(mod.percentage)
                              }}
                            />
                          </div>
                          <span className="w-12 font-extrabold text-slate-900 tabular-nums text-xs">
                            {mod.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5 sm:col-span-4" />
                    <div className="col-span-7 sm:col-span-8 pr-14">
                      <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-300 pt-1 tabular-nums">
                        <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Integrasi Karakter Sekolah PRIME + Grafik 2 */}
          <div className="p-6 md:px-8 md:py-6 space-y-5">
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1e3a5f]">
                  2. Pemetaan Integrasi Karakter Sekolah PRIME
                </h4>
                <span className="text-xs text-slate-500">
                  Prefentif · Religius · Mentalitas · Empan Papan / Sadar Diri
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikasi SIAP SPANJU mengintegrasikan pembentukan karakter sekolah melalui akronim PRIME. Evaluasi setiap pilar diperoleh melalui agregasi kinerja modul terkait:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {primePillars.map((pillar) => {
                const badge = getMetricBadge(pillar.score, hasAnyData);
                return (
                  <div key={pillar.code} className="bg-white p-4 md:p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#1e3a5f] text-white text-xs font-black flex items-center justify-center shrink-0">
                          {pillar.code}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 truncate">
                            {pillar.title}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 truncate">
                            Modul Terkait: {pillar.modulesLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black text-slate-900 tabular-nums leading-none">
                          {pillar.score.toFixed(1)}%
                        </p>
                        <p className={`text-[11px] font-bold mt-1 ${badge.textClass}`}>{badge.label}</p>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, pillar.score))}%`,
                          backgroundColor: !hasAnyData ? '#64748b' : getBarHex(pillar.score)
                        }}
                      />
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Grafik 2 Horizontal Bar Chart */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
              <p className="text-xs font-extrabold text-[#1e3a5f]">
                Grafik 2: Skor Capaian Empat Pilar Karakter Sekolah PRIME ({periodeLabelText})
              </p>
              <div className="space-y-2">
                {sortedPillarsDesc.map((pillar) => {
                  const badge = getMetricBadge(pillar.score, hasAnyData);
                  return (
                    <div key={pillar.code} className="grid grid-cols-12 items-center gap-3 text-xs">
                      <div className="col-span-5 sm:col-span-4 text-right font-semibold text-slate-700 truncate">
                        {pillar.title.split(' / ')[0]} ({pillar.code})
                      </div>
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2.5">
                        <div className="flex-1 bg-white h-5 rounded border border-slate-200 overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-r"
                            style={{
                              width: `${Math.min(100, Math.max(0, pillar.score))}%`,
                              backgroundColor: !hasAnyData ? '#64748b' : getBarHex(pillar.score)
                            }}
                          />
                        </div>
                        <span className="w-32 font-extrabold text-slate-900 tabular-nums text-[11px] whitespace-nowrap">
                          {pillar.score.toFixed(1)}% ({badge.label})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5 sm:col-span-4" />
                <div className="col-span-7 sm:col-span-8 pr-32">
                  <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-300 pt-1 tabular-nums">
                    <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Kesimpulan Analisis & Rekomendasi Tindak Lanjut */}
          <div className="px-6 py-6 md:px-8 bg-slate-50/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#1e3a5f]">
              {compositePercentage >= 75 ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <Sparkles size={16} className="text-amber-600 shrink-0" />
              )}
              <span>3. Kesimpulan Analisis &amp; Rekomendasi Tindak Lanjut</span>
            </div>

            <div className="border border-[#1e3a5f]/30 rounded-2xl bg-white p-5 space-y-4 shadow-xs">
              <div className="space-y-1">
                <h5 className="text-xs font-extrabold text-[#1e3a5f]">A. Evaluasi Keberhasilan:</h5>
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed text-justify">
                  {evaluationSummaryText}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <h5 className="text-xs font-extrabold text-[#1e3a5f]">
                  B. Area Prioritas Penguatan &amp; Rencana Aksi:
                </h5>
                <ul className="space-y-1.5 list-disc pl-5 text-xs md:text-sm text-slate-700">
                  {actionPlanItems.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <strong className="text-slate-900">{item.title}:</strong> {item.text}
                    </li>
                  ))}
                </ul>
              </div>
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
