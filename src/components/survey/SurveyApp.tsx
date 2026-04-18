import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  ClipboardList, LayoutDashboard, Send, User, MessageSquare, CheckCircle2, AlertCircle, ChevronLeft,
  Star, Users, Activity, MoreVertical, Menu, X, Download, Trash2, Edit, Save, ListFilter
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { addExcelHeaderAndLogos, applyColorfulTableStyle } from '../../lib/excelUtils';

interface SurveyAppProps {
  onBack?: () => void;
  onOpenSidebar?: () => void;
  user?: any;
}

const STATUS_OPTIONS = ['Siswa', 'Guru', 'Orang Tua Murid', 'Tamu'];

const QUESTIONS = [
  "Aplikasi SIAP SPANJU mudah digunakan",
  "Tampilan aplikasi menarik dan mudah dipahami",
  "Aplikasi berjalan dengan cepat dan lancar",
  "Informasi dalam aplikasi jelas dan mudah dimengerti",
  "Fitur dalam aplikasi sudah lengkap",
  "Aplikasi membantu kegiatan sekolah",
  "Aplikasi membantu meningkatkan kedisiplinan siswa",
  "Aplikasi mudah diakses kapan saja",
  "Aplikasi aman dan menjaga privasi pengguna",
  "Saya puas menggunakan aplikasi SIAP SPANJU"
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function SurveyApp({ onBack, onOpenSidebar, user }: SurveyAppProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard' | 'list'>('form');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  const isAdmin = user?.role === 'full';
  const isEditor = user?.role === 'entry';
  const canManage = isAdmin || isEditor;
  
  // Form State
  const [namaLengkap, setNamaLengkap] = useState('');
  const [status, setStatus] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [kritikSaran, setKritikSaran] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Dashboard State
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<any>(null);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [responseToDeleteId, setResponseToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'list') {
      fetchResponses();
    }
  }, [activeTab]);

  const fetchResponses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (err: any) {
      console.error('Error fetching responses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!responseToDeleteId) return;
    
    setIsLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('survey_responses')
        .delete()
        .eq('id', responseToDeleteId);
      
      if (deleteError) throw deleteError;
      
      setIsDeleteModalOpen(false);
      setResponseToDeleteId(null);
      await fetchResponses(); // Refresh table and dashboard
      alert('Data survey berhasil dihapus.');
    } catch (err: any) {
      console.error('Error deleting response:', err);
      alert('Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setResponseToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleEdit = (response: any) => {
    setEditingResponse({ ...response });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResponse) return;

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('survey_responses')
        .update({
          nama_lengkap: editingResponse.nama_lengkap,
          status: editingResponse.status,
          kritik_saran: editingResponse.kritik_saran,
          q1: editingResponse.q1,
          q2: editingResponse.q2,
          q3: editingResponse.q3,
          q4: editingResponse.q4,
          q5: editingResponse.q5,
          q6: editingResponse.q6,
          q7: editingResponse.q7,
          q8: editingResponse.q8,
          q9: editingResponse.q9,
          q10: editingResponse.q10
        })
        .eq('id', editingResponse.id);

      if (updateError) throw updateError;

      setIsEditModalOpen(false);
      fetchResponses();
      alert('Data survey berhasil diperbarui.');
    } catch (err: any) {
      console.error('Error updating response:', err);
      alert('Terjadi kesalahan saat memperbarui data.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (responses.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Hasil Survey');

      const title = 'Hasil Survey Kepuasan Penggunaan Aplikasi SIAP SPANJU';
      const headers = ['NO', 'TANGGAL', 'NAMA LENGKAP', 'STATUS', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'KRITIK & SARAN'];
      const totalCols = headers.length;

      await addExcelHeaderAndLogos(worksheet, workbook, title, totalCols);

      // Table Headers
      const headerRow = worksheet.getRow(10);
      headerRow.values = headers;

      // Data Rows
      responses.forEach((r, index) => {
        worksheet.addRow([
          index + 1,
          new Date(r.created_at).toLocaleDateString('id-ID'),
          r.nama_lengkap || 'Anonim',
          r.status || '-',
          r.q1,
          r.q2,
          r.q3,
          r.q4,
          r.q5,
          r.q6,
          r.q7,
          r.q8,
          r.q9,
          r.q10,
          r.kritik_saran || '-'
        ]);
      });

      applyColorfulTableStyle(worksheet, 10, responses.length, totalCols);

      // Column Widths
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 25;
      worksheet.getColumn(4).width = 15;
      for (let i = 5; i <= 14; i++) {
        worksheet.getColumn(i).width = 5;
      }
      worksheet.getColumn(15).width = 40;

      // Footer / TTD
      const footerStartRow = 11 + responses.length + 2;
      
      // Left Signature (Kepala Sekolah)
      worksheet.mergeCells(footerStartRow, 2, footerStartRow, 4);
      worksheet.getCell(footerStartRow, 2).value = 'Mengetahui';
      worksheet.getCell(footerStartRow, 2).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, 2, footerStartRow + 1, 4);
      worksheet.getCell(footerStartRow + 1, 2).value = 'Kepala Sekolah';
      worksheet.getCell(footerStartRow + 1, 2).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, 2, footerStartRow + 6, 4);
      const kasekName = worksheet.getCell(footerStartRow + 6, 2);
      kasekName.value = 'NUR FADILAH, S.Pd';
      kasekName.font = { bold: true, underline: true };
      kasekName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, 2, footerStartRow + 7, 4);
      worksheet.getCell(footerStartRow + 7, 2).value = 'NIP. 19860410 201001 2 030';
      worksheet.getCell(footerStartRow + 7, 2).alignment = { horizontal: 'center' };

      // Right Signature (Guru BK)
      const today = format(new Date(), 'd MMMM yyyy', { locale: idLocale });
      worksheet.mergeCells(footerStartRow, totalCols - 3, footerStartRow, totalCols - 1);
      worksheet.getCell(footerStartRow, totalCols - 3).value = `Pasuruan, ${today}`;
      worksheet.getCell(footerStartRow, totalCols - 3).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 1, totalCols - 3, footerStartRow + 1, totalCols - 1);
      worksheet.getCell(footerStartRow + 1, totalCols - 3).value = 'Guru BK';
      worksheet.getCell(footerStartRow + 1, totalCols - 3).alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 6, totalCols - 3, footerStartRow + 6, totalCols - 1);
      const petugasName = worksheet.getCell(footerStartRow + 6, totalCols - 3);
      petugasName.value = 'WIWIK ISMIATI, S.Pd';
      petugasName.font = { bold: true, underline: true };
      petugasName.alignment = { horizontal: 'center' };

      worksheet.mergeCells(footerStartRow + 7, totalCols - 3, footerStartRow + 7, totalCols - 1);
      worksheet.getCell(footerStartRow + 7, totalCols - 3).value = 'NIP. 19831116 200904 2 003';
      worksheet.getCell(footerStartRow + 7, totalCols - 3).alignment = { horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, `Hasil_Survey_SIAP_SPANJU_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (err) {
      console.error('Excel Export Error:', err);
      alert('Gagal mengekspor Excel');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all questions answered
    if (Object.keys(answers).length < QUESTIONS.length) {
      setError('Mohon jawab semua pertanyaan pilihan ganda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama_lengkap: namaLengkap || null,
        status: status || null,
        q1: answers[0],
        q2: answers[1],
        q3: answers[2],
        q4: answers[3],
        q5: answers[4],
        q6: answers[5],
        q7: answers[6],
        q8: answers[7],
        q9: answers[8],
        q10: answers[9],
        kritik_saran: kritikSaran || null
      };

      const { error: submitError } = await supabase
        .from('survey_responses')
        .insert([payload]);

      if (submitError) throw submitError;

      setSubmitSuccess(true);
      // Reset form
      setNamaLengkap('');
      setStatus('');
      setAnswers({});
      setKritikSaran('');
      
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      console.error('Error submitting survey:', err);
      setError('Terjadi kesalahan saat mengirim survey. Pastikan tabel database sudah dibuat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswer = (qIndex: number, value: number) => {
    setAnswers(prev => ({ ...prev, [qIndex]: value }));
  };

  // Calculate Dashboard Stats
  const totalResponden = responses.length;
  
  const statusCount = responses.reduce((acc, curr) => {
    const s = curr.status || 'Tidak Diketahui';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(statusCount).map(key => ({
    name: key,
    value: statusCount[key]
  }));

  const BAR_COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
    '#f43f5e'  // rose-500
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 max-w-xs">
          <p className="font-black text-slate-800 mb-2">{label}</p>
          <p className="text-xs font-medium text-slate-600 mb-3 leading-relaxed">{data.fullText}</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].fill }} />
            <p className="font-bold text-slate-800">
              Rata-rata: <span className="text-indigo-600">{data.RataRata}</span> / 5.0
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const averageScores = QUESTIONS.map((q, index) => {
    const key = `q${index + 1}`;
    const sum = responses.reduce((acc, curr) => acc + (curr[key] || 0), 0);
    const avg = totalResponden > 0 ? (sum / totalResponden).toFixed(1) : 0;
    return {
      name: `Q${index + 1}`,
      fullText: q,
      RataRata: parseFloat(avg as string)
    };
  });

  const kritikList = responses.filter(r => r.kritik_saran && r.kritik_saran.trim() !== '');

  return (
    <div className="h-full flex flex-col bg-slate-50 font-sans relative overflow-hidden">
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

              <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-white shadow-sm">
                  <ClipboardList size={18} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs md:text-xl font-black text-slate-800 tracking-tight uppercase truncate">Survey Aplikasi</h1>
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">SIAP SPANJU</p>
                </div>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('form')}
                className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === 'form' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Isi Survey
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === 'dashboard' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </button>
              {canManage && (
                <button
                  onClick={() => setActiveTab('list')}
                  className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === 'list' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ListFilter size={14} />
                  Hasil Detail
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
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <ClipboardList size={18} />
                </div>
                <span className="font-bold text-slate-800">Menu Survey</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
              <button
                onClick={() => { setActiveTab('form'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${
                  activeTab === 'form' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Send size={20} />
                <span>Isi Survey</span>
              </button>
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${
                  activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>
              {canManage && (
                <button
                  onClick={() => { setActiveTab('list'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${
                    activeTab === 'list' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <ListFilter size={20} />
                  <span>Hasil Detail</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          
          <AnimatePresence mode="wait">
            {activeTab === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20" />
                  
                  <div className="relative z-10 text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight mb-3">
                      Form Survey Kepuasan Penggunaan Aplikasi SIAP SPANJU
                    </h2>
                    <p className="text-slate-600 font-medium max-w-2xl mx-auto">
                      Bantu kami meningkatkan kualitas layanan dengan memberikan penilaian Anda terhadap aplikasi SIAP SPANJU.
                    </p>
                  </div>

                  {submitSuccess && (
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700">
                      <CheckCircle2 className="shrink-0" />
                      <p className="font-bold">Terima kasih! Survey Anda telah berhasil dikirim.</p>
                    </div>
                  )}

                  {error && (
                    <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
                      <AlertCircle className="shrink-0" />
                      <p className="font-bold">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                    
                    {/* Identitas */}
                    <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h3 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                        <User size={20} className="text-blue-500" />
                        Identitas Responden <span className="text-slate-400 text-sm normal-case font-medium">(Opsional)</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Lengkap</label>
                          <input
                            type="text"
                            value={namaLengkap}
                            onChange={(e) => setNamaLengkap(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                            placeholder="Masukkan nama Anda"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white appearance-none"
                          >
                            <option value="">Pilih Status</option>
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Petunjuk */}
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                      <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-3">Petunjuk Pengisian</h3>
                      <p className="text-blue-700 mb-4 font-medium">Beri tanda pada jawaban yang sesuai dengan pendapat Anda.</p>
                      <div className="flex flex-wrap gap-4 text-sm font-bold text-blue-800">
                        <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">1 = Sangat Tidak Setuju</span>
                        <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">2 = Tidak Setuju</span>
                        <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">3 = Netral</span>
                        <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">4 = Setuju</span>
                        <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">5 = Sangat Setuju</span>
                      </div>
                    </div>

                    {/* Pertanyaan */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2 mb-6">
                        <ClipboardList size={20} className="text-indigo-500" />
                        Pertanyaan Survey
                      </h3>

                      {QUESTIONS.map((q, index) => (
                        <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm">
                          <p className="font-bold text-slate-800 mb-4 text-lg">
                            <span className="text-indigo-500 mr-2">{index + 1}.</span>
                            {q}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleAnswer(index, val)}
                                className={`w-12 h-12 rounded-xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 ${
                                  answers[index] === val
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Kritik Saran */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                        <MessageSquare size={20} className="text-emerald-500" />
                        Kritik dan Saran <span className="text-slate-400 text-sm normal-case font-medium">(Opsional)</span>
                      </h3>
                      <textarea
                        value={kritikSaran}
                        onChange={(e) => setKritikSaran(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white resize-none"
                        placeholder="Tuliskan kritik dan saran Anda untuk pengembangan aplikasi..."
                      />
                    </div>

                    {/* Submit */}
                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 flex items-center gap-3"
                      >
                        {isSubmitting ? 'Mengirim...' : 'Kirim Survey'}
                        <Send size={20} />
                      </button>
                    </div>

                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
                  </div>
                ) : (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex items-center gap-6 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-100" />
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0 relative z-10">
                          <Users size={32} />
                        </div>
                        <div className="relative z-10">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Responden</p>
                          <p className="text-4xl font-black text-slate-800">{totalResponden}</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex items-center gap-6 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-100" />
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0 relative z-10">
                          <Star size={32} />
                        </div>
                        <div className="relative z-10">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rata-rata Kepuasan</p>
                          <p className="text-4xl font-black text-slate-800">
                            {averageScores.length > 0 
                              ? (averageScores.reduce((acc, curr) => acc + curr.RataRata, 0) / averageScores.length).toFixed(1) 
                              : '0.0'}
                            <span className="text-lg text-slate-400 ml-1">/ 5.0</span>
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex items-center gap-6 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-purple-100" />
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200 shrink-0 relative z-10">
                          <MessageSquare size={32} />
                        </div>
                        <div className="relative z-10">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Masukan</p>
                          <p className="text-4xl font-black text-slate-800">{kritikList.length}</p>
                        </div>
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
                        <h3 className="text-lg font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                          <Activity size={20} className="text-indigo-500" />
                          Rata-rata Nilai per Pertanyaan
                        </h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={averageScores} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                              <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Bar dataKey="RataRata" radius={[6, 6, 0, 0]} barSize={40}>
                                {averageScores.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
                        <h3 className="text-lg font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                          <User size={20} className="text-blue-500" />
                          Demografi Responden
                        </h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}/>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Kritik dan Saran List */}
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
                      <h3 className="text-lg font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                        <MessageSquare size={20} className="text-emerald-500" />
                        Rekap Kritik dan Saran
                      </h3>
                      
                      {kritikList.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 font-medium">
                          Belum ada kritik dan saran yang masuk.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {kritikList.map((item, index) => (
                            <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-bold text-slate-800">{item.nama_lengkap || 'Anonim'}</p>
                                <span className="text-[10px] font-bold px-2 py-1 bg-slate-200 text-slate-600 rounded-md uppercase tracking-wider">
                                  {item.status || 'Tidak Diketahui'}
                                </span>
                              </div>
                              <p className="text-slate-600 text-sm leading-relaxed">{item.kritik_saran}</p>
                              <p className="text-[10px] text-slate-400 mt-3 font-medium">
                                {new Date(item.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Daftar Hasil Survey</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manajemen data responden dan penilaian</p>
                  </div>
                  <button 
                    onClick={exportToExcel}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Download size={18} />
                    Unduh Excel
                  </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responden</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rata-rata</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kritik & Saran</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {responses.map((resp) => {
                          const avg = ((resp.q1 + resp.q2 + resp.q3 + resp.q4 + resp.q5 + resp.q6 + resp.q7 + resp.q8 + resp.q9 + resp.q10) / 10).toFixed(1);
                          return (
                            <tr key={resp.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-800 text-sm">{resp.nama_lengkap || 'Anonim'}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{resp.status || '-'}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs font-medium text-slate-500 font-mono">
                                  {new Date(resp.created_at).toLocaleDateString('id-ID')}
                                </p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black">
                                  {avg}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-slate-600 line-clamp-1 max-w-xs">{resp.kritik_saran || '-'}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleEdit(resp)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    title="Edit Data"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => confirmDelete(resp.id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                    title="Hapus Data"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {responses.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                              Belum ada data survey yang tersedia.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingResponse && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                    <Edit size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Edit Data Survey</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perbarui informasi responden</p>
                  </div>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editingResponse.nama_lengkap || ''}
                      onChange={(e) => setEditingResponse({...editingResponse, nama_lengkap: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={editingResponse.status || ''}
                      onChange={(e) => setEditingResponse({...editingResponse, status: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm bg-white"
                    >
                      <option value="">Pilih Status</option>
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Skor Jawaban (1-5)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <div key={n} className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase text-center">Q{n}</span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={editingResponse[`q${n}`]}
                          onChange={(e) => setEditingResponse({...editingResponse, [`q${n}`]: parseInt(e.target.value)})}
                          className="w-full px-2 py-2 rounded-lg border border-slate-200 text-center font-bold text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kritik & Saran</label>
                  <textarea
                    rows={4}
                    value={editingResponse.kritik_saran || ''}
                    onChange={(e) => setEditingResponse({...editingResponse, kritik_saran: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm resize-none"
                  />
                </div>
              </form>

              <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase mb-2 tracking-tight">Konfirmasi Hapus</h4>
              <p className="text-slate-500 font-medium mb-8 italic">Apakah Anda benar-benar ingin menghapus data survey ini? Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                >
                  Batal
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center font-sans"
                >
                  {isLoading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
