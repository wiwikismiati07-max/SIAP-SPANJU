import React, { useState } from 'react';
import { LayoutDashboard, Database, ClipboardList, FileText, ChevronLeft, HeartPulse, Activity, Pill, Search } from 'lucide-react';
import UksDashboard from './UksDashboard';
import UksMaster from './UksMaster';
import UksStokObat from './UksStokObat';
import UksPeriksa from './UksPeriksa';
import UksScreening from './UksScreening';
import UksLaporan from './UksLaporan';

interface UksAppProps {
  onBack: () => void;
}

const UksApp: React.FC<UksAppProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'stok' | 'periksa' | 'screening' | 'laporan'>('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master', label: 'Master Keluhan', icon: Database },
    { id: 'stok', label: 'Stok Obat', icon: Pill },
    { id: 'periksa', label: 'Periksa Siswa', icon: ClipboardList },
    { id: 'screening', label: 'Screening', icon: Search },
    { id: 'laporan', label: 'Laporan', icon: FileText },
  ];

  return (
    <div className="h-full bg-[#f8fafc] flex animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-80 bg-[#001529] text-white flex flex-col shadow-2xl shrink-0">
        <div className="p-10 border-b border-white/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
              <HeartPulse size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">UKS SMPN7</h1>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Unit Kesehatan Sekolah</p>
            </div>
          </div>
          
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Kembali ke Menu Utama
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 mt-8">
          <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Menu Utama</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 translate-x-2' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Status Sistem</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold text-slate-300 tracking-wide">Terhubung ke Supabase</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-12 py-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Sistem Informasi Unit Kesehatan Sekolah SMPN 7 Pasuruan</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-black text-slate-800">Administrator</p>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Online</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200">
              <Activity size={24} />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <UksDashboard />}
            {activeTab === 'master' && <UksMaster />}
            {activeTab === 'stok' && <UksStokObat />}
            {activeTab === 'periksa' && <UksPeriksa />}
            {activeTab === 'screening' && <UksScreening />}
            {activeTab === 'laporan' && <UksLaporan />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UksApp;
