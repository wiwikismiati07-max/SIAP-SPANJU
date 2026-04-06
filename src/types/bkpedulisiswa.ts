import { Siswa } from './izinsiswa';

export interface MasterPelanggaran {
  id: string;
  nama_pelanggaran: string;
  kategori?: string;
  poin?: number;
  created_at?: string;
}

export interface TransaksiPelanggaran {
  id: string;
  tanggal: string;
  jam: string;
  siswa_id: string;
  pelanggaran_id: string;
  alasan?: string;
  penanganan?: 'Akademik' | 'Bullying' | 'Etika' | 'Kedisiplinan' | 'Lainnya';
  konsekuensi?: 'Surat pernyataan orang tua' | 'Surat pernyataan Siswa';
  tindak_lanjut?: 'Konseling Individu' | 'Konseling Kelompok' | 'Bimbingan Kelompok' | 'Kunjungan Rumah/Home Visit' | 'Tangan alih kasus/Referral' | 'Konferensi Kasus' | 'Mediasi';
  wali_kelas?: string;
  guru_bk?: 'Wiwik Ismiati S.pd' | 'Ekik Febriani S.pd' | string;
  status?: 'Proses' | 'Selesai';
  created_at?: string;
  
  // Joined fields
  siswa?: Siswa;
  pelanggaran?: MasterPelanggaran;
}
