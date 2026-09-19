export interface SiswaJurnalItem {
  siswa_id: string;
  nama: string;
  nis?: string;
  kelas: string;
  periode?: string;
  absensi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  nilai: string | number;
  catatan_siswa: string;
  tindakan: string;
  sudah_izin?: boolean;
  keterangan_izin?: string;
}

export interface JurnalPembelajaran {
  id: string;
  tanggal: string;
  jam_ke: string;
  jam_mulai: string;
  jam_selesai: string;
  periode?: string;
  mapel_id?: string;
  nama_mapel: string;
  guru_id?: string;
  nama_guru: string;
  nip_guru?: string;
  kelas: string;
  materi: string;
  kegiatan?: string;
  foto_kegiatan: string[];
  siswa_list: SiswaJurnalItem[];
  created_at: string;
  updated_at?: string;
}

export const DAFTAR_KELAS = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

export const DEFAULT_MAPEL = [
  'Pendidikan Agama dan Budi Pekerti',
  'Pendidikan Pancasila (PPKn)',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  'Informatika',
  'Prakarya',
  'Bahasa Daerah (Jawa)',
  'Bimbingan dan Konseling (BK)'
];

export interface JamPelajaranOption {
  label: string;
  value: string;
  mulai: string;
  selesai: string;
  kategori?: 'tunggal' | 'istirahat' | 'blok' | 'kustom';
}

export const JAM_PELAJARAN_OPTIONS: JamPelajaranOption[] = [
  // Sesi Per Jam Sesuai Jadwal Bel Sekolah
  { label: 'Jam Ke 1 (07.15 - 07.55)', value: '1', mulai: '07:15', selesai: '07:55', kategori: 'tunggal' },
  { label: 'Jam Ke 2 (07.55 - 08.35)', value: '2', mulai: '07:55', selesai: '08:35', kategori: 'tunggal' },
  { label: 'Jam Ke 3 (08.35 - 09.15)', value: '3', mulai: '08:35', selesai: '09:15', kategori: 'tunggal' },
  { label: 'Jam Ke 4 (09.15 - 09.55)', value: '4', mulai: '09:15', selesai: '09:55', kategori: 'tunggal' },
  { label: 'Istirahat (09.55 - 10.35)', value: 'Istirahat', mulai: '09:55', selesai: '10:35', kategori: 'istirahat' },
  { label: 'Jam Ke 5 (10.35 - 11.15)', value: '5', mulai: '10:35', selesai: '11:15', kategori: 'tunggal' },
  { label: 'Jam Ke 6 (11.15 - 11.55)', value: '6', mulai: '11:15', selesai: '11:55', kategori: 'tunggal' },
  { label: 'Jam Ke 7 (11.55 - 12.35)', value: '7', mulai: '11:55', selesai: '12:35', kategori: 'tunggal' },
  { label: 'Jam Ke 8 (12.35 - 13.15)', value: '8', mulai: '12:35', selesai: '13:15', kategori: 'tunggal' },

  // Blok Jam Pelajaran (2 - 4 Jam Sekaligus)
  { label: 'Jam Ke 1 - 2 (07.15 - 08.35)', value: '1 - 2', mulai: '07:15', selesai: '08.35', kategori: 'blok' },
  { label: 'Jam Ke 3 - 4 (08.35 - 09.55)', value: '3 - 4', mulai: '08:35', selesai: '09:55', kategori: 'blok' },
  { label: 'Jam Ke 3 - 5 (08.35 - 11.15)', value: '3 - 5', mulai: '08:35', selesai: '11:15', kategori: 'blok' },
  { label: 'Jam Ke 4 - 6 (09.15 - 11.55)', value: '4 - 6', mulai: '09:15', selesai: '11:55', kategori: 'blok' },
  { label: 'Jam Ke 5 - 6 (10.35 - 11.55)', value: '5 - 6', mulai: '10:35', selesai: '11:55', kategori: 'blok' },
  { label: 'Jam Ke 7 - 8 (11.55 - 13.15)', value: '7 - 8', mulai: '11:55', selesai: '13:15', kategori: 'blok' },
  { label: 'Jam Ke 1 - 3 (07.15 - 09.15)', value: '1 - 3', mulai: '07:15', selesai: '09:15', kategori: 'blok' },
  { label: 'Jam Ke 2 - 4 (07.55 - 09.55)', value: '2 - 4', mulai: '07:55', selesai: '09:55', kategori: 'blok' },
  { label: 'Jam Ke 5 - 7 (10.35 - 12.35)', value: '5 - 7', mulai: '10:35', selesai: '12:35', kategori: 'blok' },
  { label: 'Jam Ke 6 - 8 (11.15 - 13.15)', value: '6 - 8', mulai: '11:15', selesai: '13:15', kategori: 'blok' },
  { label: 'Jam Ke 1 - 4 (07.15 - 09.55)', value: '1 - 4', mulai: '07:15', selesai: '09:55', kategori: 'blok' },
  { label: 'Jam Ke 5 - 8 (10.35 - 13.15)', value: '5 - 8', mulai: '10:35', selesai: '13:15', kategori: 'blok' },

  // Kustom / Tentukan Sendiri
  { label: 'Kustom (Pilih Jam Dari & Jam Ke)...', value: 'custom', mulai: '08:35', selesai: '11:15', kategori: 'kustom' }
];

