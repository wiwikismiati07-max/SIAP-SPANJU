import React from 'react';
import { Phone, Globe, Mail, PhoneCall, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { motion } from 'motion/react';

const HOTLINE_DATA = [
  { 
    title: "Hotline Sekolah", 
    desc: "Layanan telepon resmi SMP Negeri 7 Pasuruan untuk informasi dan koordinasi cepat.",
    number: "(0343) 426845 / 085168700953",
    icon: PhoneCall,
    color: "from-amber-400 to-orange-600",
    shadow: "shadow-orange-200",
    accent: "bg-orange-50 text-orange-700 border-orange-100",
    link: "tel:0343426845"
  },
  { 
    title: "Pos-el (E-mail)", 
    desc: "Layanan persuratan elektronik resmi untuk pengiriman dokumen dan surat menyurat.",
    number: "smp7pas@yahoo.co.id",
    icon: Mail,
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-200",
    accent: "bg-blue-50 text-blue-700 border-blue-100",
    link: "mailto:smp7pas@yahoo.co.id"
  },
  { 
    title: "Laman (Website)", 
    desc: "Portal informasi resmi sekolah terkait agenda, pengumuman, dan profil SMPN 7 Pasuruan.",
    number: "www.smpn7pasuruan.sch.id",
    icon: Globe,
    color: "from-emerald-500 to-emerald-600",
    shadow: "shadow-emerald-200",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
    link: "https://www.smpn7pasuruan.sch.id"
  }
];

interface HotlineSectionProps {
  onBack?: () => void;
}

export default function HotlineSection({ onBack }: HotlineSectionProps) {
  return (
    <div className="flex-1 flex flex-col bg-slate-50/80 backdrop-blur-3xl overflow-y-auto custom-scrollbar p-6 md:p-12">
      <div className="max-w-5xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl shadow-amber-100 mx-auto overflow-hidden p-2 mb-4 border border-slate-100 rotate-3">
            <Phone size={40} className="text-amber-500" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-display uppercase">Hotline SIAP SPANJU</h2>
          <p className="text-sm md:text-lg font-black text-slate-600 uppercase tracking-[0.3em]">Layanan Bantuan & Pengaduan Cepat</p>
          
          <div className="max-w-2xl mx-auto p-5 bg-orange-50 border-2 border-orange-200 rounded-[2rem] flex items-center gap-5 text-orange-900 shadow-lg shadow-orange-100/50">
            <div className="w-12 h-12 rounded-2xl bg-orange-200 flex items-center justify-center shrink-0 text-orange-600">
               <Shield size={24} />
            </div>
            <p className="text-left text-xs md:text-sm font-black leading-relaxed">
              Layanan Hotline tersedia pada jam kerja operasional sekolah. Untuk pengaduan mendesak diluar jam kerja tetap akan kami tampung untuk segera diproses pada hari kerja berikutnya.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOTLINE_DATA.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-8 -mt-8 opacity-40 group-hover:scale-110 transition-transform duration-700" />
              
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg ${item.shadow} mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <item.icon size={28} />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">{item.title}</h3>
              <p className="text-slate-600 text-sm font-bold leading-relaxed mb-8">{item.desc}</p>
              
              <div className="mt-auto space-y-4">
                <a 
                  href={item.link}
                  target={item.link.startsWith('http') ? "_blank" : undefined}
                  rel={item.link.startsWith('http') ? "noopener noreferrer" : undefined}
                  className={`w-full py-4 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center gap-3 text-slate-800 font-black text-sm uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-md active:scale-95`}
                >
                  <item.icon size={18} />
                  {item.title.includes('Hotline') ? 'Hubungi Sekarang' : item.title.includes('Pos-el') ? 'Kirim Email' : 'Buka Website'}
                </a>
                <div className={`px-4 py-2 rounded-xl border ${item.accent} text-center`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.1em]">{item.number}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="bg-slate-900 p-8 md:p-12 rounded-[3rem] text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/20 to-pink-500/20 rounded-full blur-[100px] -mr-48 -mt-48 transition-all duration-1000 group-hover:scale-110" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-6 text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
                <UserCheck size={14} className="text-blue-400" />
                Dukungan Penuh Sekolah
              </div>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">Berkomitmen Memberikan Pelayanan Terbaik</h3>
              <p className="text-slate-400 font-medium text-base md:text-lg leading-relaxed max-w-xl">
                Setiap laporan dan masukan Anda adalah langkah awal menuju SMPN 7 Pasuruan yang lebih sigap dan ramah anak. Kami menjamin kerahasiaan identitas pelapor.
              </p>
            </div>
            
            <button 
              onClick={onBack}
              className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-slate-100 transition-all flex items-center gap-3 group/btn"
            >
              Kembali ke Dashboard <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>

        {/* School Branding */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex items-center gap-3 opacity-30 grayscale">
            <img src="https://iili.io/KDFk4fI.png" alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            <div className="text-left leading-none uppercase">
                <div className="text-[8px] font-black">SIAP</div>
                <div className="text-xs font-black">SPANJU</div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">© 2024 SMP Negeri 7 Pasuruan • All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}
