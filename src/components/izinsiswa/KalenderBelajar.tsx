import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { KalenderBelajar as KalenderType } from '../../types/izinsiswa';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
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

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Kalender Belajar</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-medium transition-colors"
        >
          <Plus size={18} /> Tambah Kegiatan
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800">Tambah Kegiatan Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
              <input
                type="text"
                value={formData.keterangan}
                onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                placeholder="Contoh: Libur Semester, Ujian Nasional..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none"
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
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="libur" className="text-sm font-medium text-slate-700">Tandai sebagai Hari Libur</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-medium transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            &larr;
          </button>
          <h3 className="text-lg font-bold text-slate-800 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: id })}
          </h3>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            &rarr;
          </button>
        </div>

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Tidak ada kegiatan di bulan ini.</div>
          ) : (
            events.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()).map(event => (
              <div key={event.id} className={`p-4 rounded-xl border flex items-center justify-between ${
                event.libur ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold ${
                    event.libur ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-700 shadow-sm'
                  }`}>
                    <span className="text-xs font-medium">{format(new Date(event.tanggal), 'MMM')}</span>
                    <span className="text-lg leading-none">{format(new Date(event.tanggal), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className={`font-bold ${event.libur ? 'text-rose-800' : 'text-slate-800'}`}>
                      {event.keterangan}
                    </h4>
                    <p className={`text-xs ${event.libur ? 'text-rose-600' : 'text-slate-500'}`}>
                      {event.libur ? 'Hari Libur' : 'Kegiatan Sekolah'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
