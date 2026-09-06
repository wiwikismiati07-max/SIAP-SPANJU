export interface SiswaJurnalItem {
  siswa_id: string;
  nama: string;
  nis?: string;
  kelas: string;
  absensi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  nilai: string | number;
  catatan_siswa: string;
  tindakan: string;
}

export interface JurnalPembelajaran {
  id: string;
  tanggal: string;
  jam_ke: string;
  jam_mulai: string;
  jam_selesai: string;
  mapel_id?: string;
  nama_mapel: string;
  guru_id?: string;
  nama_guru: string;
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

export const JAM_PELAJARAN_OPTIONS = [
  { label: 'Jam Ke 1 - 2 (07:00 - 08:20)', value: '1 - 2', mulai: '07:00', selesai: '08:20' },
  { label: 'Jam Ke 3 - 4 (08:20 - 09:40)', value: '3 - 4', mulai: '08:20', selesai: '09:40' },
  { label: 'Jam Ke 5 - 6 (10:00 - 11:20)', value: '5 - 6', mulai: '10:00', selesai: '11:20' },
  { label: 'Jam Ke 7 - 8 (11:20 - 12:40)', value: '7 - 8', mulai: '11:20', selesai: '12:40' },
  { label: 'Jam Ke 9 - 10 (13:00 - 14:20)', value: '9 - 10', mulai: '13:00', selesai: '14:20' },
  { label: 'Kustom / Lainnya', value: 'custom', mulai: '07:00', selesai: '08:00' }
];
