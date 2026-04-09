import React, { useState } from 'react';
import { LayoutDashboard, Database, ClipboardList, FileText, ChevronLeft, Menu, X } from 'lucide-react';
import KeagamaanDashboard from './KeagamaanDashboard';
import KeagamaanMaster from './KeagamaanMaster';
import KeagamaanAbsensi from './KeagamaanAbsensi';
import KeagamaanLaporan from './KeagamaanLaporan';

interface KeagamaanAppProps {
  onBack: () => void;
}

const KeagamaanApp: React.FC<KeagamaanAppProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'absensi' | 'laporan'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master', label: 'Master Data', icon: Database },
    { id: 'absensi', label: 'Input Absen', icon: ClipboardList },
    { id: 'laporan', label: 'Laporan', icon: FileText },
  ];

  return (
    <div className="h-full bg-[#f8fafc] flex flex-col animate-in fade-in duration-500 relative">
      {/* Top Navigation Bar */}
      <div className="bg-[#001529] text-white sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
              >
                <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ClipboardList size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tighter leading-none">SIM-AGAMA</h1>
                  <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest leading-none mt-1 hidden sm:block">Panel Admin</p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300 text-sm ${
                    activeTab === item.id 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-slate-400 hover:bg-white/10 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute top-20 left-0 right-0 bg-[#001529] text-white p-4 space-y-2 shadow-xl animate-in slide-in-from-top duration-300">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 hidden md:block">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Sistem Informasi Monitoring Kegiatan Keagamaan</p>
          </div>
          {activeTab === 'dashboard' && <KeagamaanDashboard />}
          {activeTab === 'master' && <KeagamaanMaster />}
          {activeTab === 'absensi' && <KeagamaanAbsensi />}
          {activeTab === 'laporan' && <KeagamaanLaporan />}
        </div>
      </main>
    </div>
  );
};

export default KeagamaanApp;
