import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  LogIn, 
  GraduationCap, 
  Users, 
  X, 
  ExternalLink,
  ArrowUp,
  ChevronRight,
  RefreshCw,
  ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InfografisLandingProps {
  onEnterAksesTerpusat: () => void;
  onShowKelulusan?: () => void;
  onShowTracing?: () => void;
}

export interface InfografisData {
  id: string;
  title: string;
  imageUrl: string;
}

export const INFOGRAFIS_IMAGES: InfografisData[] = [
  {
    id: '9-aplikasi',
    title: 'Kilas 9 Aplikasi SIAP SPANJU',
    imageUrl: 'https://i.ibb.co/1J2CvZVh/kilas-siap-spanju.png',
  },
  {
    id: '8-program',
    title: '8 Program Prioritas SMPN 7 Pasuruan',
    imageUrl: 'https://i.ibb.co/hJH9B3vQ/8-program-prioritas.png',
  },
  {
    id: '15-spip-1',
    title: '15 Indikator SPIP Anti Korupsi (Bagian 1)',
    imageUrl: 'https://i.ibb.co/FbrL78ws/1.png',
  },
  {
    id: '15-spip-2',
    title: '15 Indikator SPIP Anti Korupsi (Bagian 2)',
    imageUrl: 'https://i.ibb.co/Y4cpFsdC/2.png',
  },
  {
    id: '15-spip-3',
    title: '15 Indikator SPIP Anti Korupsi (Bagian 3)',
    imageUrl: 'https://i.ibb.co/DDqRQwCr/3.png',
  },
  {
    id: 'korelasi-spip',
    title: 'Korelasi 8 Program Prioritas dg 15 Indikator SPIP Anti Korupsi dengan 9 Aplikasi SIAP SPANJU',
    imageUrl: 'https://i.ibb.co/nM7xrHj6/korelasi-8-program-dg-15-indikator-pip-anti-korupsi.png',
  },
  {
    id: 'korelasi-sra',
    title: 'Korelasi Integrasi SIAP SPANJU dg Sekolah Ramah Anak (SRA)',
    imageUrl: 'https://i.ibb.co/svM8w1FY/korelasi-integrasi-siap-spanju-dg-sekolah-ramah-anak.jpg',
  }
];

// Helper to generate fallback URLs
function getFallbackUrls(originalUrl: string): string[] {
  // Normalize url
  const clean = originalUrl.replace('i.ibb.co.com', 'i.ibb.co');
  return [
    clean,
    `https://wsrv.nl/?url=${encodeURIComponent(clean)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(clean)}`,
    originalUrl.includes('i.ibb.co.com') ? originalUrl : originalUrl.replace('i.ibb.co', 'i.ibb.co.com')
  ];
}

interface ResilientCardProps {
  item: InfografisData;
  index: number;
  onZoom: (url: string) => void;
}

