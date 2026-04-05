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

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 hidden md:flex">
            <Clock size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">Siswa Terlambat Hadir</h1>
            <p className="text-[10px] md:text-xs text-slate-500">Sistem Informasi Monitoring Pendidikan</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium">
          <Clock size={16} className="hidden md:block" />
          {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar for Si-Telat */}
        <div className={`
          absolute md:relative z-20 h-full w-64 bg-white border-r border-slate-200 flex flex-col p-4 gap-2 shrink-0 transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="font-semibold">Beranda</span>
          </button>
          <button
            onClick={() => { setActiveTab('pencatatan'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'pencatatan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock size={20} />
            <span className="font-semibold">Absensi Siswa</span>
          </button>
          <button
            onClick={() => { setActiveTab('master'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'master' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={20} />
            <span className="font-semibold">Operator / Master</span>
          </button>
          <button
            onClick={() => { setActiveTab('laporan'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'laporan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={20} />
            <span className="font-semibold">Report</span>
          </button>
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div 
            className="absolute inset-0 bg-black/20 z-10 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'pencatatan' && <Pencatatan />}
          {activeTab === 'master' && <MasterData />}
          {activeTab === 'laporan' && <Laporan />}
        </div>
      </div>
    </div>
  );
}
