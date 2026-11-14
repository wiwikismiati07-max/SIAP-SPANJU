import React, { useState, useEffect, useCallback } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
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

interface CachedAnalysis {
  periode: string;
  scope: 'all_periode' | 'this_month';
  modules: Omit<ModuleMetric, 'icon'>[];
  totalSiswa: number;
  updatedAt: string;
}

const CACHE_KEY = 'local_sra_prime_analysis_cache_v1';

const normalizePeriode = (p: any, fallback = '2026'): string => {
  const raw = String(p || fallback).replace(/^Periode\s*/i, '').trim();
  return raw || fallback;
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
  const [scope, setScope] = useState<'all_periode' | 'this_month'>('all_periode');
  const [modules, setModules] = useState<ModuleMetric[]>([]);
  const [totalSiswa, setTotalSiswa] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          setLoading(false);
        }
      }
    } catch {
      // ignore cache errors
    }
  }, [selectedPeriode, scope]);

  const fetchAnalysis = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading((prev) => (modules.length === 0 ? true : prev));
      setErrorMsg(null);

      const client = getSupabase();
      if (!client) {
        setErrorMsg('Koneksi Supabase belum tersedia.');
        setLoading(false);
        setRefreshing(false);
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
          const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
          const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
          const dateRange =
            scope === 'this_month'
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
            scope === 'this_month'
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

          const timestamp = format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale });
          return { computedModules, distinctPeriodes, siswaCount, timestamp };
        };

        const result = await Promise.race([loadLogic(), timeoutPromise]);
        if ('isTimeout' in result) {
          setErrorMsg('Sinkronisasi data memerlukan waktu lebih lama. Menampilkan data tersimpan jika ada.');
        } else {
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
        setErrorMsg('Sebagian data belum dapat dimuat dari server.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedPeriode, scope]
  );

  useEffect(() => {
    fetchAnalysis(false);
  }, [fetchAnalysis]);

  const moduleSum = modules.reduce((acc, m) => acc + m.percentage, 0);
  const hasAnyData = modules.some((m) => m.hasData);
  const compositePercentage = modules.length > 0 ? moduleSum / modules.length : 0;
  const predicate = getPredicate(compositePercentage, hasAnyData);

  const getModPct = (id: string) => modules.find((m) => m.id === id)?.percentage ?? 0;

  // Karakter Sekolah PRIME dimensions mapped to live module percentages
  const primePillars = [
    {
      code: 'P',
      title: 'Prefentif',
      modulesLabel: 'Si-Telat · Izin Siswa · Disiplin Siswa',
      score: modules.length > 0 ? (getModPct('sitelat') + getModPct('izinsiswa') + getModPct('disiplinsiswa')) / 3 : 0,
      description:
        'Deteksi dini dan pencegahan keterlambatan, ketidakhadiran tanpa kejelasan, serta pelanggaran ringan sebelum berkembang lebih jauh.'
    },
    {
      code: 'R',
      title: 'Religius',
      modulesLabel: 'Keagamaan (SIM-AGAMA)',
      score: modules.length > 0 ? getModPct('keagamaan') : 0,
      description:
        'Pembiasaan ibadah harian, penguatan akhlak mulia, dan pemantauan partisipasi kegiatan keagamaan secara konsisten dan humanis.'
    },
    {
      code: 'M',
      title: 'Mentalitas',
      modulesLabel: 'Disiplin Siswa · Survey Kepuasan Layanan',
      score: modules.length > 0 ? (getModPct('disiplinsiswa') + getModPct('survey')) / 2 : 0,
      description:
        'Pembinaan karakter positif, ketangguhan mental dalam menaati tata tertib, dan keterbukaan suara warga sekolah tanpa rasa takut.'
    },
    {
      code: 'E',
      title: 'Empan Papan / Sadar Diri',
      modulesLabel: 'UKS / Kesehatan · Izin Siswa · Survey Kepuasan',
      score: modules.length > 0 ? (getModPct('uks') + getModPct('izinsiswa') + getModPct('survey')) / 3 : 0,
      description:
        'Kesadaran diri menjaga kesehatan fisik, ketertiban menempatkan hak dan kewajiban (perizinan), serta kepedulian terhadap lingkungan belajar aman.'
    }
  ];

  // Dynamic conclusion derived from real live figures
  const sortedByScore = [...modules].sort((a, b) => b.percentage - a.percentage);
  const strongestModule = sortedByScore[0];
  const weakestModule = sortedByScore[sortedByScore.length - 1];
  const sortedPrime = [...primePillars].sort((a, b) => b.score - a.score);
  const strongestPrime = sortedPrime[0];
  const modulesNeedAttention = modules.filter((m) => m.percentage < 75);

  return (
    <section
      aria-label="Tolak Ukur Analisis Keberhasilan SIAP SPANJU SRA dan Karakter PRIME"
      className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden"
    >
      {/* Top Bar */}
      <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Tolak Ukur Analisis Keberhasilan · Sekolah Ramah Anak (SRA) × Karakter PRIME
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-display">
              Analisis Keberhasilan Penggunaan SIAP SPANJU
            </h3>
          </div>
          <p className="text-xs md:text-sm text-slate-600 max-w-3xl">
            Evaluasi terintegrasi pembentukan Sekolah Ramah Anak berlandaskan Karakter Sekolah{' '}
            <span className="font-bold text-slate-800">
              PRIME (Prefentif, Religius, Mentalitas, dan Empan Papan / Sadar Diri)
            </span>{' '}
            dari 6 layanan utama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            title="Perbarui data analisis"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors whitespace-nowrap shrink-0"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Ringkas' : 'Detail'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
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
          <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-1">
            <p className="font-bold text-slate-800">
              Rumus Tolak Ukur Analisis:
            </p>
            <p className="font-mono text-[11px] md:text-xs text-slate-700 leading-relaxed tabular-nums">
              ((% Survey + % Si-Telat + % Izin Siswa + % Keagamaan + % UKS/Kesehatan + % Disiplin Siswa) ÷ 600) × 100%
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
              <span>
                Ambang batas: ≥90% Sangat Berhasil · 75–89.9% Berhasil · 60–74.9% Cukup · &lt;60% Pembinaan
              </span>
              <span className="tabular-nums">
                {totalSiswa > 0 ? `${totalSiswa.toLocaleString('id-ID')} siswa terdata` : ''}
                {lastUpdated ? ` · Diperbarui ${lastUpdated}` : ''}
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
  );
}
