import React from 'react';
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
    </div>
  );
};
