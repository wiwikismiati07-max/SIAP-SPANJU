import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Calendar, Menu, X, UserCheck, AlertTriangle, Database, LogOut } from 'lucide-react';
import DashboardIzin from './DashboardIzin';
import MasterIzin from './MasterIzin';
import FormWaliMurid from './FormWaliMurid';
import FormOperatorIzin from './FormOperatorIzin';
import LaporanIzin from './LaporanIzin';
import LaporanPanggilan from './LaporanPanggilan';
import KalenderBelajar from './KalenderBelajar';
import Login from './Login';
import { supabase } from '../../lib/supabase';

export default function IzinSiswaApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'wali' | 'operator' | 'laporan' | 'panggilan' | 'kalender'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPublicMode, setIsPublicMode] = useState(false);

  useEffect(() => {
    checkUser();
    
    const handlePublicForm = () => {
      setIsPublicMode(true);
      setActiveTab('wali');
    };

    window.addEventListener('showPublicForm', handlePublicForm);

    const { data: authListener } = supabase?.auth.onAuthStateChanged((_event, session) => {
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email || null);
      if (session) setIsPublicMode(false);
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      window.removeEventListener('showPublicForm', handlePublicForm);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email || null);
    } else {
      const localLogin = localStorage.getItem('isLoggedIn') === 'true';
      setIsLoggedIn(localLogin);
      if (localLogin) setUserEmail('admin@local.storage');
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('isLoggedIn');
      setIsLoggedIn(false);
    }
    setIsPublicMode(false);
  };

  // Halaman Form Wali Murid tetap bisa diakses tanpa login jika diinginkan, 
  // tapi untuk keamanan penuh, kita proteksi semua kecuali jika user memilih menu Wali Murid secara eksplisit?
  // Biasanya Form Wali Murid adalah link publik. 
  // Namun di sini kita buat sistem login utama.

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLoggedIn && !isPublicMode) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {!isPublicMode && (
            <button 
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 hidden md:flex">
            <UserCheck size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">Izin Siswa <span className="text-[10px] font-normal text-slate-400">v1.2</span></h1>
            <p className="text-[10px] md:text-xs text-slate-500">{isPublicMode ? 'Form Pengajuan Izin (Publik)' : (userEmail || 'Sistem Informasi Perizinan Siswa')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium mr-4">
            <Calendar size={16} />
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          
          {isPublicMode ? (
            <button 
              onClick={() => setIsPublicMode(false)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-100 transition-colors"
            >
              <LogIn size={14} />
              <span className="hidden sm:inline">Login Staff</span>
            </button>
          ) : (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-100 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}

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
        {!isPublicMode && (
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
        )}

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
