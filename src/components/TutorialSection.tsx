import React, { useState } from 'react';
import { Instagram, Youtube, ExternalLink, Play, ArrowLeft, Video, Sparkles, Copy, Check, Search, Film } from 'lucide-react';
import { motion } from 'motion/react';

interface TutorialVideo {
  id: string;
  title: string;
  category: string;
  description: string;
  url: string;
  platform: 'instagram' | 'youtube';
  color: string;
}

const TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    id: '1',
    title: 'Tutorial 1: Pengenalan & Fitur Utama SIAP SPANJU',
    category: 'Sistem Utama',
    description: 'Panduan dasar pengenalan ekosistem dan layanan utama aplikasi SIAP SPANJU.',
    url: 'https://www.instagram.com/reel/DbE_DO9NYni/?igsh=MTV5OXc5M3BocDA2Zw',
    platform: 'instagram',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: '2',
    title: 'Tutorial 2: Panduan Navigasi & Alur Kerja Dashboard',
    category: 'Navigasi',
    description: 'Cara menggunakan menu navigasi dashboard dan membuka aplikasi dengan cepat.',
    url: 'https://www.instagram.com/reel/DbE_SPEN3-d/?igsh=ODV5d2F6MjV1dHU4',
    platform: 'instagram',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: '3',
    title: 'Tutorial 3: Layanan Izin Siswa & Perizinan Digital',
    category: 'Perizinan',
    description: 'Tata cara pengajuan dan persetujuan surat izin siswa secara online.',
    url: 'https://www.instagram.com/reel/DbE-ynmxc2d/?igsh=dW9zazBwY2VjaWhh',
    platform: 'instagram',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: '4',
    title: 'Tutorial 4: Pencatatan Disiplin & Pelanggaran Siswa',
    category: 'Kedisiplinan',
    description: 'Langkah-langkah pencatatan poin pelanggaran dan kedisiplinan siswa oleh guru.',
    url: 'https://www.instagram.com/reel/DbE-ZQ5NoY_/?igsh=b3E5Mzd6dzU5MWRz',
    platform: 'instagram',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: '5',
    title: 'Tutorial 5: Layanan Bimbingan Konseling (BK Peduli)',
    category: 'Konseling',
    description: 'Panduan penanganan kasus dan bimbingan siswa oleh guru BK.',
    url: 'https://www.instagram.com/reel/DbE93BVtrzz/?igsh=MTl5bTN6Z2Vvc2FnOQ==',
    platform: 'instagram',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: '6',
    title: 'Tutorial 6: Pengaduan Wali Murid & Layanan UKS',
    category: 'Pengaduan & UKS',
    description: 'Cara pengajuan aspirasi/pengaduan orang tua serta pencatatan kunjungan UKS.',
    url: 'https://www.instagram.com/reel/DbE9j4mtvyM/?igsh=MXB0YnltYXRueWJtYQ',
    platform: 'instagram',
    color: 'from-rose-500 to-pink-600'
  },
  {
    id: '7',
    title: 'Tutorial 7: Manajemen Data Master Siswa & Kelas',
    category: 'Master Data',
    description: 'Cara mengelola database siswa, impor file Excel, dan filter periode ajaran.',
    url: 'https://www.instagram.com/reel/DbE_2VONbY7/?igsh=MTEwd2kyNWZ4M2p3cQ',
    platform: 'instagram',
    color: 'from-blue-600 to-cyan-600'
  },
  {
    id: '8',
    title: 'Tutorial 8: Layanan Cek Kelulusan & Alumni',
    category: 'Kelulusan & Alumni',
    description: 'Panduan pengumuman kelulusan online dan penelusuran data alumni.',
    url: 'https://www.instagram.com/reel/DbFJbmyttP6/?igsh=dWg4NGJyMWt5MDd5',
    platform: 'instagram',
    color: 'from-indigo-600 to-purple-700'
  },
  {
    id: '9',
    title: 'Tutorial Singkat SIAP SPANJU (YouTube)',
    category: 'Ringkasan',
    description: 'Penjelasan ringkas seluruh ekosistem SIAP SPANJU versi YouTube Shorts.',
    url: 'https://youtube.com/shorts/Zal1cHhhE6U?si=7S5GKVb07-Qo2Kav',
    platform: 'youtube',
    color: 'from-red-500 to-rose-600'
  },
  {
    id: '10',
    title: 'Tutorial Izin Wali Murid (YouTube)',
    category: 'Perizinan',
    description: 'Panduan lengkap pengisian form perizinan siswa untuk wali murid.',
    url: 'https://youtube.com/shorts/YwtdCSp7Drk?si=CEkeCirD0uMyOWDM',
    platform: 'youtube',
    color: 'from-red-600 to-pink-600'
  }
];

interface TutorialSectionProps {
  onBack: () => void;
  onOpenSidebar?: () => void;
}

export default function TutorialSection({ onBack }: TutorialSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'instagram' | 'youtube'>('all');

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredVideos = TUTORIAL_VIDEOS.filter(video => {
    const matchesFilter = selectedFilter === 'all' || video.platform === selectedFilter;
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm"
              title="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-pink-100 text-pink-700 font-bold text-[10px] uppercase tracking-widest rounded-full">
                  PANDUAN APLIKASI
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold text-[10px] uppercase tracking-widest rounded-full">
                  {TUTORIAL_VIDEOS.length} Video Tutorial
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight font-display mt-1">
                Menu Video Tutorial Aplikasi
              </h1>
              <p className="text-slate-500 text-xs md:text-sm font-medium">
                Pilih video tutorial di bawah ini untuk melihat panduan langkah demi langkah penggunaan fitur SIAP SPANJU.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/reel/DbE_2VONbY7/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Instagram size={18} /> Instagram Official
            </a>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-md">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari video tutorial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({TUTORIAL_VIDEOS.length})
            </button>
            <button
              onClick={() => setSelectedFilter('instagram')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedFilter === 'instagram'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Instagram size={14} /> Instagram Reels (8)
            </button>
            <button
              onClick={() => setSelectedFilter('youtube')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedFilter === 'youtube'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Youtube size={14} /> YouTube Shorts (2)
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredVideos.map((video, idx) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col group hover:-translate-y-1"
            >
              {/* Header Banner of Card */}
              <div className={`p-6 bg-gradient-to-r ${video.color} text-white relative overflow-hidden flex items-center justify-between`}>
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider">
                      {video.category}
                    </span>
                    <span className="px-2.5 py-0.5 bg-black/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      {video.platform === 'instagram' ? <Instagram size={12} /> : <Youtube size={12} />}
                      {video.platform === 'instagram' ? 'Reel' : 'Short'}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-black tracking-tight leading-snug line-clamp-2">
                    {video.title}
                  </h3>
                </div>

                <div className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                  <Play size={24} className="fill-white text-white ml-0.5" />
                </div>

                {/* Ambient glow decoration */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500" />
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
                  {video.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 py-3 px-4 bg-gradient-to-r ${video.color} text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95`}
                  >
                    {video.platform === 'instagram' ? <Instagram size={16} /> : <Youtube size={16} />}
                    Tonton Video <ExternalLink size={14} />
                  </a>

                  <button
                    onClick={() => handleCopy(video.url, video.id)}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95"
                    title="Salin Link Video"
                  >
                    {copiedId === video.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {filteredVideos.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-100">
            <Film size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-700 font-bold text-sm">Tidak ada video tutorial yang cocok dengan pencarian "{searchTerm}"</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedFilter('all'); }}
              className="mt-3 text-xs text-pink-600 font-bold hover:underline"
            >
              Reset Pencarian
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
