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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <button 
                onClick={onBack}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all group"
                title="Kembali ke Menu"
              >
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                  <span className="text-white font-black text-xl">S</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-black text-slate-800 leading-tight">Si-DISPENSASI</h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Siswa SMPN 7</p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center space-x-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                    activeTab === item.id 
                      ? `${item.bg} ${item.color} shadow-sm ring-1 ring-slate-100` 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-sm font-bold">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute top-20 left-0 right-0 bg-white border-b border-slate-100 p-4 space-y-2 shadow-xl animate-in slide-in-from-top duration-300">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${
                  activeTab === item.id 
                    ? `${item.bg} ${item.color}` 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <item.icon size={20} />
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto pb-12">
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
