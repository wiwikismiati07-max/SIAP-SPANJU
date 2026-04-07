import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, Search, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MasterJenisDispensasi } from '../../types/dispensasi';
import * as XLSX from 'xlsx';

const DispMasterData: React.FC = () => {
  const [data, setData] = useState<MasterJenisDispensasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterJenisDispensasi | null>(null);
  const [formData, setFormData] = useState({ nama_jenis: '', keterangan: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: jenisData, error } = await supabase
        .from('disp_master_jenis')
        .select('*')
        .order('nama_jenis');
      if (error) throw error;
      setData(jenisData || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('disp_master_jenis')
          .update(formData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('disp_master_jenis')
          .insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ nama_jenis: '', keterangan: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving master data:', error);
      alert('Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jenis dispensasi ini?')) return;
    try {
      const { error } = await supabase
        .from('disp_master_jenis')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting master data:', error);
      alert('Gagal menghapus data. Mungkin data ini sudah digunakan dalam transaksi.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const excelData = XLSX.utils.sheet_to_json(ws) as any[];
        console.log('Excel Data Raw:', excelData);

        const formattedData = excelData.map(row => {
          // Map based on various possible header names (case insensitive-ish)
          const namaJenis = row['NAMA JENIS DISPENSASI'] || row['nama_jenis'] || row['Nama'] || row['Jenis'] || row['NAMA'];
          const keterangan = row['KETERANGAN'] || row['keterangan'] || row['Keterangan'] || '';
          
          return {
            nama_jenis: namaJenis,
            keterangan: keterangan
          };
        }).filter(row => row.nama_jenis);

        console.log('Formatted Data:', formattedData);

        if (formattedData.length === 0) {
          alert('Format Excel tidak sesuai atau data kosong. Pastikan kolom bernama "NAMA JENIS DISPENSASI" atau "nama_jenis"');
          return;
        }

        const { error } = await supabase.from('disp_master_jenis').insert(formattedData);
        if (error) {
          console.error('Supabase Insert Error:', error);
          alert(`Gagal menyimpan ke database: ${error.message}`);
          return;
        }
        
        alert(`Berhasil mengimpor ${formattedData.length} data`);
        fetchData();
      } catch (error) {
        console.error('Error importing excel:', error);
        alert('Gagal mengimpor data Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredData = data.filter(item => 
    item.nama_jenis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Jenis Dispensasi</h2>
          <p className="text-sm text-slate-500">Kelola daftar alasan dan jenis dispensasi siswa</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100">
            <Upload size={18} />
            <span className="text-sm font-bold">Upload Excel</span>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={() => {
              setEditingItem(null);
              setFormData({ nama_jenis: '', keterangan: '' });
              setShowModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-all shadow-lg shadow-pink-200"
          >
            <Plus size={18} />
            <span className="text-sm font-bold">Tambah Jenis</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari jenis dispensasi..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-50">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Jenis Dispensasi</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div></div>
                  </td>
                </tr>
              ) : filteredData.map((item, index) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-700">{item.nama_jenis}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500">{item.keterangan || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({ nama_jenis: item.nama_jenis, keterangan: item.keterangan || '' });
                          setShowModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">Data tidak ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{editingItem ? 'Edit Jenis' : 'Tambah Jenis'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Jenis Dispensasi</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  value={formData.nama_jenis}
                  onChange={(e) => setFormData({ ...formData, nama_jenis: e.target.value })}
                  placeholder="Contoh: Sakit"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan (Opsional)</label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all min-h-[100px]"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Detail tambahan..."
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-all shadow-lg shadow-pink-200"
                >
                  <Check size={18} />
                  <span className="text-sm font-bold">Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispMasterData;
