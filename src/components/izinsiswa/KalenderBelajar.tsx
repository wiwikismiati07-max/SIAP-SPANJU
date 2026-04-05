import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { KalenderBelajar as KalenderType } from '../../types/izinsiswa';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';

export default function KalenderBelajar() {
  const [events, setEvents] = useState<KalenderType[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [showForm, setShowForm] = useState(false);
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

    const newRecord = {
      id: crypto.randomUUID(),
      ...formData
    };

    try {
      if (supabase) {
        const { error } = await supabase.from('kalender_belajar').insert([newRecord]);
        if (error) throw error;
      } else {
        const localData = JSON.parse(localStorage.getItem('kalender_belajar') || '[]');
        localData.push(newRecord);
        localStorage.setItem('kalender_belajar', JSON.stringify(localData));
      }
      
      setShowForm(false);
      setFormData({ tanggal: format(new Date(), 'yyyy-MM-dd'), keterangan: '', libur: false });
      fetchEvents();
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`);
    }
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
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = events.filter(e => isSameDay(new Date(e.tanggal), cloneDay));
        const isHoliday = dayEvents.some(e => e.libur) || day.getDay() === 0; // Sunday is holiday

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] p-2 border border-slate-100 relative ${
              !isSameMonth(day, monthStart)
                ? "bg-slate-50 text-slate-400"
                : isHoliday
                ? "bg-rose-50 text-rose-700"
                : "bg-white text-slate-700"
            }`}
          >
            <span className={`text-sm font-medium ${isHoliday ? 'text-rose-600' : ''}`}>{formattedDate}</span>
            <div className="mt-1 space-y-1">
              {dayEvents.map(e => (
                <div key={e.id} className={`text-xs p-1 rounded ${e.libur ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'} flex justify-between items-center group`}>
                  <span className="truncate" title={e.keterangan}>{e.keterangan}</span>
                  <button onClick={() => handleDelete(e.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700">
                    <Trash2 size={12} />
                  </button>
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
    return <div className="border border-slate-200 rounded-xl overflow-hidden">{rows}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Kalender Belajar</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Tutup Form' : 'Tambah Kegiatan'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Tambah Kegiatan / Hari Libur</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  placeholder="Contoh: Ujian Tengah Semester"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="libur"
                checked={formData.libur}
                onChange={(e) => setFormData({...formData, libur: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="libur" className="text-sm font-medium text-slate-700">
                Tandai sebagai Hari Libur
              </label>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Simpan Kegiatan
            </button>
          </form>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        {renderHeader()}
        {renderDays()}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500">Memuat kalender...</div>
        ) : (
          renderCells()
        )}
      </div>
    </div>
  );
}
