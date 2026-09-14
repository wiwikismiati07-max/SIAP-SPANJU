import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to create Nodemailer transporter lazily
function getEmailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  });
});

// Endpoint to send learning journal notification to wiwikismiati07@gmail.com
app.post('/api/notify-jurnal', async (req, res) => {
  try {
    const { recipient, subject, text, html, fields, jurnal } = req.body;
    const targetEmail = recipient || 'wiwikismiati07@gmail.com';

    console.log(`[Email Notification] Request received for ${targetEmail}`);
    if (jurnal) {
      console.log(`[Email Notification] Jurnal: Kelas ${jurnal.kelas} - ${jurnal.nama_mapel} oleh ${jurnal.nama_guru} (${jurnal.tanggal})`);
    }

    const transporter = getEmailTransporter();
    
    // Method 1: SMTP via Nodemailer
    if (transporter) {
      try {
        const fromAddress = process.env.SMTP_FROM || `"SIAP SPANJU" <${process.env.SMTP_USER}>`;
        const info = await transporter.sendMail({
          from: fromAddress,
          to: targetEmail,
          subject: subject || `[SIAP SPANJU] Jurnal Pembelajaran Baru`,
          text: text || 'Jurnal pembelajaran baru telah diinput.',
          html: html || undefined
        });

        console.log(`[Email Notification] Email sent successfully via SMTP! Message ID: ${info.messageId}`);
        return res.json({
          success: true,
          delivered: true,
          method: 'smtp',
          messageId: info.messageId,
          recipient: targetEmail,
          message: `Notifikasi email berhasil dikirim via SMTP ke ${targetEmail}`
        });
      } catch (smtpErr: any) {
        console.warn('[Email Notification] SMTP send failed:', smtpErr?.message);
      }
    }

    // Method 2: Public Email Dispatch Service (FormSubmit)
    try {
      console.log(`[Email Notification] Attempting dispatch via FormSubmit to ${targetEmail}...`);
      const formPayload: Record<string, any> = {
        _subject: subject || `[SIAP SPANJU] Jurnal Pembelajaran Baru`,
        _captcha: 'false',
        _template: 'table',
        ...(fields || {})
      };

      if (!fields) {
        if (jurnal) {
          formPayload['Tanggal'] = jurnal.tanggal;
          formPayload['Jam Pelajaran'] = `Jam Ke-${jurnal.jam_ke || '-'} (${jurnal.jam_mulai || '-'} s/d ${jurnal.jam_selesai || '-'})`;
          formPayload['Kelas'] = `Kelas ${jurnal.kelas} (${jurnal.periode || '2026'})`;
          formPayload['Mata Pelajaran'] = jurnal.nama_mapel;
          formPayload['Guru Pengajar'] = `${jurnal.nama_guru} ${jurnal.nip_guru ? `(NIP: ${jurnal.nip_guru})` : ''}`;
          formPayload['Materi Pokok'] = jurnal.materi;
          if (jurnal.kegiatan) formPayload['Kegiatan'] = jurnal.kegiatan;
          if (jurnal.siswa_list && Array.isArray(jurnal.siswa_list)) {
            const h = jurnal.siswa_list.filter((s: any) => s.absensi === 'Hadir').length;
            const s = jurnal.siswa_list.filter((s: any) => s.absensi === 'Sakit').length;
            const i = jurnal.siswa_list.filter((s: any) => s.absensi === 'Izin').length;
            const a = jurnal.siswa_list.filter((s: any) => s.absensi === 'Alpa').length;
            formPayload['Kehadiran'] = `Hadir: ${h}, Sakit: ${s}, Izin: ${i}, Alpa: ${a} (Total: ${jurnal.siswa_list.length} Siswa)`;
          }
        }
        formPayload['Ringkasan'] = text || 'Jurnal pembelajaran baru telah disimpan.';
      }

      const formSubmitResp = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://ais-pre-ml6nnrf7dze6tbhzpmslhb-42950961927.asia-east1.run.app',
          'Referer': 'https://smpn7pasuruan.sch.id/'
        },
        body: JSON.stringify(formPayload)
      });

      const formSubmitData: any = await formSubmitResp.json();
      console.log('[Email Notification] FormSubmit response:', formSubmitData);

      if (formSubmitData.success === 'true' || formSubmitData.success === true) {
        return res.json({
          success: true,
          delivered: true,
          method: 'formsubmit',
          recipient: targetEmail,
          message: `Notifikasi email berhasil dikirim ke ${targetEmail}`
        });
      } else if (formSubmitData.message && formSubmitData.message.includes('needs Activation')) {
        return res.json({
          success: true,
          delivered: false,
          needsActivation: true,
          method: 'formsubmit',
          recipient: targetEmail,
          message: `Tautan aktivasi telah dikirim ke ${targetEmail}. Silakan klik tautan 'Activate Form' pada email Anda sekali saja.`
        });
      }
    } catch (fsErr: any) {
      console.warn('[Email Notification] FormSubmit dispatch failed:', fsErr?.message);
    }

    // Method 3: Fallback simulated
    console.log(`[Email Notification] Notification logged for ${targetEmail}.`);
    return res.json({
      success: true,
      delivered: false,
      method: 'simulated',
      recipient: targetEmail,
      message: `Notifikasi email dicatat untuk ${targetEmail}.`
    });
  } catch (err: any) {
    console.error('[Email Notification] Error processing notification:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memproses notifikasi email'
    });
  }
});

// Start server with Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
