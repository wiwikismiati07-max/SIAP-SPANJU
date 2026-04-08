import React, { useState, useEffect } from 'react';
import { 
  Library, 
  Users, 
  BookOpen, 
  Book, 
  ArrowLeftRight, 
  History, 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  ChevronLeft,
  LayoutDashboard,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Printer,
  Calendar,
  Clock,
  User,
  RotateCcw,
  GraduationCap,
  Briefcase,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

const safeFormatDate = (dateStr: string | null | undefined, formatStr: string = 'dd/MM/yyyy') => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr);
  } catch (error) {
    return '-';
  }
};

interface SipenaAppProps {
  onBack?: () => void;
}

type SipenaSection = 'dashboard' | 'master' | 'kunjungan_siswa' | 'kunjungan_warta' | 'peminjaman' | 'pengembalian' | 'laporan';

const SipenaApp: React.FC<SipenaAppProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<SipenaSection>('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- Dashboard Stats ---
  const [stats, setStats] = useState({
    totalKunjungan: 0,
    kunjunganKelas: 0,
    totalJenisBuku: 0,
    bukuKoleksi: 0,
    bukuDipinjam: 0
  });

  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, color: 'from-blue-600 to-blue-800' },
    { id: 'master', title: 'Master Buku', icon: Book, color: 'from-slate-800 to-black' },
    { id: 'kunjungan_siswa', title: 'Kunjungan Siswa', icon: Users, color: 'from-emerald-600 to-emerald-800' },
    { id: 'kunjungan_warta', title: 'Kunjungan Warta', icon: Briefcase, color: 'from-amber-600 to-amber-800' },
    { id: 'peminjaman', title: 'Peminjaman', icon: ArrowLeftRight, color: 'from-pink-600 to-rose-700' },
    { id: 'pengembalian', title: 'Pengembalian', icon: History, color: 'from-indigo-600 to-indigo-800' },
    { id: 'laporan', title: 'Laporan', icon: FileSpreadsheet, color: 'from-purple-600 to-purple-800' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase leading-none">SIPENA</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Sistem Informasi Perpustakaan Siswa</p>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as SipenaSection)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeSection === item.id 
                  ? `bg-gradient-to-r ${item.color} text-white shadow-lg` 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <item.icon size={14} />
              {item.title}
            </button>
          ))}
        </div>

        {/* Mobile Menu Trigger Placeholder */}
        <div className="lg:hidden">
          <select 
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as SipenaSection)}
            className="bg-slate-100 border-none rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none"
          >
            {menuItems.map(item => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            {activeSection === 'dashboard' && <SipenaDashboard key="dashboard" />}
            {activeSection === 'master' && <SipenaMaster key="master" />}
            {activeSection === 'kunjungan_siswa' && <SipenaKunjunganSiswa key="kunjungan_siswa" />}
            {activeSection === 'kunjungan_warta' && <SipenaKunjunganWarta key="kunjungan_warta" />}
            {activeSection === 'peminjaman' && <SipenaPeminjaman key="peminjaman" />}
            {activeSection === 'pengembalian' && <SipenaPengembalian key="pengembalian" />}
            {activeSection === 'laporan' && <SipenaLaporan key="laporan" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Message Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="font-bold text-sm">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-Components ---

const SipenaDashboard = () => {
  const [stats, setStats] = useState({
    totalKunjungan: 0,
    kunjunganKelas: 0,
    totalJenisBuku: 0,
    bukuKoleksi: 0,
    bukuDipinjam: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topVisitors, setTopVisitors] = useState<any[]>([]);
  const [topBorrowers, setTopBorrowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [kunjungan, buku, pinjam] = await Promise.all([
        supabase.from('sipena_kunjungan_siswa').select('*, master_siswa(nama)'),
        supabase.from('sipena_buku').select('*'),
        supabase.from('sipena_peminjaman').select('*, master_siswa(nama)')
      ]);

      const totalKunjungan = kunjungan.data?.length || 0;
      const uniqueClasses = new Set(kunjungan.data?.map(v => v.kelas)).size;
      const totalJenisBuku = buku.data?.length || 0;
      const bukuKoleksi = buku.data?.reduce((acc, b) => acc + (b.stok_eksemplar || 0), 0) || 0;
      const bukuDipinjam = pinjam.data?.filter(p => p.status === 'Dipinjam').length || 0;

      setStats({
        totalKunjungan,
        kunjunganKelas: uniqueClasses,
        totalJenisBuku,
        bukuKoleksi,
        bukuDipinjam
      });

      // Chart Data (Top 5 books by stock)
      const sortedBooks = [...(buku.data || [])].sort((a, b) => b.stok_eksemplar - a.stok_eksemplar).slice(0, 5);
      setChartData(sortedBooks.map(b => ({ name: b.judul_buku.substring(0, 15) + '...', stok: b.stok_eksemplar })));

      // Top Visitors
      const visitorCounts: any = {};
      kunjungan.data?.forEach(v => {
        const name = v.master_siswa?.nama || 'Unknown';
        visitorCounts[name] = (visitorCounts[name] || 0) + 1;
      });
      const sortedVisitors = Object.entries(visitorCounts)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopVisitors(sortedVisitors);

      // Top Borrowers
      const borrowerCounts: any = {};
      pinjam.data?.forEach(p => {
        const name = p.master_siswa?.nama || 'Unknown';
        borrowerCounts[name] = (borrowerCounts[name] || 0) + 1;
      });
      const sortedBorrowers = Object.entries(borrowerCounts)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopBorrowers(sortedBorrowers);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Kunjungan', value: stats.totalKunjungan, icon: Users, color: 'emerald' },
    { label: 'Kunjungan Kelas', value: stats.kunjunganKelas, icon: GraduationCap, color: 'blue' },
    { label: 'Total Jenis Buku', value: stats.totalJenisBuku, icon: BookOpen, color: 'amber' },
    { label: 'Buku Koleksi', value: stats.bukuKoleksi, icon: Library, color: 'indigo' },
    { label: 'Buku Dipinjam', value: stats.bukuDipinjam, icon: ArrowLeftRight, color: 'pink' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {statCards.map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-2xl bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <card.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
            <h4 className="text-2xl font-black text-slate-800">{card.value}</h4>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Grafik Stok Buku</h4>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="stok" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100"
          >
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Siswa Sering Berkunjung</h4>
            <div className="space-y-4">
              {topVisitors.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm">
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{v.name}</span>
                  </div>
                  <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-emerald-600 uppercase shadow-sm">
                    {v.count} Kali
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100"
          >
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Siswa Sering Pinjam</h4>
            <div className="space-y-4">
              {topBorrowers.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-black text-sm">
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{v.name}</span>
                  </div>
                  <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-pink-600 uppercase shadow-sm">
                    {v.count} Buku
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const SipenaMaster = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mapels, setMapels] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    judul_buku: '',
    jenis_buku: '',
    mapel_id: '',
    edisi: '',
    isbn_issn: '',
    penerbit: '',
    tahun: '',
    kolasi: '',
    judul_seri: '',
    nomor_panggil: '',
    bahasa_buku: 'Indonesia',
    kota_terbit: '',
    nomor_kelas: '',
    catatan: '',
    guru_id: '',
    pengarang: '',
    subjek: '',
    kode_eksemplar: '',
    stok_eksemplar: 0
  });

  useEffect(() => {
    fetchBooks();
    fetchMasters();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sipena_buku')
        .select('*, master_mapel(nama_mapel), master_guru(nama_guru)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [mapelRes, guruRes] = await Promise.all([
        supabase.from('master_mapel').select('*').order('nama_mapel'),
        supabase.from('master_guru').select('*').order('nama_guru')
      ]);
      setMapels(mapelRes.data || []);
      setGurus(guruRes.data || []);
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingBook) {
        const { error } = await supabase
          .from('sipena_buku')
          .update(formData)
          .eq('id', editingBook.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sipena_buku')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchBooks();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus buku ini?')) return;
    try {
      const { error } = await supabase.from('sipena_buku').delete().eq('id', id);
      if (error) throw error;
      fetchBooks();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map Excel columns to DB columns
        const mappedData = data.map((row: any) => {
          // Helper to find value by case-insensitive key or common variations
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim());
              if (foundKey) return row[foundKey];
            }
            return '';
          };

          return {
            judul_buku: getValue(['judul', 'Judul Buku', 'Title']),
            jenis_buku: getValue(['jenis', 'Jenis Buku', 'Type']),
            edisi: getValue(['edisi', 'Edisi', 'Edition']),
            isbn_issn: getValue(['isbn-issn', 'ISBN/ISSN', 'ISBN']),
            penerbit: getValue(['penerbit', 'Penerbit', 'Publisher']),
            tahun: getValue(['tahun terbit', 'Tahun', 'Year']),
            kolasi: getValue(['kolasi', 'Kolasi', 'Collation']),
            judul_seri: getValue(['judul seri', 'Judul Seri', 'Series']),
            nomor_panggil: getValue(['Nomor Panggil', 'Call Number']),
            bahasa_buku: getValue(['Bahasa Buku', 'Bahasa', 'Language']) || 'Indonesia',
            kota_terbit: getValue(['Kota Terbit', 'City']),
            nomor_kelas: getValue(['Nomor Kelas', 'Class Number']),
            catatan: getValue(['catatan', 'Catatan', 'Notes']),
            pengarang: getValue(['pengarang', 'Author']),
            subjek: getValue(['subjek', 'Subject']),
            kode_eksemplar: getValue(['kode eksemplar', 'Kode', 'Barcode']),
            stok_eksemplar: parseInt(getValue(['stok', 'Stok Eksemplar', 'Stock'])) || 1
          };
        });

        const { error } = await supabase.from('sipena_buku').insert(mappedData);
        if (error) throw error;
        alert('Data berhasil diupload!');
        fetchBooks();
      } catch (error: any) {
        alert('Error reading Excel: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredBooks = books.filter(b => 
    b.judul_buku.toLowerCase().includes(search.toLowerCase()) ||
    b.pengarang?.toLowerCase().includes(search.toLowerCase()) ||
    b.kode_eksemplar?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Master Data Buku</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kelola koleksi buku perpustakaan</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari buku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full md:w-64"
            />
          </div>
          <label className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest cursor-pointer">
            <Upload size={18} />
            <span className="hidden sm:inline">Upload Excel</span>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
          </label>
          <button 
            onClick={() => { 
              setEditingBook(null); 
              setFormData({
                judul_buku: '', jenis_buku: '', mapel_id: '', edisi: '', isbn_issn: '', 
                penerbit: '', tahun: '', kolasi: '', judul_seri: '', nomor_panggil: '', 
                bahasa_buku: 'Indonesia', kota_terbit: '', nomor_kelas: '', catatan: '', 
                guru_id: '', pengarang: '', subjek: '', kode_eksemplar: '', stok_eksemplar: 0
              });
              setIsModalOpen(true); 
            }}
            className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah Buku</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Info Buku</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identitas</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Penerbit</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBooks.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                        <Book size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{book.judul_buku}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{book.pengarang || 'Tanpa Pengarang'}</p>
                        <div className="flex gap-1 mt-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest">{book.jenis_buku || 'Umum'}</span>
                          {book.master_mapel && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest">{book.master_mapel.nama_mapel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">ISBN: {book.isbn_issn || '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No. Panggil: {book.nomor_panggil || '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kode: {book.kode_eksemplar || '-'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{book.penerbit || '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tahun: {book.tahun || '-'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black ${book.stok_eksemplar > 0 ? 'text-slate-800' : 'text-rose-500'}`}>{book.stok_eksemplar}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Eks</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingBook(book);
                          setFormData({
                            judul_buku: book.judul_buku,
                            jenis_buku: book.jenis_buku || '',
                            mapel_id: book.mapel_id || '',
                            edisi: book.edisi || '',
                            isbn_issn: book.isbn_issn || '',
                            penerbit: book.penerbit || '',
                            tahun: book.tahun || '',
                            kolasi: book.kolasi || '',
                            judul_seri: book.judul_seri || '',
                            nomor_panggil: book.nomor_panggil || '',
                            bahasa_buku: book.bahasa_buku || 'Indonesia',
                            kota_terbit: book.kota_terbit || '',
                            nomor_kelas: book.nomor_kelas || '',
                            catatan: book.catatan || '',
                            guru_id: book.guru_id || '',
                            pengarang: book.pengarang || '',
                            subjek: book.subjek || '',
                            kode_eksemplar: book.kode_eksemplar || '',
                            stok_eksemplar: book.stok_eksemplar || 0
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(book.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h4 className="text-xl font-black text-slate-800 tracking-tight uppercase">{editingBook ? 'Edit Buku' : 'Tambah Buku Baru'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lengkapi detail informasi buku</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Judul Buku *</label>
                      <input 
                        required
                        type="text" 
                        value={formData.judul_buku}
                        onChange={(e) => setFormData({...formData, judul_buku: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Pengarang</label>
                      <input 
                        type="text" 
                        value={formData.pengarang}
                        onChange={(e) => setFormData({...formData, pengarang: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Jenis Buku</label>
                        <select 
                          value={formData.jenis_buku}
                          onChange={(e) => setFormData({...formData, jenis_buku: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">Pilih Jenis</option>
                          <option value="Fiksi">Fiksi</option>
                          <option value="Non-Fiksi">Non-Fiksi</option>
                          <option value="Referensi">Referensi</option>
                          <option value="Mapel">Mata Pelajaran</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Mata Pelajaran</label>
                        <select 
                          value={formData.mapel_id}
                          onChange={(e) => setFormData({...formData, mapel_id: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">Pilih Mapel</option>
                          {mapels.map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">ISBN/ISSN</label>
                        <input 
                          type="text" 
                          value={formData.isbn_issn}
                          onChange={(e) => setFormData({...formData, isbn_issn: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Kode Eksemplar</label>
                        <input 
                          type="text" 
                          value={formData.kode_eksemplar}
                          onChange={(e) => setFormData({...formData, kode_eksemplar: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Penerbit</label>
                        <input 
                          type="text" 
                          value={formData.penerbit}
                          onChange={(e) => setFormData({...formData, penerbit: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Tahun Terbit</label>
                        <input 
                          type="text" 
                          value={formData.tahun}
                          onChange={(e) => setFormData({...formData, tahun: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">No. Panggil</label>
                      <input 
                        type="text" 
                        value={formData.nomor_panggil}
                        onChange={(e) => setFormData({...formData, nomor_panggil: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Penanggung Jawab (Guru)</label>
                      <select 
                        value={formData.guru_id}
                        onChange={(e) => setFormData({...formData, guru_id: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="">Pilih Guru</option>
                        {gurus.map(g => <option key={g.id} value={g.id}>{g.nama_guru}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Stok Eksemplar</label>
                      <input 
                        type="number" 
                        value={formData.stok_eksemplar}
                        onChange={(e) => setFormData({...formData, stok_eksemplar: parseInt(e.target.value) || 0})}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                    Simpan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SipenaKunjunganSiswa = () => {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [siswa, setSiswa] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
    kelas: '',
    siswa_id: '',
    keperluan: 'Membaca',
    keterangan_lain: ''
  });

  const classes = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];

  useEffect(() => {
    fetchVisits();
    fetchSiswa();
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sipena_kunjungan_siswa')
        .select('*, master_siswa(nama, kelas)')
        .order('tanggal', { ascending: false })
        .order('jam', { ascending: false });
      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiswa = async () => {
    const { data } = await supabase.from('master_siswa').select('*').order('nama');
    setSiswa(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.from('sipena_kunjungan_siswa').insert([formData]);
      if (error) throw error;
      setIsModalOpen(false);
      fetchVisits();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data kunjungan ini?')) return;
    await supabase.from('sipena_kunjungan_siswa').delete().eq('id', id);
    fetchVisits();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Kunjungan Siswa</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catat kehadiran siswa di perpustakaan</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200"
        >
          <Plus size={18} />
          Catat Kunjungan
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keperluan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visits.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{safeFormatDate(v.tanggal, 'dd MMM yyyy')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.jam.substring(0, 5)} WIB</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        {v.master_siswa?.nama?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{v.master_siswa?.nama || 'Siswa'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas {v.kelas}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {v.keperluan}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => handleDelete(v.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
              <h4 className="text-xl font-black text-slate-800 uppercase mb-6">Catat Kunjungan</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Kelas</label>
                    <select 
                      required
                      value={formData.kelas}
                      onChange={(e) => setFormData({...formData, kelas: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">Pilih Kelas</option>
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Siswa</label>
                    <select 
                      required
                      value={formData.siswa_id}
                      onChange={(e) => setFormData({...formData, siswa_id: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">Pilih Siswa</option>
                      {siswa.filter(s => s.kelas === formData.kelas).map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Keperluan</label>
                  <select 
                    value={formData.keperluan}
                    onChange={(e) => setFormData({...formData, keperluan: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="Membaca">Membaca</option>
                    <option value="Belajar">Belajar</option>
                    <option value="Mengembalikan">Mengembalikan Buku</option>
                    <option value="Meminjam Buku">Meminjam Buku</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200">
                  Simpan Kunjungan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SipenaKunjunganWarta = () => {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gurus, setGurus] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    jam: format(new Date(), 'HH:mm'),
    kelas: '',
    guru_id: '',
    mapel_id: ''
  });

  const classes = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];

  useEffect(() => {
    fetchVisits();
    fetchMasters();
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sipena_kunjungan_warta')
        .select('*, master_guru(nama_guru), master_mapel(nama_mapel)')
        .order('tanggal', { ascending: false });
      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    const [g, m] = await Promise.all([
      supabase.from('master_guru').select('*').order('nama_guru'),
      supabase.from('master_mapel').select('*').order('nama_mapel')
    ]);
    setGurus(g.data || []);
    setMapels(m.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.from('sipena_kunjungan_warta').insert([formData]);
      if (error) throw error;
      setIsModalOpen(false);
      fetchVisits();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Kunjungan Warta</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catat kunjungan guru dan staf</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-3 bg-amber-600 text-white rounded-2xl hover:bg-amber-700 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200"
        >
          <Plus size={18} />
          Catat Kunjungan
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guru</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visits.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-slate-800">{safeFormatDate(v.tanggal, 'dd MMM yyyy')}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.jam.substring(0, 5)} WIB</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{v.master_guru?.nama_guru || '-'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {v.master_mapel?.nama_mapel || '-'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-slate-800">{v.kelas || '-'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
              <h4 className="text-xl font-black text-slate-800 uppercase mb-6">Catat Kunjungan Warta</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Guru</label>
                  <select 
                    required
                    value={formData.guru_id}
                    onChange={(e) => setFormData({...formData, guru_id: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="">Pilih Guru</option>
                    {gurus.map(g => <option key={g.id} value={g.id}>{g.nama_guru}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Mata Pelajaran</label>
                    <select 
                      required
                      value={formData.mapel_id}
                      onChange={(e) => setFormData({...formData, mapel_id: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">Pilih Mapel</option>
                      {mapels.map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Kelas</label>
                    <select 
                      value={formData.kelas}
                      onChange={(e) => setFormData({...formData, kelas: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">Pilih Kelas</option>
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200">
                  Simpan Kunjungan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SipenaPeminjaman = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [siswa, setSiswa] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    tanggal_pinjam: format(new Date(), 'yyyy-MM-dd'),
    jam_pinjam: format(new Date(), 'HH:mm'),
    kelas: '',
    siswa_id: '',
    tanggal_kembali_rencana: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  });

  const [selectedBooks, setSelectedBooks] = useState<any[]>([]);
  const [currentBookId, setCurrentBookId] = useState('');
  const [currentQty, setCurrentQty] = useState(1);

  useEffect(() => {
    fetchLoans();
    fetchMasters();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sipena_peminjaman')
        .select('*, master_siswa(nama, kelas), sipena_peminjaman_item(*, sipena_buku(judul_buku))')
        .order('tanggal_pinjam', { ascending: false });
      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    const [s, b] = await Promise.all([
      supabase.from('master_siswa').select('*').order('nama'),
      supabase.from('sipena_buku').select('*').gt('stok_eksemplar', 0).order('judul_buku')
    ]);
    setSiswa(s.data || []);
    setBooks(b.data || []);
  };

  const handleAddBook = () => {
    if (!currentBookId) return;
    const book = books.find(b => b.id === currentBookId);
    if (book) {
      // Check if already added
      if (selectedBooks.find(sb => sb.id === book.id)) {
        alert('Buku ini sudah ditambahkan ke daftar');
        return;
      }
      setSelectedBooks([...selectedBooks, { ...book, jumlah: currentQty }]);
      setCurrentBookId('');
      setCurrentQty(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalBooks = [...selectedBooks];
    
    // If no books in list, but one is selected in dropdown, add it automatically
    if (finalBooks.length === 0 && currentBookId) {
      const book = books.find(b => b.id === currentBookId);
      if (book) {
        finalBooks = [{ ...book, jumlah: currentQty }];
      }
    }

    if (finalBooks.length === 0) return alert('Pilih minimal satu buku');

    try {
      setLoading(true);
      const { data: loan, error: loanError } = await supabase
        .from('sipena_peminjaman')
        .insert([formData])
        .select()
        .single();
      
      if (loanError) throw loanError;

      const items = finalBooks.map(b => ({
        peminjaman_id: loan.id,
        buku_id: b.id,
        jumlah: b.jumlah
      }));

      const { error: itemError } = await supabase.from('sipena_peminjaman_item').insert(items);
      if (itemError) throw itemError;

      setIsModalOpen(false);
      setSelectedBooks([]);
      setCurrentBookId('');
      fetchLoans();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Peminjaman Buku</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kelola peminjaman buku oleh siswa</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              tanggal_pinjam: format(new Date(), 'yyyy-MM-dd'),
              jam_pinjam: format(new Date(), 'HH:mm'),
              kelas: '',
              siswa_id: '',
              tanggal_kembali_rencana: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            });
            setSelectedBooks([]);
            setCurrentBookId('');
            setIsModalOpen(true);
          }}
          className="p-3 bg-pink-600 text-white rounded-2xl hover:bg-pink-700 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-pink-200"
        >
          <Plus size={18} />
          Pinjam Buku
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peminjam</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Buku</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tgl Pinjam</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tgl Kembali</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loans.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{l.master_siswa?.nama || '-'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas {l.kelas}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      {l.sipena_peminjaman_item?.map((item: any, i: number) => (
                        <p key={i} className="text-xs font-bold text-slate-600">• {item.sipena_buku?.judul_buku} ({item.jumlah} eks)</p>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-slate-800">{safeFormatDate(l.tanggal_pinjam, 'dd MMM yyyy')}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-slate-800">{safeFormatDate(l.tanggal_kembali_rencana, 'dd MMM yyyy')}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      l.status === 'Dipinjam' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h4 className="text-xl font-black text-slate-800 uppercase mb-6 tracking-tight">Form Peminjaman</h4>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Kelas</label>
                    <select required value={formData.kelas} onChange={(e) => setFormData({...formData, kelas: e.target.value, siswa_id: ''})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none">
                      <option value="">Pilih Kelas</option>
                      {['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Siswa</label>
                    <select required value={formData.siswa_id} onChange={(e) => setFormData({...formData, siswa_id: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none">
                      <option value="">Pilih Siswa</option>
                      {siswa.filter(s => s.kelas === formData.kelas).map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Pilih Buku</label>
                  <div className="flex gap-2">
                    <select 
                      value={currentBookId}
                      onChange={(e) => setCurrentBookId(e.target.value)}
                      className="flex-1 px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none"
                    >
                      <option value="">Pilih Buku...</option>
                      {books.map(b => <option key={b.id} value={b.id}>{b.judul_buku} (Stok: {b.stok_eksemplar})</option>)}
                    </select>
                    <input 
                      type="number" 
                      value={currentQty}
                      onChange={(e) => setCurrentQty(parseInt(e.target.value) || 1)}
                      min="1" 
                      max="50" 
                      className="w-20 px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" 
                    />
                    <button 
                      type="button"
                      onClick={handleAddBook}
                      className="p-4 bg-slate-800 text-white rounded-2xl hover:bg-black transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedBooks.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-800">{b.judul_buku} ({b.jumlah} eks)</span>
                        <button type="button" onClick={() => setSelectedBooks(selectedBooks.filter((_, idx) => idx !== i))} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Tanggal Kembali Rencana</label>
                  <input type="date" required value={formData.tanggal_kembali_rencana} onChange={(e) => setFormData({...formData, tanggal_kembali_rencana: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-pink-200 hover:bg-pink-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Proses Peminjaman'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SipenaPengembalian = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const [returnedLoans, setReturnedLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  useEffect(() => {
    fetchActiveLoans();
    fetchReturnedLoans();
  }, []);

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sipena_peminjaman')
        .select('*, master_siswa(nama, kelas), sipena_peminjaman_item(*, sipena_buku(judul_buku))')
        .eq('status', 'Dipinjam')
        .order('tanggal_pinjam', { ascending: true });
      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnedLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('sipena_peminjaman')
        .select('*, master_siswa(nama, kelas), sipena_peminjaman_item(*, sipena_buku(judul_buku))')
        .eq('status', 'Kembali')
        .order('id', { ascending: false })
        .limit(10);
      if (error) throw error;
      setReturnedLoans(data || []);
    } catch (error) {
      console.error('Error fetching returned loans:', error);
    }
  };

  const handleReturn = async (loanId: string) => {
    if (!confirm('Konfirmasi pengembalian buku?')) return;
    try {
      setLoading(true);
      // Update items
      const { data: items } = await supabase.from('sipena_peminjaman_item').select('*').eq('peminjaman_id', loanId);
      if (items) {
        for (const item of items) {
          await supabase.from('sipena_peminjaman_item').update({ tanggal_kembali_aktual: format(new Date(), 'yyyy-MM-dd') }).eq('id', item.id);
        }
      }
      // Update loan status
      await supabase.from('sipena_peminjaman').update({ status: 'Kembali' }).eq('id', loanId);
      fetchActiveLoans();
      fetchReturnedLoans();
      alert('Buku berhasil dikembalikan!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReturn = async (loanId: string) => {
    if (!confirm('Batalkan pengembalian ini? Status akan kembali menjadi "Dipinjam".')) return;
    try {
      setLoading(true);
      // Update items
      await supabase.from('sipena_peminjaman_item').update({ tanggal_kembali_aktual: null }).eq('peminjaman_id', loanId);
      // Update loan status
      await supabase.from('sipena_peminjaman').update({ status: 'Dipinjam' }).eq('id', loanId);
      
      fetchActiveLoans();
      fetchReturnedLoans();
      alert('Pengembalian berhasil dibatalkan!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Pengembalian Buku</h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daftar buku yang sedang dipinjam</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loans.map((l) => (
          <div key={l.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User size={24} />
                </div>
                <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Belum Kembali
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-800 leading-tight mb-1">{l.master_siswa?.nama}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Kelas {l.kelas}</p>
              
              <div className="space-y-3 mb-8">
                {l.sipena_peminjaman_item?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <Book size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{item.sipena_buku?.judul_buku}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-400">Tgl Pinjam:</span>
                <span className="text-slate-600">{safeFormatDate(l.tanggal_pinjam, 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-slate-400">Jatuh Tempo:</span>
                <span className="text-rose-500">{safeFormatDate(l.tanggal_kembali_rencana, 'dd/MM/yyyy')}</span>
              </div>
              <button 
                onClick={() => handleReturn(l.id)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                Proses Kembali
              </button>
            </div>
          </div>
        ))}
        {loans.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4 opacity-20" />
            <p className="text-slate-400 font-bold uppercase tracking-widest">Semua buku sudah kembali</p>
          </div>
        )}
      </div>

      <div className="pt-12 border-t border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Histori Pengembalian</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">10 transaksi terakhir yang sudah kembali</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <History size={20} />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Buku</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tgl Pinjam</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {returnedLoans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-800">{l.master_siswa?.nama || '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas {l.kelas}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        {l.sipena_peminjaman_item?.map((item: any, i: number) => (
                          <p key={i} className="text-[10px] font-bold text-slate-600">• {item.sipena_buku?.judul_buku}</p>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-600">
                      {safeFormatDate(l.tanggal_pinjam)}
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                        Sudah Kembali
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleCancelReturn(l.id)}
                        className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ml-auto"
                        title="Batalkan Pengembalian"
                      >
                        <RotateCcw size={14} />
                        Batal
                      </button>
                    </td>
                  </tr>
                ))}
                {returnedLoans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                      Belum ada histori pengembalian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SipenaLaporan = () => {
  const [reportType, setReportType] = useState<'buku' | 'kunjungan' | 'peminjaman'>('buku');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setData([]);
    fetchData();
  }, [reportType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query;
      if (reportType === 'buku') {
        query = supabase.from('sipena_buku').select('*').order('judul_buku');
      } else if (reportType === 'kunjungan') {
        query = supabase.from('sipena_kunjungan_siswa').select('*, master_siswa(nama, kelas)').order('tanggal', { ascending: false });
      } else {
        query = supabase.from('sipena_peminjaman').select('*, master_siswa(nama, kelas), sipena_peminjaman_item(*, sipena_buku(judul_buku))').order('tanggal_pinjam', { ascending: false });
      }
      const { data: res, error } = await query;
      if (error) throw error;
      setData(res || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    let exportData = [];
    if (reportType === 'buku') {
      exportData = data.map(b => ({
        'Judul Buku': b.judul_buku,
        'Jenis Buku': b.jenis_buku,
        'Penerbit': b.penerbit,
        'Tahun': b.tahun,
        'Stok': b.stok_eksemplar
      }));
    } else if (reportType === 'kunjungan') {
      exportData = data.map(v => ({
        'Tanggal': v.tanggal,
        'Jam': v.jam,
        'Nama Siswa': v.master_siswa?.nama,
        'Kelas': v.kelas,
        'Keperluan': v.keperluan
      }));
    } else {
      exportData = data.flatMap(l => l.sipena_peminjaman_item.map((item: any) => ({
        'Tanggal Pinjam': l.tanggal_pinjam,
        'Nama Siswa': l.master_siswa?.nama,
        'Kelas': l.kelas,
        'Judul Buku': item.sipena_buku?.judul_buku,
        'Jumlah': item.jumlah,
        'Status': l.status
      })));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(dataBlob, `Laporan_${reportType}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Printer size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pratinjau Laporan</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siap untuk dicetak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 bg-slate-50">
            <div className="bg-white shadow-xl p-12 mx-auto w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0" id="printable-report">
              {/* Kop Surat */}
              <div className="flex items-center gap-6 border-b-4 border-blue-600 pb-4 mb-8">
                <img 
                  src="https://iili.io/KDFk4fI.png" 
                  alt="Logo" 
                  className="w-24 h-24 object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 text-center">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">Pemerintah Kota Pasuruan</h2>
                  <h1 className="text-3xl font-black text-blue-600 uppercase tracking-tighter leading-tight">SMP Negeri 7</h1>
                  <p className="text-[10px] font-bold text-slate-600 mt-1">Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139</p>
                  <p className="text-[10px] font-bold text-slate-600">Telepon (0343) 426845</p>
                  <p className="text-[10px] font-bold text-blue-500 italic">Pos-el smp7pas@yahoo.co.id , Laman www.smpn7pasuruan.sch.id</p>
                </div>
              </div>

              {/* Judul Laporan */}
              <div className="text-center mb-10">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest underline decoration-blue-600 decoration-4 underline-offset-8">
                  Laporan {reportType === 'buku' ? 'Data Buku' : reportType === 'kunjungan' ? 'Kunjungan Siswa' : 'Peminjaman Buku'}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Per Tanggal: {format(new Date(), 'dd MMMM yyyy')}</p>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">No</th>
                      {reportType === 'buku' && (
                        <>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Judul Buku</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Penerbit</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700 text-center">Stok</th>
                        </>
                      )}
                      {reportType === 'kunjungan' && (
                        <>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Tanggal</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Nama Siswa</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Keperluan</th>
                        </>
                      )}
                      {reportType === 'peminjaman' && (
                        <>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Tanggal</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Peminjam</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700">Buku</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border border-blue-700 text-center">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-700 border border-slate-200 text-center">{i + 1}</td>
                        {reportType === 'buku' && (
                          <>
                            <td className="px-4 py-3 text-[10px] font-bold text-slate-800 border border-slate-200">{item.judul_buku}</td>
                            <td className="px-4 py-3 text-[10px] text-slate-600 border border-slate-200">{item.penerbit}</td>
                            <td className="px-4 py-3 text-[10px] font-black text-slate-800 border border-slate-200 text-center">{item.stok_eksemplar}</td>
                          </>
                        )}
                        {reportType === 'kunjungan' && (
                          <>
                            <td className="px-4 py-3 text-[10px] font-bold text-slate-800 border border-slate-200">{safeFormatDate(item.tanggal)}</td>
                            <td className="px-4 py-3 text-[10px] text-slate-600 border border-slate-200">{item.master_siswa?.nama} ({item.kelas})</td>
                            <td className="px-4 py-3 text-[10px] text-slate-600 border border-slate-200">{item.keperluan}</td>
                          </>
                        )}
                        {reportType === 'peminjaman' && (
                          <>
                            <td className="px-4 py-3 text-[10px] font-bold text-slate-800 border border-slate-200">{safeFormatDate(item.tanggal_pinjam)}</td>
                            <td className="px-4 py-3 text-[10px] text-slate-600 border border-slate-200">{item.master_siswa?.nama} ({item.kelas})</td>
                            <td className="px-4 py-3 text-[10px] text-slate-600 border border-slate-200">
                              {item.sipena_peminjaman_item?.map((b: any) => b.sipena_buku?.judul_buku).join(', ')}
                            </td>
                            <td className="px-4 py-3 text-[10px] font-black border border-slate-200 text-center">
                              <span className={item.status === 'Dipinjam' ? 'text-blue-600' : 'text-emerald-600'}>
                                {item.status}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer / Tanda Tangan */}
              <div className="mt-16 grid grid-cols-2 gap-20">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 mb-20">Mengetahui,<br/>Kepala Sekolah</p>
                  <p className="text-xs font-black text-slate-900 underline">NUR FADILAH, S.Pd</p>
                  <p className="text-[10px] font-bold text-slate-500">NIP. 19860410 201001 2 030</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 mb-20">Pasuruan, {format(new Date(), 'd MMMM yyyy')}<br/>Petugas Perpustakaan</p>
                  <p className="text-xs font-black text-slate-900 underline">WIWIK ISMIATI, S.Pd</p>
                  <p className="text-[10px] font-bold text-slate-500">NIP. 19831116 200904 2 003</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Laporan Perpustakaan</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unduh atau cetak laporan resmi</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowPreview(true)}
            className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200"
          >
            <Printer size={18} />
            Pratinjau Cetak
          </button>
          <button 
            onClick={exportToExcel}
            className="p-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
          >
            <Download size={18} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {(['buku', 'kunjungan', 'peminjaman'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setReportType(t)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              reportType === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {reportType === 'buku' && (
                  <>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Penerbit</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok</th>
                  </>
                )}
                {reportType === 'kunjungan' && (
                  <>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keperluan</th>
                  </>
                )}
                {reportType === 'peminjaman' && (
                  <>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peminjam</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  {reportType === 'buku' && (
                    <>
                      <td className="px-8 py-6 text-xs font-bold text-slate-800">{item.judul_buku}</td>
                      <td className="px-8 py-6 text-xs text-slate-500">{item.penerbit}</td>
                      <td className="px-8 py-6 text-xs font-black text-slate-800">{item.stok_eksemplar}</td>
                    </>
                  )}
                  {reportType === 'kunjungan' && (
                    <>
                      <td className="px-8 py-6 text-xs font-bold text-slate-800">{safeFormatDate(item.tanggal)}</td>
                      <td className="px-8 py-6 text-xs text-slate-500">{item.master_siswa?.nama} ({item.kelas})</td>
                      <td className="px-8 py-6 text-xs text-slate-500">{item.keperluan}</td>
                    </>
                  )}
                  {reportType === 'peminjaman' && (
                    <>
                      <td className="px-8 py-6 text-xs font-bold text-slate-800">{safeFormatDate(item.tanggal_pinjam)}</td>
                      <td className="px-8 py-6 text-xs text-slate-500">{item.master_siswa?.nama} ({item.kelas})</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          item.status === 'Dipinjam' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default SipenaApp;
