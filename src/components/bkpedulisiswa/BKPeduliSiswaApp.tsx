import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Mail, 
  Home, 
  AlertCircle, 
  User, 
  Users, 
  LayoutDashboard, 
  FileText, 
  Database, 
  Search, 
  Menu, 
  X, 
  LogOut, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  Briefcase,
  UserX,
  GraduationCap
} from 'lucide-react';
import BKAgendaKerja from './BKAgendaKerja';
import BKUndanganOrtu from './BKUndanganOrtu';
import BKHomeVisit from './BKHomeVisit';
import BKTransaksiKasus from './BKTransaksiKasus';
import BKKonselingIndividual from './BKKonselingIndividual';
import BKKonselingKelompok from './BKKonselingKelompok';
import BKSuratPernyataan from './BKSuratPernyataan';
import BKKonferensiKasus from './BKKonferensiKasus';
import BKSiswaATS from './BKSiswaATS';
import BKManagementSiswa from './BKManagementSiswa';
import BKDashboard from './BKDashboard';
import BKLaporan from './BKLaporan';
import BKMasterKasus from './BKMasterKasus';
import BKSupabaseModal from './BKSupabaseModal';
import { sabdaService } from '../../lib/sabdaBkService';
import { supabase } from '../../lib/supabase';

type TabKey = 
  | 'form_a' 
  | 'form_b' 
  | 'form_c' 
  | 'form_d' 
  | 'form_e' 
  | 'form_f' 
  | 'form_g'
  | 'form_h'
  | 'form_i'
  | 'dashboard' 
  | 'laporan' 
  | 'master_siswa'
  | 'master';

interface MenuItem {
  id: TabKey;
  label: string;
  badge?: string;
  countKey?: 'agenda' | 'undangan' | 'homeVisit' | 'kasus' | 'konselingInd' | 'konselingKel' | 'pernyataan' | 'konferensi' | 'ats' | 'siswa';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: 'LAYANAN UTAMA' | 'BIMBINGAN & KONSELING' | 'ADMINISTRASI TAMBAHAN' | 'DATA MASTER';
  adminOnly?: boolean;
}

