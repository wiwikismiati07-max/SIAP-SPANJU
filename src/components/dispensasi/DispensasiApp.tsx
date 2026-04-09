import React, { useState } from 'react';
import { LayoutDashboard, Database, PlusCircle, FileBarChart, ArrowLeft, Menu, X } from 'lucide-react';
import DispDashboard from './DispDashboard';
import DispMasterData from './DispMasterData';
import DispInputData from './DispInputData';
import DispLaporan from './DispLaporan';

interface DispensasiAppProps {
  onBack: () => void;
}

const DispensasiApp: React.FC<DispensasiAppProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'input' | 'laporan'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'input', label: 'Input Data', icon: PlusCircle, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'laporan', label: 'Laporan', icon: FileBarChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'master', label: 'Master Data', icon: Database, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row relative">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Si-DISPENSASI</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col z-50 transition-transform duration-300 md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-50">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-slate-400 hover:text-slate-600 transition-colors mb-6 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Kembali ke Menu</span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">Si-DISPENSASI</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Siswa SMPN 7</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id 
                  ? `${item.bg} ${item.color} shadow-sm ring-1 ring-slate-100` 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? item.color : 'text-slate-400 group-hover:text-slate-600'} />
              <span className={`text-sm font-bold ${activeTab === item.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                {item.label}
              </span>
              {activeTab === item.id && (
                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${item.color.replace('text', 'bg')}`} />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Sistem</p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-white">Terhubung Supabase</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto pb-12">
          {activeTab === 'dashboard' && <DispDashboard />}
          {activeTab === 'master' && <DispMasterData />}
          {activeTab === 'input' && <DispInputData />}
          {activeTab === 'laporan' && <DispLaporan />}
        </div>
      </div>
    </div>
  );
};

export default DispensasiApp;
