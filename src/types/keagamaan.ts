export interface AgamaProgram {
  id: string;
  nama_kegiatan: string;
  waktu: string;
  created_at?: string;
}

export interface AgamaAbsensi {
  id: string;
  siswa_id: string;
  tanggal: string;
  jam: string;
  kegiatan_id: string;
  wali_kelas_id: string;
  alasan: 'Sakit' | 'Izin' | 'Haid' | 'Alpa' | 'Pulang sebelum waktunya' | 'Hadir';
  created_at?: string;
  siswa?: {
    nama: string;
    kelas: string;
  };
  kegiatan?: {
    nama_kegiatan: string;
  };
  wali_kelas?: {
    nama_guru: string;
  };
}

export interface HaidScreening {
  siswa_id: string;
  nama: string;
  kelas: string;
  total_hari: number;
  bulan: string;
}

export interface AgamaJadwal {
  id: string;
  kegiatan_id: string;
  hari: string;
  minggu_ke: number;
  bulan: string;
  tahun: number;
  kelas: string;
  keterangan?: string;
  created_at?: string;
  kegiatan?: {
    nama_kegiatan: string;
  };
}
