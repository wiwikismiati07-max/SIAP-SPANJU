import React, { useState } from 'react';
import { LayoutDashboard, Users, FileText, Calendar, Menu, X, UserCheck, AlertTriangle } from 'lucide-react';
import DashboardIzin from './DashboardIzin';
import MasterIzin from './MasterIzin';
import FormWaliMurid from './FormWaliMurid';
import FormOperatorIzin from './FormOperatorIzin';
import LaporanIzin from './LaporanIzin';
import LaporanPanggilan from './LaporanPanggilan';
import KalenderBelajar from './KalenderBelajar';

export default function IzinSiswaApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'wali' | 'operator' | 'laporan' | 'panggilan' | 'kalender'>('dashboard');
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
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 hidden md:flex">
            <UserCheck size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">Izin Siswa</h1>
            <p className="text-[10px] md:text-xs text-slate-500">Sistem Informasi Perizinan Siswa</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium">
          <Calendar size={16} className="hidden md:block" />
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className={`
          absolute md:relative z-20 h-full w-64 bg-white border-r border-slate-200 flex flex-col p-4 gap-2 shrink-0 transition-transform duration-300 overflow-y-auto
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="font-semibold">Beranda</span>
          </button>
          <button
            onClick={() => { setActiveTab('wali'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'wali' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={20} />
            <span className="font-semibold">Form Wali Murid</span>
          </button>
          <button
            onClick={() => { setActiveTab('operator'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'operator' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck size={20} />
            <span className="font-semibold">Form Izin (Operator)</span>
          </button>
          <button
            onClick={() => { setActiveTab('kalender'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'kalender' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar size={20} />
            <span className="font-semibold">Kalender Belajar</span>
          </button>
          <button
            onClick={() => { setActiveTab('laporan'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'laporan' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={20} />
            <span className="font-semibold">Laporan Detail</span>
          </button>
          <button
            onClick={() => { setActiveTab('panggilan'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'panggilan' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={20} />
            <span className="font-semibold">Panggilan Orang Tua</span>
          </button>
          <button
            onClick={() => { setActiveTab('master'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'master' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={20} />
            <span className="font-semibold">Master Data</span>
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
          {activeTab === 'dashboard' && <DashboardIzin />}
          {activeTab === 'wali' && <FormWaliMurid />}
          {activeTab === 'operator' && <FormOperatorIzin />}
          {activeTab === 'kalender' && <KalenderBelajar />}
          {activeTab === 'laporan' && <LaporanIzin />}
          {activeTab === 'panggilan' && <LaporanPanggilan />}
          {activeTab === 'master' && <MasterIzin />}
        </div>
      </div>
    </div>
  );
}
