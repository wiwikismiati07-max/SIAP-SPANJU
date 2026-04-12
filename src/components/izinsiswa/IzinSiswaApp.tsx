import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Calendar, Menu, X, UserCheck, AlertTriangle, Database, LogOut, ShieldCheck, MoreVertical } from 'lucide-react';
import DashboardIzin from './DashboardIzin';
import MasterIzin from './MasterIzin';
import FormWaliMurid from './FormWaliMurid';
import FormOperatorIzin from './FormOperatorIzin';
import LaporanIzin from './LaporanIzin';
import LaporanPanggilan from './LaporanPanggilan';
import KalenderBelajar from './KalenderBelajar';
import { supabase } from '../../lib/supabase';

export default function IzinSiswaApp({ onBack, onOpenSidebar, user: globalUser }: { onBack?: () => void, onOpenSidebar?: () => void, user?: any }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'wali' | 'operator' | 'laporan' | 'panggilan' | 'kalender' | 'users'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!globalUser);
  const [user, setUser] = useState<any>(globalUser);
  const [isPublicMode, setIsPublicMode] = useState(!globalUser); // Default public mode for Dashboard & Wali Murid
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  useEffect(() => {
    if (globalUser) {
      setUser(globalUser);
      setIsLoggedIn(true);
      setIsPublicMode(false);
    }
    
    const handlePublicForm = () => {
      setIsPublicMode(true);
      setActiveTab('wali');
    };

    window.addEventListener('showPublicForm', handlePublicForm);
    return () => window.removeEventListener('showPublicForm', handlePublicForm);
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsLoggedIn(true);
    setIsPublicMode(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    // Global logout is handled in App.tsx
    onBack?.();
  };

  // Logic for role-based access
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const isAdmin = user?.role === 'full';

  // If not logged in and trying to access restricted tabs, show dashboard (or we could show a message)
  const restrictedTabs = ['master', 'operator', 'laporan', 'panggilan', 'users'];
  const isAccessingRestricted = restrictedTabs.includes(activeTab);

  if (!isLoggedIn && isAccessingRestricted) {
    setActiveTab('dashboard');
  }

  const menuItems = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'wali', label: 'Form Wali Murid', icon: Users },
    { id: 'operator', label: 'Absensi Siswa', icon: UserCheck, staff: true },
    { id: 'kalender', label: 'Kalender Belajar', icon: Calendar, staff: true },
    { id: 'laporan', label: 'Laporan Detail', icon: FileText, staff: true },
    { id: 'panggilan', label: 'Panggilan Orang Tua', icon: AlertTriangle, staff: true },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'master', label: 'Master Data', icon: Database, staff: true });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Top Navigation Bar */}
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
                <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <UserCheck size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs md:text-lg font-bold text-slate-800 leading-tight truncate">Izin Siswa</h1>
                  <p className="text-[8px] md:text-[10px] text-slate-500 font-medium hidden sm:block truncate">
                    {isLoggedIn ? `Halo, ${user.nama_lengkap || user.username}` : 'Sistem Perizinan'}
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden xl:flex items-center space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 font-semibold text-xs ${
                    activeTab === item.id 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Menu Toggle & Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Calendar size={12} />
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </div>
              
              {isLoggedIn ? (
                <button 
                  onClick={handleLogout}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
                  title="Keluar"
                >
                  <LogOut size={18} />
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('operator')}
                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
                  title="Login Staff"
                >
                  <UserCheck size={18} />
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
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
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
        className={`fixed inset-0 z-50 xl:hidden transition-opacity duration-300 ${
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
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <UserCheck size={18} />
                </div>
                <span className="font-bold text-slate-800">Navigasi Izin</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                    activeTab === item.id 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {isLoggedIn && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50 transition-all font-semibold"
                >
                  <LogOut size={20} />
                  <span>Keluar Sesi</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto pb-12">
          {activeTab === 'dashboard' && <DashboardIzin />}
          {activeTab === 'wali' && <FormWaliMurid />}
          {activeTab === 'operator' && <FormOperatorIzin />}
          {activeTab === 'kalender' && <KalenderBelajar />}
          {activeTab === 'laporan' && <LaporanIzin />}
          {activeTab === 'panggilan' && <LaporanPanggilan />}
          {activeTab === 'master' && <MasterIzin />}
        </div>
      </div>
    </div>
  );
}
