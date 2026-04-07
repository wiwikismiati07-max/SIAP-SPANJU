export interface PrestasiSiswa {
  id: string;
  tanggal: string;
  jam: string;
  siswa_id: string;
  kelas: string;
  jenis_prestasi: 'Akademik' | 'Non Akademik';
  nama_lomba: string;
  juara: string;
  tingkat: string;
  bukti_url?: string;
  wali_kelas_id: string;
  guru_bk: string;
  created_at: string;
  siswa?: {
    nama: string;
  };
  wali_kelas?: {
    nama: string;
  };
}

export interface PrestasiStats {
  totalSiswa: number;
  totalPrestasi: number;
  totalSiswaBerprestasi: number;
}

export interface RankingSiswa {
  siswa_id: string;
  nama: string;
  kelas: string;
  jumlah_prestasi: number;
}