export default function BKPeduliSiswaApp({ onBack, onOpenSidebar, user }: { onBack?: () => void, onOpenSidebar?: () => void, user?: any }) {
  const [activeTab, setActiveTab] = useState<TabKey>('form_a');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [counts, setCounts] = useState<{
    agenda: number;
    undangan: number;
    homeVisit: number;
    kasus: number;
    konselingInd: number;
    konselingKel: number;
    pernyataan: number;
    konferensi: number;
    ats: number;
    siswa: number;
  }>({
    agenda: 3,
    undangan: 2,
    homeVisit: 1,
    kasus: 0,
    konselingInd: 1,
    konselingKel: 1,
    pernyataan: 1,
    konferensi: 1,
    ats: 1,
    siswa: 8,
  });

  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  const isAdmin = user?.role === 'full';

  // Fetch counts for badges
  useEffect(() => {
    async function fetchCounts() {
      try {
        const [agendas, undangans, visits, ind, kel, pernyataans, konfs, atss] = await Promise.all([
          sabdaService.getAgenda().catch(() => []),
          sabdaService.getUndangan().catch(() => []),
          sabdaService.getHomeVisit().catch(() => []),
          sabdaService.getKonselingIndividual().catch(() => []),
          sabdaService.getKonselingKelompok().catch(() => []),
          sabdaService.getPernyataan().catch(() => []),
          sabdaService.getKonferensi().catch(() => []),
          sabdaService.getATS().catch(() => [])
        ]);

        let kasusCount = 0;
        try {
          const { count } = await supabase.from('bk_transaksi_kasus').select('*', { count: 'exact', head: true });
          kasusCount = count || 0;
        } catch {
          const local = localStorage.getItem('bk_transaksi_kasus');
          if (local) {
            kasusCount = JSON.parse(local).length;
          }
        }

        let siswaCount = 8;
        try {
          const { count } = await supabase.from('master_siswa').select('*', { count: 'exact', head: true }).neq('periode', '2025');
          if (typeof count === 'number' && count > 0) {
            siswaCount = count;
          }
        } catch {
          const localS = localStorage.getItem('master_siswa');
          if (localS) {
            siswaCount = JSON.parse(localS).length;
          }
        }

        setCounts({
          agenda: agendas.length,
          undangan: undangans.length,
          homeVisit: visits.length,
          kasus: kasusCount,
          konselingInd: ind.length,
          konselingKel: kel.length,
          pernyataan: pernyataans.length,
          konferensi: konfs.length,
          ats: atss.length,
          siswa: siswaCount,
        });
      } catch (err) {
        console.error('Failed to load menu badge counts', err);
      }
    }

    fetchCounts();
  }, [activeTab]);

  const allMenuItems: MenuItem[] = [
    // LAYANAN UTAMA
    {
      id: 'form_a',
      label: 'Agenda Kerja BK...',
      badge: 'FORM A',
      countKey: 'agenda',
      icon: Calendar,
      section: 'LAYANAN UTAMA'
    },
    {
      id: 'form_b',
      label: 'Undangan Orang Tua ...',
      badge: 'FORM B',
      countKey: 'undangan',
      icon: Mail,
      section: 'LAYANAN UTAMA'
    },
    {
      id: 'form_c',
      label: 'Home Visit / Kunjung...',
      badge: 'FORM C',
      countKey: 'homeVisit',
      icon: Home,
      section: 'LAYANAN UTAMA'
    },
    // BIMBINGAN & KONSELING
    {
      id: 'form_d',
      label: 'Rekam Permasalahan ...',
      badge: 'FORM D',
      countKey: 'kasus',
      icon: AlertCircle,
      section: 'BIMBINGAN & KONSELING'
    },
    {
      id: 'form_e',
      label: 'Rencana Konseling In...',
      badge: 'FORM E',
      countKey: 'konselingInd',
      icon: User,
      section: 'BIMBINGAN & KONSELING'
    },
    {
      id: 'form_f',
      label: 'Rencana Konseling Ke...',
      badge: 'FORM F',
      countKey: 'konselingKel',
      icon: Users,
      section: 'BIMBINGAN & KONSELING'
    },
    // ADMINISTRASI TAMBAHAN
    {
      id: 'form_g',
      label: 'Surat Pernyataan Siswa',
      badge: 'FORM G',
      countKey: 'pernyataan',
      icon: FileText,
      section: 'ADMINISTRASI TAMBAHAN'
    },
    {
      id: 'form_h',
      label: 'Konferensi Kasus Siswa',
      badge: 'FORM H',
      countKey: 'konferensi',
      icon: Briefcase,
      section: 'ADMINISTRASI TAMBAHAN'
    },
    {
      id: 'form_i',
      label: 'Siswa ATS (Anak Tidak...',
      badge: 'FORM I',
      countKey: 'ats',
      icon: UserX,
      section: 'ADMINISTRASI TAMBAHAN'
    },
    {
      id: 'dashboard',
      label: 'Dashboard Monitoring BK',
      icon: LayoutDashboard,
      section: 'ADMINISTRASI TAMBAHAN'
    },
    {
      id: 'laporan',
      label: 'Laporan & Rekapitulasi',
      icon: FileText,
      section: 'ADMINISTRASI TAMBAHAN'
    },
    // DATA MASTER
    {
      id: 'master_siswa',
      label: 'Management Siswa',
      badge: 'MASTER',
      countKey: 'siswa',
      icon: GraduationCap,
      section: 'DATA MASTER'
    },
    {
      id: 'master',
      label: 'Master Data & Kasus',
      badge: 'MASTER',
      icon: Database,
      section: 'DATA MASTER',
      adminOnly: true
    }
  ];

  const filteredMenuItems = useMemo(() => {
    return allMenuItems.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q)) ||
        item.section.toLowerCase().includes(q)
      );
    });
  }, [allMenuItems, searchQuery, isAdmin]);

  const sections: Array<'LAYANAN UTAMA' | 'BIMBINGAN & KONSELING' | 'ADMINISTRASI TAMBAHAN' | 'DATA MASTER'> = [
    'LAYANAN UTAMA',
    'BIMBINGAN & KONSELING',
    'ADMINISTRASI TAMBAHAN',
    'DATA MASTER'
  ];

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };


  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar matching screenshot */}
      <header className="bg-[#0f172a] text-white border-b border-slate-800 shrink-0 z-20 shadow-md">
        <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(prev => !prev)}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg lg:hidden"
              title="Buka Menu Layanan"
            >
              {isMobileSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/10">
                <img 
                  src={LOGO_URL} 
                  alt="Logo SMPN 7" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white uppercase">
                  BK PEDULI SISWA
                </span>
                <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full tracking-wide shadow-sm">
                  SMPN 7 PASURUAN
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-white leading-tight">
                {user?.nama_lengkap || user?.username || 'Guru BK'}
              </span>
              <span className="text-[10px] text-blue-300 font-medium">
                {user?.role === 'full' ? 'Administrator BK' : 'Konselor BK'}
              </span>
            </div>

            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs border border-blue-400"
              title="Periksa Koneksi Database Supabase & Salin Kode SQL Tabel"
            >
              <Database size={14} />
              <span className="hidden sm:inline">Database & SQL</span>
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                title="Kembali ke Portal SIAP SPANJU"
              >
                <ArrowLeft size={14} />
                <span className="hidden md:inline">Portal SIAP</span>
              </button>
            )}

            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Buka Navigasi Global"
              >
                <Menu size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace: Left Sidebar + Content View */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Overlay on Mobile */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar Menu */}
        <aside 
          className={`
            fixed lg:static inset-y-0 left-0 z-40 lg:z-auto
            w-72 sm:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0
            transform transition-transform duration-200 ease-in-out
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            shadow-xl lg:shadow-none
          `}
        >
          {/* Search Box at Top of Sidebar */}
          <div className="p-3.5 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu layanan BK..."
                className="w-full pl-9 pr-7 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Menu List */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
            {sections.map(section => {
              const items = filteredMenuItems.filter(item => item.section === section);
              if (items.length === 0) return null;

              return (
                <div key={section} className="space-y-1">
                  <div className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                    {section}
                  </div>

                  <div className="space-y-1">
                    {items.map(item => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon;
                      const countValue = item.countKey ? counts[item.countKey] : undefined;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all duration-150
                            ${isActive 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-bold' 
                              : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'}
                          `}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-1">
                            <div className={`p-1.5 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'text-slate-500'}`}>
                              <Icon size={18} />
                            </div>
                            <span className="truncate leading-tight">{item.label}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span 
                                className={`
                                  text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase
                                  ${isActive 
                                    ? 'bg-white/20 text-white border border-white/30' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'}
                                `}
                              >
                                {item.badge}
                              </span>
                            )}

                            {typeof countValue === 'number' && (
                              <span 
                                className={`
                                  min-w-5 h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full
                                  ${isActive 
                                    ? 'bg-white text-blue-700 shadow-xs' 
                                    : 'bg-slate-200 text-slate-700'}
                                `}
                              >
                                {countValue}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar Database & SQL Schema trigger */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/60">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold transition-all shadow-xs"
              title="Periksa Status Tabel Supabase & Salin Kode SQL"
            >
              <div className="flex items-center gap-2">
                <Database size={15} className="text-blue-600" />
                <span>Database Supabase</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black">
                SQL DDL
              </span>
            </button>
          </div>

          {/* Sidebar Footer info */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-slate-400 text-[10px] flex items-center justify-between">
            <span>SABDA BK v2.0 SPANJU</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
            </span>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'form_a' && <BKAgendaKerja user={user} />}
            {activeTab === 'form_b' && <BKUndanganOrtu user={user} />}
            {activeTab === 'form_c' && <BKHomeVisit user={user} />}
            {activeTab === 'form_d' && <BKTransaksiKasus user={user} />}
            {activeTab === 'form_e' && <BKKonselingIndividual user={user} />}
            {activeTab === 'form_f' && <BKKonselingKelompok user={user} />}
            {activeTab === 'form_g' && <BKSuratPernyataan user={user} />}
            {activeTab === 'form_h' && <BKKonferensiKasus user={user} />}
            {activeTab === 'form_i' && <BKSiswaATS user={user} />}
            {activeTab === 'dashboard' && <BKDashboard />}
            {activeTab === 'laporan' && <BKLaporan user={user} />}
            {activeTab === 'master_siswa' && <BKManagementSiswa user={user} />}
            {activeTab === 'master' && <BKMasterKasus />}
          </div>
        </main>
      </div>

      {/* Supabase Connection & SQL Schema Modal */}
      <BKSupabaseModal 
        isOpen={isSqlModalOpen} 
        onClose={() => setIsSqlModalOpen(false)} 
      />
    </div>
  );
}

