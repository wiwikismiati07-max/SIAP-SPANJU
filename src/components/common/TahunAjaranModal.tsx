import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  ChevronDown, 
  Check, 
  X, 
  Calendar, 
  Sparkles,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface TahunAjaranModalProps {
  selectedPeriode: string;
  onChange: (periode: string) => void;
  availablePeriodes?: string[];
  themeColor?: 'emerald' | 'blue' | 'indigo' | 'purple' | 'pink' | 'amber' | 'rose' | 'teal';
  className?: string;
  label?: string;
}

export default function TahunAjaranModal({
  selectedPeriode,
  onChange,
  availablePeriodes: propPeriodes,
  themeColor = 'blue',
  className = '',
  label = 'Tahun Ajaran'
}: TahunAjaranModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [periodes, setPeriodes] = useState<string[]>(propPeriodes || ['2026', '2025']);

  // If prop periodes change, update internal
  useEffect(() => {
    if (propPeriodes && propPeriodes.length > 0) {
      setPeriodes(propPeriodes);
    } else {
      fetchAvailablePeriodes();
    }
  }, [propPeriodes]);

  const fetchAvailablePeriodes = async () => {
    try {
      if (supabase) {
        const { data } = await supabase.from('master_siswa').select('periode');
        if (data && data.length > 0) {
          const distinct = Array.from(new Set(['2026', '2025', ...data.map(s => s.periode || '2025')]))
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
          setPeriodes(distinct);
        }
      } else {
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        const distinct = Array.from(new Set(['2026', '2025', ...localSiswa.map((s: any) => s.periode || '2025')]))
          .filter(Boolean)
          .sort((a: any, b: any) => b.localeCompare(a));
        setPeriodes(distinct as string[]);
      }
    } catch (e) {
      console.error('Error fetching periodes:', e);
    }
  };

  const colorMap = {
    emerald: {
      btnBg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200',
      activeItem: 'bg-emerald-600 text-white shadow-md shadow-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: 'text-emerald-600',
      headerBg: 'from-emerald-600 to-teal-700'
    },
    blue: {
      btnBg: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200',
      activeItem: 'bg-blue-600 text-white shadow-md shadow-blue-200',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: 'text-blue-600',
      headerBg: 'from-blue-600 to-indigo-700'
    },
    indigo: {
      btnBg: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200',
      activeItem: 'bg-indigo-600 text-white shadow-md shadow-indigo-200',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: 'text-indigo-600',
      headerBg: 'from-indigo-600 to-purple-700'
    },
    purple: {
      btnBg: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200',
      activeItem: 'bg-purple-600 text-white shadow-md shadow-purple-200',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: 'text-purple-600',
      headerBg: 'from-purple-600 to-pink-700'
    },
    pink: {
      btnBg: 'bg-pink-50 hover:bg-pink-100 text-pink-800 border-pink-200',
      activeItem: 'bg-pink-600 text-white shadow-md shadow-pink-200',
      badge: 'bg-pink-100 text-pink-800 border-pink-300',
      icon: 'text-pink-600',
      headerBg: 'from-pink-600 to-rose-700'
    },
    amber: {
      btnBg: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200',
      activeItem: 'bg-amber-600 text-white shadow-md shadow-amber-200',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: 'text-amber-600',
      headerBg: 'from-amber-600 to-orange-700'
    },
    rose: {
      btnBg: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200',
      activeItem: 'bg-rose-600 text-white shadow-md shadow-rose-200',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: 'text-rose-600',
      headerBg: 'from-rose-600 to-red-700'
    },
    teal: {
      btnBg: 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200',
      activeItem: 'bg-teal-600 text-white shadow-md shadow-teal-200',
      badge: 'bg-teal-100 text-teal-800 border-teal-300',
      icon: 'text-teal-600',
      headerBg: 'from-teal-600 to-emerald-700'
    }
  };

  const currentTheme = colorMap[themeColor] || colorMap.blue;

  const getDisplayText = () => {
    if (selectedPeriode === 'ALL') return 'Semua Tahun Ajaran';
    return `Periode ${selectedPeriode}`;
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button styled like the Periode Izin dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 transition-all shadow-sm font-semibold text-left ${currentTheme.btnBg}`}
      >
        <div className={`p-1 rounded-lg bg-white/80 shadow-xs ${currentTheme.icon}`}>
          <GraduationCap size={16} />
        </div>
        <div className="flex flex-col min-w-[120px]">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none mb-0.5">
            {label}
          </span>
          <span className="text-xs sm:text-sm font-black truncate">
            {getDisplayText()}
          </span>
        </div>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${currentTheme.icon}`} />
      </button>

      {/* Popup Modal / Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for closing */}
            <div 
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" 
              onClick={() => setIsOpen(false)} 
            />

            {/* Popup Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${currentTheme.headerBg} p-4 text-white flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
                    <GraduationCap size={18} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black leading-tight">Pilih Periode / Tahun Ajaran</h4>
                    <p className="text-[11px] text-white/80">Saring laporan per tahun ajaran</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Options List */}
              <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
                {periodes.map(p => {
                  const isSelected = selectedPeriode === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        onChange(p);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left font-bold text-xs sm:text-sm transition-all ${
                        isSelected 
                          ? currentTheme.activeItem 
                          : 'hover:bg-slate-100 text-slate-700 bg-slate-50/70 border border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar size={16} className={isSelected ? 'text-white' : 'text-slate-400'} />
                        <div>
                          <div className="font-black">Periode {p}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            Tahun Ajaran {p}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="p-1 bg-white/20 rounded-full">
                          <Check size={14} className="text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Option: Semua Periode */}
                <button
                  type="button"
                  onClick={() => {
                    onChange('ALL');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left font-bold text-xs sm:text-sm transition-all ${
                    selectedPeriode === 'ALL' 
                      ? currentTheme.activeItem 
                      : 'hover:bg-slate-100 text-slate-700 bg-slate-50/70 border border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers size={16} className={selectedPeriode === 'ALL' ? 'text-white' : 'text-slate-400'} />
                    <div>
                      <div className="font-black">Semua Periode / Tahun Ajaran</div>
                      <div className={`text-[10px] ${selectedPeriode === 'ALL' ? 'text-white/80' : 'text-slate-400'}`}>
                        Tampilkan data seluruh tahun ajaran
                      </div>
                    </div>
                  </div>
                  {selectedPeriode === 'ALL' && (
                    <div className="p-1 bg-white/20 rounded-full">
                      <Check size={14} className="text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-4">
                <span>Terpilih: <strong>{getDisplayText()}</strong></span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
