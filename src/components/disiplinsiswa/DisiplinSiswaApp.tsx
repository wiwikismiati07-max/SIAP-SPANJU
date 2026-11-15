import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Database, Menu, X, ClipboardList, PlusCircle, MoreVertical, Lock } from 'lucide-react';
import DisiplinDashboard from './DisiplinDashboard';
import DisiplinMaster from './DisiplinMaster';
import DisiplinTransaksi from './DisiplinTransaksi';
import DisiplinLaporan from './DisiplinLaporan';
import { SupabaseConfigModal } from '../common/SupabaseConfigModal';

const checkIsTamuUser = (u: any) =>
  (u?.username || '').toLowerCase().trim() === 'tamu' ||
  (u?.role || '').toLowerCase().trim() === 'tamu' ||
  u?.id === 'user_tamu_walimurid' ||
  (u?.nama_lengkap || '').toLowerCase().includes('wali murid') ||
  (u?.nama_lengkap || '').toLowerCase().includes('tamu');

export default function DisiplinSiswaApp({ onBack, onOpenSidebar, user }: { onBack?: () => void, onOpenSidebar?: () => void, user?: any }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'transaksi' | 'laporan'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  const isTamu = checkIsTamuUser(user);
  const isAdmin = !isTamu && user?.role === 'full';
  const canEdit = !isTamu && (user?.role === 'entry' || user?.role === 'full');
  const isViewer = !isTamu && user?.role === 'view';

  useEffect(() => {
    if (isTamu && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [isTamu, activeTab]);

  const handleTabSelect = (tabId: string, label: string) => {
    if (isTamu && tabId !== 'dashboard') {
      setLockNotice(`Menu "${label}" terkunci. Hanya Operator yang dapat membuka menu ini. Akun Tamu hanya dapat melihat Beranda/Dashboard.`);
      return;
    }
    setLockNotice(null);
    setActiveTab(tabId as any);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    ...(!isViewer ? [{ id: 'transaksi', label: 'Input Kasus', icon: PlusCircle }] : []),
    { id: 'laporan', label: 'Laporan', icon: FileText },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'master', label: 'Master', icon: Database });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
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
                  <div className="text-xs md:text-sm font-black text-slate-800 leading-none">SPANJU</div>
                </div>
              </button>
              
              <div className="h-8 w-px bg-slate-200 shrink-0" />

              <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <ClipboardList size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs md:text-lg font-bold text-slate-800 leading-tight uppercase tracking-tight truncate">DISIPLIN SISWA</h1>
                  <p className="text-[8px] md:text-[10px] text-slate-500 font-medium truncate">
                    Kasus Ringan (Guru)
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => {
                const locked = isTamu && item.id !== 'dashboard';
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id, item.label)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                      locked
                        ? 'text-slate-400 bg-slate-100/80 cursor-not-allowed'
                        : activeTab === item.id 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    {locked && <Lock size={13} className="text-amber-500" />}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {!isTamu && (
                <button
                  onClick={() => setIsDbModalOpen(true)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Koneksi Database Supabase"
                >
                  <Database size={20} />
                </button>
              )}

              {/* Hamburger Menu for Sidebar */}
              <button 
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={onOpenSidebar}
                title="Menu Utama Aplikasi"
              >
                <Menu size={24} />
              </button>

              {/* More Menu for App Internal Menu */}
              <button 
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors md:hidden"
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
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <div 
          className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <ClipboardList size={18} />
                </div>
                <span className="font-bold text-slate-800">Menu Disiplin</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
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
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                      locked
                        ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed'
                        : activeTab === item.id 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                          : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </div>
                    {locked && <Lock size={15} className="text-amber-500 shrink-0" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto pb-12">
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
          {isTamu ? (
            <DisiplinDashboard />
          ) : (
            <>
              {activeTab === 'dashboard' && <DisiplinDashboard />}
              {activeTab === 'transaksi' && <DisiplinTransaksi user={user} />}
              {activeTab === 'laporan' && <DisiplinLaporan user={user} />}
              {activeTab === 'master' && <DisiplinMaster />}
            </>
          )}
        </div>
      </div>

      <SupabaseConfigModal 
        isOpen={!isTamu && isDbModalOpen} 
        onClose={() => setIsDbModalOpen(false)} 
      />
    </div>
  );
}
