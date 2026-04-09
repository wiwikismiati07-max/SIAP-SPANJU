import React, { useState } from 'react';
import { Trophy, LayoutDashboard, FileEdit, FileText, ChevronLeft, Menu, X, MoreVertical } from 'lucide-react';
import PrestasiDashboard from './PrestasiDashboard';
import PrestasiInput from './PrestasiInput';
import PrestasiLaporan from './PrestasiLaporan';

interface PrestasiAppProps {
  onBack: () => void;
}

const PrestasiApp: React.FC<PrestasiAppProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input' | 'laporan'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'input', label: 'Input Data', icon: FileEdit },
    { id: 'laporan', label: 'Laporan', icon: FileText },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3 min-w-0">
              <button 
                onClick={onBack}
                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all group shrink-0"
                title="Kembali ke Menu"
              >
                <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-100 shrink-0">
                  <Trophy className="text-white" size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-lg font-black text-slate-800 leading-tight truncate">Si-PRESTASI</h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter hidden sm:block">Prestasi Siswa</p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center space-x-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all duration-300 font-black uppercase tracking-widest text-xs ${
                    activeTab === item.id 
                      ? 'bg-purple-600 text-white shadow-xl shadow-purple-100' 
                      : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-500 hover:bg-purple-50 rounded-xl transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar/Drawer */}
      <div 
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
        <div 
          className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                  <Trophy size={18} />
                </div>
                <span className="font-bold text-slate-800">Menu Prestasi</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-black uppercase tracking-widest text-xs ${
                    activeTab === item.id 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
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

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto pb-12">
          {activeTab === 'dashboard' && <PrestasiDashboard />}
          {activeTab === 'input' && <PrestasiInput />}
          {activeTab === 'laporan' && <PrestasiLaporan />}
        </div>
      </div>
    </div>
  );
};

export default PrestasiApp;
