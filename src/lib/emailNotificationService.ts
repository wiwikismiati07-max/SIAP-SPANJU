import { JurnalPembelajaran } from '../types/jurnalpembelajaran';

export const PRIMARY_NOTIF_EMAIL = 'wiwikismiati07@gmail.com';

export interface EmailNotifResult {
  success: boolean;
  delivered?: boolean;
  needsActivation?: boolean;
  recipient: string;
  method?: 'smtp' | 'formsubmit' | 'api' | 'mailto' | 'simulated';
  message: string;
  error?: string;
  mailtoUrl?: string;
  gmailComposeUrl?: string;
}

export interface JurnalEmailLog {
  id: string;
  jurnalId: string;
  recipient: string;
  tanggal: string;
  kelas: string;
  nama_mapel: string;
  nama_guru: string;
  status: 'sent' | 'queued' | 'simulated' | 'error';
  timestamp: string;
  message?: string;
}

const EMAIL_LOGS_KEY = 'jurnal_email_notification_logs';

/**
 * Retrieve stored notification logs from localStorage
 */
export const getEmailNotifLogs = (): JurnalEmailLog[] => {
  try {
    const raw = localStorage.getItem(EMAIL_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Save notification log entry
 */
export const saveEmailNotifLog = (log: JurnalEmailLog) => {
  try {
    const logs = getEmailNotifLogs();
    logs.unshift(log);
    // Keep last 50 logs
    localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save email notif log:', e);
  }
};

/**
 * Generate email subject for learning journal notification with prominent teacher name
 */
export const generateJurnalEmailSubject = (jurnal: JurnalPembelajaran): string => {
  const guru = (jurnal.nama_guru || 'Guru Pengajar').trim();
  const mapel = (jurnal.nama_mapel || 'Pembelajaran').trim();
  const kelas = (jurnal.kelas || '-').trim();
  const tanggal = jurnal.tanggal || new Date().toISOString().split('T')[0];
  return `[SIAP SPANJU] Jurnal ${guru} - Kelas ${kelas} (${mapel}) - ${tanggal}`;
};

/**
 * Generate plain text email body
 */
export const generateJurnalEmailText = (jurnal: JurnalPembelajaran): string => {
  const guru = (jurnal.nama_guru || 'Guru Pengajar').trim();
  const siswaList = Array.isArray(jurnal.siswa_list) ? jurnal.siswa_list : [];
  const total = siswaList.length;
  const hadir = siswaList.filter(s => s.absensi === 'Hadir').length;
  const sakit = siswaList.filter(s => s.absensi === 'Sakit').length;
  const izin = siswaList.filter(s => s.absensi === 'Izin').length;
  const alpa = siswaList.filter(s => s.absensi === 'Alpa').length;

  const tidakHadir = siswaList.filter(s => s.absensi && s.absensi !== 'Hadir');

  let text = `NOTIFIKASI JURNAL PEMBELAJARAN
SIAP SPANJU - SMP NEGERI 7 PASURUAN
========================================
GURU PENGINPUT  : ${guru} ${jurnal.nip_guru ? `(NIP: ${jurnal.nip_guru})` : ''}
MATA PELAJARAN  : ${jurnal.nama_mapel}
KELAS / PERIODE : Kelas ${jurnal.kelas} (${jurnal.periode || '2026'})
TANGGAL         : ${jurnal.tanggal}
JAM PELAJARAN   : Jam Ke-${jurnal.jam_ke || '-'} (${jurnal.jam_mulai || '-'} s/d ${jurnal.jam_selesai || '-'})
========================================

Materi & Kegiatan:
- Materi Pokok   : ${jurnal.materi}
- Kegiatan       : ${jurnal.kegiatan || '-'}

Rekapitulasi Presensi (${total} Siswa):
- Hadir : ${hadir} siswa
- Sakit : ${sakit} siswa
- Izin  : ${izin} siswa
- Alpa  : ${alpa} siswa
`;

  if (tidakHadir.length > 0) {
    text += `\nDaftar Siswa Tidak Hadir:\n`;
    tidakHadir.forEach((s, idx) => {
      text += `${idx + 1}. ${s.nama} (${s.absensi})${s.catatan_siswa ? ` - Ket: ${s.catatan_siswa}` : ''}\n`;
    });
  } else {
    text += `\nSeluruh siswa hadir lengkap (${hadir}/${total}).\n`;
  }

  text += `\n========================================
Diinput oleh: ${guru}
Waktu Input : ${new Date().toLocaleString('id-ID')}
Pemberitahuan otomatis dari SIAP SPANJU SMP Negeri 7 Pasuruan ke ${PRIMARY_NOTIF_EMAIL}.
`;

  return text;
};

/**
 * Generate formatted HTML email body
 */
export const generateJurnalEmailHtml = (jurnal: JurnalPembelajaran): string => {
  const guru = (jurnal.nama_guru || 'Guru Pengajar').trim();
  const siswaList = Array.isArray(jurnal.siswa_list) ? jurnal.siswa_list : [];
  const total = siswaList.length;
  const hadir = siswaList.filter(s => s.absensi === 'Hadir').length;
  const sakit = siswaList.filter(s => s.absensi === 'Sakit').length;
  const izin = siswaList.filter(s => s.absensi === 'Izin').length;
  const alpa = siswaList.filter(s => s.absensi === 'Alpa').length;

  const tidakHadir = siswaList.filter(s => s.absensi && s.absensi !== 'Hadir');

  const tidakHadirHtml = tidakHadir.length > 0 
    ? `<div style="margin-top: 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;">
         <div style="font-weight: bold; color: #991b1b; margin-bottom: 6px; font-size: 13px;">Daftar Siswa Tidak Hadir (${tidakHadir.length} Siswa):</div>
         <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 12px; line-height: 1.6;">
           ${tidakHadir.map(s => `<li><strong>${s.nama}</strong>: <span style="background: #fee2e2; padding: 1px 6px; border-radius: 4px; font-weight: 600;">${s.absensi}</span> ${s.catatan_siswa ? `— <em>${s.catatan_siswa}</em>` : ''}</li>`).join('')}
         </ul>
       </div>`
    : `<div style="margin-top: 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; color: #065f46; font-size: 13px;">
         <strong>Alhamdulillah</strong>, seluruh siswa tercatat <strong>Hadir Lengkap (${hadir}/${total})</strong>.
       </div>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Notifikasi Jurnal Pembelajaran - ${guru}</title>
</head>
<body style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #047857 0%, #065f46 100%); padding: 24px 20px; color: #ffffff; text-align: center;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9; margin-bottom: 4px;">SIAP SPANJU • SMP NEGERI 7 PASURUAN</div>
      <h1 style="margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.5px;">Jurnal Pembelajaran Baru</h1>
      
      <!-- Prominent Teacher Pill in Header -->
      <div style="margin-top: 12px; display: inline-block; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35); padding: 7px 18px; border-radius: 30px; font-size: 13px; font-weight: 700;">
        👤 Diinput oleh: <u>${guru}</u>
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 24px;">
      
      <!-- Teacher Profile Banner Card -->
      <div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 44px; vertical-align: middle;">
              <div style="width: 38px; height: 38px; background-color: #059669; color: #ffffff; border-radius: 50%; text-align: center; line-height: 38px; font-size: 18px; font-weight: bold;">
                👨‍🏫
              </div>
            </td>
            <td style="vertical-align: middle; padding-left: 8px;">
              <div style="font-size: 11px; text-transform: uppercase; color: #047857; font-weight: 800; letter-spacing: 0.8px;">GURU PENGINPUT JURNAL:</div>
              <div style="font-size: 16px; font-weight: 900; color: #064e3b; margin-top: 1px;">
                ${guru}
              </div>
              ${jurnal.nip_guru ? `<div style="font-size: 12px; color: #059669; font-weight: 600; margin-top: 2px;">NIP: ${jurnal.nip_guru}</div>` : ''}
            </td>
          </tr>
        </table>
      </div>

      <!-- Highlight Card -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #047857; width: 35%;">Guru Pengajar / Input</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #064e3b;">${guru} ${jurnal.nip_guru ? `<span style="font-size: 11px; color: #64748b; font-weight: normal;">(NIP: ${jurnal.nip_guru})</span>` : ''}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">Mata Pelajaran</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">${jurnal.nama_mapel}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">Kelas & Periode</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">Kelas ${jurnal.kelas} (Periode ${jurnal.periode || '2026'})</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">Tanggal Pembelajaran</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f172a;">${jurnal.tanggal}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 12px; color: #64748b;">Jam Pelajaran</td>
          <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0f172a;">Jam Ke-${jurnal.jam_ke || '-'} (${jurnal.jam_mulai || '-'} s/d ${jurnal.jam_selesai || '-'})</td>
        </tr>
      </table>

      <!-- Section: Materi & Kegiatan -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Materi Pokok & Kegiatan</div>
        <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
          <div style="font-size: 11px; color: #7e22ce; font-weight: 600; text-transform: uppercase;">Materi Diajarkan:</div>
          <div style="font-size: 14px; color: #581c87; font-weight: 600; margin-top: 2px;">${jurnal.materi}</div>
        </div>
        ${jurnal.kegiatan ? `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Uraian Kegiatan:</div>
          <div style="font-size: 13px; color: #334155; margin-top: 2px; line-height: 1.5;">${jurnal.kegiatan}</div>
        </div>` : ''}
      </div>

      <!-- Section: Presensi Siswa -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Rekap Presensi Siswa</div>
        <table style="width: 100%; border-collapse: collapse; text-align: center;">
          <tr>
            <td style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 10px; width: 25%;">
              <div style="font-size: 11px; color: #065f46; font-weight: bold;">HADIR</div>
              <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 2px;">${hadir}</div>
            </td>
            <td style="width: 2%;"></td>
            <td style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 10px; width: 23%;">
              <div style="font-size: 11px; color: #1e40af; font-weight: bold;">SAKIT</div>
              <div style="font-size: 20px; font-weight: 800; color: #2563eb; margin-top: 2px;">${sakit}</div>
            </td>
            <td style="width: 2%;"></td>
            <td style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px; width: 23%;">
              <div style="font-size: 11px; color: #92400e; font-weight: bold;">IZIN</div>
              <div style="font-size: 20px; font-weight: 800; color: #d97706; margin-top: 2px;">${izin}</div>
            </td>
            <td style="width: 2%;"></td>
            <td style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 10px; width: 23%;">
              <div style="font-size: 11px; color: #991b1b; font-weight: bold;">ALPA</div>
              <div style="font-size: 20px; font-weight: 800; color: #dc2626; margin-top: 2px;">${alpa}</div>
            </td>
          </tr>
        </table>
        ${tidakHadirHtml}
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; line-height: 1.5; text-align: center;">
      <div>Pemberitahuan otomatis ditujukan ke <strong>${PRIMARY_NOTIF_EMAIL}</strong></div>
      <div style="margin-top: 4px;">Sistem Informasi & Pembinaan Siswa (SIAP SPANJU) • SMP Negeri 7 Pasuruan</div>
      <div style="margin-top: 2px; color: #94a3b8;">Waktu Kirim: ${new Date().toLocaleString('id-ID')}</div>
    </div>

  </div>
</body>
</html>
`;
};

/**
 * Generate a mailto link with encoded subject and body for instant fallback or review
 */
export const generateJurnalMailtoUrl = (jurnal: JurnalPembelajaran, recipient: string = PRIMARY_NOTIF_EMAIL): string => {
  const subject = encodeURIComponent(generateJurnalEmailSubject(jurnal));
  const body = encodeURIComponent(generateJurnalEmailText(jurnal));
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
};

/**
 * Generate a Gmail Web Compose URL that opens Gmail in browser with pre-filled recipient, subject, and body
 */
export const generateGmailWebComposeUrl = (jurnal: JurnalPembelajaran, recipient: string = PRIMARY_NOTIF_EMAIL): string => {
  const subject = encodeURIComponent(generateJurnalEmailSubject(jurnal));
  const body = encodeURIComponent(generateJurnalEmailText(jurnal));
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${subject}&body=${body}`;
};

/**
 * Main function to dispatch learning journal email notification to wiwikismiati07@gmail.com
 */
export const dispatchJurnalEmailNotification = async (
  jurnal: JurnalPembelajaran,
  targetEmail: string = PRIMARY_NOTIF_EMAIL
): Promise<EmailNotifResult> => {
  const subject = generateJurnalEmailSubject(jurnal);
  const text = generateJurnalEmailText(jurnal);
  const html = generateJurnalEmailHtml(jurnal);
  const mailtoUrl = generateJurnalMailtoUrl(jurnal, targetEmail);
  const gmailComposeUrl = generateGmailWebComposeUrl(jurnal, targetEmail);

  let result: EmailNotifResult = {
    success: true,
    delivered: false,
    recipient: targetEmail,
    method: 'api',
    message: `Notifikasi email disiapkan untuk ${targetEmail}`,
    mailtoUrl,
    gmailComposeUrl
  };

  try {
    // Attempt sending through the backend API route /api/notify-jurnal
    const response = await fetch('/api/notify-jurnal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: targetEmail,
        subject,
        text,
        html,
        jurnal: {
          id: jurnal.id,
          tanggal: jurnal.tanggal,
          jam_ke: jurnal.jam_ke,
          jam_mulai: jurnal.jam_mulai,
          jam_selesai: jurnal.jam_selesai,
          kelas: jurnal.kelas,
          nama_mapel: jurnal.nama_mapel,
          nama_guru: jurnal.nama_guru,
          nip_guru: jurnal.nip_guru,
          materi: jurnal.materi,
          kegiatan: jurnal.kegiatan,
          periode: jurnal.periode,
          siswa_list: jurnal.siswa_list
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      result = {
        success: true,
        delivered: !!data.delivered,
        needsActivation: !!data.needsActivation,
        recipient: targetEmail,
        method: data.method || 'smtp',
        message: data.message || `Notifikasi email berhasil dikirim ke ${targetEmail}`,
        mailtoUrl,
        gmailComposeUrl
      };
    } else {
      // Backend returned non-200, try direct client-side fallback to FormSubmit
      try {
        const clientFs = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            name: `${jurnal.nama_guru || 'Guru'} (Guru Penginput)`,
            _subject: subject,
            _captcha: 'false',
            _template: 'table',
            'Guru Penginput': `${jurnal.nama_guru} ${jurnal.nip_guru ? `(NIP: ${jurnal.nip_guru})` : ''}`,
            'Mata Pelajaran': jurnal.nama_mapel,
            'Kelas': `Kelas ${jurnal.kelas} (${jurnal.periode || '2026'})`,
            'Tanggal': jurnal.tanggal,
            'Jam Pelajaran': `Jam Ke-${jurnal.jam_ke || '-'} (${jurnal.jam_mulai || '-'} s/d ${jurnal.jam_selesai || '-'})`,
            'Materi Pokok': jurnal.materi,
            'Ringkasan': text
          })
        });
        const fsData = await clientFs.json();
        if (fsData.success === 'true' || fsData.success === true) {
          result.delivered = true;
          result.method = 'formsubmit';
          result.message = `Notifikasi email berhasil dikirim ke ${targetEmail}`;
        } else if (fsData.message && fsData.message.includes('needs Activation')) {
          result.needsActivation = true;
          result.method = 'formsubmit';
          result.message = `Tautan aktivasi pengiriman email telah dikirim ke ${targetEmail}. Silakan klik tautan 'Activate Form' pada email Anda sekali saja.`;
        }
      } catch (_) {}
    }
  } catch (err: any) {
    console.info('Using local notification record:', err?.message || err);
    result.method = 'simulated';
    result.message = `Notifikasi email dicatat untuk ${targetEmail}.`;
  }

  // Record audit log
  saveEmailNotifLog({
    id: `log-${Date.now()}`,
    jurnalId: jurnal.id,
    recipient: targetEmail,
    tanggal: jurnal.tanggal,
    kelas: jurnal.kelas,
    nama_mapel: jurnal.nama_mapel,
    nama_guru: jurnal.nama_guru,
    status: result.delivered ? 'sent' : 'queued',
    timestamp: new Date().toISOString(),
    message: result.message
  });

  return result;
};
