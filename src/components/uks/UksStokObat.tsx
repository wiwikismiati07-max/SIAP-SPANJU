import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Pill, AlertCircle, CheckCircle2, Search, Edit2, ShoppingCart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UksObat } from '../../types/uks';

const UksStokObat: React.FC = () => {
  const [obat, setObat] = useState<UksObat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nama_obat: '', stok: 0, satuan: 'Tablet' });

  useEffect(() => {
    fetchObat();
  }, []);

  const fetchObat = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('uks_obat')
        .select('*')
        .order('nama_obat', { ascending: true });
      
      if (error) throw error;
      setObat(data || []);
    } catch (error) {
      console.error('Error fetching obat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_obat.trim()) return;

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('uks_obat')
          .update(formData)
          .eq('id', isEditing);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Obat berhasil diperbarui!' });
      } else {
        const { error } = await supabase
          .from('uks_obat')
          .insert([formData]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Obat berhasil ditambahkan!' });
      }

      setFormData({ nama_obat: '', stok: 0, satuan: 'Tablet' });
      setIsEditing(null);
      fetchObat();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menyimpan data obat' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEdit = (o: UksObat) => {
    setIsEditing(o.id);
    setFormData({ nama_obat: o.nama_obat, stok: o.stok, satuan: o.satuan });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus obat ini?')) return;

    try {
      const { error } = await supabase
        .from('uks_obat')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Obat berhasil dihapus!' });
      fetchObat();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Gagal menghapus obat. Mungkin sedang digunakan dalam data kunjungan.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredObat = obat.filter(o => 
    o.nama_obat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Form Section */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Pill size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isEditing ? 'Edit Stok Obat' : 'Tambah Stok Obat'}</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">Kelola inventaris obat-obatan UKS</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Nama Obat</label>
            <input
              type="text"
              value={formData.nama_obat}
              onChange={(e) => setFormData({ ...formData, nama_obat: e.target.value })}
              placeholder="Contoh: Paracetamol"
              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-amber-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Stok</label>
            <input
              type="number"
              value={formData.stok}
              onChange={(e) => setFormData({ ...formData, stok: parseInt(e.target.value) || 0 })}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-amber-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Satuan</label>
            <select
              value={formData.satuan}
              onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-amber-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
            >
              <option value="Tablet">Tablet</option>
              <option value="Kapsul">Kapsul</option>
              <option value="Botol">Botol</option>
              <option value="Sachet">Sachet</option>
              <option value="Tube">Tube</option>
              <option value="Pcs">Pcs</option>
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end gap-4 mt-4">
            {isEditing && (
              <button
                type="button"
                onClick={() => { setIsEditing(null); setFormData({ nama_obat: '', stok: 0, satuan: 'Tablet' }); }}
                className="px-10 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-3xl font-black transition-all duration-300"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={!formData.nama_obat.trim()}
              className="px-10 py-5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 text-white rounded-3xl font-black flex items-center gap-3 transition-all duration-300 shadow-lg shadow-amber-600/20 hover:scale-105 active:scale-95"
            >
              {isEditing ? <Save size={20} /> : <Plus size={20} />}
              {isEditing ? 'Simpan Perubahan' : 'Tambah Obat'}
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-6 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="font-bold">{message.text}</p>
          </div>
        )}
      </div>

      {/* List Section */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Pill size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Inventaris Obat</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">Total {obat.length} jenis obat tersedia</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari obat..."
              className="pl-14 pr-8 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-amber-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 w-full md:w-80"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : filteredObat.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">Tidak ada data obat ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Nama Obat</th>
                  <th className="px-8 py-4">Stok</th>
                  <th className="px-8 py-4">Satuan</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredObat.map((o) => (
                  <tr key={o.id} className="group bg-slate-50 hover:bg-white rounded-[32px] border-2 border-transparent hover:border-amber-100 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-500">
                    <td className="px-8 py-6 rounded-l-[32px]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 font-black text-sm shadow-sm">
                          <Pill size={18} />
                        </div>
                        <span className="font-bold text-slate-700">{o.nama_obat}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`font-black text-lg ${o.stok < 5 ? 'text-rose-600' : 'text-slate-700'}`}>{o.stok}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{o.satuan}</span>
                    </td>
                    <td className="px-8 py-6">
                      {o.stok < 5 ? (
                        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-full w-fit">
                          <ShoppingCart size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Perlu Order</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full w-fit">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Aman</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 rounded-r-[32px] text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(o)}
                          className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UksStokObat;
