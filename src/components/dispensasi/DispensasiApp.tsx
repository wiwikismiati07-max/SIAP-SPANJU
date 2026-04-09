import React, { useState } from 'react';
import { LayoutDashboard, Database, PlusCircle, FileBarChart, ArrowLeft, Menu, X, MoreVertical } from 'lucide-react';
import DispDashboard from './DispDashboard';
import DispMasterData from './DispMasterData';
import DispInputData from './DispInputData';
import DispLaporan from './DispLaporan';

interface DispensasiAppProps {
  onBack: () => void;
  onOpenSidebar?: () => void;
}

const DispensasiApp: React.FC<DispensasiAppProps> = ({ onBack, onOpenSidebar }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'input' | 'laporan'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'input', label: 'Input Data', icon: PlusCircle, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'laporan', label: 'Laporan', icon: FileBarChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'master', label: 'Master Data', icon: Database, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
                  <span className="text-white font-black text-xl">S</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-lg font-black text-slate-800 leading-tight truncate">Si-DISPENSASI</h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter hidden sm:block">Siswa SMPN 7</p>
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
            <div className="flex items-center gap-2">
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
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                title="Menu Aplikasi"
              >
                {isSidebarOpen ? <X size={24} /> : <MoreVertical size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar/Drawer */}
      <div 
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        <div 
          className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform ${
            isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-blue-600 flex items-center justify-center text-white">
                  <span className="font-black text-xs">S</span>
                </div>
                <span className="font-bold text-slate-800">Menu Navigasi</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                    activeTab === item.id 
                      ? `${item.bg} ${item.color} shadow-sm` 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

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
