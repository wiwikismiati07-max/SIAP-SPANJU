export interface MasterJenisDispensasi {
  id: string;
  nama_jenis: string;
  keterangan?: string;
  created_at?: string;
}

export interface TransaksiDispensasi {
  id: string;
  tanggal: string;
  jam: string;
  kelas: string;
  siswa_id: string;
  jenis_id: string;
  alasan?: string;
  tindak_lanjut?: string;
  bukti_url?: string;
  created_at?: string;
  // Joined data
  siswa?: {
    nama: string;
    kelas: string;
  };
  jenis?: {
    nama_jenis: string;
  };
}

export interface SiswaSeringDispensasi {
  siswa_id: string;
  nama: string;
  kelas: string;
  jumlah: number;
  jenis_terbanyak: string;
}
