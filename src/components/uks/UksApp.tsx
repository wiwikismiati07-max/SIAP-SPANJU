import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, ClipboardList, FileText, ChevronLeft, HeartPulse, Activity, Pill, Search, MoreVertical, Menu, X, Lock } from 'lucide-react';
import UksDashboard from './UksDashboard';
import UksMaster from './UksMaster';
import UksStokObat from './UksStokObat';
import UksPeriksa from './UksPeriksa';
import UksScreening from './UksScreening';
import UksLaporan from './UksLaporan';

interface UksAppProps {
  onBack: () => void;
  onOpenSidebar?: () => void;
}

const checkIsTamuUser = (u: any) =>
  (u?.username || '').toLowerCase().trim() === 'tamu' ||
  (u?.role || '').toLowerCase().trim() === 'tamu' ||
  u?.id === 'user_tamu_walimurid' ||
  (u?.nama_lengkap || '').toLowerCase().includes('wali murid') ||
  (u?.nama_lengkap || '').toLowerCase().includes('tamu');

const UksApp: React.FC<UksAppProps & { user?: any }> = ({ onBack, onOpenSidebar, user }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'stok' | 'periksa' | 'screening' | 'laporan'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  const isTamu = checkIsTamuUser(user);
  const isAdmin = !isTamu && user?.role === 'full';
  const isViewer = !isTamu && user?.role === 'view';

  useEffect(() => {
    if (isTamu && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [isTamu, activeTab]);

  const handleTabSelect = (tabId: string, label: string) => {
    if (isTamu && tabId !== 'dashboard') {
      setLockNotice(`Menu "${label}" terkunci. Hanya Operator yang dapat membuka menu ini. Akun Tamu hanya dapat melihat Dashboard.`);
      return;
    }
    setLockNotice(null);
    setActiveTab(tabId as any);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(!isViewer ? [
      { id: 'periksa', label: 'Periksa Siswa', icon: ClipboardList },
      { id: 'screening', label: 'Screening', icon: Search },
    ] : []),
    { id: 'laporan', label: 'Laporan', icon: FileText },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'master', label: 'Master Keluhan', icon: Database });
    menuItems.push({ id: 'stok', label: 'Stok Obat', icon: Pill });
  }

  return (
    <div className="h-full bg-[#f8fafc] flex flex-col animate-in fade-in duration-500 relative overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-[#001529] text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 group transition-all active:scale-95 shrink-0"
                title="Kembali ke Menu Aplikasi"
              >
                <img src={LOGO_URL} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" referrerPolicy="no-referrer" />
                <div className="text-left">
                  <div className="text-[8px] md:text-[10px] font-black text-slate-400 leading-none">SIAP</div>
                  <div className="text-xs md:text-sm font-black text-white leading-none">SPANJU</div>
                </div>
              </button>
              
              <div className="h-8 w-px bg-white/10 shrink-0" />

              <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <HeartPulse size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs md:text-lg font-black tracking-tighter leading-none truncate">UKS SMPN7</h1>
                  <p className="text-[8px] md:text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-none mt-1 hidden sm:block">Unit Kesehatan Sekolah</p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden xl:flex items-center space-x-1">
              {menuItems.map((item) => {
                const locked = isTamu && item.id !== 'dashboard';
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id, item.label)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm ${
                      locked
                        ? 'text-slate-500 bg-white/5 cursor-not-allowed'
                        : activeTab === item.id 
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                    {locked && <Lock size={13} className="text-amber-400" />}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-2">
              {/* Hamburger Menu for Sidebar */}
              <button 
                className="p-2 text-slate-400 hover:bg-white/10 rounded-xl transition-colors"
                onClick={onOpenSidebar}
                title="Menu Utama Aplikasi"
              >
                <Menu size={24} />
              </button>

              {/* More Menu for App Internal Menu */}
              <button 
                className="p-2 text-slate-400 hover:bg-white/10 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                title="Menu Aplikasi"
              >
                {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar/Drawer */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <div 
          className={`absolute top-0 right-0 bottom-0 w-72 bg-[#001529] text-white shadow-2xl transition-transform duration-300 transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white">
                  <HeartPulse size={18} />
                </div>
                <span className="font-bold text-white">Menu UKS</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
              {menuItems.map((item) => {
                const locked = isTamu && item.id !== 'dashboard';
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabSelect(item.id, item.label);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold ${
                      locked
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : activeTab === item.id 
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </div>
                    {locked && <Lock size={15} className="text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {lockNotice && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs">
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-amber-600 shrink-0" />
                <span>{lockNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setLockNotice(null)}
                className="p-1 hover:bg-amber-100 rounded-lg text-amber-700"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="mb-8 hidden md:block">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {isTamu ? 'Dashboard' : menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Sistem Informasi Unit Kesehatan Sekolah SMPN 7 Pasuruan</p>
          </div>
          {isTamu ? (
            <UksDashboard />
          ) : (
            <>
              {activeTab === 'dashboard' && <UksDashboard />}
              {activeTab === 'master' && <UksMaster />}
              {activeTab === 'stok' && <UksStokObat />}
              {activeTab === 'periksa' && <UksPeriksa user={user} />}
              {activeTab === 'screening' && <UksScreening user={user} />}
              {activeTab === 'laporan' && <UksLaporan user={user} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default UksApp;
