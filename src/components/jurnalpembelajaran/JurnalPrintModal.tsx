import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Calendar, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { JurnalPembelajaran } from '../../types/jurnalpembelajaran';

interface JurnalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurnalList: JurnalPembelajaran[];
  filterPeriod: string;
  startDate: string;
  endDate: string;
  filterKelas: string;
  filterMapel: string;
  filterGuru: string;
  filterPeriode: string;
  defaultMode?: 'semua' | 'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan';
}

interface SubjectGroup {
  mapel: string;
  guruList: string[];
  kelasList: string[];
  jurnals: JurnalPembelajaran[];
  totalPertemuan: number;
  totalPresensi: number;
  totalHadir: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  persenKehadiran: string;
  absensiRecords: {
    no: number;
    tanggal: string;
    jam_ke: string;
    kelas: string;
    nama_siswa: string;
    nis?: string;
    status: string;
    catatan: string;
  }[];
  catatanRecords: {
    no: number;
    tanggal: string;
    jam_ke: string;
    kelas: string;
    guru: string;
    nama_siswa: string;
    nilai: string | number;
    catatan: string;
    tindakan: string;
  }[];
  photos: {
    foto: string;
    tanggal: string;
    kelas: string;
    materi: string;
  }[];
  studentsWithAttention: {
    nama: string;
    kelas: string;
    count: number;
    notes: { tanggal: string; catatan: string; tindakan: string }[];
  }[];
}

