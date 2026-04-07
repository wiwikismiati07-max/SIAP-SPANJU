import React, { useState } from 'react';
import { Trophy, LayoutDashboard, FileEdit, FileText, ChevronLeft } from 'lucide-react';
import PrestasiDashboard from './PrestasiDashboard';
import PrestasiInput from './PrestasiInput';
import PrestasiLaporan from './PrestasiLaporan';

interface PrestasiAppProps {
  onBack: () => void;
}

const PrestasiApp: React.FC<PrestasiAppProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input' | 'laporan'>('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'input', label: 'Input Data', icon: FileEdit },
    { id: 'laporan', label: 'Laporan', icon: FileText },
  ];

  return (
    <div className="flex h-full bg-slate-50 font-sans">
      {/* Sidebar Si-Prestasi */}
      <div className="w-64 bg-white border-r border-slate-100 flex flex-col fixed h-full z-20">
        <div className="p-8 border-b border-slate-50">
          <button 
            onClick={onBack}
            className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-purple-600 transition-colors mb-6"
          >
            <ChevronLeft size={14} className="mr-1" />
            Kembali ke Menu
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-100">
              <Trophy className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">Si-PRESTASI</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Prestasi Siswa</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                activeTab === item.id
                  ? 'bg-purple-600 text-white shadow-xl shadow-purple-100 translate-x-2'
                  : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              <item.icon size={20} />
              <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="bg-purple-50 rounded-2xl p-4">
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Status Sistem</p>
            <div className="flex items-center text-xs font-bold text-slate-600">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
              Terhubung Supabase
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto pb-12">
          {activeTab === 'dashboard' && <PrestasiDashboard />}
          {activeTab === 'input' && <PrestasiInput />}
          {activeTab === 'laporan' && <PrestasiLaporan />}
        </div>
      </div>
    </div>
  );
};

export default PrestasiApp;
