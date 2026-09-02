import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  X, 
  Check, 
  Clock, 
  RotateCcw, 
  CalendarRange, 
  ChevronDown,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  subDays, 
  startOfYear, 
  endOfYear,
  parseISO,
  differenceInCalendarDays,
  isValid
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export interface PeriodeFilterModalProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string, label?: string) => void;
  title?: string;
  themeColor?: 'emerald' | 'blue' | 'indigo' | 'purple' | 'pink' | 'amber' | 'rose' | 'teal';
  className?: string;
  buttonLabel?: string;
  showQuickBadges?: boolean;
}

export default function PeriodeFilterModal({
  startDate,
  endDate,
  onChange,
  title = 'Periode Laporan',
  themeColor = 'emerald',
  className = '',
  buttonLabel,
  showQuickBadges = false
}: PeriodeFilterModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate || '');
  const [tempEnd, setTempEnd] = useState(endDate || '');
  const [activePreset, setActivePreset] = useState<string>('');

  // Keep internal temp state in sync when props change
  useEffect(() => {
    setTempStart(startDate || '');
    setTempEnd(endDate || '');
    determineActivePreset(startDate, endDate);
  }, [startDate, endDate]);

  const currentYear = new Date().getFullYear();

  // Helper to safely format readable date
  const formatReadable = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = parseISO(dateStr);
      if (!isValid(d)) return dateStr;
      return format(d, 'd MMM yyyy', { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  // Color mappings
  const colorMap = {
    emerald: {
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activePreset: 'bg-emerald-600 text-white shadow-md shadow-emerald-200',
      focusRing: 'focus:ring-emerald-500',
      primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
      accentText: 'text-emerald-600',
      iconBg: 'bg-emerald-100 text-emerald-600'
    },
    blue: {
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      activePreset: 'bg-blue-600 text-white shadow-md shadow-blue-200',
      focusRing: 'focus:ring-blue-500',
      primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
      accentText: 'text-blue-600',
      iconBg: 'bg-blue-100 text-blue-600'
    },
    indigo: {
      btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activePreset: 'bg-indigo-600 text-white shadow-md shadow-indigo-200',
      focusRing: 'focus:ring-indigo-500',
      primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
      accentText: 'text-indigo-600',
      iconBg: 'bg-indigo-100 text-indigo-600'
    },
    purple: {
      btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      activePreset: 'bg-purple-600 text-white shadow-md shadow-purple-200',
      focusRing: 'focus:ring-purple-500',
      primaryBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200',
      accentText: 'text-purple-600',
      iconBg: 'bg-purple-100 text-purple-600'
    },
    pink: {
      btnBg: 'bg-pink-600 hover:bg-pink-700 text-white',
      badge: 'bg-pink-50 text-pink-700 border-pink-200',
      activePreset: 'bg-pink-600 text-white shadow-md shadow-pink-200',
      focusRing: 'focus:ring-pink-500',
      primaryBtn: 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-200',
      accentText: 'text-pink-600',
      iconBg: 'bg-pink-100 text-pink-600'
    },
    amber: {
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      activePreset: 'bg-amber-600 text-white shadow-md shadow-amber-200',
      focusRing: 'focus:ring-amber-500',
      primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
      accentText: 'text-amber-600',
      iconBg: 'bg-amber-100 text-amber-600'
    },
    rose: {
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      activePreset: 'bg-rose-600 text-white shadow-md shadow-rose-200',
      focusRing: 'focus:ring-rose-500',
      primaryBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
      accentText: 'text-rose-600',
      iconBg: 'bg-rose-100 text-rose-600'
    },
    teal: {
      btnBg: 'bg-teal-600 hover:bg-teal-700 text-white',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      activePreset: 'bg-teal-600 text-white shadow-md shadow-teal-200',
      focusRing: 'focus:ring-teal-500',
      primaryBtn: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200',
      accentText: 'text-teal-600',
      iconBg: 'bg-teal-100 text-teal-600'
    }
  };

  const currentTheme = colorMap[themeColor] || colorMap.emerald;

  // Preset definitions
  const getPresets = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

    const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const thisWeekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lastWeekEnd = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const last7DaysStart = format(subDays(today, 6), 'yyyy-MM-dd');
    const last30DaysStart = format(subDays(today, 29), 'yyyy-MM-dd');

    const thisMonthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const thisMonthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

    const lastMonthStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
    const lastMonthEnd = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');

    const last3MonthsStart = format(startOfMonth(subMonths(today, 2)), 'yyyy-MM-dd');

    const year = today.getFullYear();
    const semGanjilStart = `${year}-07-01`;
    const semGanjilEnd = `${year}-12-31`;

    const semGenapStart = `${year}-01-01`;
    const semGenapEnd = `${year}-06-30`;

    const thisYearStart = `${year}-01-01`;
    const thisYearEnd = `${year}-12-31`;

    return [
      { id: 'today', label: 'Hari Ini', start: todayStr, end: todayStr, category: 'Harian' },
      { id: 'yesterday', label: 'Kemarin', start: yesterdayStr, end: yesterdayStr, category: 'Harian' },
      { id: 'last7days', label: '7 Hari Terakhir', start: last7DaysStart, end: todayStr, category: 'Harian' },
      { id: 'thisweek', label: 'Minggu Ini', start: thisWeekStart, end: thisWeekEnd, category: 'Mingguan' },
      { id: 'lastweek', label: 'Minggu Lalu', start: lastWeekStart, end: lastWeekEnd, category: 'Mingguan' },
      { id: 'thismonth', label: 'Bulan Ini', start: thisMonthStart, end: thisMonthEnd, category: 'Bulanan' },
      { id: 'lastmonth', label: 'Bulan Lalu', start: lastMonthStart, end: lastMonthEnd, category: 'Bulanan' },
      { id: 'last30days', label: '30 Hari Terakhir', start: last30DaysStart, end: todayStr, category: 'Bulanan' },
      { id: 'last3months', label: '3 Bulan Terakhir', start: last3MonthsStart, end: thisMonthEnd, category: 'Bulanan' },
      { id: 'semganjil', label: 'Semester Ganjil (Jul - Des)', start: semGanjilStart, end: semGanjilEnd, category: 'Akademik' },
      { id: 'semgenap', label: 'Semester Genap (Jan - Jun)', start: semGenapStart, end: semGenapEnd, category: 'Akademik' },
      { id: 'thisyear', label: `Tahun Ini (${year})`, start: thisYearStart, end: thisYearEnd, category: 'Akademik' },
      { id: 'all', label: 'Semua Periode (Reset)', start: '', end: '', category: 'Lainnya' }
    ];
  };

  const presets = getPresets();

  const determineActivePreset = (s: string, e: string) => {
    if (!s && !e) {
      setActivePreset('all');
      return;
    }
    const found = presets.find(p => p.start === s && p.end === e);
    if (found) {
      setActivePreset(found.id);
    } else {
      setActivePreset('custom');
    }
  };

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setTempStart(preset.start);
    setTempEnd(preset.end);
    setActivePreset(preset.id);
  };

  const handleSave = () => {
    const selectedPresetObj = presets.find(p => p.id === activePreset);
    const label = selectedPresetObj && selectedPresetObj.id !== 'custom' 
      ? selectedPresetObj.label 
      : (tempStart && tempEnd ? `${formatReadable(tempStart)} - ${formatReadable(tempEnd)}` : 'Semua Periode');

    onChange(tempStart, tempEnd, label);
    setIsOpen(false);
  };

  const handleResetToThisMonth = () => {
    const thisMonth = presets.find(p => p.id === 'thismonth');
    if (thisMonth) {
      handleApplyPreset(thisMonth);
    }
  };

  // Calculate day difference for preview
  const getDayCountText = () => {
    if (!tempStart && !tempEnd) return 'Menampilkan semua riwayat waktu';
    if (!tempStart || !tempEnd) return 'Rentang belum lengkap';
    try {
      const d1 = parseISO(tempStart);
      const d2 = parseISO(tempEnd);
      if (isValid(d1) && isValid(d2)) {
        const diff = differenceInCalendarDays(d2, d1) + 1;
        if (diff < 0) return 'Tanggal akhir mendahului tanggal awal';
        return `${diff} Hari Terpilih (${formatReadable(tempStart)} s/d ${formatReadable(tempEnd)})`;
      }
    } catch {
      // fallback
    }
    return `${tempStart} s/d ${tempEnd}`;
  };

  // Display label for current active trigger button
  const getDisplayLabel = () => {
    if (buttonLabel) return buttonLabel;
    if (!startDate && !endDate) return 'Semua Periode';
    const active = presets.find(p => p.start === startDate && p.end === endDate);
    if (active && active.id !== 'all') {
      return `${active.label} (${formatReadable(startDate)} - ${formatReadable(endDate)})`;
    }
    if (startDate && endDate) {
      if (startDate === endDate) return formatReadable(startDate);
      return `${formatReadable(startDate)} - ${formatReadable(endDate)}`;
    }
    if (startDate) return `Sejak ${formatReadable(startDate)}`;
    if (endDate) return `Hingga ${formatReadable(endDate)}`;
    return 'Pilih Periode';
  };

  // Group presets by category
  const categories = ['Harian', 'Mingguan', 'Bulanan', 'Akademik'];

  return (
    <>
      {/* Trigger Button */}
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => {
            setTempStart(startDate || '');
            setTempEnd(endDate || '');
            determineActivePreset(startDate, endDate);
            setIsOpen(true);
          }}
          className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all hover:border-slate-300 active:scale-95`}
          title="Klik untuk membuka Popup Pemilih Periode Laporan"
        >
          <div className={`p-1.5 rounded-lg ${currentTheme.iconBg}`}>
            <CalendarIcon size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1">
              {getDisplayLabel()}
            </span>
          </div>
          <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-y-0.5 ml-1" />
        </button>

        {/* Quick Badges (Optional) */}
        {showQuickBadges && (
          <div className="hidden lg:flex items-center gap-1.5">
            {['today', 'thisweek', 'thismonth', 'semganjil'].map(presetId => {
              const p = presets.find(item => item.id === presetId);
              if (!p) return null;
              const isSelected = startDate === p.start && endDate === p.end;
              return (
                <button
                  key={presetId}
                  type="button"
                  onClick={() => onChange(p.start, p.end, p.label)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    isSelected 
                      ? currentTheme.activePreset
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {p.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Backdrop & Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${currentTheme.iconBg}`}>
                    <CalendarRange size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                      {title}
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                        Filter Waktu
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih pilihan cepat periode atau tentukan rentang tanggal spesifik
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
                {/* Quick Presets Grouped */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className={currentTheme.accentText} />
                      Pilihan Periode Cepat
                    </label>
                    <button
                      type="button"
                      onClick={handleResetToThisMonth}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <RotateCcw size={12} />
                      Reset Bulan Ini
                    </button>
                  </div>

                  <div className="space-y-3">
                    {categories.map(cat => {
                      const catPresets = presets.filter(p => p.category === cat);
                      return (
                        <div key={cat} className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                            {cat}
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {catPresets.map(preset => {
                              const isSelected = activePreset === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handleApplyPreset(preset)}
                                  className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                                    isSelected
                                      ? `${currentTheme.activePreset} border-transparent`
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <span className="truncate">{preset.label}</span>
                                  {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date Range */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                    Rentang Tanggal Kustom
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        Dari Tanggal (Mulai)
                      </label>
                      <input
                        type="date"
                        value={tempStart}
                        onChange={(e) => {
                          setTempStart(e.target.value);
                          setActivePreset('custom');
                        }}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium ${currentTheme.focusRing} focus:ring-2 focus:bg-white outline-none transition-all`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        Sampai Tanggal (Selesai)
                      </label>
                      <input
                        type="date"
                        value={tempEnd}
                        onChange={(e) => {
                          setTempEnd(e.target.value);
                          setActivePreset('custom');
                        }}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium ${currentTheme.focusRing} focus:ring-2 focus:bg-white outline-none transition-all`}
                      />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CalendarIcon size={16} className={currentTheme.accentText} />
                      <span className="font-semibold">{getDayCountText()}</span>
                    </div>
                    {tempStart && tempEnd && (
                      <button
                        type="button"
                        onClick={() => {
                          setTempStart('');
                          setTempEnd('');
                          setActivePreset('all');
                        }}
                        className="text-rose-500 hover:text-rose-700 font-bold hover:underline"
                      >
                        Hapus Filter
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-all"
                >
                  Batal
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempStart('');
                      setTempEnd('');
                      setActivePreset('all');
                    }}
                    className="hidden sm:inline-flex px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold transition-all"
                  >
                    Semua Data
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${currentTheme.primaryBtn}`}
                  >
                    <span>Terapkan Periode</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
