export interface AlumniTracing {
  id?: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  tahun_lulus: string | number;
  wa_number: string;
  alamat: string;
  lanjut_ke: string;
  nama_sekolah_lanjutan: string;
  jurusan: string;
  alasan: string;
  created_at?: string;
  updated_at?: string;
}