// Resilient Infografis Image Component with auto fallback and smooth loading
const ResilientInfografisCard: React.FC<ResilientCardProps> = ({ 
  item, 
  index, 
  onZoom 
}) => {
  const fallbackList = getFallbackUrls(item.imageUrl);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  const currentSrc = fallbackList[fallbackIndex] || item.imageUrl;

  const handleImageError = () => {
    if (fallbackIndex < fallbackList.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setHasFailedAll(true);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setHasFailedAll(false);
    setIsLoading(true);
    setFallbackIndex(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-2.5 sm:p-4 md:p-6 shadow-lg sm:shadow-xl shadow-pink-100/60 border border-pink-100/80 flex flex-col items-center justify-center relative group overflow-hidden"
    >
      {/* Click to Zoom Button */}
      {!hasFailedAll && (
        <button
          type="button"
          onClick={() => onZoom(currentSrc)}
          className="absolute top-3.5 sm:top-5 right-3.5 sm:right-5 z-20 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/95 hover:bg-white text-slate-700 rounded-xl text-[11px] sm:text-xs font-bold shadow-md border border-slate-200/80 flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-all opacity-85 sm:opacity-0 group-hover:opacity-100"
          title="Perbesar Gambar"
        >
          <Maximize2 size={13} className="text-pink-600" />
          <span className="hidden sm:inline">Perbesar</span>
        </button>
      )}

      {/* Infographic Frame */}
      <div 
        onClick={() => !hasFailedAll && onZoom(currentSrc)}
        className="w-full relative flex items-center justify-center cursor-zoom-in rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden bg-slate-50/50 min-h-[140px] sm:min-h-[220px]"
      >
        {/* Skeleton Shimmer while loading */}
        {isLoading && !hasFailedAll && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/80 animate-pulse p-4">
            <div className="w-10 h-10 border-3 border-pink-300 border-t-pink-600 rounded-full animate-spin mb-2" />
            <p className="text-xs font-bold text-slate-500">Memuat infografis...</p>
          </div>
        )}

        {/* Failed State */}
        {hasFailedAll ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
              <ImageIcon size={24} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-700">{item.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Gagal memuat gambar dari server hosting.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Coba Lagi</span>
              </button>
              <a
                href={item.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={12} />
                <span>Buka Link</span>
              </a>
            </div>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={item.title}
            onError={handleImageError}
            onLoad={() => setIsLoading(false)}
            className={`w-full h-auto object-contain rounded-xl sm:rounded-2xl md:rounded-3xl shadow-xs transition-transform duration-300 group-hover:scale-[1.01] ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            referrerPolicy="no-referrer"
            loading={index === 0 ? "eager" : "lazy"}
          />
        )}
      </div>
    </motion.div>
  );
}

export default function InfografisLanding({ 
  onEnterAksesTerpusat, 
  onShowKelulusan, 
  onShowTracing 
}: InfografisLandingProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const LOGO_URL = "https://iili.io/KDFk4fI.png";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100/60 via-pink-50/40 to-slate-50 text-slate-800 font-sans flex flex-col items-center relative selection:bg-pink-200">
      
      {/* Top Floating Mini Bar for Quick Navigation */}
      <div className="w-full sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-pink-100/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Logo" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
            <span className="text-sm font-black text-slate-800 tracking-tight">
              SIAP <span className="text-pink-600">SPANJU</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onShowKelulusan && (
              <button
                type="button"
                onClick={onShowKelulusan}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer border border-blue-100"
              >
                <GraduationCap size={14} />
                <span>Cek Kelulusan</span>
              </button>
            )}

            {onShowTracing && (
              <button
                type="button"
                onClick={onShowTracing}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer border border-indigo-100"
              >
                <Users size={14} />
                <span>Tracing Alumni</span>
              </button>
            )}

            <button
              type="button"
              onClick={onEnterAksesTerpusat}
              className="px-4 py-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm shadow-pink-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn size={14} />
              <span>Akses Terpusat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Matching Screenshot Exactly */}
      <header className="w-full max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6 text-center flex flex-col items-center">
        {/* Center Logo in Rounded White Card */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white rounded-3xl sm:rounded-[2rem] flex items-center justify-center p-3 sm:p-4 shadow-xl shadow-pink-200/50 border border-slate-100 mb-4 sm:mb-5 hover:scale-105 transition-transform">
          <img 
            src={LOGO_URL} 
            alt="Logo SMP Negeri 7 Pasuruan" 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer" 
          />
        </div>

        {/* Big Bold Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight font-display mb-1.5 leading-tight">
          SIAP SPANJU
        </h1>

        {/* Subtitle */}
        <h2 className="text-[11px] sm:text-xs md:text-sm font-extrabold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-600 mb-3 px-2">
          SISTEM INTEGRASI APLIKASI PEMBINAAN SISWA
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium max-w-md sm:max-w-lg md:max-w-xl mx-auto leading-relaxed mb-6 px-2">
          Platform terpadu untuk mempermudah pendataan, pemantauan, dan tindak lanjut permasalahan siswa di SMP Negeri 7 Pasuruan.
        </p>

        {/* Big Action Button directly below description */}
        <button
          type="button"
          onClick={onEnterAksesTerpusat}
          className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mb-2"
        >
          <LogIn size={16} />
          <span>Buka Akses Terpusat SIAP SPANJU</span>
          <ChevronRight size={16} />
        </button>
      </header>

      {/* CONTINUOUS VERTICAL STACK OF WHITE CARDS - RESPONSIVE FOR PHONE & LAPTOP */}
      <main className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl px-3 sm:px-4 md:px-6 pb-16 space-y-4 sm:space-y-6 md:space-y-8">
        {INFOGRAFIS_IMAGES.map((item, index) => (
          <ResilientInfografisCard
            key={item.id}
            item={item}
            index={index}
            onZoom={(url) => setPreviewImage(url)}
          />
        ))}

        {/* BOTTOM CARD: MASUK KE AKSES TERPUSAT */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl text-center text-white space-y-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md p-2 rotate-2">
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>

          <h3 className="text-xl md:text-2xl font-black tracking-tight">
            Masuk ke Akses Terpusat SIAP SPANJU
          </h3>

          <p className="text-xs md:text-sm text-pink-100 font-medium max-w-md mx-auto leading-relaxed">
            Klik tombol di bawah untuk login dan mengakses 9 modul aplikasi pembinaan siswa SMP Negeri 7 Pasuruan.
          </p>

          <button
            type="button"
            onClick={onEnterAksesTerpusat}
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-900 hover:bg-pink-50 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn size={16} className="text-pink-600" />
            <span>Masuk ke Akses Terpusat</span>
          </button>
        </div>
      </main>

      {/* FLOATING ACTION BUTTON (BOTTOM RIGHT) */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2.5">
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={scrollToTop}
              className="p-3 bg-white/95 hover:bg-white text-slate-700 rounded-2xl border border-pink-200 shadow-xl backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Kembali ke atas"
            >
              <ArrowUp size={18} />
            </motion.button>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={onEnterAksesTerpusat}
          className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider shadow-2xl shadow-pink-500/30 hover:from-pink-600 hover:to-indigo-700 active:scale-95 transition-all border border-white/40 cursor-pointer"
        >
          <LogIn size={16} />
          <span>Akses Terpusat</span>
        </button>
      </div>

      {/* Image Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-950/90 backdrop-blur-md">
            <div className="relative w-full max-w-5xl max-h-[95vh] flex flex-col items-center justify-center">
              <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-white/20 shadow-lg"
                >
                  <ExternalLink size={14} />
                  <span>Buka Tab Baru</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-auto max-h-[88vh] w-full p-2 flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Preview Infografis"
                  className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white p-2"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-pink-100 py-6 text-center text-xs text-slate-400 font-bold uppercase tracking-widest w-full">
        &copy; 2026 SMP Negeri 7 Pasuruan &bull; SIAP SPANJU
      </footer>
    </div>
  );
}
