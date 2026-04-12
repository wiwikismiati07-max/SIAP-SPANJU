import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa, TransaksiTerlambat, TransaksiWithSiswa } from '../../types/sitelat';
import Dashboard from './Dashboard';
import MasterData from './MasterData';
import Pencatatan from './Pencatatan';
import Laporan from './Laporan';
import { LayoutDashboard, Users, Clock, Settings, Menu, X, FileText, MoreVertical } from 'lucide-react';

export default function SiTelatApp({ onBack, onOpenSidebar, user }: { onBack?: () => void, onOpenSidebar?: () => void, user?: any }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pencatatan' | 'master' | 'laporan'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const LOGO_URL = "https://iili.io/KDFk4fI.png";
  const isAdmin = user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';

  const menuItems = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'pencatatan', label: 'Absensi Siswa', icon: Clock },
    { id: 'laporan', label: 'Report', icon: FileText },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'master', label: 'Operator / Master', icon: Users });
  }

  // If not admin and trying to access master, redirect to dashboard
  useEffect(() => {
    if (activeTab === 'master' && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);

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
                <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Clock size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs md:text-lg font-bold text-slate-800 leading-tight truncate">Siswa Terlambat</h1>
                  <p className="text-[8px] md:text-[10px] text-slate-500 font-medium hidden sm:block truncate">Monitoring Pendidikan</p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                    activeTab === item.id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Clock size={14} />
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
              
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
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Clock size={18} />
                </div>
                <span className="font-bold text-slate-800">Menu Utama</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                    activeTab === item.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto pb-12">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'pencatatan' && <Pencatatan />}
          {activeTab === 'master' && <MasterData />}
          {activeTab === 'laporan' && <Laporan />}
        </div>
      </div>
    </div>
  );
}
