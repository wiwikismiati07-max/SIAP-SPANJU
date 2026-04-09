/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Download, 
  Upload, 
  LayoutDashboard,
  X,
  Globe,
  Shield,
  Book,
  Users,
  Activity,
  FileText,
  Calendar,
  MessageSquare,
  Briefcase,
  Zap,
  Search,
  ClipboardList,
  FileCheck,
  Award,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sparkles,
  Clock,
  UserCheck,
  Trophy,
  HeartPulse,
  Library
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';

// --- Types & Constants ---

interface AppLink {
  id: string;
  title: string;
  url: string;
  displayMode: 'iframe' | 'new_tab';
  color: string;
  icon: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Globe, Shield, Book, Users, Activity, FileText, Calendar, 
  MessageSquare, Briefcase, Zap, Search, ClipboardList, 
  FileCheck, Award, LayoutDashboard, Sparkles
};

const COLORS = [
  "from-blue-600 to-blue-800",
  "from-slate-800 to-black",
  "from-slate-300 to-slate-100",
  "from-red-600 to-red-800",
  "from-pink-500 to-pink-700",
  "from-emerald-600 to-emerald-800",
  "from-amber-700 to-amber-900"
];

const EXTERNAL_APPS = [
  { id: "tata-tertib", title: "Tata Tertib Siswa", url: "https://tally.so/r/q4D1XY", icon: "FileText", color: "from-blue-400 to-blue-600" },
  { id: "8-program-prioritas-spanju", title: "8 Program Prioritas Spanju", url: "https://7-kaih-nine.vercel.app/", icon: "LayoutDashboard", color: "from-blue-400 to-blue-600" }
];

const LOGO_URL = "https://iili.io/KDFk4fI.png";
const IMAGE_KILAS = "https://wsrv.nl/?url=i.ibb.co.com/3yssw38v/Gemini-Generated-Image-gporzagporzagpor.png";
const IMAGE_8_PROGRAM = "https://wsrv.nl/?url=i.ibb.co.com/VWYCc9Cc/Gemini-Generated-Image-a54l2ma54l2ma54l.png";
const IMAGE_KORELASI_SRA = "https://wsrv.nl/?url=i.ibb.co/5wM2Bd4/gambar-3.jpg";

import SiTelatApp from './components/sitelat/SiTelatApp';
import IzinSiswaApp from './components/izinsiswa/IzinSiswaApp';
import BKPeduliSiswaApp from './components/bkpedulisiswa/BKPeduliSiswaApp';
import DispensasiApp from './components/dispensasi/DispensasiApp';
import PrestasiApp from './components/siprestasi/PrestasiApp';
import KeagamaanApp from './components/keagamaan/KeagamaanApp';
import UksApp from './components/uks/UksApp';
import PengaduanWaliApp from './components/pengaduan/PengaduanWaliApp';
import SipenaApp from './components/sipena/SipenaApp';
import SurveyApp from './components/survey/SurveyApp';

// --- Components ---

