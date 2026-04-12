import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { KalenderBelajar as KalenderType } from '../../types/izinsiswa';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, X, Info, Pencil } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';

export default function KalenderBelajar({ user }: { user?: any }) {
  const canDelete = user?.role === 'full';
  const canAdd = user?.role === 'entry' || user?.role === 'full';
  const canEdit = user?.role === 'entry' || user?.role === 'full';
  const [events, setEvents] = useState<KalenderType[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    keterangan: '',
    libur: false
  });

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      if (supabase) {
        const { data } = await supabase
          .from('kalender_belajar')
          .select('*')
          .gte('tanggal', start)
          .lte('tanggal', end);
        if (data) setEvents(data);
      } else {
        const localData = JSON.parse(localStorage.getItem('kalender_belajar') || '[]');
        const filtered = localData.filter((d: any) => d.tanggal >= start && d.tanggal <= end);
        setEvents(filtered);
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keterangan) return;

    try {
      if (editingId) {
        if (supabase) {
          const { error } = await supabase
            .from('kalender_belajar')
            .update({
              tanggal: formData.tanggal,
              keterangan: formData.keterangan,
              libur: formData.libur
            })
            .eq('id', editingId);
          if (error) throw error;
        } else {
          const localData = JSON.parse(localStorage.getItem('kalender_belajar') || '[]');
          const index = localData.findIndex((d: any) => d.id === editingId);
          if (index !== -1) {
            localData[index] = { ...localData[index], ...formData };
            localStorage.setItem('kalender_belajar', JSON.stringify(localData));
          }
        }
      } else {
        const newRecord = {
          id: crypto.randomUUID(),
          ...formData
        };

        if (supabase) {
          const { error } = await supabase.from('kalender_belajar').insert([newRecord]);
          if (error) throw error;
        } else {
          const localData = JSON.parse(localStorage.getItem('kalender_belajar') || '[]');
          localData.push(newRecord);
          localStorage.setItem('kalender_belajar', JSON.stringify(localData));
        }
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ tanggal: format(new Date(), 'yyyy-MM-dd'), keterangan: '', libur: false });
      fetchEvents();
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    }
  };

  const handleEdit = (event: KalenderType) => {
    setEditingId(event.id);
    setFormData({
      tanggal: event.tanggal,
      keterangan: event.keterangan,
      libur: event.libur
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kegiatan ini?')) return;
    try {
      if (supabase) {
        await supabase.from('kalender_belajar').delete().eq('id', id);
      } else {
        const localData = JSON.parse(localStorage.getItem('kalender_belajar') || '[]');
        const updated = localData.filter((d: any) => d.id !== id);
        localStorage.setItem('kalender_belajar', JSON.stringify(updated));
      }
      fetchEvents();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h3 className="text-xl font-bold text-slate-800">
          {format(currentMonth, 'MMMM yyyy', { locale: id })}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-full">
          <ChevronRight size={24} className="text-slate-600" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Start on Monday
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-semibold text-sm text-slate-500 py-2">
          {format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'EEEE', { locale: id }).substring(0, 3)}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start on Sunday for standard view
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const formattedDate = format(day, "d");
        
        const dayEvents = events.filter(e => isSameDay(new Date(e.tanggal), cloneDay));
        const isSunday = day.getDay() === 0;
        const isHoliday = dayEvents.some(e => e.libur) || isSunday;
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-3 border border-slate-100 relative transition-all ${
              !isCurrentMonth
                ? "bg-slate-50/50 text-slate-300"
                : isHoliday
                ? "bg-rose-50/30"
                : "bg-white"
            }`}
          >
            <span className={`text-sm font-bold ${
              !isCurrentMonth ? 'text-slate-300' :
              isSunday ? 'text-rose-500' : 
              isHoliday ? 'text-rose-600' : 'text-slate-700'
            }`}>
              {formattedDate}
            </span>
            
            <div className="mt-2 space-y-1">
              {dayEvents.map(e => (
                <div 
                  key={e.id} 
                  className={`text-[10px] p-1.5 rounded-lg font-bold uppercase tracking-tight flex justify-between items-center group leading-tight ${
                    e.libur ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}
                >
                  <span className="truncate" title={e.keterangan}>{e.keterangan}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <button 
                        onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }} 
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        <Pencil size={10} />
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} 
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">{rows}</div>;
  };

  const getSummary = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const sundays = allDays.filter(d => d.getDay() === 0).length;
    const holidays = events.filter(e => e.libur && isSameMonth(new Date(e.tanggal), currentMonth)).length;
    const totalDays = allDays.length;
    const effectiveDays = totalDays - sundays - holidays;

    return {
      effective: effectiveDays,
      sundays: sundays,
      holidays: holidays,
      semester: 0 // Placeholder as not in data yet
    };
  };

  const summary = getSummary();

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Calendar className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kalender Pendidikan</h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Tahun Pelajaran 2025/2026</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <h3 className="text-lg font-black text-slate-800 min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: id })}
            </h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
              Muat Default
            </button>
            {canAdd && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                <Plus size={18} />
                Tambah Libur
              </button>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-800">
              {editingId ? 'Edit Hari Libur / Kegiatan' : 'Tambah Hari Libur / Kegiatan'}
            </h3>
            <button 
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ tanggal: format(new Date(), 'yyyy-MM-dd'), keterangan: '', libur: false });
              }} 
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Keterangan</label>
                <input
                  type="text"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  placeholder="Contoh: Libur Hari Raya"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-700"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="libur"
                  checked={formData.libur}
                  onChange={(e) => setFormData({...formData, libur: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <label htmlFor="libur" className="ml-3 text-sm font-bold text-slate-600">
                  Tandai sebagai Hari Libur
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan ke Kalender'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <div className="grid grid-cols-7 mb-6">
            {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map((day, i) => (
              <div key={day} className={`text-center text-xs font-black tracking-[0.2em] py-2 ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                {day}
              </div>
            ))}
          </div>
          
          {loading ? (
            <div className="h-[600px] flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold animate-pulse">Menyusun Kalender...</p>
            </div>
          ) : (
            <>
              {renderCells()}
              
              {/* Keterangan Bulan Ini */}
              <div className="mt-8 bg-white p-8 rounded-[32px] border border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                  <Info className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 mb-2">Keterangan Bulan Ini</h4>
                  {events.filter(e => e.libur).length > 0 ? (
                    <ul className="space-y-2">
                      {events.filter(e => e.libur).map(e => (
                        <li key={e.id} className="text-sm font-bold text-slate-500 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>
                          <span className="font-black text-slate-700">{format(new Date(e.tanggal), 'd MMMM', { locale: id })}:</span>
                          {e.keterangan}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-bold text-slate-400 italic">Tidak ada hari libur khusus di bulan ini.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-[320px] space-y-6">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 sticky top-8">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Ringkasan Hari</h4>
            
            <div className="space-y-6">
              <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100/50 group hover:scale-[1.02] transition-transform">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Hari Efektif</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-emerald-700">{summary.effective}</span>
                </div>
                <p className="text-[10px] font-bold text-emerald-600/60 mt-2 leading-relaxed">Hari belajar aktif di sekolah</p>
              </div>

              <div className="p-6 bg-rose-50 rounded-[32px] border border-rose-100/50 group hover:scale-[1.02] transition-transform">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Hari Minggu</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-rose-700">{summary.sundays}</span>
                </div>
                <p className="text-[10px] font-bold text-rose-600/60 mt-2 leading-relaxed">Hari libur akhir pekan</p>
              </div>

              <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100/50 group hover:scale-[1.02] transition-transform">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Libur Nasional</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-amber-700">{summary.holidays}</span>
                </div>
                <p className="text-[10px] font-bold text-amber-600/60 mt-2 leading-relaxed">Hari libur umum nasional</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 group hover:scale-[1.02] transition-transform">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Libur Semester</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-500">{summary.semester}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed">Masa libur pergantian semester</p>
              </div>

              {/* Catatan Box */}
              <div className="p-8 bg-indigo-600 rounded-[40px] shadow-xl shadow-indigo-100/50 text-white">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 opacity-80">Catatan</h4>
                <p className="text-sm font-bold leading-relaxed">
                  Kalender ini merupakan acuan kegiatan belajar mengajar. Jadwal sewaktu-waktu dapat berubah sesuai dengan kebijakan Dinas Pendidikan setempat.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-50">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <span>Status Sistem</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>Terhubung</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
