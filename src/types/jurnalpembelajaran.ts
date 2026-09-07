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

  // Blok Jam Pelajaran (2 - 3 Jam Sekaligus)
  { label: 'Jam Ke 1 - 2 (07.15 - 08.35)', value: '1 - 2', mulai: '07:15', selesai: '08:35', kategori: 'blok' },
  { label: 'Jam Ke 3 - 4 (08.35 - 09.55)', value: '3 - 4', mulai: '08:35', selesai: '09:55', kategori: 'blok' },
  { label: 'Jam Ke 5 - 6 (10.35 - 11.55)', value: '5 - 6', mulai: '10:35', selesai: '11:55', kategori: 'blok' },
  { label: 'Jam Ke 7 - 8 (11.55 - 13.15)', value: '7 - 8', mulai: '11:55', selesai: '13:15', kategori: 'blok' },
  { label: 'Jam Ke 1 - 3 (07.15 - 09.15)', value: '1 - 3', mulai: '07:15', selesai: '09:15', kategori: 'blok' },
  { label: 'Jam Ke 2 - 4 (07.55 - 09.55)', value: '2 - 4', mulai: '07:55', selesai: '09:55', kategori: 'blok' },
  { label: 'Jam Ke 5 - 7 (10.35 - 12.35)', value: '5 - 7', mulai: '10:35', selesai: '12:35', kategori: 'blok' },
  { label: 'Jam Ke 6 - 8 (11.15 - 13.15)', value: '6 - 8', mulai: '11:15', selesai: '13:15', kategori: 'blok' },

  // Kustom / Lainnya
  { label: 'Kustom / Lainnya', value: 'custom', mulai: '07:15', selesai: '08:35', kategori: 'kustom' }
];
