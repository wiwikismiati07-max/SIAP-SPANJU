import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Image as ImageIcon,
  Check,
  ExternalLink,
  Filter,
  Sliders,
  Sparkles
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
  const [signerRole, setSignerRole] = useState<string>(
    filterGuru !== 'semua' ? 'Guru Mata Pelajaran' : 'Koordinator Pembelajaran / Guru'
  );
  const [signerName, setSignerName] = useState<string>(
    filterGuru !== 'semua' ? filterGuru : '................................................'
  );
  const [signerNip, setSignerNip] = useState<string>('NIP. ....................................');

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

  // 1. Calculate Aggregates
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

  // 2. Absence Records (Sakit, Izin, Alpa)
  const absensiRecords: {
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
        absensiRecords.push({
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

  // 3. Student Notes & Actions
  const catatanRecords: {
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
        catatanRecords.push({
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

  // 4. Grouped Student Notes
  const studentNoteMap = new Map<string, {
    nama: string;
    kelas: string;
    count: number;
    notes: { tanggal: string; mapel: string; catatan: string; tindakan: string }[];
  }>();

  catatanRecords.forEach(c => {
    const key = `${c.nama_siswa}_${c.kelas}`;
    if (!studentNoteMap.has(key)) {
      studentNoteMap.set(key, {
        nama: c.nama_siswa,
        kelas: c.kelas,
        count: 0,
        notes: []
      });
    }
    const item = studentNoteMap.get(key)!;
    item.count++;
    item.notes.push({
      tanggal: c.tanggal,
      mapel: c.mapel,
      catatan: c.catatan,
      tindakan: c.tindakan
    });
  });

  const studentsWithSpecialAttention = Array.from(studentNoteMap.values()).sort((a, b) => b.count - a.count);

  // 5. Gather All Photos
  const allPhotos: { foto: string; tanggal: string; kelas: string; mapel: string; materi: string }[] = [];
  jurnalList.forEach(j => {
    if (j.foto_kegiatan && Array.isArray(j.foto_kegiatan)) {
      j.foto_kegiatan.forEach(foto => {
        if (foto && typeof foto === 'string') {
          allPhotos.push({
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

  // Standalone Isolated Printing Function (Prevents App UI/Sidebar from Printing and enables full multi-page flow)
  const triggerIsolatedPrint = (inNewWindow = false) => {
    const printContent = document.getElementById('printable-full-report');
    if (!printContent) {
      window.print();
      return;
    }

    // Grab all stylesheets and style tags currently loaded in document
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    const htmlDoc = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Laporan Jurnal Pembelajaran - SMPN 7 Pasuruan</title>
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
              font-size: 10.5px !important;
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
              page-break-after: auto !important;
            }
            thead {
              display: table-header-group !important;
            }
            tfoot {
              display: table-footer-group !important;
            }
            .avoid-break {
              page-break-inside: avoid !important;
            }
            .page-break {
              page-break-before: always !important;
            }
            /* High-contrast printable borders */
            .border-slate-300 { border-color: #94a3b8 !important; }
            .border-slate-200 { border-color: #cbd5e1 !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
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

    // Default: print using isolated hidden iframe
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

  // Print Action
  const handlePrint = () => {
    triggerIsolatedPrint(false);
  };

  // Open in New Window Action
  const handleOpenNewWindow = () => {
    triggerIsolatedPrint(true);
  };

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
                  Cetak Dokumen Laporan Lengkap
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                  Resmi SMPN 7
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Format lengkap, rapi, dan mudah dipahami dengan Kop Sekolah & Lembar Pengesahan
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewWindow}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
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
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors ml-1"
              title="Tutup Pratinjau"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR: MODE SELECTOR & OPTIONS */}
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Report Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportMode('semua')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                reportMode === 'semua' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={13} className="text-amber-500" /> 🌟 Laporan Utuh & Lengkap (Semua Data)
            </button>
            <button
              onClick={() => setReportMode('mingguan_bulanan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportMode === 'mingguan_bulanan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda Mengajar
            </button>
            <button
              onClick={() => setReportMode('absensi')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportMode === 'absensi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Siswa Absensi ({absensiRecords.length})
            </button>
            <button
              onClick={() => setReportMode('catatan_tindakan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportMode === 'catatan_tindakan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catatan & Tindakan ({catatanRecords.length})
            </button>
            <button
              onClick={() => setReportMode('siswa_bercatatan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportMode === 'siswa_bercatatan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Siswa Bercatatan ({studentsWithSpecialAttention.length})
            </button>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-4 text-slate-600 font-semibold">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeStats} 
                onChange={e => setIncludeStats(e.target.checked)} 
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Statistik Kehadiran</span>
            </label>

            {reportMode === 'semua' && allPhotos.length > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includePhotos} 
                  onChange={e => setIncludePhotos(e.target.checked)} 
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Foto Dokumentasi ({allPhotos.length})</span>
              </label>
            )}

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeSignatures} 
                onChange={e => setIncludeSignatures(e.target.checked)} 
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Lembar Pengesahan</span>
            </label>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (PRINTABLE AREA) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200/80 print:p-0 print:m-0 print:overflow-visible print:bg-white print:h-auto">
        <div 
          id="printable-full-report"
          className="bg-white mx-auto max-w-[215mm] min-h-[297mm] p-8 md:p-12 shadow-2xl rounded-sm text-slate-900 text-[11px] leading-relaxed border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none print:min-h-0"
        >
          {/* 1. KOP SURAT RESMI SEKOLAH */}
          <div className="flex items-center gap-4 border-b-2 border-black pb-3 mb-4">
            <img 
              src="https://iili.io/KDFk4fI.png" 
              alt="Logo SMPN 7 Pasuruan" 
              className="w-20 h-20 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 text-center">
              <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider m-0 leading-tight">
                Pemerintah Kota Pasuruan
              </h4>
              <h4 className="text-[12px] font-bold text-slate-800 uppercase tracking-wider m-0 leading-tight">
                Dinas Pendidikan dan Kebudayaan
              </h4>
              <h2 className="text-[19px] font-black text-blue-700 uppercase tracking-wide m-0 my-0.5 leading-tight">
                SMP Negeri 7 Pasuruan
              </h2>
              <p className="text-[9.5px] font-normal text-slate-600 m-0 leading-tight">
                Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur 67139 | Telp: (0343) 426845
              </p>
              <p className="text-[9.5px] font-medium text-blue-600 italic m-0 leading-tight">
                Pos-el: smp7pas@yahoo.co.id | Laman: www.smpn7pasuruan.sch.id
              </p>
            </div>
          </div>

          {/* 2. JUDUL DOKUMEN & RENTANG LAPORAN */}
          <div className="text-center mb-5">
            <h3 className="text-[15px] font-black uppercase tracking-wider underline decoration-slate-900 underline-offset-4 m-0">
              {reportMode === 'semua' && 'BUKU LAPORAN JURNAL PEMBELAJARAN, EVALUASI & PRESENSI SISWA'}
              {reportMode === 'mingguan_bulanan' && 'LAPORAN REKAPITULASI AGENDA PEMBELAJARAN (KBM)'}
              {reportMode === 'absensi' && 'LAPORAN REKAPITULASI KETIDAKHADIRAN SISWA (SAKIT, IZIN, ALPA)'}
              {reportMode === 'catatan_tindakan' && 'LAPORAN EVALUASI PERILAKU SISWA DAN TINDAKAN GURU'}
              {reportMode === 'siswa_bercatatan' && 'LAPORAN DAFTAR SISWA DENGAN CATATAN KHUSUS'}
            </h3>
            <p className="text-[10.5px] font-semibold text-slate-600 mt-1">
              Periode: {filterPeriode !== 'semua' ? `Tahun Ajaran ${filterPeriode}` : 'Semua Periode / Tahun Ajaran'} 
              {' '}| Rentang Tanggal: {formatDateIndo(startDate)} s.d. {formatDateIndo(endDate)}
            </p>
          </div>

          {/* 3. INFORMASI ATRIBUT FILTER / KELAS / MAPEL */}
          <table className="w-full mb-4 text-[10.5px] border-collapse">
            <tbody>
              <tr>
                <td className="w-32 font-bold py-0.5 text-slate-700">Kelas</td>
                <td className="w-2 py-0.5">:</td>
                <td className="py-0.5 font-semibold text-slate-900">{filterKelas !== 'semua' ? `Kelas ${filterKelas}` : 'Semua Kelas (VII, VIII, IX)'}</td>
                <td className="w-36 font-bold py-0.5 text-slate-700">Mata Pelajaran</td>
                <td className="w-2 py-0.5">:</td>
                <td className="py-0.5 font-semibold text-slate-900">{filterMapel !== 'semua' ? filterMapel : 'Semua Mata Pelajaran'}</td>
              </tr>
              <tr>
                <td className="font-bold py-0.5 text-slate-700">Guru Pengajar</td>
                <td className="py-0.5">:</td>
                <td className="py-0.5 font-semibold text-slate-900">{filterGuru !== 'semua' ? filterGuru : 'Semua Guru Pengajar'}</td>
                <td className="font-bold py-0.5 text-slate-700">Total Tatap Muka</td>
                <td className="py-0.5">:</td>
                <td className="py-0.5 font-bold text-slate-900">{jurnalList.length} Pertemuan Pembelajaran</td>
              </tr>
            </tbody>
          </table>

          {/* 4. RINGKASAN EKSEKUTIF & STATISTIK PRESENSI (IF ENABLED) */}
          {includeStats && (
            <div className="mb-5 p-3 rounded bg-slate-50 border border-slate-300">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>Ringkasan Statistik Kehadiran & Pembelajaran:</span>
                <span className="text-[10px] font-black text-emerald-700">Tingkat Kehadiran: {persenKehadiran}%</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                <div className="p-1.5 bg-white border border-slate-200 rounded">
                  <div className="text-slate-500 font-semibold">Total Tatap Muka</div>
                  <div className="text-sm font-black text-slate-800">{jurnalList.length} Pertemuan</div>
                </div>
                <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded">
                  <div className="text-emerald-700 font-semibold">Hadir</div>
                  <div className="text-sm font-black text-emerald-800">{totalHadir}</div>
                </div>
                <div className="p-1.5 bg-amber-50 border border-amber-200 rounded">
                  <div className="text-amber-700 font-semibold">Sakit (S)</div>
                  <div className="text-sm font-black text-amber-800">{totalSakit}</div>
                </div>
                <div className="p-1.5 bg-sky-50 border border-sky-200 rounded">
                  <div className="text-sky-700 font-semibold">Izin (I)</div>
                  <div className="text-sm font-black text-sky-800">{totalIzin}</div>
                </div>
                <div className="p-1.5 bg-rose-50 border border-rose-200 rounded">
                  <div className="text-rose-700 font-semibold">Alpa / Tanpa Keterangan (A)</div>
                  <div className="text-sm font-black text-rose-800">{totalAlpa}</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION A: REKAPITULASI AGENDA PEMBELAJARAN (KBM) */}
          {/* ========================================================================= */}
          {(reportMode === 'semua' || reportMode === 'mingguan_bulanan') && (
            <div className="mb-6">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-amber-500 flex justify-between items-center">
                <span>{reportMode === 'semua' ? 'A. DAFTAR AGENDA JURNAL PEMBELAJARAN GURU' : 'DAFTAR AGENDA JURNAL PEMBELAJARAN GURU'}</span>
                <span className="text-[10px] font-normal text-slate-500">({jurnalList.length} Pertemuan)</span>
              </div>

              {jurnalList.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-300 text-center text-slate-500 italic text-xs">
                  Tidak ada agenda jurnal pembelajaran yang sesuai dengan kriteria filter.
                </div>
              ) : (
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center w-6">No</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-left w-20">Tanggal & Jam</th>
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center w-14">Kelas</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-left w-24">Mata Pelajaran</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-left w-28">Guru Pengajar</th>
                      <th className="border border-slate-300 px-2 py-1.5 text-left">Materi & Kegiatan</th>
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center w-14">Presensi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jurnalList.map((j, idx) => {
                      const hadir = j.siswa_list?.filter(s => s.absensi === 'Hadir').length || 0;
                      const sakit = j.siswa_list?.filter(s => s.absensi === 'Sakit').length || 0;
                      const izin = j.siswa_list?.filter(s => s.absensi === 'Izin').length || 0;
                      const alpa = j.siswa_list?.filter(s => s.absensi === 'Alpa').length || 0;

                      return (
                        <tr key={j.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-medium">{idx + 1}</td>
                          <td className="border border-slate-300 px-2 py-1">
                            <div className="font-bold text-slate-800">{j.tanggal}</div>
                            <div className="text-[8.5px] text-slate-500 font-mono">Jam ke-{j.jam_ke}</div>
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-800">
                            {j.kelas}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">
                            {j.nama_mapel}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-700">
                            {j.nama_guru}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            <div className="font-bold text-slate-900">{j.materi}</div>
                            {j.kegiatan && (
                              <div className="text-[9px] text-slate-600 mt-0.5 line-clamp-2">{j.kegiatan}</div>
                            )}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-[8.5px]">
                            <span className="text-emerald-700 font-bold" title="Hadir">{hadir}H</span>{' '}
                            {sakit > 0 && <span className="text-amber-700 font-bold" title="Sakit">{sakit}S </span>}
                            {izin > 0 && <span className="text-sky-700 font-bold" title="Izin">{izin}I </span>}
                            {alpa > 0 && <span className="text-rose-700 font-bold" title="Alpa">{alpa}A</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION B: REKAPITULASI SISWA TIDAK HADIR (SAKIT, IZIN, ALPA) */}
          {/* ========================================================================= */}
          {(reportMode === 'semua' || reportMode === 'absensi') && (
            <div className="mb-6">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-rose-500 flex justify-between items-center">
                <span>{reportMode === 'semua' ? 'B. REKAPITULASI SISWA TIDAK HADIR (SAKIT, IZIN, ALPA)' : 'REKAPITULASI SISWA TIDAK HADIR'}</span>
                <span className="text-[10px] font-normal text-slate-500">({absensiRecords.length} Catatan Presensi)</span>
              </div>

              {absensiRecords.length === 0 ? (
                <div className="p-3 border border-slate-200 rounded text-center text-slate-500 text-xs italic bg-slate-50">
                  Nihil — Seluruh siswa hadir 100% pada rentang pertemuan yang dipilih.
                </div>
              ) : (
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-6">No</th>
                      <th className="border border-slate-300 px-2 py-1 text-left w-20">Tanggal</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-12">Kelas</th>
                      <th className="border border-slate-300 px-2 py-1 text-left w-28">Mata Pelajaran</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">Nama Siswa</th>
                      <th className="border border-slate-300 px-2 py-1 text-center w-16">Status</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absensiRecords.map((r, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 px-1.5 py-1 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1 font-mono text-[9px]">{r.tanggal}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold">{r.kelas}</td>
                        <td className="border border-slate-300 px-2 py-1">{r.mapel}</td>
                        <td className="border border-slate-300 px-2 py-1 font-bold text-slate-800">
                          {r.nama_siswa}
                          {r.nis && <span className="text-[8px] text-slate-400 font-normal ml-1">({r.nis})</span>}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
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

          {/* ========================================================================= */}
          {/* SECTION C: REKAPITULASI CATATAN EVALUASI & TINDAKAN GURU */}
          {/* ========================================================================= */}
          {(reportMode === 'semua' || reportMode === 'catatan_tindakan') && (
            <div className="mb-6">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-sky-500 flex justify-between items-center">
                <span>{reportMode === 'semua' ? 'C. REKAPITULASI CATATAN EVALUASI SISWA & TINDAK LANJUT GURU' : 'REKAPITULASI CATATAN EVALUASI SISWA & TINDAKAN GURU'}</span>
                <span className="text-[10px] font-normal text-slate-500">({catatanRecords.length} Catatan Evaluasi)</span>
              </div>

              {catatanRecords.length === 0 ? (
                <div className="p-3 border border-slate-200 rounded text-center text-slate-500 text-xs italic bg-slate-50">
                  Nihil — Tidak ada catatan khusus atau pelanggaran perilaku pada rentang data ini.
                </div>
              ) : (
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-6">No</th>
                      <th className="border border-slate-300 px-2 py-1 text-left w-20">Tanggal</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-12">Kelas</th>
                      <th className="border border-slate-300 px-2 py-1 text-left w-24">Mapel</th>
                      <th className="border border-slate-300 px-2 py-1 text-left w-32">Nama Siswa</th>
                      <th className="border border-slate-300 px-1 py-1 text-center w-10">Nilai</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">Catatan / Kendala Siswa</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">Tindakan / Solusi Guru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catatanRecords.map((c, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 px-1.5 py-1 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1 font-mono text-[9px]">{c.tanggal}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold">{c.kelas}</td>
                        <td className="border border-slate-300 px-2 py-1">{c.mapel}</td>
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

          {/* ========================================================================= */}
          {/* SECTION D: DAFTAR SISWA YANG MEMERLUKAN PERHATIAN KHUSUS */}
          {/* ========================================================================= */}
          {(reportMode === 'semua' || reportMode === 'siswa_bercatatan') && (
            <div className="mb-6">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-1.5 bg-slate-100 p-1.5 border-l-4 border-amber-600 flex justify-between items-center">
                <span>{reportMode === 'semua' ? 'D. DAFTAR SISWA DENGAN CATATAN KHUSUS (PERHATIAN WALI KELAS & BK)' : 'DAFTAR SISWA DENGAN CATATAN KHUSUS'}</span>
                <span className="text-[10px] font-normal text-slate-500">({studentsWithSpecialAttention.length} Siswa Teridentifikasi)</span>
              </div>

              {studentsWithSpecialAttention.length === 0 ? (
                <div className="p-3 border border-slate-200 rounded text-center text-slate-500 text-xs italic bg-slate-50">
                  Nihil — Seluruh siswa terpantau kondusif dan tidak memerlukan penanganan khusus.
                </div>
              ) : (
                <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase">
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-6">No</th>
                      <th className="border border-slate-300 px-2 py-1 text-left w-36">Nama Siswa</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-14">Kelas</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-center w-16">Total Catatan</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">Rincian Catatan & Rekomendasi Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsWithSpecialAttention.map((s, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 px-1.5 py-1 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1 font-bold text-slate-900">{s.nama}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold">{s.kelas}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center">
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-black rounded text-[9px] border border-amber-300">
                            {s.count}x
                          </span>
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <ul className="list-disc list-inside space-y-0.5 text-[9px]">
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
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION E: DOKUMENTASI FOTO KEGIATAN PEMBELAJARAN (IF INCLUDED) */}
          {/* ========================================================================= */}
          {includePhotos && reportMode === 'semua' && allPhotos.length > 0 && (
            <div className="mb-6">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-2 bg-slate-100 p-1.5 border-l-4 border-emerald-600 flex justify-between items-center">
                <span>E. DOKUMENTASI FOTO KEGIATAN BELAJAR MENGAJAR (KBM)</span>
                <span className="text-[10px] font-normal text-slate-500">({allPhotos.length} Foto Terlampir)</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {allPhotos.slice(0, 9).map((p, idx) => (
                  <div key={idx} className="border border-slate-300 p-1.5 rounded bg-white text-center">
                    <img 
                      src={p.foto} 
                      alt={`Dokumentasi ${idx + 1}`} 
                      className="w-full h-28 object-cover rounded border border-slate-200"
                    />
                    <div className="text-[8.5px] font-bold text-slate-800 mt-1 line-clamp-1">{p.mapel} - {p.kelas}</div>
                    <div className="text-[8px] text-slate-500">{p.tanggal}</div>
                    <div className="text-[8px] text-slate-600 italic line-clamp-1">{p.materi}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LEMBAR PENGESAHAN / TANDA TANGAN RESMI */}
          {/* ========================================================================= */}
          {includeSignatures && (
            <div className="mt-8 pt-4 border-t border-slate-300">
              <div className="flex justify-between items-start text-center text-[10.5px]">
                {/* Kolom Kiri: Kepala Sekolah */}
                <div className="w-60 text-center">
                  <div className="text-slate-800 font-bold mb-1">Mengetahui,</div>
                  <div className="text-slate-800 font-bold mb-14">Kepala SMP Negeri 7 Pasuruan</div>
                  <div className="font-black text-slate-900 underline uppercase tracking-tight">{kepsekName}</div>
                  <div className="text-[9.5px] text-slate-600 font-medium">NIP. {kepsekNip}</div>
                </div>

                {/* Kolom Kanan: Guru Pengajar / Penandatangan */}
                <div className="w-60 text-center">
                  <div className="text-slate-800 font-medium mb-1">{docDate}</div>
                  <div className="text-slate-800 font-bold mb-14">{signerRole}</div>
                  <div className="font-black text-slate-900 underline uppercase tracking-tight">{signerName}</div>
                  <div className="text-[9.5px] text-slate-600 font-medium">{signerNip}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
