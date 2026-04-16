import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  FileText, 
  UserCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Upload, 
  ShieldCheck, 
  ChevronLeft,
  Settings,
  Eye,
  Filter,
  Download,
  ClipboardList,
  MoreVertical,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface PengaduanWaliAppProps {
  onBack?: () => void;
  onOpenSidebar?: () => void;
}

const PengaduanWaliApp: React.FC<PengaduanWaliAppProps & { user?: any }> = ({ onBack, onOpenSidebar, user }) => {
  const isAdmin = user?.role === 'full';
  const isEditor = user?.role === 'entry';
  const isViewer = user?.role === 'view';
  const [view, setView] = useState<'form' | 'list'>(isViewer ? 'list' : 'form');
  const [siswa, setSiswa] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [pengaduanList, setPengaduanList] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [formData, setFormData] = useState({
    nama_pelapor: '',
    hp_pelapor: '',
    hubungan_siswa: '',
    alamat_pelapor: '',
    jenis_pengaduan: '',
    jenis_pengaduan_manual: '',
    uraian: '',
    waktu_kejadian: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    tempat_kejadian: '',
    harapan_orang_tua: '',
    tindakan_diharapkan: '',
    pernyataan_benar: false
  });

  const classes = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];
  const jenisOptions = ['Bullying/Perundungan', 'Disiplin', 'Akademik', 'Sosial/Pergaulan', 'Pelanggaran Tatatertib', 'Masalah dengan Guru', 'Lainnya'];

  useEffect(() => {
    fetchSiswa();
    if (view === 'list') {
      fetchPengaduan();
    }
  }, [view]);

  const fetchSiswa = async () => {
    try {
      const { data, error } = await supabase
        .from('master_siswa')
        .select('id, nama, kelas')
        .order('nama');
      if (error) throw error;
      setSiswa(data || []);
    } catch (error) {
      console.error('Error fetching siswa:', error);
    }
  };

  const fetchPengaduan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pengaduan_wali')
        .select('*, siswa:master_siswa(nama, kelas)')
        .order('created_at', { ascending: false });
      
      if (error) {
        // Fallback to simple select if join fails
        const { data: simpleData, error: simpleError } = await supabase
          .from('pengaduan_wali')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        setPengaduanList(simpleData || []);
      } else {
        setPengaduanList(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching pengaduan:', error);
      setMessage({ type: 'error', text: `Gagal memuat data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pernyataan_benar) {
      setMessage({ type: 'error', text: 'Mohon centang pernyataan pengakuan.' });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('pengaduan_wali')
        .insert([{
          ...formData,
          kelas: selectedClass,
          siswa_id: selectedSiswaId || null,
          jenis_pengaduan: formData.jenis_pengaduan === 'Lainnya' ? formData.jenis_pengaduan_manual : formData.jenis_pengaduan
        }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Laporan pengaduan berhasil dikirim! Pihak sekolah akan segera menindaklanjuti.' });
      resetForm();
      if (view === 'list') {
        fetchPengaduan();
      }
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal mengirim pengaduan' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nama_pelapor: '',
      hp_pelapor: '',
      hubungan_siswa: '',
      alamat_pelapor: '',
      jenis_pengaduan: '',
      jenis_pengaduan_manual: '',
      uraian: '',
      waktu_kejadian: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      tempat_kejadian: '',
      harapan_orang_tua: '',
      tindakan_diharapkan: '',
      pernyataan_benar: false
    });
    setSelectedSiswaId('');
    setSelectedClass('');
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pengaduan_wali')
        .delete()
        .eq('id', itemToDelete);
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Pengaduan berhasil dihapus.' });
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
      fetchPengaduan();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal menghapus pengaduan' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pengaduan_wali')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: `Status pengaduan berhasil diubah menjadi ${newStatus}.` });
      setIsStatusModalOpen(false);
      fetchPengaduan();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal mengubah status' });
    } finally {
      setLoading(false);
    }
  };

  const filteredSiswa = siswa.filter(s => s.kelas === selectedClass);

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
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

              <div className="min-w-0">
                <h1 className="text-xs md:text-xl font-black text-slate-800 tracking-tight uppercase truncate">Pengaduan Wali</h1>
                <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Layanan Pengaduan</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              {!isViewer && (
                <button
                  onClick={() => setView('form')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    view === 'form' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Form Laporan
                </button>
              )}
              {(isAdmin || isEditor || isViewer) && (
                <button
                  onClick={() => setView('list')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  List Pengaduan {isViewer ? '' : '(Admin)'}
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-2">
              {/* Hamburger Menu for Sidebar */}
              <button 
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={onOpenSidebar}
                title="Menu Utama Aplikasi"
              >
                <Menu size={24} />
              </button>

              {/* More Menu for App Internal Menu */}
              <button 
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                title="Menu Aplikasi"
              >
                {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar/Drawer */}
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
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center text-white">
                  <MessageSquare size={18} />
                </div>
                <span className="font-bold text-slate-800">Menu Pengaduan</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
              {!isViewer && (
                <button
                  onClick={() => { setView('form'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${
                    view === 'form' ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Plus size={20} />
                  <span>Form Laporan</span>
                </button>
              )}
              {(isAdmin || isEditor || isViewer) && (
                <button
                  onClick={() => { setView('list'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${
                    view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardList size={20} />
                  <span>List Pengaduan</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          {view === 'form' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Formulir Pengaduan</h3>
                    <p className="text-sm text-slate-400 font-medium mt-1">Sampaikan permasalahan Anda secara benar dan jujur</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Section 1: Data Pelapor */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs">1</div>
                      <h4 className="font-black text-slate-700 uppercase tracking-widest text-sm">Data Pelapor</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Nama Orang Tua / Wali *</label>
                        <div className="relative group">
                          <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-500 transition-colors" size={20} />
                          <input
                            required
                            type="text"
                            value={formData.nama_pelapor}
                            onChange={(e) => setFormData({ ...formData, nama_pelapor: e.target.value })}
                            placeholder="Nama Lengkap"
                            className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Nomor HP / WA *</label>
                        <div className="relative group">
                          <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-500 transition-colors" size={20} />
                          <input
                            required
                            type="tel"
                            value={formData.hp_pelapor}
                            onChange={(e) => setFormData({ ...formData, hp_pelapor: e.target.value })}
                            placeholder="Contoh: 08123456789"
                            className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Hubungan dengan Siswa *</label>
                        <select
                          required
                          value={formData.hubungan_siswa}
                          onChange={(e) => setFormData({ ...formData, hubungan_siswa: e.target.value })}
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                        >
                          <option value="">-- Pilih Hubungan --</option>
                          <option value="Ayah">Ayah</option>
                          <option value="Ibu">Ibu</option>
                          <option value="Wali">Wali</option>
                          <option value="Saudara">Saudara</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Alamat Lengkap *</label>
                        <div className="relative group">
                          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-500 transition-colors" size={20} />
                          <input
                            required
                            type="text"
                            value={formData.alamat_pelapor}
                            onChange={(e) => setFormData({ ...formData, alamat_pelapor: e.target.value })}
                            placeholder="Alamat tempat tinggal saat ini"
                            className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Data Siswa */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs">2</div>
                      <h4 className="font-black text-slate-700 uppercase tracking-widest text-sm">Data Siswa</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Kelas *</label>
                        <select
                          required
                          value={selectedClass}
                          onChange={(e) => { setSelectedClass(e.target.value); setSelectedSiswaId(''); }}
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                        >
                          <option value="">-- Pilih Kelas --</option>
                          {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Pilih Nama Siswa *</label>
                        <select
                          required
                          value={selectedSiswaId}
                          onChange={(e) => setSelectedSiswaId(e.target.value)}
                          disabled={!selectedClass}
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 disabled:opacity-50"
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {filteredSiswa.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Detail Pengaduan */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs">3</div>
                      <h4 className="font-black text-slate-700 uppercase tracking-widest text-sm">Detail Pengaduan</h4>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Jenis Pengaduan *</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {jenisOptions.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, jenis_pengaduan: opt })}
                              className={`px-4 py-4 rounded-2xl font-bold text-xs transition-all duration-300 ${
                                formData.jenis_pengaduan === opt 
                                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20 scale-105' 
                                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {formData.jenis_pengaduan === 'Lainnya' && (
                          <input
                            required
                            type="text"
                            value={formData.jenis_pengaduan_manual}
                            onChange={(e) => setFormData({ ...formData, jenis_pengaduan_manual: e.target.value })}
                            placeholder="Sebutkan jenis pengaduan lainnya..."
                            className="w-full mt-4 px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2 ml-4">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Uraian Permasalahan / Kronologi *</label>
                          <span className="text-[10px] font-bold text-slate-400">{formData.uraian.length}/500</span>
                        </div>
                        <div className="relative group">
                          <FileText className="absolute left-6 top-6 text-slate-300 group-focus-within:text-pink-500 transition-colors" size={20} />
                          <textarea
                            required
                            maxLength={500}
                            value={formData.uraian}
                            onChange={(e) => setFormData({ ...formData, uraian: e.target.value })}
                            placeholder="Ceritakan secara detail kronologi kejadian..."
                            rows={4}
                            className="w-full pl-14 pr-8 py-6 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Waktu Kejadian *</label>
                          <div className="relative group">
                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-500 transition-colors" size={20} />
                            <input
                              required
                              type="datetime-local"
                              value={formData.waktu_kejadian}
                              onChange={(e) => setFormData({ ...formData, waktu_kejadian: e.target.value })}
                              className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Tempat Kejadian *</label>
                          <div className="relative group">
                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-500 transition-colors" size={20} />
                            <input
                              required
                              type="text"
                              value={formData.tempat_kejadian}
                              onChange={(e) => setFormData({ ...formData, tempat_kejadian: e.target.value })}
                              placeholder="Lokasi kejadian"
                              className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Bukti Pendukung (Opsional)</label>
                        <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-4 hover:bg-slate-100 transition-all cursor-pointer group">
                          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-slate-400 group-hover:text-pink-500 shadow-sm transition-colors">
                            <Upload size={32} />
                          </div>
                          <div className="text-center">
                            <p className="font-black text-slate-700">Klik untuk Unggah</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">JPG, PDF, MP4 (Maks 10MB)</p>
                          </div>
                          <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf,.mp4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Harapan */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-black text-xs">4</div>
                      <h4 className="font-black text-slate-700 uppercase tracking-widest text-sm">Harapan Orang Tua</h4>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Harapan Orang Tua *</label>
                        <textarea
                          required
                          value={formData.harapan_orang_tua}
                          onChange={(e) => setFormData({ ...formData, harapan_orang_tua: e.target.value })}
                          placeholder="Apa harapan Anda setelah melaporkan ini?"
                          rows={2}
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Tindakan yang diharapkan dari pihak sekolah...</label>
                        <textarea
                          value={formData.tindakan_diharapkan}
                          onChange={(e) => setFormData({ ...formData, tindakan_diharapkan: e.target.value })}
                          placeholder="Langkah apa yang Anda inginkan sekolah ambil?"
                          rows={2}
                          className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-pink-500 focus:bg-white outline-none transition-all duration-300 font-bold text-slate-700 placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Pengakuan */}
                  <div className="p-8 bg-pink-50 rounded-[32px] border border-pink-100">
                    <label className="flex items-start gap-4 cursor-pointer group">
                      <div className="relative mt-1">
                        <input
                          type="checkbox"
                          checked={formData.pernyataan_benar}
                          onChange={(e) => setFormData({ ...formData, pernyataan_benar: e.target.checked })}
                          className="peer appearance-none w-6 h-6 border-2 border-pink-300 rounded-lg checked:bg-pink-600 checked:border-pink-600 transition-all cursor-pointer"
                        />
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" size={16} />
                      </div>
                      <span className="text-sm font-bold text-pink-900 leading-tight">
                        Pengakuan - Saya menyatakan bahwa informasi yang saya sampaikan adalah benar dan dapat dipertanggungjawabkan.
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end pt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-12 py-6 bg-pink-600 hover:bg-pink-700 text-white rounded-[32px] font-black flex items-center gap-4 transition-all duration-300 shadow-xl shadow-pink-600/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save size={24} />
                      )}
                      Kirim Laporan Pengaduan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Daftar Pengaduan</h3>
                      <p className="text-sm text-slate-400 font-medium mt-1">Hanya dapat diakses oleh Administrator</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Cari pengaduan..."
                        className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-100 transition-all">
                      <Filter size={20} />
                    </button>
                    <button className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all">
                      <Download size={20} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-4">Pelapor & Siswa</th>
                        <th className="px-8 py-4">Jenis & Waktu</th>
                        <th className="px-8 py-4">Uraian</th>
                        <th className="px-8 py-4">Status</th>
                        <th className="px-8 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pengaduanList.map((item) => (
                        <tr key={item.id} className="group bg-slate-50 hover:bg-white rounded-[32px] border-2 border-transparent hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
                          <td className="px-8 py-6 rounded-l-[32px]">
                            <div className="space-y-1">
                              <p className="font-black text-slate-800 text-sm">{item.nama_pelapor}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Wali dari: {item.siswa?.nama} ({item.kelas})</p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1">
                              <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-blue-600 border border-blue-50 uppercase tracking-widest">
                                {item.jenis_pengaduan}
                              </span>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {format(new Date(item.waktu_kejadian), 'dd MMM yyyy, HH:mm')}
                              </p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-bold text-slate-600 line-clamp-2 max-w-xs">{item.uraian}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                              item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              item.status === 'Diproses' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              item.status === 'Ditolak' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                              'bg-slate-200 text-slate-600 border-slate-300'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 rounded-r-[32px] text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setSelectedItem(item); setIsStatusModalOpen(true); }}
                                className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300"
                                title="Lihat Detail & Update Status"
                              >
                                <Eye size={18} />
                              </button>
                              {(isAdmin || isEditor) && (
                                <button 
                                  onClick={() => { setSelectedItem(item); setIsStatusModalOpen(true); }}
                                  className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-300"
                                  title="Update Status"
                                >
                                  <Settings size={18} />
                                </button>
                              )}
                              {(isAdmin || isEditor) && (
                                <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="p-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300"
                                  title="Hapus Pengaduan"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pengaduanList.length === 0 && !loading && (
                        <tr>
                          <td colSpan={5} className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">Belum ada laporan pengaduan.</p>
                          </td>
                        </tr>
                      )}
                      {loading && (
                        <tr>
                          <td colSpan={5} className="text-center py-20">
                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <AnimatePresence>
        {isStatusModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Detail & Update Status</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {selectedItem.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsStatusModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pelapor</label>
                      <p className="font-black text-slate-800">{selectedItem.nama_pelapor}</p>
                      <p className="text-xs font-bold text-slate-500">{selectedItem.hp_pelapor} ({selectedItem.hubungan_siswa})</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Siswa</label>
                      <p className="font-black text-slate-800">{selectedItem.siswa?.nama || 'N/A'}</p>
                      <p className="text-xs font-bold text-slate-500">Kelas {selectedItem.kelas}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Waktu Kejadian</label>
                      <p className="font-bold text-slate-700 text-sm">{format(new Date(selectedItem.waktu_kejadian), 'dd MMMM yyyy, HH:mm', { locale: idLocale })}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jenis Pengaduan</label>
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        {selectedItem.jenis_pengaduan}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Uraian</label>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {selectedItem.uraian}
                      </p>
                    </div>
                  </div>
                </div>

                {(isAdmin || isEditor) && (
                  <div className="border-t border-slate-100 pt-8">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Update Status Laporan</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['Pending', 'Diproses', 'Selesai', 'Ditolak'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(selectedItem.id, status)}
                          disabled={loading}
                          className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            selectedItem.status === status
                              ? status === 'Selesai' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' :
                                status === 'Diproses' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' :
                                status === 'Ditolak' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' :
                                'bg-slate-600 text-white shadow-lg shadow-slate-200'
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-600 mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Hapus Pengaduan?</h3>
              <p className="text-slate-500 font-bold mb-8">Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus data ini?</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={executeDelete}
                  disabled={loading}
                  className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-3"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={20} />}
                  Ya, Hapus Sekarang
                </button>
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest transition-all"
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Message Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 50, x: 50 }}
            className={`fixed bottom-8 right-8 z-[120] px-8 py-6 rounded-[32px] shadow-2xl flex items-center gap-6 border animate-in slide-in-from-bottom-4 duration-300 ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-widest mb-1">{message.type === 'success' ? 'Berhasil' : 'Kesalahan'}</p>
              <p className="font-bold text-xs opacity-80">{message.text}</p>
            </div>
            <button onClick={() => setMessage(null)} className="p-2 hover:bg-black/5 rounded-xl transition-colors ml-2">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PengaduanWaliApp;
