import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckSquare, 
  Square, 
  Users, 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  RotateCcw,
  BookOpen,
  UserCheck,
  Check
} from 'lucide-react';
import { DAFTAR_KELAS, SiswaJurnalItem } from '../../types/jurnalpembelajaran';
import { 
  fetchAllSiswaForSelection, 
  getSavedInklusiSiswaIds, 
  saveInklusiSiswaIds 
} from '../../lib/jurnalService';

interface StudentOption {
  id: string;
  nama: string;
  nis?: string;
  kelas: string;
  periode?: string;
}

interface KelasSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKelas: string;
  currentSiswaList: SiswaJurnalItem[];
  selectedPeriode?: string;
  onApplyMultiKelas: (selectedClasses: string[]) => void;
  onApplyInklusi: (selectedStudents: SiswaJurnalItem[]) => void;
  initialTab?: 'multikelas' | 'inklusi';
}

export const KelasSelectorModal: React.FC<KelasSelectorModalProps> = ({
  isOpen,
  onClose,
  currentKelas,
  currentSiswaList,
  selectedPeriode,
  onApplyMultiKelas,
  onApplyInklusi,
  initialTab = 'multikelas'
}) => {
  const [activeTab, setActiveTab] = useState<'multikelas' | 'inklusi'>(initialTab);

  // Multi-kelas states
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // Inklusi states
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [selectedInklusiIds, setSelectedInklusiIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<'all' | '7' | '8' | '9'>('all');
  const [filterSpecificClass, setFilterSpecificClass] = useState<string>('all');

  // Initialize data on open
  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(initialTab);

    // If currentKelas is multi-class or single
    if (currentKelas && currentKelas !== 'Inklusi') {
      const parts = currentKelas.split(',').map(c => c.trim()).filter(Boolean);
      setSelectedClasses(parts);
    } else {
      setSelectedClasses([]);
    }

    // Initialize inklusi selected IDs
    if (currentKelas === 'Inklusi' && currentSiswaList.length > 0) {
      setSelectedInklusiIds(new Set(currentSiswaList.map(s => s.siswa_id)));
    } else {
      const saved = getSavedInklusiSiswaIds();
      setSelectedInklusiIds(new Set(saved));
    }

    // Load all students for inklusi picker
    const loadAllStudents = async () => {
      setIsLoadingStudents(true);
      const students = await fetchAllSiswaForSelection(selectedPeriode);
      setAllStudents(students);
      setIsLoadingStudents(false);
    };

    loadAllStudents();
  }, [isOpen, initialTab, currentKelas, selectedPeriode]);

  // Group classes by grade
  const kelas7 = useMemo(() => DAFTAR_KELAS.filter(k => k.startsWith('7')), []);
  const kelas8 = useMemo(() => DAFTAR_KELAS.filter(k => k.startsWith('8')), []);
  const kelas9 = useMemo(() => DAFTAR_KELAS.filter(k => k.startsWith('9')), []);

  // Multi-kelas toggles
  const handleToggleClass = (k: string) => {
    setSelectedClasses(prev => 
      prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k]
    );
  };

  const handleToggleGrade = (gradeClasses: string[]) => {
    const allSelected = gradeClasses.every(c => selectedClasses.includes(c));
    if (allSelected) {
      // Unselect all in this grade
      setSelectedClasses(prev => prev.filter(c => !gradeClasses.includes(c)));
    } else {
      // Select all in this grade
      setSelectedClasses(prev => Array.from(new Set([...prev, ...gradeClasses])));
    }
  };

  const handleResetMultiKelas = () => {
    setSelectedClasses([]);
  };

  // Inklusi toggles
  const handleToggleStudent = (id: string) => {
    setSelectedInklusiIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFilteredStudents = (filtered: StudentOption[]) => {
    setSelectedInklusiIds(prev => {
      const next = new Set(prev);
      filtered.forEach(s => next.add(s.id));
      return next;
    });
  };

  const handleUnselectAllFilteredStudents = (filtered: StudentOption[]) => {
    setSelectedInklusiIds(prev => {
      const next = new Set(prev);
      filtered.forEach(s => next.delete(s.id));
      return next;
    });
  };

  const handleResetInklusi = () => {
    setSelectedInklusiIds(new Set());
  };

  const handleRestoreLastSavedInklusi = () => {
    const saved = getSavedInklusiSiswaIds();
    setSelectedInklusiIds(new Set(saved));
  };

  // Filter students for Inklusi
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      // Level filter
      if (filterLevel !== 'all') {
        if (!s.kelas.startsWith(filterLevel)) return false;
      }
      // Specific class filter
      if (filterSpecificClass !== 'all') {
        if (s.kelas !== filterSpecificClass) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.nama.toLowerCase().includes(q);
        const matchNis = s.nis && s.nis.toLowerCase().includes(q);
        const matchKelas = s.kelas.toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchKelas) return false;
      }
      return true;
    });
  }, [allStudents, filterLevel, filterSpecificClass, searchQuery]);

  // Submit Multi-Kelas
  const handleConfirmMultiKelas = () => {
    if (selectedClasses.length === 0) {
      alert('Pilih minimal satu kelas!');
      return;
    }
    onApplyMultiKelas(selectedClasses);
    onClose();
  };

  // Submit Inklusi
  const handleConfirmInklusi = () => {
    if (selectedInklusiIds.size === 0) {
      alert('Pilih minimal satu siswa untuk kelas inklusi!');
      return;
    }

    const selectedIdsArray: string[] = Array.from(selectedInklusiIds);
    // Save to persistent storage for convenience next time
    saveInklusiSiswaIds(selectedIdsArray);

    const chosenStudents = allStudents.filter(s => selectedInklusiIds.has(s.id));
    
    // Map to SiswaJurnalItem
    const siswaJurnalList: SiswaJurnalItem[] = chosenStudents.map((s, idx) => {
      // If student was already in current list, preserve absensi/nilai/catatan
      const existing = currentSiswaList.find(c => c.siswa_id === s.id);
      if (existing) {
        return { ...existing, kelas: s.kelas || existing.kelas };
      }
      return {
        siswa_id: s.id,
        nama: s.nama,
        nis: s.nis || `24${s.kelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
        kelas: s.kelas,
        periode: s.periode || selectedPeriode || '2026',
        absensi: 'Hadir',
        nilai: '',
        catatan_siswa: 'Peserta Inklusi',
        tindakan: ''
      };
    });

    onApplyInklusi(siswaJurnalList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 font-bold">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2">
                Pilih Kelas & Inklusi Pembelajaran
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih gabungan multi-kelas atau pilih bebas siswa untuk kelas inklusi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 border-b border-slate-200/70 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('multikelas')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'multikelas'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users size={16} />
            <span>Multi-Kelas (Checklist)</span>
            {selectedClasses.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'multikelas' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedClasses.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inklusi')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'inklusi'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles size={16} />
            <span>Kelas Inklusi (Pilih Siswa)</span>
            {selectedInklusiIds.size > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'inklusi' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {selectedInklusiIds.size} Siswa
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: MULTI-KELAS */}
          {activeTab === 'multikelas' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                <Users size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Petunjuk Multi-Kelas:</span>
                  Centang satu atau beberapa kelas yang mengikuti jam pelajaran ini sekaligus. Sistem akan otomatis menggabungkan seluruh siswa dari kelas-kelas terpilih ke dalam daftar absensi jurnal.
                </div>
              </div>

              {/* Action Buttons: Quick selection */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Kelas SMPN 7:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetMultiKelas}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <RotateCcw size={12} /> Hapus Pilihan
                  </button>
                </div>
              </div>

              {/* Tingkat 7 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Tingkat Kelas 7 (7A - 7H)</span>
                  <button
                    type="button"
                    onClick={() => handleToggleGrade(kelas7)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
                  >
                    {kelas7.every(c => selectedClasses.includes(c)) ? 'Batal Semua Kelas 7' : '+ Pilih Semua Kelas 7'}
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {kelas7.map(k => {
                    const isSelected = selectedClasses.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleToggleClass(k)}
                        className={`py-3 px-2 rounded-xl text-center font-bold text-xs transition-all border flex flex-col items-center justify-center gap-1 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        <span>{k}</span>
                        {isSelected ? <Check size={14} className="stroke-[3]" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tingkat 8 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Tingkat Kelas 8 (8A - 8H)</span>
                  <button
                    type="button"
                    onClick={() => handleToggleGrade(kelas8)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
                  >
                    {kelas8.every(c => selectedClasses.includes(c)) ? 'Batal Semua Kelas 8' : '+ Pilih Semua Kelas 8'}
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {kelas8.map(k => {
                    const isSelected = selectedClasses.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleToggleClass(k)}
                        className={`py-3 px-2 rounded-xl text-center font-bold text-xs transition-all border flex flex-col items-center justify-center gap-1 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        <span>{k}</span>
                        {isSelected ? <Check size={14} className="stroke-[3]" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tingkat 9 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Tingkat Kelas 9 (9A - 9H)</span>
                  <button
                    type="button"
                    onClick={() => handleToggleGrade(kelas9)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
                  >
                    {kelas9.every(c => selectedClasses.includes(c)) ? 'Batal Semua Kelas 9' : '+ Pilih Semua Kelas 9'}
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {kelas9.map(k => {
                    const isSelected = selectedClasses.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleToggleClass(k)}
                        className={`py-3 px-2 rounded-xl text-center font-bold text-xs transition-all border flex flex-col items-center justify-center gap-1 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/30'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        <span>{k}</span>
                        {isSelected ? <Check size={14} className="stroke-[3]" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Kelas Terpilih:</span>
                  <span className="text-sm font-black text-amber-800">
                    {selectedClasses.length > 0 
                      ? selectedClasses.sort().join(', ') 
                      : 'Belum ada kelas yang dipilih'}
                  </span>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-extrabold">
                  {selectedClasses.length} Kelas
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: INKLUSI (PILIH SISWA BEBAS) */}
          {activeTab === 'inklusi' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 text-xs text-indigo-950 leading-relaxed flex items-start gap-3">
                <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Petunjuk Kelas Inklusi:</span>
                  Semua nama siswa sekolah ditampilkan di bawah ini. Guru dapat bebas mencari dan mencentang siswa mana saja yang mengikuti pembelajaran inklusi untuk hari ini.
                </div>
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Search Bar */}
                <div className="sm:col-span-6 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa atau NIS..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Tingkat Filter */}
                <div className="sm:col-span-3">
                  <select
                    value={filterLevel}
                    onChange={e => {
                      setFilterLevel(e.target.value as any);
                      setFilterSpecificClass('all');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Tingkat</option>
                    <option value="7">Tingkat 7</option>
                    <option value="8">Tingkat 8</option>
                    <option value="9">Tingkat 9</option>
                  </select>
                </div>

                {/* Specific Class Filter */}
                <div className="sm:col-span-3">
                  <select
                    value={filterSpecificClass}
                    onChange={e => setFilterSpecificClass(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Kelas</option>
                    {DAFTAR_KELAS.filter(k => filterLevel === 'all' || k.startsWith(filterLevel)).map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Actions for Inklusi */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllFilteredStudents(filteredStudents)}
                    disabled={filteredStudents.length === 0}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    + Centang Semua ({filteredStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnselectAllFilteredStudents(filteredStudents)}
                    disabled={filteredStudents.length === 0}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Batal Centang
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreLastSavedInklusi}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors"
                    title="Gunakan pilihan siswa yang tersimpan sebelumnya"
                  >
                    <RotateCcw size={11} className="inline mr-1" />
                    Pilihan Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={handleResetInklusi}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* Student Checklist Table / List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                {isLoadingStudents ? (
                  <div className="p-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs font-medium">Memuat data siswa...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Tidak ada siswa yang sesuai dengan filter pencarian.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredStudents.map((s, idx) => {
                      const isChecked = selectedInklusiIds.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors ${
                            isChecked ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStudent(s.id)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isChecked ? 'text-indigo-950' : 'text-slate-800'}`}>
                                  {s.nama}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200/80 text-slate-700">
                                  Kelas {s.kelas}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                NIS: {s.nis || '-'}
                              </span>
                            </div>
                          </div>

                          {isChecked && (
                            <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check size={11} className="stroke-[3]" /> Terpilih Inklusi
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status footer for inklusi */}
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-indigo-700 font-medium block">Total Siswa Inklusi Terpilih:</span>
                  <span className="text-sm font-black text-indigo-950">
                    {selectedInklusiIds.size} Siswa Terpilih
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium">Dari {allStudents.length} total siswa</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 md:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all"
          >
            Batal
          </button>

          {activeTab === 'multikelas' ? (
            <button
              type="button"
              onClick={handleConfirmMultiKelas}
              disabled={selectedClasses.length === 0}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Users size={16} />
              <span>Terapkan Multi-Kelas ({selectedClasses.length})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmInklusi}
              disabled={selectedInklusiIds.size === 0}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>Terapkan Siswa Inklusi ({selectedInklusiIds.size})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
