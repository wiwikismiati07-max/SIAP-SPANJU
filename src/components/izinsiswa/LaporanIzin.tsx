import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IzinWithSiswa } from '../../types/izinsiswa';
import { Download, Search, Calendar as CalendarIcon, Edit, Trash2, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

export default function LaporanIzin() {
  const [data, setData] = useState<IzinWithSiswa[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipe, setFilterTipe] = useState<'Semua' | 'Wali Murid'>('Semua');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    tanggal_mulai: '',
    tanggal_selesai: '',
    alasan: '',
    status: 'Menunggu' as 'Menunggu' | 'Disetujui' | 'Ditolak'
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data: iData } = await supabase
          .from('izin_siswa')
          .select('*')
          .gte('tanggal_mulai', dateRange.start)
          .lte('tanggal_mulai', dateRange.end)
          .order('tanggal_mulai', { ascending: false });
          
        if (iData) {
          const { data: sData } = await supabase.from('master_siswa').select('*');
          const joinedData = iData.map(i => ({
            ...i,
            siswa: sData?.find(s => s.id === i.siswa_id) || { id: i.siswa_id, nama: 'Unknown', kelas: '-' }
          }));
          setData(joinedData as IzinWithSiswa[]);
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const localSiswa = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        
        const filtered = localData
          .filter((d: any) => d.tanggal_mulai >= dateRange.start && d.tanggal_mulai <= dateRange.end)
          .map((d: any) => ({
            ...d,
            siswa: localSiswa.find((s: any) => s.id === d.siswa_id) || { id: d.siswa_id, nama: 'Unknown', kelas: '-' }
          }))
          .sort((a: any, b: any) => new Date(b.tanggal_mulai).getTime() - new Date(a.tanggal_mulai).getTime());
          
        setData(filtered);
      }
    } catch (error) {
      console.error('Error fetching laporan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    const exportData = filteredData.map(d => ({
      'NAMA': d.siswa?.nama,
      'KELAS': d.siswa?.kelas,
      'TANGGAL MULAI': d.tanggal_mulai,
      'TANGGAL SELESAI': d.tanggal_selesai,
      'ALASAN': d.alasan,
      'STATUS': d.status,
      'DIAJUKAN OLEH': d.diajukan_oleh,
      'NAMA WALI': d.nama_wali || '-',
      'NO TELP WALI': d.no_telp_wali || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Izin");
    XLSX.writeFile(wb, `Laporan_Izin_${dateRange.start}_sd_${dateRange.end}.xlsx`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data izin ini?')) return;
    try {
      if (supabase) {
        await supabase.from('izin_siswa').delete().eq('id', id);
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        localStorage.setItem('izinsiswa_data', JSON.stringify(localData.filter((d:any) => d.id !== id)));
      }
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus data');
    }
  };

  const startEdit = (izin: IzinWithSiswa) => {
    setEditingId(izin.id);
    setEditForm({
      tanggal_mulai: izin.tanggal_mulai,
      tanggal_selesai: izin.tanggal_selesai,
      alasan: izin.alasan,
      status: izin.status
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      if (supabase) {
        await supabase.from('izin_siswa').update(editForm).eq('id', editingId);
      } else {
        const localData = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
        const updated = localData.map((d:any) => d.id === editingId ? { ...d, ...editForm } : d);
        localStorage.setItem('izinsiswa_data', JSON.stringify(updated));
      }
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan perubahan');
    }
  };

  const filteredData = data.filter(d => {
    const matchSearch = d.siswa?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.siswa?.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.alasan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipe = filterTipe === 'Semua' || d.diajukan_oleh === filterTipe;
    return matchSearch && matchTipe;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Laporan Detail Izin</h2>
        <button
          onClick={handleDownloadExcel}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-medium transition-colors"
        >
          <Download size={18} /> Download Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama, kelas, atau alasan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-slate-400" size={20} />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <select
          value={filterTipe}
          onChange={(e) => setFilterTipe(e.target.value as any)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="Semua">Semua Pengajuan</option>
          <option value="Wali Murid">Laporan Izin Wali</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Tidak ada data izin pada periode ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Siswa</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Tanggal</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Alasan</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Diajukan Oleh</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Lampiran</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((izin) => (
                  <tr key={izin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{izin.siswa?.nama}</div>
                      <div className="text-xs text-slate-500">Kelas {izin.siswa?.kelas}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">
                        {izin.tanggal_mulai === izin.tanggal_selesai 
                          ? format(new Date(izin.tanggal_mulai), 'dd MMM yyyy')
                          : `${format(new Date(izin.tanggal_mulai), 'dd MMM')} - ${format(new Date(izin.tanggal_selesai), 'dd MMM yyyy')}`
                        }
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{izin.alasan}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        izin.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                        izin.status === 'Ditolak' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {izin.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 w-fit">
                          {izin.diajukan_oleh}
                        </span>
                        {izin.nama_wali && <span className="text-xs text-slate-500">Wali: {izin.nama_wali}</span>}
                        {izin.no_telp_wali && <span className="text-xs text-slate-500">Telp: {izin.no_telp_wali}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      {izin.lampiran_url ? (
                        <a href={izin.lampiran_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                          Lihat Surat
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(izin)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(izin.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Edit Data Izin</h3>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={editForm.tanggal_mulai}
                  onChange={e => setEditForm({...editForm, tanggal_mulai: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  value={editForm.tanggal_selesai}
                  onChange={e => setEditForm({...editForm, tanggal_selesai: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alasan</label>
                <input
                  type="text"
                  value={editForm.alasan}
                  onChange={e => setEditForm({...editForm, alasan: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Menunggu">Menunggu</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
