import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  LayoutDashboard, 
  PlusCircle, 
  FileBarChart, 
  Menu, 
  X, 
  MoreVertical,
  Calendar,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { JurnalPembelajaran } from '../../types/jurnalpembelajaran';
import { fetchAllJurnal } from '../../lib/jurnalService';
import { JurnalDashboard } from './JurnalDashboard';
import { JurnalForm } from './JurnalForm';
import { JurnalLaporan } from './JurnalLaporan';
import { JurnalDetailModal } from './JurnalDetailModal';

interface JurnalPembelajaranAppProps {
  onBack: () => void;
  onOpenSidebar?: () => void;
  user?: any;
}

export default function JurnalPembelajaranApp({ onBack, onOpenSidebar, user }: JurnalPembelajaranAppProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input' | 'laporan'>('dashboard');
  const [jurnalList, setJurnalList] = useState<JurnalPembelajaran[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingJurnal, setEditingJurnal] = useState<JurnalPembelajaran | null>(null);
  const [viewingJurnal, setViewingJurnal] = useState<JurnalPembelajaran | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  // Cek apakah akun yang sedang aktif adalah akun Tamu (Wali Murid)
  const isTamu = 
    (user?.username || '').toLowerCase().trim() === 'tamu' || 
    (user?.role || '').toLowerCase().trim() === 'tamu' || 
    user?.id === 'user_tamu_walimurid' ||
    (user?.nama_lengkap || '').toLowerCase().includes('wali murid') ||
    (user?.nama_lengkap || '').toLowerCase().includes('tamu');

  const isViewer = user?.role === 'view';

  // Load all journals (Hanya untuk Non-Tamu)
  const loadData = async () => {
    if (isTamu) return;
    setIsLoading(true);
    const data = await fetchAllJurnal();
    setJurnalList(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isTamu) {
      loadData();
    }
  }, [isTamu]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-amber-600', bg: 'bg-amber-50' },
    ...(!isViewer ? [{ id: 'input', label: 'Input Jurnal', icon: PlusCircle, color: 'text-orange-600', bg: 'bg-orange-50' }] : []),
    { id: 'laporan', label: 'Laporan', icon: FileBarChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const handleEditJurnal = (jurnal: JurnalPembelajaran) => {
    setEditingJurnal(jurnal);
    setActiveTab('input');
  };

  const handleFormSaved = () => {
    setEditingJurnal(null);
    loadData();
    setActiveTab('laporan');
  };

  if (isTamu) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-200/80">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-5 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Akses Terbatas</h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Akun <span className="font-bold text-slate-800">Tamu (Wali Murid)</span> tidak diizinkan membuka <span className="font-bold text-slate-800">Jurnal Pembelajaran</span>. Fitur ini dikhususkan bagi Bapak/Ibu Guru dan Tenaga Kependidikan SMPN 7 Pasuruan.
          </p>
          <button
            onClick={onBack}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm uppercase tracking-wider"
          >
            Kembali ke Menu Utama
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#f8fafc] flex flex-col relative overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 group transition-all active:scale-95 shrink-0"
                title="Kembali ke Menu Aplikasi"
              >
                <img src={LOGO_URL} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" referrerPolicy="no-referrer" />
                <div className="text-left">
                  <div className="text-[8px] md:text-[10px] font-black text-slate-400 leading-none">SIAP</div>
                  <div className="text-xs md:text-sm font-black text-slate-800 leading-none">SPANJU</div>
                </div>
              </button>
              
              <div className="h-8 w-px bg-slate-200 shrink-0" />

              <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs md:text-lg font-black text-slate-800 leading-tight truncate uppercase tracking-tight">
                    JURNAL PEMBELAJARAN
                  </h1>
                  <p className="text-[8px] md:text-[10px] text-amber-600 font-bold uppercase tracking-wider hidden sm:block">
                    Agenda Belajar & Evaluasi Siswa (SMPN 7)
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id !== 'input') setEditingJurnal(null);
                    setActiveTab(item.id as any);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm ${
                    activeTab === item.id 
                      ? `${item.bg} ${item.color} shadow-sm ring-1 ring-slate-100` 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2">
              <button 
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={onOpenSidebar}
                title="Menu Utama Aplikasi"
              >
                <Menu size={24} />
              </button>

              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors md:hidden"
                title="Menu Internal Jurnal"
              >
                {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
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
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                  <BookOpen size={18} />
                </div>
                <span className="font-bold text-slate-800 text-sm">Jurnal Pembelajaran</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id !== 'input') setEditingJurnal(null);
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
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

      {/* Main App Body */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto pb-12">
          {activeTab === 'dashboard' && (
            <JurnalDashboard 
              jurnalList={jurnalList} 
              onNavigateTab={setActiveTab}
              onViewDetail={(j) => setViewingJurnal(j)}
            />
          )}

          {activeTab === 'input' && (
            <JurnalForm
              initialData={editingJurnal}
              onSaved={handleFormSaved}
              onCancel={() => {
                setEditingJurnal(null);
                setActiveTab('laporan');
              }}
            />
          )}

          {activeTab === 'laporan' && (
            <JurnalLaporan
              jurnalList={jurnalList}
              onRefresh={loadData}
              onEditJurnal={handleEditJurnal}
            />
          )}
        </div>
      </div>

      {/* Modal for viewing details from dashboard */}
      <JurnalDetailModal
        jurnal={viewingJurnal}
        onClose={() => setViewingJurnal(null)}
        onEdit={(j) => {
          setViewingJurnal(null);
          handleEditJurnal(j);
        }}
      />
    </div>
  );
}
