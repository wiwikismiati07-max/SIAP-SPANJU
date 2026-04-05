export interface Siswa {
  id: string;
  nama: string;
  kelas: string;
}

export interface IzinSiswa {
  id: string;
  siswa_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  diajukan_oleh: 'Wali Murid' | 'Operator';
  keterangan?: string;
  created_at?: string;
}

export interface IzinWithSiswa extends IzinSiswa {
  siswa: Siswa;
}

export interface KalenderBelajar {
  id: string;
  tanggal: string;
  keterangan: string;
  libur: boolean;
}