export interface JadwalJamItem {
  jam: number;
  label: string;
  mulai: string;
  selesai: string;
  startM: number;
  endM: number;
}

export const JADWAL_BEL_SEKOLAH: JadwalJamItem[] = [
  { jam: 1, label: 'Jam Ke-1', mulai: '07:15', selesai: '07:55', startM: 435, endM: 475 },
  { jam: 2, label: 'Jam Ke-2', mulai: '07:55', selesai: '08:35', startM: 475, endM: 515 },
  { jam: 3, label: 'Jam Ke-3', mulai: '08:35', selesai: '09:15', startM: 515, endM: 555 },
  { jam: 4, label: 'Jam Ke-4', mulai: '09:15', selesai: '09:55', startM: 555, endM: 595 },
  { jam: 5, label: 'Jam Ke-5', mulai: '10:35', selesai: '11:15', startM: 635, endM: 675 },
  { jam: 6, label: 'Jam Ke-6', mulai: '11:15', selesai: '11:55', startM: 675, endM: 715 },
  { jam: 7, label: 'Jam Ke-7', mulai: '11:55', selesai: '12:35', startM: 715, endM: 755 },
  { jam: 8, label: 'Jam Ke-8', mulai: '12:35', selesai: '13:15', startM: 755, endM: 795 },
];

/**
 * Konversi string waktu "HH:MM" atau "HH.MM" ke total menit dari tengah malam
 */
export const timeStrToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const match = String(timeStr).match(/(\d{1,2})[:.](\d{2})/);
  if (!match) {
    const singleHour = parseInt(String(timeStr).trim(), 10);
    if (!isNaN(singleHour) && singleHour >= 6 && singleHour <= 18) {
      return singleHour * 60;
    }
    return null;
  }
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

/**
 * Menghitung jam pelajaran 1 s.d. 8 dari:
 * 1. String jam_ke (rentang "1-2", "3 - 5", "1 - 8", "3 s/d 5", "3, 4, 5", dsb.)
 * 2. Waktu jam_mulai (Jam Dari) dan jam_selesai (Jam Ke/Sampai), khususnya saat custom/costum/kustom
 */
