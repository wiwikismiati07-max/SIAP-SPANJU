import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Database, Menu, X, LogOut, ShieldCheck, AlertCircle, ClipboardList, PlusCircle } from 'lucide-react';
import BKDashboard from './BKDashboard';
import BKMasterPelanggaran from './BKMasterPelanggaran';
import BKTransaksiPelanggaran from './BKTransaksiPelanggaran';
import BKLaporan from './BKLaporan';
import Login from '../izinsiswa/Login';
import { supabase } from '../../lib/supabase';

export default function BKPeduliSiswaApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'transaksi' | 'laporan' | 'users'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('app_user');
    setUser(null);
    setIsLoggedIn(false);
    setActiveTab('dashboard');
  };

  // Logic for role-based access
  const isAdmin = user?.role === 'full';

  // If not logged in, show login (BK Peduli Siswa is internal only)
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

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
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 hidden md:flex">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">BK Peduli Siswa <span className="text-[10px] font-normal text-slate-400">v1.0</span></h1>
            <p className="text-[10px] md:text-xs text-slate-500">
              Halo, {user.nama_lengkap || user.username} ({user.role}) - Digital Counseling System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-100 transition-colors"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          {supabase ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 shadow-sm">
              <Database size={14} />
              <span className="hidden sm:inline">Supabase</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200 shadow-sm">
              <Database size={14} />
              Local
            </div>
          )}
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
              activeTab === 'dashboard' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="font-semibold">Dashboard</span>
          </button>
          
          <div className="h-px bg-slate-100 my-2" />
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Counseling</p>

          <button
            onClick={() => { setActiveTab('transaksi'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'transaksi' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle size={20} />
            <span className="font-semibold">Transaksi</span>
          </button>
          <button
            onClick={() => { setActiveTab('laporan'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'laporan' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={20} />
            <span className="font-semibold">Laporan</span>
          </button>

          {isAdmin && (
            <>
              <div className="h-px bg-slate-100 my-2" />
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator</p>
              <button
                onClick={() => { setActiveTab('master'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === 'master' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Database size={20} />
                <span className="font-semibold">Master</span>
              </button>
            </>
          )}
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
          {activeTab === 'dashboard' && <BKDashboard />}
          {activeTab === 'transaksi' && <BKTransaksiPelanggaran />}
          {activeTab === 'laporan' && <BKLaporan />}
          {activeTab === 'master' && <BKMasterPelanggaran />}
        </div>
      </div>
    </div>
  );
}
