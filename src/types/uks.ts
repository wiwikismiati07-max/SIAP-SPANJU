export interface UksKeluhan {
  id: string;
  nama_keluhan: string;
  created_at?: string;
}

export interface UksObat {
  id: string;
  nama_obat: string;
  stok: number;
  satuan: string;
  created_at?: string;
}

export interface UksKunjungan {
  id: string;
  tanggal: string;
  jam: string;
  siswa_id: string;
  keluhan_id: string;
  penanganan: 'Minum Obat' | 'Pulang' | 'Istirahat';
  catatan?: string;
  created_at?: string;
  siswa?: {
    nama: string;
    kelas: string;
  };
  keluhan?: {
    nama_keluhan: string;
  };
  obat_digunakan?: UksKunjunganObat[];
}

export interface UksKunjunganObat {
  id: string;
  kunjungan_id: string;
  obat_id: string;
  jumlah: number;
  obat?: {
    nama_obat: string;
    satuan: string;
  };
}

export interface UksScreening {
  id: string;
  tanggal: string;
  siswa_id: string;
  evaluasi: 'Sehat' | 'Pemantauan' | 'Perlu Rujukan';
  catatan: string;
  petugas: string;
  created_at?: string;
  siswa?: {
    nama: string;
    kelas: string;
  };
}