export const JurnalPrintModal: React.FC<JurnalPrintModalProps> = ({
  isOpen,
  onClose,
  jurnalList,
  filterPeriod,
  startDate,
  endDate,
  filterKelas,
  filterMapel,
  filterGuru,
  filterPeriode,
  defaultMode = 'semua'
}) => {
  const [reportMode, setReportMode] = useState<'semua' | 'mingguan_bulanan' | 'absensi' | 'catatan_tindakan' | 'siswa_bercatatan'>(defaultMode);
  // Default to grouping per subject as requested by the user
  const [layoutMode, setLayoutMode] = useState<'per_mapel' | 'gabungan'>('per_mapel');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('semua');
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includeStats, setIncludeStats] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

  // Signature Config
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const [docDate, setDocDate] = useState<string>(`Pasuruan, ${todayFormatted}`);
  const [kepsekName, setKepsekName] = useState<string>('NUR FADILAH, S.Pd');
  const [kepsekNip, setKepsekNip] = useState<string>('19860410 201001 2 030');

  if (!isOpen) return null;

  // Format Date Helper
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // 1. Overall Aggregates
  let totalSiswaPresensi = 0;
  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;

  jurnalList.forEach(j => {
    j.siswa_list?.forEach(s => {
      totalSiswaPresensi++;
      if (s.absensi === 'Hadir') totalHadir++;
      else if (s.absensi === 'Sakit') totalSakit++;
      else if (s.absensi === 'Izin') totalIzin++;
      else if (s.absensi === 'Alpa') totalAlpa++;
    });
  });

  const persenKehadiran = totalSiswaPresensi > 0 
    ? ((totalHadir / totalSiswaPresensi) * 100).toFixed(1) 
    : '0';

  // 2. Build Subject Groups (Per Mata Pelajaran)
  const subjectGroupMap = new Map<string, JurnalPembelajaran[]>();
  jurnalList.forEach(j => {
    const mapelKey = j.nama_mapel?.trim() || 'Lainnya';
    if (!subjectGroupMap.has(mapelKey)) {
      subjectGroupMap.set(mapelKey, []);
    }
    subjectGroupMap.get(mapelKey)!.push(j);
  });

  const subjectKeys = Array.from(subjectGroupMap.keys()).sort((a, b) => a.localeCompare(b, 'id'));

  const subjectGroups: SubjectGroup[] = subjectKeys.map(mapel => {
    const list = subjectGroupMap.get(mapel)!;
    // Sort chronological: date then jam_ke
    list.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a.jam_ke || '').localeCompare(b.jam_ke || ''));

    const guruSet = new Set<string>();
    const kelasSet = new Set<string>();
    let sPresensi = 0;
    let sHadir = 0;
    let sSakit = 0;
    let sIzin = 0;
    let sAlpa = 0;
    const sAbsensi: SubjectGroup['absensiRecords'] = [];
    const sCatatan: SubjectGroup['catatanRecords'] = [];
    const sPhotos: SubjectGroup['photos'] = [];
    const noteMap = new Map<string, { nama: string; kelas: string; count: number; notes: { tanggal: string; catatan: string; tindakan: string }[] }>();

    let aIdx = 1;
    let cIdx = 1;

    list.forEach(j => {
      if (j.nama_guru) guruSet.add(j.nama_guru);
      if (j.kelas) kelasSet.add(j.kelas);

      j.siswa_list?.forEach(s => {
        sPresensi++;
        if (s.absensi === 'Hadir') sHadir++;
        else if (s.absensi === 'Sakit') sSakit++;
        else if (s.absensi === 'Izin') sIzin++;
        else if (s.absensi === 'Alpa') sAlpa++;

        if (s.absensi && s.absensi !== 'Hadir') {
          sAbsensi.push({
            no: aIdx++,
            tanggal: j.tanggal,
            jam_ke: j.jam_ke,
            kelas: j.kelas,
            nama_siswa: s.nama,
            nis: s.nis,
            status: s.absensi,
            catatan: s.catatan_siswa || '-'
          });
        }

        if ((s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) {
          sCatatan.push({
            no: cIdx++,
            tanggal: j.tanggal,
            jam_ke: j.jam_ke,
            kelas: j.kelas,
            guru: j.nama_guru,
            nama_siswa: s.nama,
            nilai: s.nilai || '-',
            catatan: s.catatan_siswa || '-',
            tindakan: s.tindakan || '-'
          });

          const nKey = `${s.nama}_${j.kelas}`;
          if (!noteMap.has(nKey)) {
            noteMap.set(nKey, { nama: s.nama, kelas: j.kelas, count: 0, notes: [] });
          }
          const item = noteMap.get(nKey)!;
          item.count++;
          item.notes.push({
            tanggal: j.tanggal,
            catatan: s.catatan_siswa || '-',
            tindakan: s.tindakan || '-'
          });
        }
      });

      if (j.foto_kegiatan && Array.isArray(j.foto_kegiatan)) {
        j.foto_kegiatan.forEach(f => {
          if (f && typeof f === 'string') {
            sPhotos.push({
              foto: f,
              tanggal: j.tanggal,
              kelas: j.kelas,
              materi: j.materi
            });
          }
        });
      }
    });

    const sPersen = sPresensi > 0 ? ((sHadir / sPresensi) * 100).toFixed(1) : '0';

    return {
      mapel,
      guruList: Array.from(guruSet),
      kelasList: Array.from(kelasSet),
      jurnals: list,
      totalPertemuan: list.length,
      totalPresensi: sPresensi,
      totalHadir: sHadir,
      totalSakit: sSakit,
      totalIzin: sIzin,
      totalAlpa: sAlpa,
      persenKehadiran: sPersen,
      absensiRecords: sAbsensi,
      catatanRecords: sCatatan,
      photos: sPhotos,
      studentsWithAttention: Array.from(noteMap.values()).sort((a, b) => b.count - a.count)
    };
  });

  // Filtered Subject Groups based on selected subject in modal
  const activeSubjectGroups = selectedSubjectFilter === 'semua' 
    ? subjectGroups 
    : subjectGroups.filter(g => g.mapel === selectedSubjectFilter);

  // 3. Combined Absence Records (for Combined mode or quick stats)
  const allAbsensiRecords: {
    no: number;
    tanggal: string;
    jam_ke: string;
    kelas: string;
    mapel: string;
    guru: string;
    nama_siswa: string;
    nis?: string;
    status: string;
    catatan: string;
  }[] = [];

  let absIndex = 1;
  jurnalList.forEach(j => {
    j.siswa_list?.forEach(s => {
      if (s.absensi !== 'Hadir') {
        allAbsensiRecords.push({
          no: absIndex++,
          tanggal: j.tanggal,
          jam_ke: j.jam_ke,
          kelas: j.kelas,
          mapel: j.nama_mapel,
          guru: j.nama_guru,
          nama_siswa: s.nama,
          nis: s.nis,
          status: s.absensi,
          catatan: s.catatan_siswa || '-'
        });
      }
    });
  });

  // 4. Combined Student Notes
  const allCatatanRecords: {
    no: number;
    tanggal: string;
    jam_ke: string;
    kelas: string;
    mapel: string;
    guru: string;
    nama_siswa: string;
    nilai: string | number;
    catatan: string;
    tindakan: string;
  }[] = [];

  let noteIndex = 1;
  jurnalList.forEach(j => {
    j.siswa_list?.forEach(s => {
      if ((s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) {
        allCatatanRecords.push({
          no: noteIndex++,
          tanggal: j.tanggal,
          jam_ke: j.jam_ke,
          kelas: j.kelas,
          mapel: j.nama_mapel,
          guru: j.nama_guru,
          nama_siswa: s.nama,
          nilai: s.nilai || '-',
          catatan: s.catatan_siswa || '-',
          tindakan: s.tindakan || '-'
        });
      }
    });
  });

  // 5. Combined Attention Map
  const globalStudentNoteMap = new Map<string, {
    nama: string;
    kelas: string;
    count: number;
    notes: { tanggal: string; mapel: string; catatan: string; tindakan: string }[];
  }>();

  allCatatanRecords.forEach(c => {
    const key = `${c.nama_siswa}_${c.kelas}`;
    if (!globalStudentNoteMap.has(key)) {
      globalStudentNoteMap.set(key, {
        nama: c.nama_siswa,
        kelas: c.kelas,
        count: 0,
        notes: []
      });
    }
    const item = globalStudentNoteMap.get(key)!;
    item.count++;
    item.notes.push({
      tanggal: c.tanggal,
      mapel: c.mapel,
      catatan: c.catatan,
      tindakan: c.tindakan
    });
  });

  const allStudentsWithAttention = Array.from(globalStudentNoteMap.values()).sort((a, b) => b.count - a.count);

  // 6. Gather ALL Photos (No slicing!)
  const allPhotosList: { foto: string; tanggal: string; kelas: string; mapel: string; materi: string }[] = [];
  jurnalList.forEach(j => {
    if (j.foto_kegiatan && Array.isArray(j.foto_kegiatan)) {
      j.foto_kegiatan.forEach(foto => {
        if (foto && typeof foto === 'string') {
          allPhotosList.push({
            foto,
            tanggal: j.tanggal,
            kelas: j.kelas,
            mapel: j.nama_mapel,
            materi: j.materi
          });
        }
      });
    }
  });

  // Standalone Isolated Printing Function
  const triggerIsolatedPrint = (inNewWindow = false) => {
    const printContent = document.getElementById('printable-full-report');
    if (!printContent) {
      window.print();
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    const htmlDoc = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Buku Laporan Jurnal Pembelajaran - SMPN 7 Pasuruan</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm 15mm 10mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              font-size: 10px !important;
              line-height: 1.35 !important;
              overflow: visible !important;
              height: auto !important;
              width: 100% !important;
            }
            #print-isolated-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #print-isolated-wrapper > div {
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              min-height: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            thead {
              display: table-header-group !important;
            }
            tfoot {
              display: table-footer-group !important;
            }
            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .page-break {
              page-break-before: always !important;
              break-before: page !important;
            }
            /* High-contrast printable borders */
            .border-slate-300 { border-color: #94a3b8 !important; }
            .border-slate-200 { border-color: #cbd5e1 !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .subject-report-section {
              page-break-inside: auto !important;
              margin-bottom: 20px !important;
            }
          </style>
        </head>
        <body>
          <div id="print-isolated-wrapper">
            ${printContent.innerHTML}
          </div>
          ${inNewWindow ? `
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>` : ''}
        </body>
      </html>
    `;

    if (inNewWindow) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlDoc);
        printWindow.document.close();
        return;
      }
    }

    const iframe = document.createElement('iframe');
    iframe.name = 'isolated_print_frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(htmlDoc);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error invoking iframe print, falling back to window.print', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 450);
  };

  const handlePrint = () => {
    triggerIsolatedPrint(false);
  };

  const handleOpenNewWindow = () => {
    triggerIsolatedPrint(true);
  };

  // Reusable KOP SURAT Component
  const renderKopSurat = () => (
    <div className="flex items-center justify-between gap-3 border-b-2 border-black pb-3 mb-4 avoid-break">
      <img 
        src="https://i.ibb.co.com/C3Y7JXkN/logo-dinas.png" 
        alt="Logo Dinas Pendidikan" 
        className="w-16 h-16 object-contain shrink-0"
        crossOrigin="anonymous"
      />
      <div className="flex-1 text-center px-2">
        <h4 className="text-[10px] md:text-[11px] font-bold tracking-wider uppercase text-slate-800 m-0">
          PEMERINTAH KOTA PASURUAN • DINAS PENDIDIKAN DAN KEBUDAYAAN
        </h4>
        <h2 className="text-sm md:text-base font-black text-sky-700 tracking-wide uppercase m-0 leading-tight">
          SMP NEGERI 7 PASURUAN
        </h2>
        <p className="text-[8.5px] text-slate-600 m-0 leading-tight">
          Jl. KH. Achmad Dahlan No. 58, Telp. (0343) 424364 Pasuruan, Jawa Timur 67126
        </p>
        <p className="text-[8.5px] text-sky-700 m-0 font-medium leading-tight">
          Pos-el: smpn7pasuruan@gmail.com | Laman: smpn7pasuruan.sch.id
        </p>
      </div>
      <img 
        src="https://iili.io/KDFk4fI.png" 
        alt="Logo SMPN 7 Pasuruan" 
        className="w-16 h-16 object-contain shrink-0"
        crossOrigin="anonymous"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/60 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200 print:static print:bg-white print:p-0 print:overflow-visible print:h-auto print:backdrop-blur-none">
      {/* TOP BAR / CONTROLS (NOT PRINTED) */}
      <div className="bg-white border-b border-slate-200 shadow-md p-3 md:p-4 z-20 shrink-0 no-print print:hidden" data-no-print="true">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Title and Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                  Cetak Buku Laporan Jurnal Pembelajaran
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                  Resmi SMPN 7
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Informasi utuh & lengkap tanpa terpotong, disusun per mata pelajaran & multi-halaman
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewWindow}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka tampilan cetak di jendela baru"
            >
              <ExternalLink size={14} /> Jendela Baru
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer size={16} /> Cetak Sekarang
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors ml-1 cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: MODE SELECTOR & OPTIONS */}
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Format & Mode Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Toggle: Per Mapel vs Gabungan */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setLayoutMode('per_mapel')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  layoutMode === 'per_mapel' 
                    ? 'bg-white text-amber-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Membuat halaman terpisah untuk setiap mata pelajaran sesuai banyaknya laporan"
              >
                <Layers size={13} className={layoutMode === 'per_mapel' ? 'text-amber-500' : ''} />
                <span>📑 Pisah Per Mata Pelajaran ({subjectGroups.length} Mapel)</span>
              </button>
              <button
                onClick={() => setLayoutMode('gabungan')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  layoutMode === 'gabungan' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Menggabungkan semua mata pelajaran dalam satu daftar kronologis"
              >
                <FileSpreadsheet size={13} />
                <span>📄 Tabel Terpadu</span>
              </button>
            </div>

            {/* Subject Picker Dropdown (Active in Per Mapel mode) */}
            {layoutMode === 'per_mapel' && subjectGroups.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500">Mata Pelajaran:</span>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua ({subjectGroups.length} Mapel - Multi Halaman)</option>
                  {subjectGroups.map(g => (
                    <option key={g.mapel} value={g.mapel}>{g.mapel} ({g.totalPertemuan} Pertemuan)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sub-Report Scope Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportMode('semua')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                reportMode === 'semua' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={12} className="text-amber-500" /> Semua Bagian
            </button>
            <button
              onClick={() => setReportMode('mingguan_bulanan')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                reportMode === 'mingguan_bulanan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda KBM
            </button>
            <button
              onClick={() => setReportMode('absensi')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                reportMode === 'absensi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Absensi Siswa
            </button>
            <button
              onClick={() => setReportMode('catatan_tindakan')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                reportMode === 'catatan_tindakan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catatan & Tindakan
            </button>
            <button
              onClick={() => setReportMode('siswa_bercatatan')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                reportMode === 'siswa_bercatatan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Siswa Bercatatan
            </button>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-3 text-slate-600 font-semibold">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeStats} 
                onChange={e => setIncludeStats(e.target.checked)} 
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Statistik</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includePhotos} 
                onChange={e => setIncludePhotos(e.target.checked)} 
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Foto KBM ({allPhotosList.length})</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeSignatures} 
                onChange={e => setIncludeSignatures(e.target.checked)} 
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Pengesahan</span>
            </label>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (PRINTABLE AREA) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200/80 print:p-0 print:m-0 print:overflow-visible print:bg-white print:h-auto">
        <div 
          id="printable-full-report"
          className="mx-auto max-w-[215mm] space-y-8 print:space-y-0 print:max-w-none print:w-full"
        >
          {/* ========================================================================= */}
          {/* OPTION 1: PER MATA PELAJARAN (MULTI-PAGE BY SUBJECT) */}
          {/* ========================================================================= */}
          {layoutMode === 'per_mapel' ? (
            activeSubjectGroups.map((group, groupIdx) => {
              // Primary teacher for signature
              const groupTeacher = group.guruList.length > 0 ? group.guruList.join(', ') : 'Guru Mata Pelajaran';

              return (
                <div 
                  key={group.mapel}
                  className={`bg-white p-8 md:p-12 shadow-2xl rounded-sm text-slate-900 text-[10.5px] leading-relaxed border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none ${
                    groupIdx > 0 ? 'page-break' : ''
                  }`}
                >
                  {/* Visual Divider in screen preview */}
                  {groupIdx > 0 && (
                    <div className="hidden print:hidden border-b-2 border-dashed border-amber-300 pb-2 mb-6 text-center text-xs font-bold text-amber-700">
                      📄 Halaman Berikutnya: Mata Pelajaran {group.mapel}
                    </div>
                  )}

                  {/* 1. KOP SURAT RESMI */}
                  {renderKopSurat()}

                  {/* 2. JUDUL DOKUMEN & MATA PELAJARAN */}
                  <div className="text-center mb-4">
                    <h3 className="text-[14px] font-black uppercase tracking-wider underline decoration-slate-900 underline-offset-4 m-0">
                      {reportMode === 'semua' && 'BUKU JURNAL PEMBELAJARAN & EVALUASI SISWA'}
                      {reportMode === 'mingguan_bulanan' && 'AGENDA PEMBELAJARAN (KBM)'}
                      {reportMode === 'absensi' && 'REKAPITULASI KETIDAKHADIRAN SISWA'}
                      {reportMode === 'catatan_tindakan' && 'EVALUASI PERILAKU SISWA DAN TINDAKAN GURU'}
                      {reportMode === 'siswa_bercatatan' && 'DAFTAR SISWA DENGAN CATATAN KHUSUS'}
                    </h3>
                    <h2 className="text-[16px] font-black uppercase tracking-wide text-sky-800 mt-1 mb-0.5">
                      MATA PELAJARAN: {group.mapel}
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-600 m-0">
                      Periode: {filterPeriode !== 'semua' ? `Tahun Ajaran ${filterPeriode}` : 'Semua Periode'} 
                      {' '}| Rentang Tanggal: {formatDateIndo(startDate)} s.d. {formatDateIndo(endDate)}
                    </p>
                  </div>

                  {/* 3. METADATA MATA PELAJARAN */}
                  <div className="border border-slate-300 rounded p-2.5 mb-4 bg-slate-50/50 text-[10px] avoid-break">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="w-32 font-bold py-0.5 text-slate-700">Mata Pelajaran</td>
                          <td className="w-2 py-0.5">:</td>
                          <td className="py-0.5 font-bold text-sky-900 text-[11px]">{group.mapel}</td>
                          <td className="w-36 font-bold py-0.5 text-slate-700">Kelas Diajar</td>
                          <td className="w-2 py-0.5">:</td>
                          <td className="py-0.5 font-semibold text-slate-900">{group.kelasList.join(', ') || '-'}</td>
                        </tr>
                        <tr>
                          <td className="font-bold py-0.5 text-slate-700">Guru Pengajar</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5 font-semibold text-slate-900">{group.guruList.join(', ') || '-'}</td>
                          <td className="font-bold py-0.5 text-slate-700">Total Pertemuan KBM</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5 font-black text-slate-900">{group.totalPertemuan} Pertemuan</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. RINGKASAN STATISTIK KEHADIRAN MAPEL INI */}
                  {includeStats && (
                    <div className="mb-4 p-2.5 rounded bg-slate-50 border border-slate-300 avoid-break">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 border-b border-slate-200 pb-1 flex items-center justify-between">
                        <span>Statistik Kehadiran Mata Pelajaran {group.mapel}:</span>
                        <span className="text-[10px] font-black text-emerald-700">Kehadiran: {group.persenKehadiran}%</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center text-[9.5px]">
                        <div className="p-1 bg-white border border-slate-200 rounded">
                          <div className="text-slate-500 font-semibold text-[8.5px]">Tatap Muka</div>
                          <div className="text-xs font-black text-slate-800">{group.totalPertemuan} KBM</div>
                        </div>
                        <div className="p-1 bg-emerald-50 border border-emerald-200 rounded">
                          <div className="text-emerald-700 font-semibold text-[8.5px]">Hadir</div>
                          <div className="text-xs font-black text-emerald-800">{group.totalHadir}</div>
                        </div>
                        <div className="p-1 bg-amber-50 border border-amber-200 rounded">
                          <div className="text-amber-700 font-semibold text-[8.5px]">Sakit (S)</div>
                          <div className="text-xs font-black text-amber-800">{group.totalSakit}</div>
                        </div>
                        <div className="p-1 bg-sky-50 border border-sky-200 rounded">
                          <div className="text-sky-700 font-semibold text-[8.5px]">Izin (I)</div>
                          <div className="text-xs font-black text-sky-800">{group.totalIzin}</div>
                        </div>
                        <div className="p-1 bg-rose-50 border border-rose-200 rounded">
                          <div className="text-rose-700 font-semibold text-[8.5px]">Alpa (A)</div>
                          <div className="text-xs font-black text-rose-800">{group.totalAlpa}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION A: AGENDA PEMBELAJARAN (LENGKAP & UTUH TANPA TERPOTONG) */}
                  {(reportMode === 'semua' || reportMode === 'mingguan_bulanan') && (
                    <div className="mb-5">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-amber-500 flex justify-between items-center avoid-break">
                        <span>A. AGENDA TATAP MUKA & KEGIATAN BELAJAR MENGAJAR (KBM)</span>
                        <span className="text-[9.5px] font-normal text-slate-500">({group.jurnals.length} Pertemuan)</span>
                      </div>

                      {group.jurnals.length === 0 ? (
                        <div className="p-3 border border-dashed border-slate-300 text-center text-slate-500 italic text-xs">
                          Belum ada catatan jurnal pada mata pelajaran ini.
                        </div>
                      ) : (
                        <table className="w-full border-collapse border border-slate-300 text-[9px]">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                              <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                              <th className="border border-slate-300 px-1.5 py-1 text-left w-20">Tanggal & Jam</th>
                              <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                              <th className="border border-slate-300 px-2 py-1 text-left w-32">Materi Pokok</th>
                              <th className="border border-slate-300 px-2 py-1 text-left">Uraian Lengkap Kegiatan Pembelajaran</th>
                              <th className="border border-slate-300 px-2 py-1 text-left w-36">Presensi & Siswa Tidak Hadir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.jurnals.map((j, idx) => {
                              const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
                              const sakitList = j.siswa_list?.filter(s => s.absensi === 'Sakit') || [];
                              const izinList = j.siswa_list?.filter(s => s.absensi === 'Izin') || [];
                              const alpaList = j.siswa_list?.filter(s => s.absensi === 'Alpa') || [];
                              const notesInMeeting = j.siswa_list?.filter(s => (s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) || [];

                              return (
                                <tr key={j.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                  <td className="border border-slate-300 px-1 py-1.5 text-center font-medium align-top">{idx + 1}</td>
                                  <td className="border border-slate-300 px-1.5 py-1.5 align-top">
                                    <div className="font-bold text-slate-800">{j.tanggal}</div>
                                    <div className="text-[8.5px] text-slate-500 font-mono">Jam ke-{j.jam_ke}</div>
                                    {group.guruList.length > 1 && j.nama_guru && (
                                      <div className="text-[8px] text-slate-600 mt-0.5 italic">{j.nama_guru}</div>
                                    )}
                                  </td>
                                  <td className="border border-slate-300 px-1 py-1.5 text-center font-bold text-slate-800 align-top">
                                    {j.kelas}
                                  </td>
                                  <td className="border border-slate-300 px-2 py-1.5 align-top">
                                    <div className="font-bold text-slate-900 text-[9.5px]">{j.materi}</div>
                                  </td>
                                  <td className="border border-slate-300 px-2 py-1.5 align-top">
                                    {/* URAIAN KEGIATAN UTUH TANPA TERPOTONG */}
                                    <div className="text-slate-800 text-[9px] leading-relaxed whitespace-pre-line font-normal">
                                      {j.kegiatan || '-'}
                                    </div>

                                    {/* Evaluasi Khusus Siswa pada pertemuan ini (jika ada) */}
                                    {notesInMeeting.length > 0 && (
                                      <div className="mt-1.5 pt-1 border-t border-slate-200 text-[8.5px] bg-amber-50/40 p-1 rounded">
                                        <span className="font-bold text-amber-800">Catatan/Evaluasi Guru: </span>
                                        {notesInMeeting.map((n, ni) => (
                                          <div key={ni} className="text-slate-700 mt-0.5">
                                            • <strong className="text-slate-900">{n.nama}</strong>: {n.catatan_siswa}
                                            {n.tindakan && <span className="text-sky-800 font-medium"> (Tindakan: {n.tindakan})</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="border border-slate-300 px-2 py-1.5 align-top">
                                    <div className="font-mono text-[8.5px] font-bold text-slate-800">
                                      <span className="text-emerald-700">{hadir} Hadir</span>
                                      {sakitList.length > 0 && <span className="text-amber-700 ml-1">· {sakitList.length}S</span>}
                                      {izinList.length > 0 && <span className="text-sky-700 ml-1">· {izinList.length}I</span>}
                                      {alpaList.length > 0 && <span className="text-rose-700 ml-1">· {alpaList.length}A</span>}
                                    </div>

                                    {/* DAFTAR NAMA SISWA TIDAK HADIR LENGKAP */}
                                    {(sakitList.length > 0 || izinList.length > 0 || alpaList.length > 0) && (
                                      <div className="text-[8px] mt-1 space-y-0.5 text-slate-600 border-t border-slate-200 pt-1">
                                        {sakitList.length > 0 && (
                                          <div>
                                            <span className="font-bold text-amber-800">Sakit:</span>{' '}
                                            {sakitList.map(s => s.nama).join(', ')}
                                          </div>
                                        )}
                                        {izinList.length > 0 && (
                                          <div>
                                            <span className="font-bold text-sky-800">Izin:</span>{' '}
                                            {izinList.map(s => s.nama).join(', ')}
                                          </div>
                                        )}
                                        {alpaList.length > 0 && (
                                          <div>
                                            <span className="font-bold text-rose-800">Alpa:</span>{' '}
                                            {alpaList.map(s => s.nama).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* SECTION B: REKAPITULASI SISWA TIDAK HADIR MAPEL INI */}
                  {(reportMode === 'semua' || reportMode === 'absensi') && (
                    <div className="mb-5">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-rose-500 flex justify-between items-center avoid-break">
                        <span>B. DAFTAR KETIDAKHADIRAN SISWA (SAKIT, IZIN, ALPA)</span>
                        <span className="text-[9.5px] font-normal text-slate-500">({group.absensiRecords.length} Catatan)</span>
                      </div>

                      {group.absensiRecords.length === 0 ? (
                        <div className="p-2.5 border border-slate-200 rounded text-center text-slate-500 text-[9.5px] italic bg-slate-50">
                          Nihil — Seluruh siswa hadir 100% pada seluruh tatap muka mata pelajaran ini.
                        </div>
                      ) : (
                        <table className="w-full border-collapse border border-slate-300 text-[9px]">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                              <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                              <th className="border border-slate-300 px-2 py-1 text-left w-20">Tanggal</th>
                              <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                              <th className="border border-slate-300 px-2 py-1 text-left">Nama Siswa</th>
                              <th className="border border-slate-300 px-2 py-1 text-center w-16">Status</th>
                              <th className="border border-slate-300 px-2 py-1 text-left">Keterangan / Alasan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.absensiRecords.map((r, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                <td className="border border-slate-300 px-1 py-1 text-center">{idx + 1}</td>
                                <td className="border border-slate-300 px-2 py-1 font-mono text-[8.5px]">{r.tanggal} (Jam {r.jam_ke})</td>
                                <td className="border border-slate-300 px-1 py-1 text-center font-bold">{r.kelas}</td>
                                <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800">
                                  {r.nama_siswa}
                                  {r.nis && <span className="text-[8px] text-slate-400 font-normal ml-1">({r.nis})</span>}
                                </td>
                                <td className="border border-slate-300 px-2 py-1 text-center">
                                  <span className={`px-1.5 py-0.5 rounded font-bold text-[8.5px] ${
                                    r.status === 'Sakit' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                    r.status === 'Izin' ? 'bg-sky-100 text-sky-800 border border-sky-300' :
                                    'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="border border-slate-300 px-2 py-1 italic text-slate-600">{r.catatan}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* SECTION C: REKAPITULASI CATATAN EVALUASI & TINDAKAN GURU MAPEL INI */}
                  {(reportMode === 'semua' || reportMode === 'catatan_tindakan') && (
                    <div className="mb-5">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-sky-500 flex justify-between items-center avoid-break">
                        <span>C. CATATAN EVALUASI SISWA & SOLUSI TINDAKAN GURU</span>
                        <span className="text-[9.5px] font-normal text-slate-500">({group.catatanRecords.length} Catatan)</span>
                      </div>

                      {group.catatanRecords.length === 0 ? (
                        <div className="p-2.5 border border-slate-200 rounded text-center text-slate-500 text-[9.5px] italic bg-slate-50">
                          Nihil — Seluruh siswa terpantau tertib dan tidak ada catatan khusus pada mata pelajaran ini.
                        </div>
                      ) : (
                        <table className="w-full border-collapse border border-slate-300 text-[9px]">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                              <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                              <th className="border border-slate-300 px-2 py-1 text-left w-20">Tanggal</th>
                              <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                              <th className="border border-slate-300 px-2 py-1 text-left w-36">Nama Siswa</th>
                              <th className="border border-slate-300 px-1 py-1 text-center w-10">Nilai</th>
                              <th className="border border-slate-300 px-2 py-1 text-left">Catatan / Kendala Siswa</th>
                              <th className="border border-slate-300 px-2 py-1 text-left">Tindakan / Solusi Guru</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.catatanRecords.map((c, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                <td className="border border-slate-300 px-1 py-1 text-center">{idx + 1}</td>
                                <td className="border border-slate-300 px-2 py-1 font-mono text-[8.5px]">{c.tanggal}</td>
                                <td className="border border-slate-300 px-1 py-1 text-center font-bold">{c.kelas}</td>
                                <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800">{c.nama_siswa}</td>
                                <td className="border border-slate-300 px-1 py-1 text-center font-bold text-slate-700">{c.nilai}</td>
                                <td className="border border-slate-300 px-2 py-1 text-slate-800">{c.catatan}</td>
                                <td className="border border-slate-300 px-2 py-1 text-sky-800 font-medium bg-sky-50/30">{c.tindakan}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* SECTION D: SISWA DENGAN CATATAN KHUSUS DI MAPEL INI */}
                  {(reportMode === 'semua' || reportMode === 'siswa_bercatatan') && group.studentsWithAttention.length > 0 && (
                    <div className="mb-5">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-amber-600 flex justify-between items-center avoid-break">
                        <span>D. SISWA DENGAN CATATAN KHUSUS PADA MAPEL {group.mapel}</span>
                        <span className="text-[9.5px] font-normal text-slate-500">({group.studentsWithAttention.length} Siswa)</span>
                      </div>

                      <table className="w-full border-collapse border border-slate-300 text-[9px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                            <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                            <th className="border border-slate-300 px-2 py-1 text-left w-36">Nama Siswa</th>
                            <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                            <th className="border border-slate-300 px-1.5 py-1 text-center w-16">Total Masuk</th>
                            <th className="border border-slate-300 px-2 py-1 text-left">Rincian Riwayat Catatan & Tindakan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.studentsWithAttention.map((s, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                              <td className="border border-slate-300 px-1 py-1 text-center">{idx + 1}</td>
                              <td className="border border-slate-300 px-2 py-1 font-bold text-slate-900">{s.nama}</td>
                              <td className="border border-slate-300 px-1 py-1 text-center font-bold">{s.kelas}</td>
                              <td className="border border-slate-300 px-1.5 py-1 text-center">
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-black rounded text-[8.5px] border border-amber-300">
                                  {s.count}x
                                </span>
                              </td>
                              <td className="border border-slate-300 px-2 py-1">
                                <ul className="list-disc list-inside space-y-0.5 text-[8.5px]">
                                  {s.notes.map((n, nIdx) => (
                                    <li key={nIdx}>
                                      <span className="font-semibold text-slate-800">[{n.tanggal}]</span>: {n.catatan} 
                                      {n.tindakan && n.tindakan !== '-' && (
                                        <span className="text-sky-700 font-medium"> (Tindakan: {n.tindakan})</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* SECTION E: FOTO DOKUMENTASI KBM MAPEL INI (SEMUA FOTO, TANPA SAMPEL) */}
                  {includePhotos && reportMode === 'semua' && group.photos.length > 0 && (
                    <div className="mb-6">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-2 bg-slate-100 p-1.5 border-l-4 border-emerald-600 flex justify-between items-center avoid-break">
                        <span>E. DOKUMENTASI FOTO KEGIATAN BELAJAR MENGAJAR (KBM)</span>
                        <span className="text-[9.5px] font-normal text-slate-500">({group.photos.length} Foto Lengkap)</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 print:grid-cols-2">
                        {group.photos.map((p, pIdx) => (
                          <div key={pIdx} className="border border-slate-300 p-2 rounded bg-white text-center avoid-break">
                            <img 
                              src={p.foto} 
                              alt={`Dokumentasi ${group.mapel} ${pIdx + 1}`} 
                              className="w-full h-32 object-cover rounded border border-slate-200"
                              crossOrigin="anonymous"
                            />
                            <div className="text-[9px] font-bold text-slate-800 mt-1.5">{p.materi}</div>
                            <div className="text-[8px] text-slate-500 font-medium">Kelas {p.kelas} • {p.tanggal}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* LEMBAR PENGESAHAN MAPEL INI */}
                  {includeSignatures && (
                    <div className="mt-8 pt-4 border-t border-slate-300 avoid-break">
                      <div className="flex justify-between items-start text-center text-[10.5px]">
                        {/* Kolom Kiri: Kepala Sekolah */}
                        <div className="w-60 text-center">
                          <div className="text-slate-800 font-bold mb-1">Mengetahui,</div>
                          <div className="text-slate-800 font-bold mb-14">Kepala SMP Negeri 7 Pasuruan</div>
                          <div className="font-black text-slate-900 underline uppercase tracking-tight">{kepsekName}</div>
                          <div className="text-[9.5px] text-slate-600 font-medium">NIP. {kepsekNip}</div>
                        </div>

                        {/* Kolom Kanan: Guru Pengajar Mapel */}
                        <div className="w-60 text-center">
                          <div className="text-slate-800 font-medium mb-1">{docDate}</div>
                          <div className="text-slate-800 font-bold mb-14">Guru Mata Pelajaran {group.mapel}</div>
                          <div className="font-black text-slate-900 underline uppercase tracking-tight">
                            {groupTeacher || '................................................'}
                          </div>
                          <div className="text-[9.5px] text-slate-600 font-medium">
                            NIP. ....................................
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* ========================================================================= */
            /* OPTION 2: TABEL TERPADU (GABUNGAN SEMUA MATA PELAJARAN) */
            /* ========================================================================= */
            <div className="bg-white p-8 md:p-12 shadow-2xl rounded-sm text-slate-900 text-[10.5px] leading-relaxed border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
              {/* 1. KOP SURAT */}
              {renderKopSurat()}

              {/* 2. JUDUL */}
              <div className="text-center mb-4">
                <h3 className="text-[14px] font-black uppercase tracking-wider underline decoration-slate-900 underline-offset-4 m-0">
                  BUKU LAPORAN JURNAL PEMBELAJARAN & EVALUASI SISWA
                </h3>
                <h2 className="text-[15px] font-black uppercase tracking-wide text-sky-800 mt-1 mb-0.5">
                  SEMUA MATA PELAJARAN (TABEL TERPADU)
                </h2>
                <p className="text-[10px] font-semibold text-slate-600 m-0">
                  Periode: {filterPeriode !== 'semua' ? `Tahun Ajaran ${filterPeriode}` : 'Semua Periode'} 
                  {' '}| Rentang Tanggal: {formatDateIndo(startDate)} s.d. {formatDateIndo(endDate)}
                </p>
              </div>

              {/* 3. INFO METADATA GABUNGAN */}
              <div className="border border-slate-300 rounded p-2.5 mb-4 bg-slate-50/50 text-[10px] avoid-break">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-32 font-bold py-0.5 text-slate-700">Mata Pelajaran</td>
                      <td className="w-2 py-0.5">:</td>
                      <td className="py-0.5 font-bold text-sky-900">{filterMapel !== 'semua' ? filterMapel : `Semua (${subjectGroups.length} Mapel Terdaftar)`}</td>
                      <td className="w-36 font-bold py-0.5 text-slate-700">Kelas</td>
                      <td className="w-2 py-0.5">:</td>
                      <td className="py-0.5 font-semibold text-slate-900">{filterKelas !== 'semua' ? `Kelas ${filterKelas}` : 'Semua Kelas (VII, VIII, IX)'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold py-0.5 text-slate-700">Guru Pengajar</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 font-semibold text-slate-900">{filterGuru !== 'semua' ? filterGuru : 'Seluruh Dewan Guru'}</td>
                      <td className="font-bold py-0.5 text-slate-700">Total Pertemuan KBM</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 font-black text-slate-900">{jurnalList.length} Pertemuan Terdata</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. STATISTIK GABUNGAN */}
              {includeStats && (
                <div className="mb-4 p-2.5 rounded bg-slate-50 border border-slate-300 avoid-break">
                  <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Ringkasan Kehadiran Seluruh Pembelajaran:</span>
                    <span className="text-[10px] font-black text-emerald-700">Kehadiran: {persenKehadiran}%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center text-[9.5px]">
                    <div className="p-1 bg-white border border-slate-200 rounded">
                      <div className="text-slate-500 font-semibold text-[8.5px]">Total Pertemuan</div>
                      <div className="text-xs font-black text-slate-800">{jurnalList.length} KBM</div>
                    </div>
                    <div className="p-1 bg-emerald-50 border border-emerald-200 rounded">
                      <div className="text-emerald-700 font-semibold text-[8.5px]">Hadir</div>
                      <div className="text-xs font-black text-emerald-800">{totalHadir}</div>
                    </div>
                    <div className="p-1 bg-amber-50 border border-amber-200 rounded">
                      <div className="text-amber-700 font-semibold text-[8.5px]">Sakit (S)</div>
                      <div className="text-xs font-black text-amber-800">{totalSakit}</div>
                    </div>
                    <div className="p-1 bg-sky-50 border border-sky-200 rounded">
                      <div className="text-sky-700 font-semibold text-[8.5px]">Izin (I)</div>
                      <div className="text-xs font-black text-sky-800">{totalIzin}</div>
                    </div>
                    <div className="p-1 bg-rose-50 border border-rose-200 rounded">
                      <div className="text-rose-700 font-semibold text-[8.5px]">Alpa (A)</div>
                      <div className="text-xs font-black text-rose-800">{totalAlpa}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION A: AGENDA GABUNGAN LENGKAP UTUH */}
              {(reportMode === 'semua' || reportMode === 'mingguan_bulanan') && (
                <div className="mb-5">
                  <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-amber-500 flex justify-between items-center avoid-break">
                    <span>A. DAFTAR AGENDA TATAP MUKA JURNAL PEMBELAJARAN GURU</span>
                    <span className="text-[9.5px] font-normal text-slate-500">({jurnalList.length} Pertemuan)</span>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-[9px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                        <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                        <th className="border border-slate-300 px-1.5 py-1 text-left w-20">Tanggal & Jam</th>
                        <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                        <th className="border border-slate-300 px-2 py-1 text-left w-28">Mata Pelajaran</th>
                        <th className="border border-slate-300 px-2 py-1 text-left w-28">Guru Pengajar</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">Materi & Uraian Lengkap Kegiatan</th>
                        <th className="border border-slate-300 px-2 py-1 text-left w-36">Presensi & Siswa Tidak Hadir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jurnalList.map((j, idx) => {
                        const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
                        const sakitList = j.siswa_list?.filter(s => s.absensi === 'Sakit') || [];
                        const izinList = j.siswa_list?.filter(s => s.absensi === 'Izin') || [];
                        const alpaList = j.siswa_list?.filter(s => s.absensi === 'Alpa') || [];
                        const notesInMeeting = j.siswa_list?.filter(s => (s.catatan_siswa && s.catatan_siswa.trim()) || (s.tindakan && s.tindakan.trim())) || [];

                        return (
                          <tr key={j.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className="border border-slate-300 px-1 py-1.5 text-center font-medium align-top">{idx + 1}</td>
                            <td className="border border-slate-300 px-1.5 py-1.5 align-top">
                              <div className="font-bold text-slate-800">{j.tanggal}</div>
                              <div className="text-[8.5px] text-slate-500 font-mono">Jam ke-{j.jam_ke}</div>
                            </td>
                            <td className="border border-slate-300 px-1 py-1.5 text-center font-bold text-slate-800 align-top">
                              {j.kelas}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 font-bold text-sky-900 align-top">
                              {j.nama_mapel}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-slate-700 align-top">
                              {j.nama_guru}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 align-top">
                              <div className="font-bold text-slate-900 text-[9.5px]">{j.materi}</div>
                              <div className="text-slate-800 text-[9px] leading-relaxed whitespace-pre-line font-normal mt-0.5">
                                {j.kegiatan || '-'}
                              </div>

                              {notesInMeeting.length > 0 && (
                                <div className="mt-1.5 pt-1 border-t border-slate-200 text-[8.5px] bg-amber-50/40 p-1 rounded">
                                  <span className="font-bold text-amber-800">Catatan/Evaluasi Guru: </span>
                                  {notesInMeeting.map((n, ni) => (
                                    <div key={ni} className="text-slate-700 mt-0.5">
                                      • <strong className="text-slate-900">{n.nama}</strong>: {n.catatan_siswa}
                                      {n.tindakan && <span className="text-sky-800 font-medium"> (Tindakan: {n.tindakan})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 align-top">
                              <div className="font-mono text-[8.5px] font-bold text-slate-800">
                                <span className="text-emerald-700">{hadir} Hadir</span>
                                {sakitList.length > 0 && <span className="text-amber-700 ml-1">· {sakitList.length}S</span>}
                                {izinList.length > 0 && <span className="text-sky-700 ml-1">· {izinList.length}I</span>}
                                {alpaList.length > 0 && <span className="text-rose-700 ml-1">· {alpaList.length}A</span>}
                              </div>

                              {(sakitList.length > 0 || izinList.length > 0 || alpaList.length > 0) && (
                                <div className="text-[8px] mt-1 space-y-0.5 text-slate-600 border-t border-slate-200 pt-1">
                                  {sakitList.length > 0 && (
                                    <div>
                                      <span className="font-bold text-amber-800">Sakit:</span>{' '}
                                      {sakitList.map(s => s.nama).join(', ')}
                                    </div>
                                  )}
                                  {izinList.length > 0 && (
                                    <div>
                                      <span className="font-bold text-sky-800">Izin:</span>{' '}
                                      {izinList.map(s => s.nama).join(', ')}
                                    </div>
                                  )}
                                  {alpaList.length > 0 && (
                                    <div>
                                      <span className="font-bold text-rose-800">Alpa:</span>{' '}
                                      {alpaList.map(s => s.nama).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECTION B: REKAP ABSENSI GABUNGAN */}
              {(reportMode === 'semua' || reportMode === 'absensi') && (
                <div className="mb-5">
                  <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-rose-500 flex justify-between items-center avoid-break">
                    <span>B. REKAPITULASI SISWA TIDAK HADIR (SAKIT, IZIN, ALPA)</span>
                    <span className="text-[9.5px] font-normal text-slate-500">({allAbsensiRecords.length} Catatan)</span>
                  </div>

                  {allAbsensiRecords.length === 0 ? (
                    <div className="p-2.5 border border-slate-200 rounded text-center text-slate-500 text-[9.5px] italic bg-slate-50">
                      Nihil — Seluruh siswa hadir 100% pada seluruh tatap muka pembelajaran yang dipilih.
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-slate-300 text-[9px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                          <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                          <th className="border border-slate-300 px-2 py-1 text-left w-20">Tanggal</th>
                          <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                          <th className="border border-slate-300 px-2 py-1 text-left w-28">Mata Pelajaran</th>
                          <th className="border border-slate-300 px-2 py-1 text-left">Nama Siswa</th>
                          <th className="border border-slate-300 px-2 py-1 text-center w-16">Status</th>
                          <th className="border border-slate-300 px-2 py-1 text-left">Keterangan / Alasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAbsensiRecords.map((r, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className="border border-slate-300 px-1 py-1 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 px-2 py-1 font-mono text-[8.5px]">{r.tanggal}</td>
                            <td className="border border-slate-300 px-1 py-1 text-center font-bold">{r.kelas}</td>
                            <td className="border border-slate-300 px-2 py-1">{r.mapel}</td>
                            <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800">
                              {r.nama_siswa}
                              {r.nis && <span className="text-[8px] text-slate-400 font-normal ml-1">({r.nis})</span>}
                            </td>
                            <td className="border border-slate-300 px-2 py-1 text-center">
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[8.5px] ${
                                r.status === 'Sakit' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                r.status === 'Izin' ? 'bg-sky-100 text-sky-800 border border-sky-300' :
                                'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="border border-slate-300 px-2 py-1 italic text-slate-600">{r.catatan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* SECTION C: REKAP CATATAN & TINDAKAN GABUNGAN */}
              {(reportMode === 'semua' || reportMode === 'catatan_tindakan') && (
                <div className="mb-5">
                  <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-sky-500 flex justify-between items-center avoid-break">
                    <span>C. REKAPITULASI CATATAN EVALUASI SISWA & SOLUSI TINDAK LANJUT GURU</span>
                    <span className="text-[9.5px] font-normal text-slate-500">({allCatatanRecords.length} Catatan)</span>
                  </div>

                  {allCatatanRecords.length === 0 ? (
                    <div className="p-2.5 border border-slate-200 rounded text-center text-slate-500 text-[9.5px] italic bg-slate-50">
                      Nihil — Tidak ada catatan khusus pelanggaran atau kendala pada rentang data ini.
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-slate-300 text-[9px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                          <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                          <th className="border border-slate-300 px-2 py-1 text-left w-20">Tanggal</th>
                          <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                          <th className="border border-slate-300 px-2 py-1 text-left w-24">Mapel</th>
                          <th className="border border-slate-300 px-2 py-1 text-left w-32">Nama Siswa</th>
                          <th className="border border-slate-300 px-1 py-1 text-center w-10">Nilai</th>
                          <th className="border border-slate-300 px-2 py-1 text-left">Catatan / Kendala Siswa</th>
                          <th className="border border-slate-300 px-2 py-1 text-left">Tindakan / Solusi Guru</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCatatanRecords.map((c, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className="border border-slate-300 px-1 py-1 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 px-2 py-1 font-mono text-[8.5px]">{c.tanggal}</td>
                            <td className="border border-slate-300 px-1 py-1 text-center font-bold">{c.kelas}</td>
                            <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">{c.mapel}</td>
                            <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800">{c.nama_siswa}</td>
                            <td className="border border-slate-300 px-1 py-1 text-center font-bold text-slate-700">{c.nilai}</td>
                            <td className="border border-slate-300 px-2 py-1 text-slate-800 font-medium">{c.catatan}</td>
                            <td className="border border-slate-300 px-2 py-1 text-sky-800 font-semibold bg-sky-50/30">{c.tindakan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* SECTION D: DAFTAR SISWA BERCATATAN KHUSUS GABUNGAN */}
              {(reportMode === 'semua' || reportMode === 'siswa_bercatatan') && allStudentsWithAttention.length > 0 && (
                <div className="mb-5">
                  <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-amber-600 flex justify-between items-center avoid-break">
                    <span>D. DAFTAR SISWA DENGAN CATATAN KHUSUS (PERHATIAN WALI KELAS & BK)</span>
                    <span className="text-[9.5px] font-normal text-slate-500">({allStudentsWithAttention.length} Siswa Teridentifikasi)</span>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-[9px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                        <th className="border border-slate-300 px-1 py-1 text-center w-6">No</th>
                        <th className="border border-slate-300 px-2 py-1 text-left w-36">Nama Siswa</th>
                        <th className="border border-slate-300 px-1 py-1 text-center w-12">Kelas</th>
                        <th className="border border-slate-300 px-1.5 py-1 text-center w-16">Total Catatan</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">Rincian Catatan & Rekomendasi Tindak Lanjut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStudentsWithAttention.map((s, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                          <td className="border border-slate-300 px-1 py-1 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 px-2 py-1 font-bold text-slate-900">{s.nama}</td>
                          <td className="border border-slate-300 px-1 py-1 text-center font-bold">{s.kelas}</td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center">
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-black rounded text-[8.5px] border border-amber-300">
                              {s.count}x
                            </span>
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            <ul className="list-disc list-inside space-y-0.5 text-[8.5px]">
                              {s.notes.map((n, nIdx) => (
                                <li key={nIdx}>
                                  <span className="font-semibold text-slate-800">[{n.tanggal} - {n.mapel}]</span>: {n.catatan} 
                                  {n.tindakan && n.tindakan !== '-' && (
                                    <span className="text-sky-700 font-medium"> (Tindakan: {n.tindakan})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SECTION E: FOTO DOKUMENTASI SEMUA KBM (SEMUA FOTO, TANPA SAMPEL) */}
              {includePhotos && reportMode === 'semua' && allPhotosList.length > 0 && (
                <div className="mb-6">
                  <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-2 bg-slate-100 p-1.5 border-l-4 border-emerald-600 flex justify-between items-center avoid-break">
                    <span>E. DOKUMENTASI FOTO KEGIATAN BELAJAR MENGAJAR (KBM)</span>
                    <span className="text-[9.5px] font-normal text-slate-500">({allPhotosList.length} Foto Lengkap Terlampir)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 print:grid-cols-2">
                    {allPhotosList.map((p, idx) => (
                      <div key={idx} className="border border-slate-300 p-2 rounded bg-white text-center avoid-break">
                        <img 
                          src={p.foto} 
                          alt={`Dokumentasi ${idx + 1}`} 
                          className="w-full h-32 object-cover rounded border border-slate-200"
                          crossOrigin="anonymous"
                        />
                        <div className="text-[9px] font-bold text-slate-800 mt-1.5">{p.mapel} - Kelas {p.kelas}</div>
                        <div className="text-[8px] text-slate-500 font-medium">{p.tanggal}</div>
                        <div className="text-[8px] text-slate-700 italic mt-0.5">{p.materi}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LEMBAR PENGESAHAN GABUNGAN */}
              {includeSignatures && (
                <div className="mt-8 pt-4 border-t border-slate-300 avoid-break">
                  <div className="flex justify-between items-start text-center text-[10.5px]">
                    <div className="w-60 text-center">
                      <div className="text-slate-800 font-bold mb-1">Mengetahui,</div>
                      <div className="text-slate-800 font-bold mb-14">Kepala SMP Negeri 7 Pasuruan</div>
                      <div className="font-black text-slate-900 underline uppercase tracking-tight">{kepsekName}</div>
                      <div className="text-[9.5px] text-slate-600 font-medium">NIP. {kepsekNip}</div>
                    </div>

                    <div className="w-60 text-center">
                      <div className="text-slate-800 font-medium mb-1">{docDate}</div>
                      <div className="text-slate-800 font-bold mb-14">
                        {filterGuru !== 'semua' ? 'Guru Mata Pelajaran' : 'Koordinator Pembelajaran / Kurikulum'}
                      </div>
                      <div className="font-black text-slate-900 underline uppercase tracking-tight">
                        {filterGuru !== 'semua' ? filterGuru : '................................................'}
                      </div>
                      <div className="text-[9.5px] text-slate-600 font-medium">NIP. ....................................</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
