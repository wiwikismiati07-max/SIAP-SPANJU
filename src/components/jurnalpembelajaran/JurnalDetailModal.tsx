import React, { useEffect, useState } from 'react';
import { X, Printer, Calendar, Clock, BookOpen, User, Users, CheckCircle2, AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react';
import { JurnalPembelajaran } from '../../types/jurnalpembelajaran';
import { fetchGuruList } from '../../lib/jurnalService';

interface JurnalDetailModalProps {
  jurnal: JurnalPembelajaran | null;
  onClose: () => void;
  onEdit?: (jurnal: JurnalPembelajaran) => void;
}

export const JurnalDetailModal: React.FC<JurnalDetailModalProps> = ({ jurnal, onClose, onEdit }) => {
  const [guruMasterList, setGuruMasterList] = useState<{ id: string; nama_guru: string; nip?: string }[]>([]);

  useEffect(() => {
    if (jurnal) {
      fetchGuruList().then((data) => {
        if (data) setGuruMasterList(data);
      }).catch(console.error);
    }
  }, [jurnal]);

  if (!jurnal) return null;

  const totalHadir = jurnal.siswa_list.filter(s => s.absensi === 'Hadir').length;
  const totalSakit = jurnal.siswa_list.filter(s => s.absensi === 'Sakit').length;
  const totalIzin = jurnal.siswa_list.filter(s => s.absensi === 'Izin').length;
  const totalAlpa = jurnal.siswa_list.filter(s => s.absensi === 'Alpa').length;

  const handlePrint = () => {
    let teacherNip = '....................................';
    if (jurnal.nama_guru) {
      const searchName = jurnal.nama_guru.trim().toLowerCase();
      const primaryGuru = guruMasterList.find(g => g.nama_guru?.trim().toLowerCase() === searchName);
      if (primaryGuru && primaryGuru.nip && primaryGuru.nip.trim() !== '') {
        teacherNip = primaryGuru.nip;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Jurnal Pembelajaran - Kelas ${jurnal.kelas} (${jurnal.tanggal})</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: Arial, sans-serif; margin: 0; color: #1e293b; font-size: 11px; line-height: 1.4; }
            .kop-header { display: flex; align-items: center; gap: 15px; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px; }
            .kop-header img { width: 70px; height: 70px; object-fit: contain; }
            .kop-text { flex: 1; text-align: center; }
            .kop-text h4 { margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .kop-text h2 { margin: 2px 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0284c7; }
            .kop-text p { margin: 1px 0; font-size: 9px; color: #334155; }
            .title-section { text-align: center; margin-bottom: 14px; }
            .title-section h3 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; text-decoration: underline; color: #0f172a; }
            
            .info-cards { display: flex; gap: 10px; margin-bottom: 14px; }
            .info-card { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid; }
            .info-card.yellow { background-color: #fffbeb; border-color: #fef3c7; }
            .info-card.blue { background-color: #f0f9ff; border-color: #e0f2fe; }
            .info-card.green { background-color: #f0fdf4; border-color: #dcfce7; }
            .card-title { font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
            .info-card.yellow .card-title { color: #92400e; }
            .info-card.blue .card-title { color: #0369a1; }
            .info-card.green .card-title { color: #166534; }
            .card-value { font-size: 13px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
            .card-desc { font-size: 10px; color: #475569; }
            
            .kegiatan-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; margin-bottom: 14px; }
            .kegiatan-title { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            
            table.data { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; font-size: 10.5px; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; }
            table.data th, table.data td { border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
            table.data th:last-child, table.data td:last-child { border-right: none; }
            table.data tr:last-child td { border-bottom: none; }
            table.data th { background-color: #f1f5f9; font-weight: bold; font-size: 10px; text-align: center; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            
            .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 9.5px; text-align: center; }
            .hadir { background: #dcfce7; color: #15803d; }
            .sakit { background: #fef3c7; color: #b45309; }
            .izin { background: #dbeafe; color: #1d4ed8; }
            .alpa { background: #fee2e2; color: #b91c1c; }
            
            .summary { margin-top: 14px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
            .summary-title { font-weight: bold; color: #475569; font-size: 10.5px; text-transform: uppercase; }
            .summary-stats { display: flex; gap: 8px; }
            
            .signature { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .signature-box { text-align: center; width: 220px; font-size: 11px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px;">
            <img src="https://i.ibb.co.com/C3Y7JXkN/logo-dinas.png" style="width: 65px; height: 65px; object-fit: contain;" alt="Logo Dinas" />
            <div style="text-align: center; flex: 1; padding: 0 10px;">
              <h4 style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase;">Pemerintah Kota Pasuruan • Dinas Pendidikan dan Kebudayaan</h4>
              <h2 style="margin: 2px 0; font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0369a1;">SMP Negeri 7 Pasuruan</h2>
              <p style="margin: 1px 0; font-size: 8.5px; color: #334155;">Jl. KH. Achmad Dahlan No. 58, Telp. (0343) 424364 Pasuruan, Jawa Timur 67126</p>
              <p style="margin: 1px 0; font-size: 8.5px; color: #0369a1; font-style: italic;">Pos-el: smpn7pasuruan@gmail.com | Laman: smpn7pasuruan.sch.id</p>
            </div>
            <img src="https://iili.io/KDFk4fI.png" style="width: 65px; height: 65px; object-fit: contain;" alt="Logo SMPN 7" />
          </div>

          <div class="title-section">
            <h3>Jurnal Pembelajaran Guru</h3>
          </div>

          <div class="info-cards">
            <div class="info-card yellow">
              <div class="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                Mata Pelajaran & Materi
              </div>
              <div class="card-value">${jurnal.nama_mapel}</div>
              <div class="card-desc">Materi: <strong>${jurnal.materi}</strong></div>
            </div>

            <div class="info-card blue">
              <div class="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Guru & Kelas
              </div>
              <div class="card-value">${jurnal.nama_guru}</div>
              <div class="card-desc">Kelas: <strong>${jurnal.kelas}</strong> ${jurnal.periode ? `<span style="background: #fef3c7; color: #92400e; padding: 2px 4px; border-radius: 4px; border: 1px solid #fde68a; font-weight: bold; font-size: 8px;">Periode ${jurnal.periode}</span>` : ''}</div>
            </div>

            <div class="info-card green">
              <div class="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Waktu & Tanggal
              </div>
              <div class="card-value">${jurnal.jam_ke}</div>
              <div class="card-desc">${jurnal.jam_mulai} - ${jurnal.jam_selesai} • ${jurnal.hari ? `${jurnal.hari}, ` : ''}${jurnal.tanggal}</div>
            </div>
          </div>

          ${jurnal.kegiatan ? `
          <div class="kegiatan-box">
            <div class="kegiatan-title">Uraian Kegiatan</div>
            <div>${jurnal.kegiatan}</div>
          </div>` : ''}

          <div class="summary">
            <div class="summary-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Ringkasan Kehadiran (${jurnal.siswa_list.length} Siswa)
            </div>
            <div class="summary-stats">
              <div class="badge hadir">Hadir: ${totalHadir}</div>
              <div class="badge sakit">Sakit: ${totalSakit}</div>
              <div class="badge izin">Izin: ${totalIzin}</div>
              <div class="badge alpa">Alpa: ${totalAlpa}</div>
            </div>
          </div>

          ${jurnal.foto_kegiatan && jurnal.foto_kegiatan.length > 0 ? `
            <div style="margin-top: 14px; page-break-inside: avoid;">
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; color: #334155;">Foto Dokumentasi Kegiatan Pembelajaran:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${jurnal.foto_kegiatan.map(foto => `
                  <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; background: #f8fafc; width: 140px; text-align: center;">
                    <img src="${foto}" style="width: 130px; height: 80px; object-fit: cover; border-radius: 4px;" alt="Dokumentasi" />
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <table class="data">
            <thead>
              <tr>
                <th style="width: 25px;">No</th>
                <th style="text-align: left;">Nama Siswa</th>
                <th style="width: 60px;">Presensi</th>
                <th style="width: 45px;">Nilai</th>
                <th style="text-align: left;">Catatan Perilaku / Kendala</th>
                <th style="text-align: left;">Tindakan / Solusi Guru</th>
              </tr>
            </thead>
            <tbody>
              ${jurnal.siswa_list.map((s, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${s.nama}</strong>${s.nis ? ` <span style="font-size: 8px; color: #64748b;">(${s.nis})</span>` : ''}</td>
                  <td style="text-align: center;">
                    <span class="badge ${s.absensi.toLowerCase()}">${s.absensi}</span>
                  </td>
                  <td style="text-align: center; font-weight: bold;">${s.nilai || '-'}</td>
                  <td>${s.catatan_siswa || '-'}</td>
                  <td>${s.tindakan || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signature">
            <div class="signature-box">
              <p>Mengetahui,</p>
              <p style="font-weight: bold;">Kepala SMP Negeri 7 Pasuruan</p>
              <br/><br/><br/>
              <p style="font-weight: bold; text-decoration: underline;">NUR FADILAH, S.Pd</p>
              <p style="font-size: 10px;">NIP. 19860410 201001 2 030</p>
            </div>
            <div class="signature-box">
              <p>Pasuruan, ${jurnal.tanggal}</p>
              <p style="font-weight: bold;">Guru Mata Pelajaran,</p>
              <br/><br/><br/>
              <p style="font-weight: bold; text-decoration: underline;">${jurnal.nama_guru}</p>
              <p style="font-size: 10px;">NIP. ${teacherNip}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback using invisible iframe for iframe sandboxes
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }, 500);
      }
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-black">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Detail Jurnal Pembelajaran</h3>
              <p className="text-xs text-amber-100 font-medium">
                Kelas {jurnal.kelas} {jurnal.periode ? `• Periode ${jurnal.periode}` : ''} • {jurnal.tanggal}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer size={16} /> Cetak Jurnal
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Main Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100/80">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-1">
                <BookOpen size={14} /> Mata Pelajaran & Materi
              </div>
              <div className="text-base font-black text-slate-900">{jurnal.nama_mapel}</div>
              <div className="text-xs text-slate-600 font-medium mt-1">Materi: <span className="font-semibold text-slate-800">{jurnal.materi}</span></div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/80">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-wider mb-1">
                <User size={14} /> Guru & Kelas
              </div>
              <div className="text-base font-black text-slate-900">{jurnal.nama_guru}</div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                Kelas: <span className="font-bold text-blue-700">{jurnal.kelas}</span> {jurnal.periode ? <span className="ml-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Periode {jurnal.periode}</span> : null}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
                <Clock size={14} /> Waktu & Tanggal
              </div>
              <div className="text-base font-black text-slate-900">{jurnal.jam_ke}</div>
              <div className="text-xs text-slate-600 font-medium mt-1">{jurnal.jam_mulai} - {jurnal.jam_selesai} • {jurnal.tanggal}</div>
            </div>
          </div>

          {/* Presensi Statistics */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Users size={16} className="text-slate-400" /> Ringkasan Kehadiran ({jurnal.siswa_list.length} Siswa)
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-xs font-black">
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
                Hadir: {totalHadir}
              </span>
              <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl border border-amber-200">
                Sakit: {totalSakit}
              </span>
              <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-xl border border-blue-200">
                Izin: {totalIzin}
              </span>
              <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-xl border border-rose-200">
                Alpa: {totalAlpa}
              </span>
            </div>
          </div>

          {/* Activity Photos */}
          {jurnal.foto_kegiatan && jurnal.foto_kegiatan.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ImageIcon size={15} /> Foto Dokumentasi Kegiatan Pembelajaran
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {jurnal.foto_kegiatan.map((foto, fIdx) => (
                  <a
                    key={fIdx}
                    href={foto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 block hover:shadow-md transition-shadow"
                  >
                    <img
                      src={foto}
                      alt={`Dokumentasi ${fIdx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      Lihat Foto
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Student Table */}
          <div>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={15} /> Daftar Siswa, Nilai, Presensi & Catatan Tindakan
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center w-24">Presensi</th>
                    <th className="p-3 text-center w-20">Nilai</th>
                    <th className="p-3">Catatan Siswa</th>
                    <th className="p-3">Tindakan Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jurnal.siswa_list.map((s, idx) => (
                    <tr key={s.siswa_id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 flex items-center flex-wrap gap-1.5">
                          <span>{s.nama}</span>
                          {s.sudah_izin && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                              {s.keterangan_izin || 'Izin Form'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {s.nis && <span>NIS: {s.nis}</span>}
                          {s.periode && <span className="text-amber-700 bg-amber-50 px-1 rounded">Thn {s.periode}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-[11px] ${
                          s.absensi === 'Hadir' ? 'bg-emerald-100 text-emerald-700' :
                          s.absensi === 'Sakit' ? 'bg-amber-100 text-amber-700' :
                          s.absensi === 'Izin' ? 'bg-blue-100 text-blue-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {s.absensi}
                        </span>
                      </td>
                      <td className="p-3 text-center font-black text-slate-700">
                        {s.nilai !== '' && s.nilai !== undefined ? s.nilai : '-'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {s.catatan_siswa ? (
                          <span className="font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block">
                            {s.catatan_siswa}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {s.tindakan ? (
                          <span className="font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 inline-block">
                            {s.tindakan}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Dibuat pada: {new Date(jurnal.created_at).toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(jurnal);
                  onClose();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Edit Jurnal Ini
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
