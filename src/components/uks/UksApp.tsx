import React, { useState } from 'react';
import { LayoutDashboard, Database, ClipboardList, FileText, ChevronLeft, HeartPulse, Activity, Pill, Search, MoreVertical, Menu, X } from 'lucide-react';
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

const UksApp: React.FC<UksAppProps> = ({ onBack, onOpenSidebar }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'stok' | 'periksa' | 'screening' | 'laporan'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master', label: 'Master Keluhan', icon: Database },
    { id: 'stok', label: 'Stok Obat', icon: Pill },
    { id: 'periksa', label: 'Periksa Siswa', icon: ClipboardList },
    { id: 'screening', label: 'Screening', icon: Search },
    { id: 'laporan', label: 'Laporan', icon: FileText },
  ];

  return (
    <div className="h-full bg-[#f8fafc] flex flex-col animate-in fade-in duration-500 relative overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-[#001529] text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <HeartPulse size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-lg font-black tracking-tighter leading-none truncate">UKS SMPN7</h1>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-none mt-1 hidden sm:block">Unit Kesehatan Sekolah</p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden xl:flex items-center space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm ${
                    activeTab === item.id 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
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
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                    activeTab === item.id 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 hidden md:block">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Sistem Informasi Unit Kesehatan Sekolah SMPN 7 Pasuruan</p>
          </div>
          {activeTab === 'dashboard' && <UksDashboard />}
          {activeTab === 'master' && <UksMaster />}
          {activeTab === 'stok' && <UksStokObat />}
          {activeTab === 'periksa' && <UksPeriksa />}
          {activeTab === 'screening' && <UksScreening />}
          {activeTab === 'laporan' && <UksLaporan />}
        </div>
      </main>
    </div>
  );
};

export default UksApp;
