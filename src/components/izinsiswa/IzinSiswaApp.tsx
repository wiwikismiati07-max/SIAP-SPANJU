import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Calendar, Menu, X, UserCheck, AlertTriangle, Database, LogOut, ShieldCheck } from 'lucide-react';
import DashboardIzin from './DashboardIzin';
import MasterIzin from './MasterIzin';
import FormWaliMurid from './FormWaliMurid';
import FormOperatorIzin from './FormOperatorIzin';
import LaporanIzin from './LaporanIzin';
import LaporanPanggilan from './LaporanPanggilan';
import KalenderBelajar from './KalenderBelajar';
import UserManagement from './UserManagement';
import Login from './Login';
import { supabase } from '../../lib/supabase';

export default function IzinSiswaApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'wali' | 'operator' | 'laporan' | 'panggilan' | 'kalender' | 'users'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [isPublicMode, setIsPublicMode] = useState(true); // Default public mode for Dashboard & Wali Murid

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsLoggedIn(true);
      setIsPublicMode(false);
    }
    
    const handlePublicForm = () => {
      setIsPublicMode(true);
      setActiveTab('wali');
    };

    window.addEventListener('showPublicForm', handlePublicForm);
    return () => window.removeEventListener('showPublicForm', handlePublicForm);
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsLoggedIn(true);
    setIsPublicMode(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('app_user');
    setUser(null);
    setIsLoggedIn(false);
    setIsPublicMode(true);
    setActiveTab('dashboard');
  };

  // Logic for role-based access
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const isAdmin = user?.role === 'full';

  // If not logged in and trying to access restricted tabs, show login
  const restrictedTabs = ['master', 'operator', 'laporan', 'panggilan', 'users'];
  const isAccessingRestricted = restrictedTabs.includes(activeTab);

  if (!isLoggedIn && isAccessingRestricted) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'wali', label: 'Form Wali Murid', icon: Users },
    { id: 'operator', label: 'Absensi Siswa', icon: UserCheck, staff: true },
    { id: 'kalender', label: 'Kalender Belajar', icon: Calendar, staff: true },
    { id: 'laporan', label: 'Laporan Detail', icon: FileText, staff: true },
    { id: 'panggilan', label: 'Panggilan Orang Tua', icon: AlertTriangle, staff: true },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'master', label: 'Master Data', icon: Database, staff: true });
    menuItems.push({ id: 'users', label: 'Setup Login', icon: ShieldCheck, staff: true });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <UserCheck size={24} />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-slate-800 leading-tight">Izin Siswa <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">v1.2</span></h1>
                <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                  {isLoggedIn ? `Halo, ${user.nama_lengkap || user.username}` : 'Sistem Informasi Perizinan Siswa'}
                </p>
              </div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden xl:flex items-center space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 font-semibold text-xs ${
                    activeTab === item.id 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Menu Toggle & Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Calendar size={12} />
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </div>
              
              {isLoggedIn ? (
                <button 
                  onClick={handleLogout}
                  className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
                  title="Keluar"
                >
                  <LogOut size={18} />
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('operator')}
                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
                  title="Login Staff"
                >
                  <UserCheck size={18} />
                </button>
              )}

              <button 
                className="xl:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
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
        <div className="xl:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute top-20 left-0 right-0 bg-white border-b border-slate-200 p-4 space-y-2 shadow-xl animate-in slide-in-from-top duration-300 max-h-[70vh] overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all font-semibold ${
                  activeTab === item.id 
                    ? 'bg-emerald-600 text-white shadow-md' 
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
          {activeTab === 'dashboard' && <DashboardIzin />}
          {activeTab === 'wali' && <FormWaliMurid />}
          {activeTab === 'operator' && <FormOperatorIzin />}
          {activeTab === 'kalender' && <KalenderBelajar />}
          {activeTab === 'laporan' && <LaporanIzin />}
          {activeTab === 'panggilan' && <LaporanPanggilan />}
          {activeTab === 'master' && <MasterIzin />}
          {activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  );
}