export const calculateJamPelajaranNumbers = (
  jamKeStr?: string,
  jamMulai?: string,
  jamSelesai?: string
): number[] => {
  const resultNumbers = new Set<number>();

  // 1. Cek apakah jamMulai dan jamSelesai langsung berupa angka Jam 1 s.d. 8 (misal Jam Dari: 1, Jam Ke: 8)
  const numDari = parseInt(String(jamMulai || '').trim(), 10);
  const numKe = parseInt(String(jamSelesai || '').trim(), 10);
  if (
    !isNaN(numDari) && 
    !isNaN(numKe) && 
    numDari >= 1 && 
    numDari <= 8 && 
    numKe >= 1 && 
    numKe <= 8 && 
    !String(jamMulai).includes(':') && 
    !String(jamMulai).includes('.')
  ) {
    const minJ = Math.min(numDari, numKe);
    const maxJ = Math.max(numDari, numKe);
    for (let i = minJ; i <= maxJ; i++) {
      resultNumbers.add(i);
    }
  }

  // 2. Ekstraksi dari string jamKeStr jika ada
  if (jamKeStr) {
    const clean = jamKeStr.toLowerCase().trim();
    
    // Jangan proses hanya jika teks murni 'istirahat' tanpa ada angka
    if (!clean.includes('istirahat') || clean.match(/\d+/)) {
      // Ambil waktu jam mulai dan selesai jika tertera di dalam string seperti "Kustom (07:15 - 13:15)"
      const embeddedTimes = clean.match(/(\d{1,2}[:.]\d{2})\s*(?:[-–—~]|s\/?d\.?|sampai|hingga)\s*(\d{1,2}[:.]\d{2})/);
      if (embeddedTimes && !jamMulai && !jamSelesai) {
        jamMulai = embeddedTimes[1];
        jamSelesai = embeddedTimes[2];
      }

      // Hapus format jam waktu (HH:MM / HH.MM) dari string agar tidak mengacaukan deteksi angka jam pelajaran 1-8
      const cleanWithoutTime = clean.replace(/\d{1,2}[:.]\d{2}/g, ' ');

      // Pola rentang jam pelajaran seperti "1 - 8", "1-8", "3 - 5", "3-5", "3 s/d 5", "3 sd 5", "3 s.d 5", "3 sampai 5", "dari 1 ke 8", "jam 1 s/d 8"
      const rangeMatch = cleanWithoutTime.match(/(\d+)\s*(?:[-–—~]|s\/?d\.?|sampai|hingga|ke|s\.?d)\s*(\d+)/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= 1) {
          const minJ = Math.max(1, Math.min(start, end));
          const maxJ = Math.min(8, Math.max(start, end));
          for (let i = minJ; i <= maxJ; i++) {
            resultNumbers.add(i);
          }
        }
      }

      // Pola angka-angka jam pelajaran tersendiri (misal: "1, 2, 3" atau "Jam 4" atau "8")
      const digits = cleanWithoutTime.match(/\b([1-8])\b/g);
      if (digits && digits.length > 0) {
        digits.forEach(d => {
          const n = parseInt(d, 10);
          if (!isNaN(n) && n >= 1 && n <= 8) {
            resultNumbers.add(n);
          }
        });
      }
    }
  }

  // 3. Ekstraksi dari jam_mulai (Jam Dari) & jam_selesai (Jam Ke/Sampai)
  // Sangat penting jika jam_ke bernilai "custom", "costum", "kustom", atau guru menginput waktu kustom
  const startM = timeStrToMinutes(jamMulai);
  const endM = timeStrToMinutes(jamSelesai);

  if (startM !== null && endM !== null && startM < endM) {
    JADWAL_BEL_SEKOLAH.forEach(item => {
      // Cek apakah ada irisan waktu minimal 10 menit dengan jadwal jam pelajaran ini
      const overlapStart = Math.max(startM, item.startM);
      const overlapEnd = Math.min(endM, item.endM);
      if (overlapEnd - overlapStart >= 10) {
        resultNumbers.add(item.jam);
      }
    });
  }

  return Array.from(resultNumbers).sort((a, b) => a - b);
};

/**
 * Helper untuk format tampilan jam pelajaran yang ramah dibaca
 */
export const formatDisplayJamPelajaran = (
  jamKe?: string,
  jamMulai?: string,
  jamSelesai?: string
): string => {
  if (!jamKe) return '-';
  const clean = jamKe.trim();
  const lower = clean.toLowerCase();
  if (lower === 'custom' || lower === 'costum' || lower === 'kustom' || lower.includes('custom') || lower.includes('costum') || lower.includes('kustom')) {
    const nums = calculateJamPelajaranNumbers(jamKe, jamMulai, jamSelesai);
    if (nums.length > 0) {
      const rangeStr = nums.length === 1 ? `Jam ${nums[0]}` : `Jam ${nums[0]} - ${nums[nums.length - 1]}`;
      return `${rangeStr} (Kustom: ${jamMulai || ''} - ${jamSelesai || ''})`;
    }
    return `Kustom (${jamMulai || ''} - ${jamSelesai || ''})`;
  }

  if (clean.toLowerCase().startsWith('jam') || clean.toLowerCase() === 'istirahat') {
    return clean;
  }
  return `Jam ${clean}`;
};
