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
  const clean = timeStr.trim().replace('.', ':');
  const parts = clean.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

/**
 * Menghitung jam pelajaran 1 s.d. 8 dari:
 * 1. String jam_ke (rentang "1-2", "3 - 5", "3 s/d 5", "3, 4, 5", dsb.)
 * 2. Waktu jam_mulai (Jam Dari) dan jam_selesai (Jam Ke/Sampai), khususnya saat custom/kustom
 */
export const calculateJamPelajaranNumbers = (
  jamKeStr?: string,
  jamMulai?: string,
  jamSelesai?: string
): number[] => {
  const resultNumbers = new Set<number>();

  // 1. Ekstraksi dari string jamKeStr jika ada
  if (jamKeStr) {
    const clean = jamKeStr.toLowerCase().trim();
    if (!clean.includes('istirahat')) {
      // Pola rentang seperti "3 - 5", "3-5", "3 s/d 5", "3 sd 5", "3 s.d 5", "3 sampai 5", "dari 3 ke 5"
      const rangeMatch = clean.match(/(\d+)\s*(?:[-–—]|s\/?d\.?|sampai|hingga|ke)\s*(\d+)/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= 12) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= 8) resultNumbers.add(i);
          }
        }
      }

      // Pola angka-angka tersendiri
      const digits = clean.match(/\d+/g);
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

  // 2. Ekstraksi dari jam_mulai (Jam Dari) & jam_selesai (Jam Ke/Sampai)
  // Sangat penting jika jam_ke bernilai "custom", "kustom", atau guru menginput waktu kustom
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
  if (clean.toLowerCase() === 'custom' || clean.toLowerCase() === 'kustom') {
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
