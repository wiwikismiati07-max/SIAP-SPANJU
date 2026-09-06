import React, { useState } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { JurnalPembelajaran } from '../../types/jurnalpembelajaran';

interface JurnalDashboardProps {
  jurnalList: JurnalPembelajaran[];
  onNavigateTab: (tab: 'input' | 'laporan') => void;
  onViewDetail: (jurnal: JurnalPembelajaran) => void;
}

export const JurnalDashboard: React.FC<JurnalDashboardProps> = ({ 
  jurnalList, 
  onNavigateTab,
  onViewDetail 
}) => {
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [sqlPassword, setSqlPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

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
  // Total Sesi
  const totalSesi = jurnalList.length;

  // Calculate overall attendance
  let grandTotalSiswa = 0;
  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;
  let totalCatatanTindakan = 0;

  jurnalList.forEach(j => {
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

  // Recent 5 entries
  const recentJurnal = jurnalList.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-6 md:p-10 text-white shadow-xl shadow-amber-500/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider text-amber-100">
            <BookOpen size={14} /> JURNAL PEMBELAJARAN GURU SMPN 7 PASURUAN
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
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Sesi mengajar tersimpan</p>
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

      {/* RECENT JURNAL LIST */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800">Aktivitas Jurnal Terkini</h3>
            <p className="text-xs text-slate-400 font-medium">5 sesi pembelajaran terakhir yang tercatat</p>
          </div>
          <button
            onClick={() => onNavigateTab('laporan')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            Lihat Semua <ArrowRight size={14} />
          </button>
        </div>

        {recentJurnal.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <BookOpen size={40} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Belum ada jurnal pembelajaran</p>
            <p className="text-xs text-slate-400">Klik "Isi Jurnal Baru" untuk memulai pencatatan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJurnal.map((item) => {
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
                          {item.jam_ke}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Materi: <span className="font-semibold text-slate-800">{item.materi}</span>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>Guru: {item.nama_guru}</span>
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
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Eye size={14} /> Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
