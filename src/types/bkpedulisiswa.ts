import { Siswa } from './izinsiswa';

export interface MasterKasus {
  id: string;
  nama_kasus: string;
  kategori?: string;
  poin?: number;
  created_at?: string;
}

export interface TransaksiKasus {
  id: string;
  tanggal: string;
  jam: string;
  kelas: string;
  siswa_id: string;
  kasus_id: string;
  kasus_kategori?: 'Kedisiplinan' | 'Etika' | 'Akademi' | 'Bullying' | 'Perkelahian' | 'merokok' | 'Narkoba' | 'Lain-Lain';
  kronologi?: string;
  bukti_fisik?: string[];
  wali_kelas?: string;
  guru_bk?: 'Wiwik Ismiati S.pd' | 'Eki Febriani S.pd' | string;
  status?: 'Proses' | 'Selesai';
  created_at?: string;
  
  // Joined fields
  siswa?: Siswa;
  kasus?: MasterKasus;
  tindak_lanjuts?: TindakLanjutKasus[];
}

export interface TindakLanjutKasus {
  id: string;
  transaksi_id: string;
  tanggal: string;
  tindak_lanjut: 'Konseling Individu' | 'Konseling Kelompok' | 'Panggilan Orang Tua' | 'Mediasi' | 'Home visit' | 'Skorsing' | 'Lain-lain';
  keterangan?: string;
  created_at?: string;
}