export default function App() {
  const [isDashboard, setIsDashboard] = useState(false);
  const [userLinks, setUserLinks] = useState<AppLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<'kilas' | 'program' | 'spip' | 'korelasi_program' | 'korelasi_sra' | 'menu_aplikasi' | 'app' | 'sitelat' | 'izinsiswa' | 'bkpedulisiswa' | 'disiplinsiswa' | 'dispensasi' | 'prestasi' | 'keagamaan' | 'uks' | 'pengaduan' | 'sipena' | 'survey' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data persistence with Supabase
  useEffect(() => {
    const fetchLinks = async () => {
      // Check if supabase is configured
      if (!supabase) {
        // Fallback to localStorage if Supabase is not configured yet
        const saved = localStorage.getItem('dashboard_links');
        if (saved) {
          try {
            setUserLinks(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse links", e);
          }
        } else {
          setUserLinks([{ id: '1', title: 'Survey Kepuasan', url: 'https://survey-kepuasan-alpha.vercel.app/', displayMode: 'iframe', color: COLORS[0], icon: 'MessageSquare' }]);
        }
        return;
      }

      try {
        const { data, error } = await supabase.from('app_links').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          setUserLinks(data);
        } else {
          setUserLinks([{ id: '1', title: 'Survey Kepuasan', url: 'https://survey-kepuasan-alpha.vercel.app/', displayMode: 'iframe', color: COLORS[0], icon: 'MessageSquare' }]);
        }
      } catch (error) {
        console.error('Error fetching links from Supabase:', error);
        // Fallback
        const saved = localStorage.getItem('dashboard_links');
        if (saved) setUserLinks(JSON.parse(saved));
      }
    };
    fetchLinks();
  }, []);

  useEffect(() => {
    if (!supabase) {
      localStorage.setItem('dashboard_links', JSON.stringify(userLinks));
    }
  }, [userLinks]);

  // Loading simulation for iframe
  useEffect(() => {
    if (selectedLinkId) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [selectedLinkId]);

  const handleAppSelect = (link: AppLink) => {
    setActiveSection('app');
    if (link.displayMode === 'new_tab') {
      window.open(link.url, '_blank');
    }
    setSelectedLinkId(link.id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const selectedLink = userLinks.find(l => l.id === selectedLinkId);

  const fadeInVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
    })
  };

  const sidebarItems = [
    { id: 'survey', title: 'SURVEY APLIKASI', subtitle: 'SURVEY KEPUASAN PENGGUNA', icon: ClipboardList, color: 'from-slate-800 to-black', shadow: 'shadow-slate-400', prominent: true, extraLarge: true },
    { id: 'sitelat', title: 'SI-TELAT', subtitle: 'SISTEM KETERLAMBATAN SISWA', icon: Clock, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200' },
    { id: 'izinsiswa', title: 'IZIN SISWA', subtitle: 'SISTEM PERIZINAN SISWA', icon: UserCheck, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200' },
    { id: 'sipena', title: 'SIPENA', subtitle: 'PERPUSTAKAAN SISWA (BARU)', icon: Library, color: 'from-slate-800 to-black', shadow: 'shadow-slate-300' },
    { id: 'pengaduan', title: 'PENGADUAN WALI MURID', subtitle: 'LAYANAN PENGADUAN (BARU)', icon: MessageSquare, color: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-200' },
    { id: 'dispensasi', title: 'SI-DISPENSASI', subtitle: 'DISPENSASI SISWA (BARU)', icon: FileCheck, color: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-200' },
    { id: 'prestasi', title: 'SI-PRESTASI', subtitle: 'PRESTASI SISWA (BARU)', icon: Trophy, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200' },
    { id: 'keagamaan', title: 'KEAGAMAAN', subtitle: 'KEGIATAN KEAGAMAAN (BARU)', icon: Book, color: 'from-teal-500 to-teal-600', shadow: 'shadow-teal-200' },
    { id: 'uks', title: 'UKS SMPN7', subtitle: 'UNIT KESEHATAN SEKOLAH (BARU)', icon: HeartPulse, color: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-200' },
    { id: 'disiplinsiswa', title: 'DISIPLIN SISWA', subtitle: 'KASUS RINGAN (GURU)', icon: ClipboardList, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200' },
    { id: 'bkpedulisiswa', title: 'BK PEDULI SISWA', subtitle: 'KASUS BERAT (GURU BK)', icon: Users, color: 'from-pink-500 to-pink-600', shadow: 'shadow-pink-200' },
    { id: 'kilas', title: 'KILAS APLIKASI', subtitle: 'REFERENSI DASAR', icon: Book, color: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-200' },
    { id: 'program', title: '8 PROGRAM PRIORITAS', subtitle: 'SMPN 7 PASURUAN', icon: LayoutDashboard, color: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-200' },
    { id: 'spip', title: '15 INDIKATOR SPIP', subtitle: 'ANTI KORUPSI', icon: Shield, color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-200' },
    { id: 'korelasi_program', title: 'KORELASI PROGRAM', subtitle: 'SPIP & SIAP SPANJU', icon: ClipboardList, color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-200' },
    { id: 'korelasi_sra', title: 'KORELASI SRA', subtitle: 'SEKOLAH RAMAH ANAK', icon: Activity, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200' },
  ];

  if (!isDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-pink-300/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-300/30 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[40%] w-64 h-64 bg-purple-300/20 rounded-full blur-[80px]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center max-w-2xl"
        >
          <motion.div 
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 1, delay: 0.2 }}
            className="w-32 h-32 md:w-40 md:h-40 bg-white/60 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] flex items-center justify-center p-4 mb-8 border border-white/50 backdrop-blur-2xl"
          >
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain drop-shadow-md" referrerPolicy="no-referrer" />
          </motion.div>
          
          <h1 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight mb-4 font-display">SIAP SPANJU</h1>
          <p className="text-base md:text-xl font-bold text-slate-600 uppercase tracking-[0.2em] mb-8">Sistem Integrasi Aplikasi Pembinaan Siswa</p>
          <p className="text-slate-500 text-base md:text-lg max-w-lg mb-12 leading-relaxed font-medium">
            Platform terpadu untuk mempermudah pendataan, pemantauan, dan tindak lanjut permasalahan siswa di SMP Negeri 7 Pasuruan.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsDashboard(true);
              setActiveSection('kilas');
            }}
            className="group relative px-8 py-4 md:px-12 md:py-5 bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-full font-bold text-lg md:text-xl shadow-[0_10px_40px_-10px_rgba(236,72,153,0.5)] border border-white/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative flex items-center gap-3">
              Masuk Dashboard <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 font-sans overflow-hidden text-slate-800">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (isMobile ? "calc(100% - 2rem)" : 280) : 0,
          opacity: isSidebarOpen ? 1 : 0,
          x: isMobile && !isSidebarOpen ? "-100%" : 0,
          margin: isMobile ? "1rem" : "0.75rem"
        }}
        className="bg-white/60 backdrop-blur-2xl border-r border-white/50 flex flex-col z-50 fixed md:relative h-[calc(100vh-2rem)] md:h-auto overflow-hidden rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] md:shadow-none"
      >
        <div className="p-6 flex items-center justify-between border-b border-white/50 min-w-[280px]">
          <div className="flex flex-col gap-0.5 font-display">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-pink-100 rotate-3 overflow-hidden p-1 border border-slate-100">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-black">SIAP SPANJU</span>
            </div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.15em] leading-none ml-12">
              Sistem Integrasi Aplikasi Pembinaan Siswa
            </span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/50 rounded-lg transition-colors text-slate-500 hover:text-slate-800">
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-w-[280px] custom-scrollbar">
          {/* Static Sections */}
          {sidebarItems.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id as any);
                setSelectedLinkId(null);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full text-left p-4 mb-3 rounded-[1.5rem] flex items-center gap-4 transition-all duration-300 group relative border-b-[6px] border-r-[2px] ${
                activeSection === section.id 
                  ? 'bg-white border-slate-200 shadow-[0_5px_15px_rgba(0,0,0,0.05)] translate-y-[4px]' 
                  : 'bg-white/80 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1'
              }`}
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${section.color} flex items-center justify-center text-white shadow-lg ${section.shadow} shrink-0 transition-all duration-500 group-hover:scale-110`}>
                <section.icon size={24} />
              </div>
              <div className="flex-1 min-w-0 relative">
                <p className={`font-black tracking-tight truncate uppercase leading-tight ${section.extraLarge ? 'text-[20px]' : 'text-[16px]'} ${activeSection === section.id ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                  {section.title}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{section.subtitle}</p>
                
                <div className={`h-1.5 bg-red-600 rounded-full mt-2 transition-all duration-500 ${activeSection === section.id ? 'w-3/4' : 'w-12 group-hover:w-3/4'}`} />
              </div>
            </button>
          ))}

          <div className="h-px bg-black/5 mx-2 my-4" />
          
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aplikasi Eksternal</p>
          
          {EXTERNAL_APPS.map((app) => {
            const Icon = ICON_MAP[app.icon] || Globe;
            return (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left p-4 mb-3 rounded-[1.5rem] flex items-center gap-4 transition-all duration-300 group relative border-b-[6px] border-r-[2px] bg-white/80 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-lg shrink-0 transition-all duration-500 group-hover:scale-110`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black tracking-tight truncate text-[14px] uppercase text-slate-700 group-hover:text-slate-900 transition-colors">{app.title}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">DIRECT LINK</p>
                  <div className="h-1.5 bg-blue-500 rounded-full mt-2 transition-all duration-500 w-8 group-hover:w-1/2" />
                </div>
                <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>
            );
          })}

          <div className="h-px bg-black/5 mx-2 my-4" />
          
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Tambahan</p>
          {userLinks.map((link) => {
            const Icon = ICON_MAP[link.icon] || Globe;
            return (
              <div key={link.id} className="relative group mb-3">
                <button
                  onClick={() => handleAppSelect(link)}
                  className={`w-full text-left p-4 rounded-[1.5rem] flex items-center gap-4 transition-all duration-300 border-b-[6px] border-r-[2px] ${
                    selectedLinkId === link.id 
                      ? 'bg-white border-slate-200 shadow-[0_5px_15px_rgba(0,0,0,0.05)] translate-y-[4px]' 
                      : 'bg-white/80 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${link.color} flex items-center justify-center text-white shadow-lg shrink-0 transition-all duration-500 group-hover:scale-110`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black tracking-tight truncate text-[14px] uppercase ${selectedLinkId === link.id ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>{link.title}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{link.displayMode === 'iframe' ? 'DASHBOARD' : 'NEW TAB'}</p>
                    <div className={`h-1.5 bg-indigo-500 rounded-full mt-2 transition-all duration-500 ${selectedLinkId === link.id ? 'w-3/4' : 'w-8 group-hover:w-1/2'}`} />
                  </div>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const updated = userLinks.filter(l => l.id !== link.id);
                    setUserLinks(updated);
                    if (selectedLinkId === link.id) setSelectedLinkId(null);
                    
                    if (supabase) {
                      try {
                        await supabase.from('app_links').delete().eq('id', link.id);
                      } catch (error) {
                        console.error('Error deleting link from Supabase:', error);
                      }
                    }
                  }}
                  className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:text-white bg-white hover:bg-rose-500 rounded-full shadow-lg border border-slate-100 transition-all z-10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </motion.aside>

      {/* Sidebar Toggle for Desktop/Mobile when closed */}
      {!isSidebarOpen && (
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-6 top-6 z-30 p-2 bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl text-slate-600 hover:scale-110 transition-all active:scale-90 shadow-[0_8px_32_0_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <img src={LOGO_URL} alt="Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
        </motion.button>
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0 min-w-0 flex flex-col relative p-1.5 md:p-3 md:pl-0">
        {activeSection === 'sitelat' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <SiTelatApp />
          </div>
        )}
        {activeSection === 'izinsiswa' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <IzinSiswaApp />
          </div>
        )}
        {activeSection === 'disiplinsiswa' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <div className="h-full flex flex-col">
              <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <ClipboardList size={18} />
                  </div>
                  <h2 className="font-bold text-slate-800">Disiplin Siswa (Kasus Ringan)</h2>
                </div>
                <a 
                  href="https://bk-peduli-siswa.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  Buka Penuh <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex-1">
                <iframe
                  src="https://bk-peduli-siswa.vercel.app/"
                  className="w-full h-full border-none"
                  title="Disiplin Siswa"
                  sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin allow-storage-access-by-user-activation"
                />
              </div>
            </div>
          </div>
        )}
        {activeSection === 'bkpedulisiswa' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <BKPeduliSiswaApp />
          </div>
        )}
        {activeSection === 'dispensasi' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <DispensasiApp onBack={() => setActiveSection(null)} />
          </div>
        )}
        {activeSection === 'prestasi' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <PrestasiApp onBack={() => setActiveSection(null)} />
          </div>
        )}
        {activeSection === 'keagamaan' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <KeagamaanApp onBack={() => setActiveSection(null)} />
          </div>
        )}
        {activeSection === 'uks' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <UksApp onBack={() => setActiveSection(null)} />
          </div>
        )}
        {activeSection === 'pengaduan' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <PengaduanWaliApp onBack={() => setActiveSection(null)} />
          </div>
        )}
        {activeSection === 'sipena' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <SipenaApp onBack={() => setActiveSection(null)} />
          </div>
        )}
        {activeSection === 'survey' && (
          <div className="absolute inset-0 z-10 bg-slate-50 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50">
            <SurveyApp onBack={() => setActiveSection(null)} />
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeSection === 'kilas' && (
            <motion.div
              key="kilas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 min-h-0 flex flex-col bg-white/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto shadow-2xl border border-white/50 p-6 md:p-12"
            >
              <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-4 relative">
                  <div className="absolute -top-16 -left-16 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl" />
                  <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-pink-300/30 rounded-full blur-3xl" />
                  <div className="w-24 h-24 rounded-3xl bg-white/80 flex items-center justify-center shadow-xl shadow-pink-100/50 mx-auto rotate-6 overflow-hidden p-2 mb-6 border border-white/80 backdrop-blur-md">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-display leading-none">Kilas Aplikasi SIAP SPANJU</h2>
                  <p className="text-sm md:text-lg font-black text-slate-500 uppercase tracking-[0.3em]">Sistem Integrasi Aplikasi Pembinaan Siswa</p>
                </div>

                <motion.div variants={fadeInVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="p-4 md:p-8 bg-white/80 rounded-[2.5rem] border border-white/50 shadow-xl shadow-pink-100/30 flex flex-col items-center justify-center relative group">
                  <img src={IMAGE_KILAS} alt="Kilas" className="w-full max-w-3xl h-auto rounded-2xl shadow-md object-contain" />
                </motion.div>

                <div className="p-10 bg-gradient-to-br from-pink-50 to-blue-50 rounded-[2.5rem] text-slate-800 shadow-2xl relative overflow-hidden group border border-white/50">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300/20 blur-3xl -mr-20 -mt-20 group-hover:bg-blue-300/40 transition-all duration-700" />
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-2xl font-black font-display tracking-tight text-slate-900">Filosofi SIAP SPANJU</h3>
                    <p className="text-slate-800 leading-relaxed font-bold text-lg italic">"Sekolah Sigap Menangani Permasalahan Siswa Secara Cepat dan Terdata"</p>
                    <div className="h-px bg-slate-300 w-full" />
                    <p className="text-slate-700 text-base leading-relaxed font-medium">
                      Platform ini bukan sekadar kumpulan tautan, melainkan pusat kendali pembinaan karakter yang mengedepankan kecepatan respon dan akurasi data demi masa depan siswa yang lebih baik.
                    </p>
                  </div>
                </div>

                <div className="text-center pt-8">
                  <button onClick={() => setActiveSection('program')} className="px-10 py-4 bg-white/80 text-slate-800 rounded-2xl font-black shadow-xl hover:scale-105 hover:bg-white transition-all border border-white/80">
                    Selanjutnya
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'program' && (
            <motion.div
              key="program"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 min-h-0 flex flex-col bg-white/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto shadow-2xl border border-white/50 p-6 md:p-12"
            >
              <div className="max-w-5xl mx-auto space-y-12">
                <div className="text-center space-y-4 relative">
                  <div className="absolute -top-16 -left-16 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl" />
                  <div className="w-24 h-24 rounded-3xl bg-white/80 flex items-center justify-center shadow-xl shadow-pink-100/50 mx-auto rotate-6 overflow-hidden p-2 mb-6 border border-white/80 backdrop-blur-md">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-display leading-none">8 Program Prioritas</h2>
                  <p className="text-sm md:text-lg font-black text-slate-500 uppercase tracking-[0.3em]">Menuju Sekolah Unggul & Berkarakter</p>
                </div>

                <motion.div variants={fadeInVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="p-4 md:p-8 bg-white/80 rounded-[2.5rem] border border-white/50 shadow-xl shadow-blue-100/30 flex flex-col items-center justify-center relative group z-10">
                  <img src={IMAGE_8_PROGRAM} alt="8 Program" className="w-full max-w-3xl h-auto rounded-2xl shadow-md object-contain" />
                </motion.div>

                <div className="text-center pt-8">
                  <button onClick={() => setActiveSection('spip')} className="px-10 py-4 bg-white/80 text-slate-800 rounded-2xl font-black shadow-xl hover:scale-105 hover:bg-white transition-all border border-white/80">
                    Selanjutnya
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'spip' && (
            <motion.div
              key="spip"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 min-h-0 flex flex-col bg-white/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto shadow-2xl border border-white/50 p-6 md:p-12"
            >
              <div className="max-w-5xl mx-auto space-y-12">
                <div className="text-center space-y-4 relative">
                  <div className="absolute -top-16 -left-16 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl" />
                  <div className="w-24 h-24 rounded-3xl bg-white/80 flex items-center justify-center shadow-xl shadow-purple-100/50 mx-auto rotate-6 overflow-hidden p-2 mb-6 border border-white/80 backdrop-blur-md">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-display leading-none">15 Indikator SPIP Anti Korupsi</h2>
                  <p className="text-sm md:text-lg font-black text-slate-500 uppercase tracking-[0.3em]">Sistem Pengendalian Intern Pemerintah</p>
                </div>

                <div className="flex flex-col gap-8 relative z-10 max-w-4xl mx-auto w-full">
                  <motion.div variants={fadeInVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} className="p-4 bg-white/80 rounded-[2rem] border border-white/50 shadow-xl shadow-purple-100/30 flex flex-col items-center justify-center group">
                    <img src="https://wsrv.nl/?url=i.ibb.co.com/YFn0zsDJ/Gemini-Generated-Image-ncurlcncurlcncur.png" alt="SPIP 1" className="w-full h-auto rounded-xl shadow-sm object-contain" />
                  </motion.div>
                  <motion.div variants={fadeInVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} className="p-4 bg-white/80 rounded-[2rem] border border-white/50 shadow-xl shadow-purple-100/30 flex flex-col items-center justify-center group">
                    <img src="https://wsrv.nl/?url=i.ibb.co.com/k2vVysT8/Gemini-Generated-Image-qg440qqg440qqg44.png" alt="SPIP 2" className="w-full h-auto rounded-xl shadow-sm object-contain" />
                  </motion.div>
                  <motion.div variants={fadeInVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} className="p-4 bg-white/80 rounded-[2rem] border border-white/50 shadow-xl shadow-purple-100/30 flex flex-col items-center justify-center group">
                    <img src="https://wsrv.nl/?url=i.ibb.co.com/ZpFWcqq1/Gemini-Generated-Image-dqdjpdqdjpdqdjpd.png" alt="SPIP 3" className="w-full h-auto rounded-xl shadow-sm object-contain" />
                  </motion.div>
                </div>

                <div className="text-center pt-8">
                  <button onClick={() => setActiveSection('korelasi_program')} className="px-10 py-4 bg-white/80 text-slate-800 rounded-2xl font-black shadow-xl hover:scale-105 hover:bg-white transition-all border border-white/80">
                    Selanjutnya
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'korelasi_program' && (
            <motion.div
              key="korelasi_program"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 min-h-0 flex flex-col bg-white/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto shadow-2xl border border-white/50 p-6 md:p-12"
            >
              <div className="max-w-5xl mx-auto space-y-12">
                <div className="text-center space-y-4 relative">
                  <div className="absolute -top-16 -left-16 w-64 h-64 bg-orange-300/30 rounded-full blur-3xl" />
                  <div className="w-24 h-24 rounded-3xl bg-white/80 flex items-center justify-center shadow-xl shadow-orange-100/50 mx-auto rotate-6 overflow-hidden p-2 mb-6 border border-white/80 backdrop-blur-md">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-display leading-none">Korelasi Program & SPIP</h2>
                  <p className="text-sm md:text-lg font-black text-slate-500 uppercase tracking-[0.3em]">dengan 9 Aplikasi SIAP SPANJU</p>
                </div>

                <motion.div variants={fadeInVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="p-4 md:p-8 bg-white/80 rounded-[2.5rem] border border-white/50 shadow-xl shadow-orange-100/30 flex flex-col items-center justify-center relative group z-10">
                  <img src="https://wsrv.nl/?url=i.ibb.co.com/99vdYcf5/Gemini-Generated-Image-kbsmjdkbsmjdkbsm.png" alt="Korelasi Program" className="w-full max-w-4xl h-auto rounded-2xl shadow-md object-contain" />
                </motion.div>

                <div className="text-center pt-8">
                  <button onClick={() => setActiveSection('korelasi_sra')} className="px-10 py-4 bg-white/80 text-slate-800 rounded-2xl font-black shadow-xl hover:scale-105 hover:bg-white transition-all border border-white/80">
                    Selanjutnya
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'korelasi_sra' && (
            <motion.div
              key="korelasi_sra"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 min-h-0 flex flex-col bg-white/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto shadow-2xl border border-white/50 p-6 md:p-12"
            >
              <div className="max-w-5xl mx-auto space-y-12">
                <div className="text-center space-y-4 relative">
                  <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl" />
                  <div className="w-24 h-24 rounded-3xl bg-white/80 flex items-center justify-center shadow-xl shadow-emerald-100/50 mx-auto rotate-6 overflow-hidden p-2 mb-6 border border-white/80 backdrop-blur-md">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight font-display leading-none">Korelasi Integrasi SIAP SPANJU</h2>
                  <p className="text-sm md:text-lg font-black text-slate-500 uppercase tracking-[0.3em]">dengan Sekolah Ramah Anak / SRA</p>
                </div>

                <motion.div variants={fadeInVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="p-4 md:p-8 bg-white/80 rounded-[2.5rem] border border-white/50 shadow-xl shadow-emerald-100/30 flex flex-col items-center justify-center relative group z-10">
                  <img src={IMAGE_KORELASI_SRA} alt="Korelasi SRA" className="w-full max-w-3xl h-auto rounded-2xl shadow-md object-contain" />
                </motion.div>

                <div className="p-10 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] text-slate-800 shadow-2xl relative overflow-hidden group border border-white/50">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-300/20 blur-3xl -mr-20 -mt-20 group-hover:bg-teal-300/40 transition-all duration-700" />
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-2xl font-black font-display tracking-tight text-slate-900">Kesimpulan</h3>
                    <p className="text-slate-800 leading-relaxed font-medium text-lg">Kesembilan aplikasi SIAP SPANJU di SMPN 7 saling terintegrasi untuk mendukung implementasi Sekolah Ramah Anak, karena:</p>
                    <ol className="list-decimal list-outside text-slate-700 text-base leading-relaxed font-medium space-y-2 ml-6">
                      <li>Mendukung perlindungan dan kesejahteraan siswa.</li>
                      <li>Mengembangkan kedisiplinan positif dan karakter.</li>
                      <li>Menjamin pelayanan pendidikan yang aman, sehat, dan inklusif.</li>
                      <li>Mengoptimalkan potensi dan prestasi siswa.</li>
                    </ol>
                    <div className="h-px bg-slate-300 w-full" />
                    <p className="text-slate-700 text-base leading-relaxed font-medium">
                      Dengan integrasi tersebut, sistem aplikasi SIAP SPANJU dapat menjadi pendukung utama manajemen sekolah dalam mewujudkan lingkungan belajar yang aman, nyaman, dan ramah anak.
                    </p>
                  </div>
                </div>

                <div className="text-center pt-8">
                  <button onClick={() => setActiveSection('menu_aplikasi')} className="px-10 py-4 bg-white/80 text-slate-800 rounded-2xl font-black shadow-xl hover:scale-105 hover:bg-white transition-all border border-white/80">
                    Buka Menu Aplikasi
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'menu_aplikasi' && (
            <motion.div
              key="menu_aplikasi"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 min-h-0 flex flex-col bg-slate-50/80 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto shadow-2xl border border-white/50 p-6 md:p-12"
            >
              <div className="max-w-6xl mx-auto w-full space-y-10">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl mx-auto overflow-hidden p-2 mb-4 border border-slate-100">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-display">Pilih Aplikasi</h2>
                  <p className="text-sm font-medium text-slate-500">Silakan pilih aplikasi yang ingin Anda buka dari daftar di bawah ini.</p>
                </div>

                {/* Survey Banner */}
                <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 p-8 md:p-12 rounded-[2.5rem] border border-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group hover:shadow-2xl transition-all duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-300/40 to-pink-300/40 rounded-full blur-3xl -mr-20 -mt-20" />
                  <div className="relative z-10 flex-1 space-y-4 text-center md:text-left">
                    <span className="inline-block px-4 py-1.5 bg-purple-100 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">PENTING</span>
                    <h3 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 tracking-tight">Survey Kepuasan Layanan</h3>
                    <p className="text-slate-600 font-medium max-w-xl mx-auto md:mx-0 text-sm md:text-base">Suara Anda sangat berarti! Bantu kami meningkatkan kualitas layanan dengan mengisi survey singkat ini.</p>
                  </div>
                  <div className="relative z-10 shrink-0 flex flex-col items-center gap-6">
                    <div className="w-28 h-28 rounded-full bg-white shadow-lg flex items-center justify-center text-purple-500 border-[6px] border-purple-100 group-hover:scale-110 transition-transform duration-500">
                      <MessageSquare size={48} />
                    </div>
                    <button 
                      onClick={() => setActiveSection('survey')}
                      className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-black shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 text-sm uppercase tracking-widest"
                    >
                      Mulai Survey <ExternalLink size={16} />
                    </button>
                  </div>
                </div>

                {/* Grid of Apps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sidebarItems.filter(item => !['kilas', 'program', 'spip', 'korelasi_program', 'korelasi_sra', 'survey'].includes(item.id)).map(app => (
                    <button
                      key={app.id}
                      onClick={() => setActiveSection(app.id as any)}
                      className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center group"
                    >
                      <div className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                        <app.icon size={32} />
                      </div>
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">{app.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{app.subtitle}</p>
                      <div className="px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-100">
                        <ExternalLink size={14} /> Buka Aplikasi
                      </div>
                    </button>
                  ))}
                  
                  {EXTERNAL_APPS.map(app => {
                    const Icon = ICON_MAP[app.icon] || Globe;
                    return (
                      <a
                        key={app.id}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center group"
                      >
                        <div className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                          <Icon size={32} />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">{app.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">APLIKASI EKSTERNAL</p>
                        <div className="px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-100">
                          <ExternalLink size={14} /> Buka Aplikasi
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'app' && selectedLink && (
            <motion.div
              key={selectedLink.id}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              className="flex-1 flex flex-col bg-white/60 backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] border border-white/50"
            >
              <div className="h-16 bg-white/40 border-b border-white/50 flex items-center justify-between px-4 md:px-8 z-10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${selectedLink.color} flex items-center justify-center text-white shadow-sm`}>
                    {React.createElement(ICON_MAP[selectedLink.icon] || Globe, { size: 20 })}
                  </div>
                  <div className="hidden sm:block">
                    <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-none mb-0.5 font-display">{selectedLink.title}</h2>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase opacity-70 truncate max-w-[200px]">{selectedLink.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={selectedLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-5 py-2.5 bg-gradient-to-r ${selectedLink.color} text-white rounded-xl hover:brightness-110 transition-all flex items-center gap-2 text-xs font-black shadow-xl shadow-pink-100/50 tracking-widest uppercase`}
                  >
                    <ExternalLink size={16} />
                    <span>Buka Penuh</span>
                  </a>
                </div>
              </div>
              <div className="flex-1 bg-white/40 m-2 md:m-4 rounded-[1.5rem] md:rounded-[2rem] shadow-inner overflow-hidden border border-white/50 relative group">
                {isLoading && (
                  <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-[4px] border-pink-100 border-t-pink-500 rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap size={24} className="text-pink-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-slate-800 tracking-tighter">Menyiapkan Aplikasi</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sinkronisasi data...</p>
                    </div>
                  </div>
                )}
                <iframe
                  src={selectedLink.url}
                  className="w-full h-full border-none"
                  title={selectedLink.title}
                  onLoad={() => setIsLoading(false)}
                  sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin allow-storage-access-by-user-activation"
                />
              </div>
            </motion.div>
          )}

          {/* Default/Landing Section */}
          {!activeSection && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
              <div className="w-24 h-24 bg-white/60 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/50 backdrop-blur-md">
                <LayoutDashboard className="w-12 h-12 text-pink-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Selamat Datang di SIAP SPANJU</h3>
              <p className="max-w-xs font-medium">Pilih menu di samping untuk mulai menjelajahi sistem integrasi kami.</p>
            </div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}
