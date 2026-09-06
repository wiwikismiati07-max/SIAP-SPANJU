import React from 'react';
import { X, Printer, Calendar, Clock, BookOpen, User, Users, CheckCircle2, AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react';
import { JurnalPembelajaran } from '../../types/jurnalpembelajaran';

interface JurnalDetailModalProps {
  jurnal: JurnalPembelajaran | null;
  onClose: () => void;
  onEdit?: (jurnal: JurnalPembelajaran) => void;
}

export const JurnalDetailModal: React.FC<JurnalDetailModalProps> = ({ jurnal, onClose, onEdit }) => {
  if (!jurnal) return null;

  const totalHadir = jurnal.siswa_list.filter(s => s.absensi === 'Hadir').length;
  const totalSakit = jurnal.siswa_list.filter(s => s.absensi === 'Sakit').length;
  const totalIzin = jurnal.siswa_list.filter(s => s.absensi === 'Izin').length;
  const totalAlpa = jurnal.siswa_list.filter(s => s.absensi === 'Alpa').length;

  const handlePrint = () => {
    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Jurnal Pembelajaran - Kelas ${jurnal.kelas} (${jurnal.tanggal})</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #1e293b; font-size: 11px; line-height: 1.4; }
            .kop-header { display: flex; align-items: center; gap: 15px; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px; }
            .kop-header img { width: 70px; height: 70px; object-fit: contain; }
            .kop-text { flex: 1; text-align: center; }
            .kop-text h4 { margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .kop-text h2 { margin: 2px 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0284c7; }
            .kop-text p { margin: 1px 0; font-size: 9px; color: #334155; }
            .title-section { text-align: center; margin-bottom: 14px; }
            .title-section h3 { margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; text-decoration: underline; }
            .meta-table { width: 100%; margin-bottom: 14px; border-collapse: collapse; font-size: 11px; }
            .meta-table td { padding: 3px 6px; vertical-align: top; }
            .meta-label { font-weight: bold; width: 140px; color: #334155; }
            table.data { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5px; }
            table.data th, table.data td { border: 1px solid #94a3b8; padding: 5px 7px; text-align: left; }
            table.data th { background-color: #f1f5f9; font-weight: bold; font-size: 10px; text-align: center; text-transform: uppercase; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; }
            .hadir { background: #dcfce7; color: #15803d; }
            .sakit { background: #fef9c3; color: #a16207; }
            .izin { background: #dbeafe; color: #1d4ed8; }
            .alpa { background: #fee2e2; color: #b91c1c; }
            .summary { margin-top: 14px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-weight: bold; }
            .signature { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .signature-box { text-align: center; width: 220px; font-size: 11px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="kop-header">
            <img src="https://iili.io/KDFk4fI.png" alt="Logo SMPN 7" />
            <div class="kop-text">
              <h4>Pemerintah Kota Pasuruan</h4>
              <h4>Dinas Pendidikan dan Kebudayaan</h4>
              <h2>SMP Negeri 7 Pasuruan</h2>
              <p>Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur 67139 | Telp: (0343) 426845</p>
              <p style="color: #0284c7; font-style: italic;">Pos-el: smp7pas@yahoo.co.id | Laman: www.smpn7pasuruan.sch.id</p>
            </div>
          </div>

          <div class="title-section">
            <h3>Jurnal Agenda Pembelajaran Guru</h3>
          </div>

          <table class="meta-table">
            <tr>
              <td class="meta-label">Hari / Tanggal</td>
              <td>: ${jurnal.hari ? `${jurnal.hari}, ` : ''}${jurnal.tanggal}</td>
              <td class="meta-label">Kelas / Periode</td>
              <td>: Kelas ${jurnal.kelas} ${jurnal.periode ? `(Periode ${jurnal.periode})` : ''}</td>
            </tr>
            <tr>
              <td class="meta-label">Jam Ke / Waktu</td>
              <td>: ${jurnal.jam_ke} (${jurnal.jam_mulai} - ${jurnal.jam_selesai})</td>
              <td class="meta-label">Mata Pelajaran</td>
              <td>: ${jurnal.nama_mapel}</td>
            </tr>
            <tr>
              <td class="meta-label">Guru Pengajar</td>
              <td>: ${jurnal.nama_guru}</td>
              <td class="meta-label">Materi</td>
              <td>: ${jurnal.materi}</td>
            </tr>
            ${jurnal.kegiatan ? `
            <tr>
              <td class="meta-label">Uraian Kegiatan</td>
              <td colspan="3">: ${jurnal.kegiatan}</td>
            </tr>` : ''}
          </table>

          <div class="summary">
            <strong>Ringkasan Presensi Siswa:</strong> 
            Total: ${jurnal.siswa_list.length} Siswa | 
            Hadir: ${totalHadir} | 
            Sakit: ${totalSakit} | 
            Izin: ${totalIzin} | 
            Alpa: ${totalAlpa}
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
              <p style="font-size: 10px;">NIP. ....................................</p>
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
