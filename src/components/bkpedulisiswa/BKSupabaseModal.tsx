import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, CheckCircle2, AlertTriangle, RefreshCw, X, Code, ExternalLink, ShieldCheck } from 'lucide-react';
import { sabdaService } from '../../lib/sabdaBkService';
import { getStoredSupabaseConfig } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BKSupabaseModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({});
  const [allExist, setAllExist] = useState(false);

  const config = getStoredSupabaseConfig();

  const tablesMeta = [
    { name: 'bk_agenda_kerja', label: 'Form A: Agenda Kerja BK', desc: 'Pencatatan agenda harian bimbingan dan konseling' },
    { name: 'bk_undangan_ortu', label: 'Form B: Undangan Orang Tua', desc: 'Surat pemanggilan resmi orang tua siswa' },
    { name: 'bk_home_visit', label: 'Form C: Home Visit', desc: 'Laporan dan berita acara kunjungan rumah' },
    { name: 'bk_transaksi_kasus', label: 'Form D: Rekam Kasus Siswa', desc: 'Pencatatan kasus dan skor pelanggaran tata tertib' },
    { name: 'bk_konseling_individual', label: 'Form E: Konseling Individual', desc: 'RPL dan rekam proses konseling per siswa' },
    { name: 'bk_konseling_kelompok', label: 'Form F: Konseling Kelompok', desc: 'Perencanaan dan dinamika konseling kelompok' },
    { name: 'bk_surat_pernyataan', label: 'Form G: Surat Pernyataan', desc: 'Surat perjanjian komitmen bermaterai' },
    { name: 'bk_konferensi_kasus', label: 'Form H: Konferensi Kasus', desc: 'Berita acara musyawarah penanganan kasus terpadu' },
    { name: 'bk_siswa_ats', label: 'Form I: Siswa ATS', desc: 'Pendataan dan penanganan anak rentan putus sekolah' }
  ];

  const handleCheckTables = async () => {
    setChecking(true);
    try {
      const res = await sabdaService.checkTables();
      setTableStatus(res.tables);
      setAllExist(res.allExist);
    } catch (e) {
      console.warn('Check tables error:', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleCheckTables();
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sabdaService.sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200">
              <Database size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Penyimpanan Database Supabase & Kode SQL SABDA BK
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Sinkronisasi cloud untuk Form A sampai Form I UPT SMPN 7 Pasuruan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 py-5 space-y-6 pr-1">
          {/* Connection Status Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                ENDPOINT PROYEK SUPABASE
              </div>
              <div className="text-sm font-bold text-slate-800 break-all">
                {config.url || 'https://ltfwkunozemldjivnqfq.supabase.co'}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>REST API Client Terhubung</span>
              </div>
            </div>

            <button
              onClick={handleCheckTables}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs shrink-0 transition-colors"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin text-blue-600' : ''} />
              <span>{checking ? 'Memeriksa...' : 'Cek Status Tabel'}</span>
            </button>
          </div>

          {/* Table Status List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-slate-800 text-sm">
                Status 9 Tabel Layanan BK di Supabase:
              </h4>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                allExist ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {allExist ? 'Semua Tabel Siap' : 'Perlu Eksekusi SQL'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tablesMeta.map((t) => {
                const isReady = tableStatus[t.name] ?? false;
                return (
                  <div
                    key={t.name}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      isReady ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 truncate">{t.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{t.name}</div>
                    </div>
                    {isReady ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                        <Check size={12} /> Aktif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
                        Perlu Dibuat
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-800 text-xs leading-relaxed space-y-2">
            <div className="font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Code size={15} />
              <span>Cara Menjalankan Skrip SQL di Dashboard Supabase:</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 font-medium text-slate-700">
              <li>Klik tombol <strong>"Salin Skrip SQL Lengkap"</strong> di bawah ini.</li>
              <li>Buka dashboard proyek Supabase Anda dan masuk ke menu <strong>SQL Editor</strong>.</li>
              <li>Klik <strong>New query</strong>, lalu <strong>Paste (Tempel)</strong> seluruh kode SQL.</li>
              <li>Klik tombol hijau <strong>Run</strong> di Supabase. Selesai! Seluruh tabel akan dibuat otomatis dengan RLS aktif.</li>
            </ol>
          </div>

          {/* SQL Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Kode Skrip SQL Lengkap (PostgreSQL DDL):</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Kode SQL'}</span>
              </button>
            </div>
            <div className="relative rounded-2xl border border-slate-800 bg-slate-900 p-4 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
              <pre>{sabdaService.sqlSchema}</pre>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0 gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Tutup
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Berhasil Tersalin!' : 'Salin Skrip SQL Lengkap'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
