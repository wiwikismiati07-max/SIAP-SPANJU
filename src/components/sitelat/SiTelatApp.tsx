import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Siswa, TransaksiTerlambat, TransaksiWithSiswa } from '../../types/sitelat';
import Dashboard from './Dashboard';
import MasterData from './MasterData';
import Pencatatan from './Pencatatan';
import Laporan from './Laporan';
import { LayoutDashboard, Users, Clock, Settings, Menu, X, FileText } from 'lucide-react';

export default function SiTelatApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pencatatan' | 'master' | 'laporan'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'pencatatan', label: 'Absensi Siswa', icon: Clock },
    { id: 'master', label: 'Operator / Master', icon: Users },
    { id: 'laporan', label: 'Report', icon: FileText },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Clock size={24} />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-slate-800 leading-tight">Siswa Terlambat Hadir</h1>
                <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Sistem Informasi Monitoring Pendidikan</p>
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
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Clock size={14} />
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button 
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute top-20 left-0 right-0 bg-white border-b border-slate-200 p-4 space-y-2 shadow-xl animate-in slide-in-from-top duration-300">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
