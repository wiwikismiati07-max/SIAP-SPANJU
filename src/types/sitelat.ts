export interface Siswa {
  id: string;
  nama: string;
  kelas: string;
}

export interface TransaksiTerlambat {
  id: string;
  siswa_id: string;
  tanggal: string;
  jam: string;
  alasan: string;
}

export interface TransaksiWithSiswa extends TransaksiTerlambat {
  siswa?: Siswa;
}
