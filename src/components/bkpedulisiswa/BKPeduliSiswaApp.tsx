import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Database, Menu, X, LogOut, ShieldCheck, AlertCircle, ClipboardList, PlusCircle, MoreVertical } from 'lucide-react';
import BKDashboard from './BKDashboard';
import BKMasterKasus from './BKMasterKasus';
import BKTransaksiKasus from './BKTransaksiKasus';
import BKLaporan from './BKLaporan';
import Login from '../izinsiswa/Login';
import { supabase } from '../../lib/supabase';

export default function BKPeduliSiswaApp({ onBack, onOpenSidebar }: { onBack?: () => void, onOpenSidebar?: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'transaksi' | 'laporan' | 'users'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

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
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        title="BK_PEDULI SISWA SMPN7"
        subtitle="Digital Counseling System Login"
        colorClass="bg-pink-600"
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600">
                <Users size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-lg font-bold text-slate-800 leading-tight uppercase tracking-tight truncate">BK_PEDULI SISWA SMPN7 <span className="text-[10px] font-normal text-slate-400 normal-case hidden sm:inline">v1.0</span></h1>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  Halo, {user.nama_lengkap || user.username}
                </p>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                  activeTab === 'dashboard' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('transaksi')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                  activeTab === 'transaksi' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PlusCircle size={18} />
                <span>Input Kasus</span>
              </button>
              <button
                onClick={() => setActiveTab('laporan')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                  activeTab === 'laporan' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={18} />
                <span>Laporan</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('master')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${
                    activeTab === 'master' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Database size={18} />
                  <span>Master</span>
                </button>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogout}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Keluar"
              >
                <LogOut size={20} />
              </button>

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
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                title="Menu Aplikasi"
              >
                {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar/Drawer */}
      <div 
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <div 
          className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center text-white">
                  <Users size={18} />
                </div>
                <span className="font-bold text-slate-800">Menu BK Peduli</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                  activeTab === 'dashboard' ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => { setActiveTab('transaksi'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                  activeTab === 'transaksi' ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PlusCircle size={20} />
                <span>Input Kasus</span>
              </button>
              <button
                onClick={() => { setActiveTab('laporan'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                  activeTab === 'laporan' ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText size={20} />
                <span>Laporan</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => { setActiveTab('master'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                    activeTab === 'master' ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Database size={20} />
                  <span>Master Kasus</span>
                </button>
              )}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50 transition-all font-semibold"
              >
                <LogOut size={20} />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto pb-12">
          {activeTab === 'dashboard' && <BKDashboard />}
          {activeTab === 'transaksi' && <BKTransaksiKasus />}
          {activeTab === 'laporan' && <BKLaporan />}
          {activeTab === 'master' && <BKMasterKasus />}
        </div>
      </div>
    </div>
  );
}
