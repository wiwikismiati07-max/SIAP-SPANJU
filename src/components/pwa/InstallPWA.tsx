import React, { useState, useEffect } from 'react';
import { Smartphone, Laptop, Download, CheckCircle2, Share2, PlusSquare, Info, X, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstallPWAProps {
  variant?: 'banner' | 'button' | 'card' | 'sidebar';
  className?: string;
}

export default function InstallPWA({ variant = 'banner', className = '' }: InstallPWAProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect Device Type & Platform
    const ua = navigator.userAgent;
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setDeviceType(mobileCheck ? 'mobile' : 'desktop');

    const iosCheck = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iosCheck);

    // Detect if already installed / standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show step-by-step guide modal for HP & Laptop
      setIsModalOpen(true);
    }
  };

  if (isInstalled) {
    return (
      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-bold ${className}`}>
        <CheckCircle2 size={14} className="text-emerald-600" />
        <span>SIAP SPANJU Terinstall</span>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Variant */}
      {variant === 'sidebar' && (
        <div className={`p-3.5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/30 relative overflow-hidden ${className}`}>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600/80 rounded-xl text-white shadow-md">
                {deviceType === 'mobile' ? <Smartphone size={18} /> : <Laptop size={18} />}
              </div>
              <div>
                <h4 className="text-xs font-black tracking-tight uppercase text-white">Install SIAP SPANJU</h4>
                <p className="text-[10px] text-indigo-200 font-semibold">HP Android / iOS & Laptop</p>
              </div>
            </div>
            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug mb-3 relative z-10">
            Akses langsung dari layar utama HP & Laptop tanpa perlu buka browser!
          </p>
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer relative z-10"
          >
            <Download size={14} />
            <span>INSTALL SEKARANG</span>
          </button>
        </div>
      )}

      {/* Banner / Card Variant */}
      {variant === 'banner' && (
        <div className={`p-4 md:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden ${className}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shrink-0">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm md:text-base font-black tracking-tight text-white uppercase">Install Aplikasi SIAP SPANJU</h3>
                  <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase rounded-full border border-indigo-400/30">
                    HP & Laptop
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Gunakan seperti aplikasi native di HP (Android/iOS) dan Laptop (Windows/Mac) secara lebih cepat &amp; praktis.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={handleInstallClick}
                className="w-full md:w-auto px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download size={16} className="text-indigo-600" />
                <span>Install Aplikasi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Button Variant */}
      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer ${className}`}
        >
          <Download size={14} />
          <span>Install App</span>
        </button>
      )}

      {/* Guide Modal for HP & Laptop Installation */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                    <Download size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Panduan Install Aplikasi</h3>
                    <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">SIAP SPANJU di HP &amp; Laptop</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 overflow-y-auto space-y-5 font-sans">
                {/* Smartphone Section */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-wider">
                    <Smartphone size={18} />
                    <span>Cara Install di HP (Android &amp; iPhone / iOS)</span>
                  </div>

                  {isIOS ? (
                    <div className="space-y-2 text-xs text-slate-700">
                      <p className="font-bold text-slate-900">Di iPhone / iPad (Safari):</p>
                      <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                        <li>Ketuk tombol <span className="font-bold text-indigo-600">Bagikan (Share)</span> <Share2 size={12} className="inline mx-0.5" /> di bagian bawah browser Safari.</li>
                        <li>Gulir ke bawah dan pilih <span className="font-bold text-indigo-600">"Tambahkan ke Layar Utama" (Add to Home Screen)</span> <PlusSquare size={12} className="inline mx-0.5" />.</li>
                        <li>Ketuk <span className="font-bold text-indigo-600">"Tambah"</span> di kanan atas.</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs text-slate-700">
                      <p className="font-bold text-slate-900">Di Android (Google Chrome / Edge):</p>
                      <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                        <li>Ketuk ikon titik tiga <span className="font-bold text-slate-900">(⋮)</span> di kanan atas browser Chrome.</li>
                        <li>Pilih menu <span className="font-bold text-indigo-600">"Install aplikasi"</span> atau <span className="font-bold text-indigo-600">"Tambahkan ke Layar Utama"</span>.</li>
                        <li>Konfirmasi pemasangan, aplikasi SIAP SPANJU akan muncul di layar utama HP Anda.</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Laptop Section */}
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider">
                    <Laptop size={18} />
                    <span>Cara Install di Laptop / Komputer (Windows, Mac, Chromebook)</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                      <li>Buka alamat web SIAP SPANJU di <span className="font-bold text-slate-900">Google Chrome</span> atau <span className="font-bold text-slate-900">Microsoft Edge</span> di laptop Anda.</li>
                      <li>Lihat di address bar (bilah alamat atas) di sebelah kanan, klik ikon <span className="font-bold text-indigo-600">Install / Download App <Download size={12} className="inline" /></span>.</li>
                      <li>Klik <span className="font-bold text-indigo-600">"Install"</span> pada dialog pop-up.</li>
                      <li>Aplikasi SIAP SPANJU akan berjalan sebagai aplikasi desktop mandiri tanpa address bar browser!</li>
                    </ol>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                  <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Aplikasi yang sudah diinstall dapat dibuka langsung seperti aplikasi HP / Laptop biasa, memuat lebih cepat, dan dapat digunakan secara efisien.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
