import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  LogIn, 
  GraduationCap, 
  Users, 
  X, 
  Sparkles, 
  ExternalLink,
  ArrowUp,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InfografisLandingProps {
  onEnterAksesTerpusat: () => void;
  onShowKelulusan?: () => void;
  onShowTracing?: () => void;
}

export const INFOGRAFIS_IMAGES = [
  {
    id: '9-aplikasi',
    title: 'Kilas 9 Aplikasi SIAP SPANJU',
    imageUrl: 'https://i.ibb.co.com/1J2CvZVh/kilas-siap-spanju.png',
  },
  {
    id: '8-program',
    title: '8 Program Prioritas SMPN 7 Pasuruan',
    imageUrl: 'https://i.ibb.co.com/hJH9B3vQ/8-program-prioritas.png',
  },
  {
    id: '15-spip-1',
    title: '15 Indikator SPIP Anti Korupsi (Bagian 1)',
    imageUrl: 'https://i.ibb.co.com/FbrL78ws/1.png',
  },
  {
    id: '15-spip-2',
    title: '15 Indikator SPIP Anti Korupsi (Bagian 2)',
    imageUrl: 'https://i.ibb.co.com/Y4cpFsdC/2.png',
  },
  {
    id: '15-spip-3',
    title: '15 Indikator SPIP Anti Korupsi (Bagian 3)',
    imageUrl: 'https://i.ibb.co.com/DDqRQwCr/3.png',
  },
  {
    id: 'korelasi-spip',
    title: 'Korelasi 8 Program Prioritas dg 15 Indikator SPIP Anti Korupsi dengan 9 Aplikasi SIAP SPANJU',
    imageUrl: 'https://i.ibb.co.com/nM7xrHj6/korelasi-8-program-dg-15-indikator-pip-anti-korupsi.png',
  },
  {
    id: 'korelasi-sra',
    title: 'Korelasi Integrasi SIAP SPANJU dg Sekolah Ramah Anak (SRA)',
    imageUrl: 'https://i.ibb.co.com/svM8w1FY/korelasi-integrasi-siap-spanju-dg-sekolah-ramah-anak.jpg',
  }
];

export default function InfografisLanding({ 
  onEnterAksesTerpusat, 
  onShowKelulusan, 
  onShowTracing 
}: InfografisLandingProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPopupAkses, setShowPopupAkses] = useState(false);
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
              onClick={() => setShowPopupAkses(true)}
              className="px-4 py-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm shadow-pink-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn size={14} />
              <span>Akses Terpusat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Matching Screenshot Exactly */}
      <header className="w-full max-w-3xl px-4 pt-10 pb-6 text-center flex flex-col items-center">
        {/* Soft Orange/Pink Accent Pill at Top */}
        <div className="w-10 h-2 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full mb-4 shadow-sm" />

        {/* Center Logo in Rounded White Card */}
        <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl flex items-center justify-center p-3 shadow-xl shadow-pink-200/50 border border-slate-100 mb-5 rotate-0 hover:scale-105 transition-transform">
          <img 
            src={LOGO_URL} 
            alt="Logo SMP Negeri 7 Pasuruan" 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer" 
          />
        </div>

        {/* Big Bold Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display mb-1.5">
          SIAP SPANJU
        </h1>

        {/* Subtitle */}
        <h2 className="text-xs md:text-sm font-extrabold uppercase tracking-[0.18em] text-slate-600 mb-3">
          SISTEM INTEGRASI APLIKASI PEMBINAAN SISWA
        </h2>

        {/* Description */}
        <p className="text-xs md:text-sm text-slate-500 font-medium max-w-lg mx-auto leading-relaxed mb-6">
          Platform terpadu untuk mempermudah pendataan, pemantauan, dan tindak lanjut permasalahan siswa di SMP Negeri 7 Pasuruan.
        </p>

        {/* Big Action Button directly below description */}
        <button
          type="button"
          onClick={() => setShowPopupAkses(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer mb-2"
        >
          <LogIn size={16} />
          <span>Buka Akses Terpusat SIAP SPANJU</span>
          <ChevronRight size={16} />
        </button>
      </header>

      {/* CONTINUOUS VERTICAL STACK OF WHITE CARDS LIKE IN SCREENSHOT */}
      <main className="w-full max-w-xl md:max-w-2xl px-4 pb-16 space-y-6 md:space-y-8">
        {INFOGRAFIS_IMAGES.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl md:rounded-[2.5rem] p-3 sm:p-4 md:p-5 shadow-xl shadow-pink-100/60 border border-pink-100/80 flex flex-col items-center justify-center relative group"
          >
            {/* Click to Zoom Hint Button */}
            <button
              type="button"
              onClick={() => setPreviewImage(item.imageUrl)}
              className="absolute top-6 right-6 z-10 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-xl text-xs font-bold shadow-md border border-slate-200/80 flex items-center gap-1.5 cursor-pointer backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity"
              title="Perbesar Gambar"
            >
              <Maximize2 size={13} className="text-pink-600" />
              <span>Perbesar</span>
            </button>

            {/* Infographic Image */}
            <div 
              onClick={() => setPreviewImage(item.imageUrl)}
              className="w-full flex items-center justify-center cursor-zoom-in rounded-2xl md:rounded-3xl overflow-hidden bg-slate-50/50"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-auto object-contain rounded-2xl md:rounded-3xl shadow-xs transition-transform duration-300 group-hover:scale-[1.01]"
                referrerPolicy="no-referrer"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          </motion.div>
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
            onClick={() => setShowPopupAkses(true)}
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
          onClick={() => setShowPopupAkses(true)}
          className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider shadow-2xl shadow-pink-500/30 hover:from-pink-600 hover:to-indigo-700 active:scale-95 transition-all border border-white/40 cursor-pointer"
        >
          <LogIn size={16} />
          <span>Akses Terpusat</span>
        </button>
      </div>

      {/* POPUP MODAL: MASUK KE AKSES TERPUSAT SIAP SPANJU */}
      <AnimatePresence>
        {showPopupAkses && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white border border-pink-100 rounded-[2.5rem] shadow-2xl max-w-md w-full p-6 md:p-8 relative overflow-hidden text-center"
            >
              <button
                type="button"
                onClick={() => setShowPopupAkses(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Icon & Brand */}
              <div className="w-20 h-20 bg-gradient-to-tr from-pink-50 to-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2.5 rotate-2 border border-pink-100">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>

              <span className="inline-block px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                PORTAL LAYANAN TERPADU
              </span>

              <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display mb-1.5">
                Akses Terpusat SIAP SPANJU
              </h3>

              <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed mb-6">
                Silakan masuk ke portal login terpadu untuk mengakses layanan pembinaan, presensi, kedisiplinan, dan bimbingan siswa SMP Negeri 7 Pasuruan.
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPopupAkses(false);
                    onEnterAksesTerpusat();
                  }}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-pink-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn size={18} />
                  <span>Masuk ke Akses Terpusat</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {onShowKelulusan && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPopupAkses(false);
                        onShowKelulusan();
                      }}
                      className="py-3 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <GraduationCap size={15} />
                      <span>Cek Kelulusan</span>
                    </button>
                  )}

                  {onShowTracing && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPopupAkses(false);
                        onShowTracing();
                      }}
                      className="py-3 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Users size={15} />
                      <span>Tracing Alumni</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPopupAkses(false)}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup / Lanjut Lihat Infografis
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-semibold tracking-wider">
                  (Akun Tamu: Username = Tamu | Password = Tamu)
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
