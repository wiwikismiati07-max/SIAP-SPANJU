export interface Siswa {
  id: string;
  nama: string;
  kelas: string;
}

export interface Guru {
  id: string;
  nama_guru: string;
  mata_pelajaran: string;
}

export interface IzinSiswa {
  id: string;
  siswa_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  diajukan_oleh: 'Wali Murid' | 'Operator' | 'Guru';
  keterangan?: string;
  nama_wali?: string;
  no_telp_wali?: string;
  lampiran_url?: string;
  guru_id?: string;
  created_at?: string;
}

export interface IzinWithSiswa extends IzinSiswa {
  siswa: Siswa;
  guru?: Guru;
}

export interface KalenderBelajar {
  id: string;
  tanggal: string;
  keterangan: string;
  libur: boolean;
}
