import React, { useState, useRef, useEffect } from 'react';
import { Instagram, Youtube, ExternalLink, Play, ArrowLeft, ArrowDown, ArrowUp, Copy, Check, Search, Film, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    title: 'Tutorial SIPENA',
    category: 'SIPENA',
    description: 'Panduan penggunaan Sistem Perpustakaan Digital & Literasi SIAP SPANJU.',
    url: 'https://www.instagram.com/reel/DbE_DO9NYni/?igsh=MTV5OXc5M3BocDA2Zw',
    platform: 'instagram',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: '2',
    title: 'Tutorial Dispensasi dan Prestasi',
    category: 'Dispensasi & Prestasi',
    description: 'Panduan pengajuan dispensasi kegiatan siswa serta pencatatan prestasi siswa.',
    url: 'https://www.instagram.com/reel/DbE_SPEN3-d/?igsh=ODV5d2F6MjV1dHU4',
    platform: 'instagram',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: '3',
    title: 'Tutorial SIM-Agama',
    category: 'SIM-Agama',
    description: 'Panduan pengisian data pembiasaan keagamaan dan ibadah siswa secara berkala.',
    url: 'https://www.instagram.com/reel/DbE-ynmxc2d/?igsh=dW9zazBwY2VjaWhh',
    platform: 'instagram',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: '4',
    title: 'Tutorial SI-Telat (Siswa Terlambat Hadir)',
    category: 'SI-Telat',
    description: 'Panduan pencatatan dan monitoring siswa terlambat hadir di sekolah oleh petugas piket.',
    url: 'https://www.instagram.com/reel/DbE-ZQ5NoY_/?igsh=b3E5Mzd6dzU5MWRz',
    platform: 'instagram',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: '5',
    title: 'Tutorial SIM-DiS (Disiplin Siswa) dan BK Peduli Siswa',
    category: 'SIM-DiS & BK',
    description: 'Panduan penanganan kedisiplinan, poin pelanggaran, serta bimbingan konseling siswa.',
    url: 'https://www.instagram.com/reel/DbE93BVtrzz/?igsh=MTl5bTN6Z2Vvc2FnOQ==',
    platform: 'instagram',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: '6',
    title: 'Tutorial SI-UKS',
    category: 'SI-UKS',
    description: 'Panduan layanan pencatatan kesehatan dan penanganan siswa sakit di ruang UKS.',
    url: 'https://www.instagram.com/reel/DbE9j4mtvyM/?igsh=MXB0YnltYXRueWJtYQ',
    platform: 'instagram',
    color: 'from-rose-500 to-pink-600'
  },
  {
    id: '7',
    title: 'Testimoni Aplikasi SIAP SPANJU',
    category: 'Testimoni',
    description: 'Tanggapan dan testimoni penggunaan ekosistem aplikasi SIAP SPANJU oleh pengguna.',
    url: 'https://www.instagram.com/reel/DbE_2VONbY7/?igsh=MTEwd2kyNWZ4M2p3cQ',
    platform: 'instagram',
    color: 'from-blue-600 to-cyan-600'
  },
  {
    id: '8',
    title: 'Cara Install Aplikasi SIAP SPANJU',
    category: 'Instalasi',
    description: 'Panduan langkah-langkah mudah memasang/menginstall aplikasi SIAP SPANJU di HP dan Laptop.',
    url: 'https://www.instagram.com/reel/DbFJbmyttP6/?igsh=dWg4NGJyMWt5MDd5',
    platform: 'instagram',
    color: 'from-indigo-600 to-purple-700'
  },
  {
    id: '9',
    title: 'Tutorial Profil Aplikasi SIAP Spanju',
    category: 'Profil Aplikasi',
    description: 'Penjelasan lengkap mengenai profil, visi, dan ekosistem aplikasi SIAP SPANJU.',
    url: 'https://www.instagram.com/reel/DbE9JaGNzO9/?igsh=a2l6bzF3b243MTE5',
    platform: 'instagram',
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: '10',
    title: 'Tutorial Izin Siswa',
    category: 'Perizinan',
    description: 'Penjelasan ringkas alur dan pengajuan izin keluar/masuk sekolah untuk siswa.',
    url: 'https://youtube.com/shorts/Zal1cHhhE6U?si=7S5GKVb07-Qo2Kav',
    platform: 'youtube',
    color: 'from-red-500 to-rose-600'
  },
  {
    id: '11',
    title: 'Tutorial Izin Wali Murid',
    category: 'Perizinan Wali',
    description: 'Panduan lengkap pengisian form perizinan siswa untuk orang tua / wali murid.',
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoGridRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = containerRef.current;
    const parentEl = el?.parentElement;
    
    const scrollTop = el?.scrollTop || parentEl?.scrollTop || 0;
    const scrollHeight = el?.scrollHeight || parentEl?.scrollHeight || 0;
    const clientHeight = el?.clientHeight || parentEl?.clientHeight || 0;

    setShowScrollTop(scrollTop > 150);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 80);
  };

  useEffect(() => {
    const el = containerRef.current;
    const parentEl = el?.parentElement;

    el?.addEventListener('scroll', handleScroll);
    parentEl?.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);

    handleScroll();

    return () => {
      el?.removeEventListener('scroll', handleScroll);
      parentEl?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToBottom = () => {
    const el = containerRef.current;
    const parentEl = el?.parentElement;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    if (parentEl) {
      parentEl.scrollTo({ top: parentEl.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToGrid = () => {
    if (videoGridRef.current) {
      videoGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    const el = containerRef.current;
    const parentEl = el?.parentElement;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (parentEl) {
      parentEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    <div 
      ref={containerRef}
      className="min-h-full h-full w-full bg-slate-50 p-4 md:p-8 overflow-y-auto scroll-smooth touch-pan-y custom-scrollbar relative"
    >
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
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

          <div className="flex items-center gap-2 relative z-10 flex-wrap">
            <button
              onClick={scrollToGrid}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-sm"
              title="Scroll Ke Bawah"
            >
              <ArrowDown size={16} className="text-pink-600 animate-bounce" /> Scroll Ke Bawah
            </button>

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
              <Instagram size={14} /> Instagram Reels ({TUTORIAL_VIDEOS.filter(v => v.platform === 'instagram').length})
            </button>
            <button
              onClick={() => setSelectedFilter('youtube')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedFilter === 'youtube'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Youtube size={14} /> YouTube Shorts ({TUTORIAL_VIDEOS.filter(v => v.platform === 'youtube').length})
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div ref={videoGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 scroll-mt-6">
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

      {/* Floating Scroll Controls */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2">
        {canScrollDown && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={scrollToBottom}
            className="p-3.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 text-xs font-bold active:scale-90"
            title="Scroll Ke Paling Bawah"
          >
            <ArrowDown size={18} className="animate-bounce" />
            <span className="hidden sm:inline">Scroll Bawah</span>
          </motion.button>
        )}

        {showScrollTop && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={scrollToTop}
            className="p-3.5 bg-slate-800 text-white rounded-2xl shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 text-xs font-bold active:scale-90"
            title="Kembali Ke Atas"
          >
            <ArrowUp size={18} />
            <span className="hidden sm:inline">Ke Atas</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

