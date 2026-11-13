import React from 'react';

interface BKKopSuratProps {
  subtitle?: string;
  subtitleClassName?: string;
}

export default function BKKopSurat({
  subtitle,
  subtitleClassName = 'text-slate-700',
}: BKKopSuratProps) {
  return (
    <div className="mb-5">
      <div className="w-full">
        <img
          src="/assets/aistudio/kop_surat_spanju_e20dffe4.png"
          alt="Kop Surat Pemerintah Kota Pasuruan - UPT SMP Negeri 7"
          className="w-full h-auto object-contain mx-auto block"
        />
      </div>
      {subtitle && (
        <p className={`text-center text-[10px] sm:text-xs font-black uppercase tracking-widest mt-2 ${subtitleClassName}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
