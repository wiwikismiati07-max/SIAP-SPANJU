import { supabase } from './supabase';

export const GURU_BK_OPTIONS = [
  'WIWIK ISMIATI, S.Pd',
  'EKI FEBRIANI, S.Pd'
] as const;

export const getDefaultGuruBK = (user?: any): string => {
  const name = (user?.nama_lengkap || '').toString().trim().toUpperCase();
  if (name.includes('EKI')) return GURU_BK_OPTIONS[1];
  return GURU_BK_OPTIONS[0];
};

export interface AgendaKerjaBK {
  id: string;
  tanggal: string;
  waktu?: string;
  sasaran: string;
  uraian_kegiatan: string;
  hasil?: string;
  guru_bk?: string;
  foto_url?: string;
  siswa_id?: string;
  created_at?: string;
}

export interface UndanganOrtuBK {
  id: string;
  nomor_surat: string;
  siswa_id?: string;
  nama_siswa: string;
  kelas: string;
  nama_ortu?: string;
  tanggal_hadir: string;
  jam_hadir: string;
  tempat: string;
  menemui: string;
  perihal: string;
  status: 'Menunggu' | 'Hadir' | 'Reschedule' | 'Selesai';
  hasil_pertemuan?: string;
  created_at?: string;
}

export interface HomeVisitBK {
  id: string;
  siswa_id?: string;
  nama_siswa: string;
  kelas: string;
  alamat: string;
  tanggal: string;
  waktu: string;
  petugas: string;
  anggota_keluarga: string;
  tujuan: string;
  hasil: string;
  foto_url?: string;
  created_at?: string;
}

export interface KonselingIndividualBK {
  id: string;
  siswa_id?: string;
  nama_siswa: string;
  kelas: string;
  tanggal: string;
  jam: string;
  bidang: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';
  gejala_masalah: string;
  pendekatan_teknik: string;
  proses_konseling: string;
  rencana_tindak_lanjut: string;
  guru_bk: string;
  status: 'Proses' | 'Selesai';
  created_at?: string;
}

export interface KonselingKelompokBK {
  id: string;
  topik: string;
  anggota_siswa: string; // Comma separated or string list
  kelas: string;
  tanggal: string;
  jam: string;
  tempat: string;
  tujuan: string;
  dinamika_kelompok: string;
  kesepakatan: string;
  evaluasi: string;
  guru_bk: string;
  created_at?: string;
}

export interface SuratPernyataanBK {
  id: string;
  nomor_surat: string;
  tanggal: string;
  siswa_id?: string;
  nama_siswa: string;
  nisn?: string;
  kelas: string;
  nama_ortu: string;
  alamat_ortu?: string;
  no_hp_ortu?: string;
  jenis_pernyataan: 'Perjanjian 1' | 'Perjanjian 2' | 'Perjanjian 3 (Bermaterai)' | 'Pernyataan Khusus';
  butir_pelanggaran: string;
  isi_pernyataan: string;
  konsekuensi: string;
  guru_bk: string;
  wali_kelas?: string;
  kepala_sekolah?: string;
  status: 'Aktif' | 'Dipatuhi' | 'Dilanggar';
  created_at?: string;
}

export interface KonferensiKasusBK {
  id: string;
  nomor_dokumen: string;
  tanggal: string;
  waktu: string;
  tempat: string;
  siswa_id?: string;
  nama_siswa: string;
  nisn?: string;
  kelas: string;
  kasus_dibahas: string;
  tujuan_konferensi: string;
  peserta_hadir: string; // Misal: "Kepala Sekolah, Guru BK, Wali Kelas, Orang Tua"
  pokok_pembahasan: string;
  kesepakatan_solusi: string;
  tindak_lanjut: string;
  pimpinan_sidang: string;
  notulis: string;
  status: 'Selesai' | 'Dalam Pemantauan';
  created_at?: string;
}

export interface SiswaATSBK {
  id: string;
  tanggal_identifikasi: string;
  siswa_id?: string;
  nama_siswa: string;
  nisn?: string;
  kelas: string;
  jenis_kelamin: 'L' | 'P';
  alamat: string;
  nama_ortu: string;
  no_telp: string;
  kategori_ats: 'Rentan Putus Sekolah' | 'Putus Sekolah (DO)' | 'Lulus Tidak Melanjutkan' | 'Belum Pernah Sekolah';
  faktor_penyebab: string;
  lama_tidak_sekolah: string;
  upaya_penanganan: string;
  status_penanganan: 'Teridentifikasi' | 'Pendampingan' | 'Kembali Bersekolah' | 'Alih PKBM/Paket' | 'Pindah Sekolah';
  catatan_hasil: string;
  petugas_pendamping: string;
  created_at?: string;
}


// Initial sample data for demonstration & immediate functionality
const INITIAL_AGENDA: AgendaKerjaBK[] = [
  {
    id: 'ag-1',
    tanggal: '2026-11-11',
    sasaran: 'Seluruh Siswa Kelas 7',
    uraian_kegiatan: 'Pelaksanaan orientasi pemahaman diri dan penyesuaian lingkungan belajar SMPN 7 Pasuruan.',
    hasil: 'Siswa aktif bertanya mengenai tata tertib dan manajemen waktu belajar.',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    created_at: '2026-11-11T08:00:00.000Z'
  },
  {
    id: 'ag-2',
    tanggal: '2026-11-10',
    sasaran: 'Kelas 8C & 8D',
    uraian_kegiatan: 'Bimbingan klasikal tentang pencegahan perundungan (Anti-Bullying) dan penguatan karakter Ramah Anak.',
    hasil: 'Terbentuk deklarasi kelas bebas bullying dan saling menghormati.',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    created_at: '2026-11-10T08:00:00.000Z'
  },
  {
    id: 'ag-3',
    tanggal: '2026-11-09',
    sasaran: 'Kelas 9A, 9B, 9C',
    uraian_kegiatan: 'Layanan informasi karir dan persiapan studi lanjut ke jenjang SMA/SMK.',
    hasil: 'Siswa mulai memetakan minat jurusan dan bakat vokasi.',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    created_at: '2026-11-09T08:00:00.000Z'
  }
];

const INITIAL_UNDANGAN: UndanganOrtuBK[] = [
  {
    id: 'und-1',
    nomor_surat: '421.3/BK-01/SMPN7/XI/2026',
    nama_siswa: 'Ahmad Dani Saputra',
    kelas: '8B',
    nama_ortu: 'Bpk. Hendro',
    tanggal_hadir: '2026-11-12',
    jam_hadir: '08:30 WIB',
    tempat: 'Ruang BK SMPN 7 Pasuruan',
    menemui: 'Wiwik Ismiati, S.Pd (Guru BK)',
    perihal: 'Konsultasi Perkembangan Belajar & Kedisiplinan Siswa',
    status: 'Menunggu',
    hasil_pertemuan: '',
    created_at: '2026-11-11T07:30:00.000Z'
  }
];

const INITIAL_HOME_VISIT: HomeVisitBK[] = [
  {
    id: 'hv-1',
    nama_siswa: 'Bagas Pratama',
    kelas: '7C',
    alamat: 'Jl. Panglima Sudirman No. 45, Pasuruan',
    tanggal: '2026-11-08',
    waktu: '14:00 WIB',
    petugas: 'Wiwik Ismiati, S.Pd & Wali Kelas 7C',
    anggota_keluarga: 'Ibu Kandung (Ibu Siti Rahma)',
    tujuan: 'Konfirmasi ketidakhadiran siswa selama 3 hari berturut-turut tanpa keterangan.',
    hasil: 'Siswa mengalami demam tinggi dan orang tua belum sempat mengirimkan surat izin. Disepakati siswa istirahat hingga pulih.',
    created_at: '2026-11-08T14:00:00.000Z'
  }
];

const INITIAL_INDIVIDUAL: KonselingIndividualBK[] = [
  {
    id: 'ki-1',
    nama_siswa: 'Citra Dewi',
    kelas: '9D',
    tanggal: '2026-11-10',
    jam: '09:15 WIB',
    bidang: 'Belajar',
    gejala_masalah: 'Konseli merasa cemas dan kurang percaya diri menghadapi ujian kelulusan.',
    pendekatan_teknik: 'Cognitive Behavioral Therapy (Restrukturisasi Kognitif)',
    proses_konseling: 'Membimbing konseli mengidentifikasi pikiran negatif irasional dan menggantinya dengan afirmasi positif.',
    rencana_tindak_lanjut: 'Latihan manajemen stres belajar dan evaluasi berkala minggu depan.',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    status: 'Proses',
    created_at: '2026-11-10T09:15:00.000Z'
  }
];

const INITIAL_KELOMPOK: KonselingKelompokBK[] = [
  {
    id: 'kk-1',
    topik: 'Manajemen Emosi dan Resolusi Konflik Sebaya',
    anggota_siswa: 'Rian (8A), Fajar (8A), Dimas (8A), Reza (8A)',
    kelas: '8A',
    tanggal: '2026-11-07',
    jam: '10:30 WIB',
    tempat: 'Ruang Konseling Kelompok BK',
    tujuan: 'Membangun komunikasi asertif dan saling memaafkan antar teman sekelas.',
    dinamika_kelompok: 'Anggota kelompok terbuka mengutarakan uneg-uneg dan sepakat berdamai tanpa dendam.',
    kesepakatan: 'Menjaga kerukunan kelas dan saling mendukung dalam belajar kelompok.',
    evaluasi: 'Hubungan pertemanan kembali harmonis.',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    created_at: '2026-11-07T10:30:00.000Z'
  }
];

const INITIAL_PERNYATAAN: SuratPernyataanBK[] = [
  {
    id: 'sp-1',
    nomor_surat: '421.3/SP-01/SMPN7/XI/2026',
    tanggal: '2026-11-10',
    nama_siswa: 'Rizky Ramadhani',
    nisn: '0098765432',
    kelas: '8B',
    nama_ortu: 'Bpk. Sugeng Wibowo',
    alamat_ortu: 'Jl. Veteran No. 12, Pasuruan',
    no_hp_ortu: '081234567890',
    jenis_pernyataan: 'Perjanjian 2',
    butir_pelanggaran: 'Membawa handphone ke dalam kelas saat jam belajar tanpa izin guru pengajar.',
    isi_pernyataan: 'Dengan ini saya berjanji dengan sungguh-sungguh tidak akan membawa dan menggunakan HP saat jam pelajaran tanpa izin guru, serta bersedia mematuhi seluruh tata tertib SMPN 7 Pasuruan.',
    konsekuensi: 'Apabila mengulangi kembali, bersedia HP dititipkan ke pihak sekolah selama 1 bulan dan siap menerima sanksi Perjanjian III (Bermaterai).',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    wali_kelas: 'Dewi Mahindrawati, S.Pd.',
    kepala_sekolah: 'Drs. Edy Suprayitno, M.M.',
    status: 'Aktif',
    created_at: '2026-11-10T08:30:00.000Z'
  }
];

const INITIAL_KONFERENSI: KonferensiKasusBK[] = [
  {
    id: 'kk-case-1',
    nomor_dokumen: '421.3/BA-KK-01/SMPN7/XI/2026',
    tanggal: '2026-11-09',
    waktu: '10:00 WIB',
    tempat: 'Ruang BK SMPN 7 Pasuruan',
    nama_siswa: 'Muhammad Farhan',
    nisn: '0091234567',
    kelas: '9C',
    kasus_dibahas: 'Penanganan penurunan drastis motivasi belajar dan indikasi keterlibatan perkelahian di luar sekolah.',
    tujuan_konferensi: 'Mencari akar permasalahan dan merumuskan langkah penanganan kolaboratif antara sekolah, orang tua, dan wali kelas.',
    peserta_hadir: 'Drs. Edy Suprayitno, M.M. (Kepala Sekolah), Wiwik Ismiati, S.Pd (Guru BK), Drs. Supeno (Wali Kelas 9C), Ibu Nurul (Ibu Kandung Siswa)',
    pokok_pembahasan: 'Siswa mengalami pergaulan lingkungan luar sekolah yang kurang kondusif pada malam hari sehingga sering terlambat dan terpengaruh kelompok remaja luar.',
    kesepakatan_solusi: 'Orang tua memperketat jam malam (maksimal pukul 20.00 WIB di rumah), sekolah memberikan pendampingan konseling individual rutin 2 kali seminggu, dan pemantauan harian buku kendali siswa.',
    tindak_lanjut: 'Evaluasi perkembangan perilaku Farhan dalam 2 pekan ke depan oleh Guru BK dan Wali Kelas.',
    pimpinan_sidang: 'Drs. Edy Suprayitno, M.M.',
    notulis: 'Wiwik Ismiati, S.Pd',
    status: 'Dalam Pemantauan',
    created_at: '2026-11-09T10:00:00.000Z'
  }
];

const INITIAL_ATS: SiswaATSBK[] = [
  {
    id: 'ats-1',
    tanggal_identifikasi: '2026-11-05',
    nama_siswa: 'Dimas Anggara',
    nisn: '0089871234',
    kelas: '8E',
    jenis_kelamin: 'L',
    alamat: 'Kelurahan Mandaranrejo, Pasuruan',
    nama_ortu: 'Bpk. Kasiman',
    no_telp: '085712349988',
    kategori_ats: 'Rentan Putus Sekolah',
    faktor_penyebab: 'Faktor Ekonomi dan Membantu Orang Tua berjualan di pasar subuh hingga siang hari.',
    lama_tidak_sekolah: '12 Hari tanpa keterangan (Alpha)',
    upaya_penanganan: 'Kunjungan rumah (Home Visit) bersama Tim Satgas Pencegahan ATS, advokasi percepatan pencairan PIP (Program Indonesia Pintar), serta penyesuaian penugasan modul belajar.',
    status_penanganan: 'Pendampingan',
    catatan_hasil: 'Orang tua menyepakati siswa dapat kembali masuk sekolah setelah jadwal bantu orang tua disesuaikan ke sore hari.',
    petugas_pendamping: 'Wiwik Ismiati, S.Pd & Tim Satgas ATS',
    created_at: '2026-11-05T08:00:00.000Z'
  }
];

// SQL Schema code for copying or automatic creation guidance
export const SABDA_BK_SQL_SCHEMA = `-- ====================================================================
-- SKRIP SQL DATABASE SUPABASE - SABDA BK SPANJU (BK PEDULI SISWA)
-- UPT SMP NEGERI 7 PASURUAN
-- ====================================================================

-- 1. TABEL FORM A: Agenda Kerja Harian BK
CREATE TABLE IF NOT EXISTS public.bk_agenda_kerja (
    id TEXT PRIMARY KEY,
    tanggal DATE NOT NULL,
    waktu TEXT,
    sasaran TEXT NOT NULL,
    uraian_kegiatan TEXT NOT NULL,
    hasil TEXT DEFAULT 'Terlaksana',
    guru_bk TEXT DEFAULT 'Wiwik Ismiati, S.Pd',
    foto_url TEXT,
    siswa_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL FORM B: Undangan Orang Tua / Wali Siswa
CREATE TABLE IF NOT EXISTS public.bk_undangan_ortu (
    id TEXT PRIMARY KEY,
    nomor_surat TEXT NOT NULL,
    siswa_id TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    nama_ortu TEXT,
    tanggal_hadir DATE NOT NULL,
    jam_hadir TEXT NOT NULL,
    tempat TEXT DEFAULT 'Ruang BK SMPN 7 Pasuruan',
    menemui TEXT DEFAULT 'Wiwik Ismiati, S.Pd (Guru BK)',
    perihal TEXT NOT NULL,
    status TEXT DEFAULT 'Menunggu',
    hasil_pertemuan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL FORM C: Home Visit / Kunjungan Rumah
CREATE TABLE IF NOT EXISTS public.bk_home_visit (
    id TEXT PRIMARY KEY,
    siswa_id TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    alamat TEXT NOT NULL,
    tanggal DATE NOT NULL,
    waktu TEXT NOT NULL,
    petugas TEXT NOT NULL,
    anggota_keluarga TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    hasil TEXT NOT NULL,
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL FORM D: Rekam Permasalahan / Kasus Siswa
CREATE TABLE IF NOT EXISTS public.bk_transaksi_kasus (
    id TEXT PRIMARY KEY,
    siswa_id TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL,
    jenis_kasus TEXT NOT NULL,
    kategori TEXT DEFAULT 'Sedang',
    poin INTEGER DEFAULT 0,
    penanganan TEXT,
    guru_bk TEXT DEFAULT 'Wiwik Ismiati, S.Pd',
    status TEXT DEFAULT 'Proses',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL FORM E: Rencana Konseling Individual
CREATE TABLE IF NOT EXISTS public.bk_konseling_individual (
    id TEXT PRIMARY KEY,
    siswa_id TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL,
    jam TEXT NOT NULL,
    bidang TEXT NOT NULL DEFAULT 'Pribadi',
    gejala_masalah TEXT NOT NULL,
    pendekatan_teknik TEXT NOT NULL,
    proses_konseling TEXT NOT NULL,
    rencana_tindak_lanjut TEXT NOT NULL,
    guru_bk TEXT DEFAULT 'Wiwik Ismiati, S.Pd',
    status TEXT DEFAULT 'Proses',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL FORM F: Rencana Konseling Kelompok
CREATE TABLE IF NOT EXISTS public.bk_konseling_kelompok (
    id TEXT PRIMARY KEY,
    topik TEXT NOT NULL,
    anggota_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL,
    jam TEXT NOT NULL,
    tempat TEXT DEFAULT 'Ruang Konseling Kelompok BK',
    tujuan TEXT NOT NULL,
    dinamika_kelompok TEXT,
    kesepakatan TEXT NOT NULL,
    evaluasi TEXT,
    guru_bk TEXT DEFAULT 'Wiwik Ismiati, S.Pd',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL FORM G: Surat Pernyataan Siswa
CREATE TABLE IF NOT EXISTS public.bk_surat_pernyataan (
    id TEXT PRIMARY KEY,
    nomor_surat TEXT NOT NULL,
    tanggal DATE NOT NULL,
    siswa_id TEXT,
    nama_siswa TEXT NOT NULL,
    nisn TEXT,
    kelas TEXT NOT NULL,
    nama_ortu TEXT NOT NULL,
    alamat_ortu TEXT,
    no_hp_ortu TEXT,
    jenis_pernyataan TEXT NOT NULL DEFAULT 'Perjanjian 2',
    butir_pelanggaran TEXT NOT NULL,
    isi_pernyataan TEXT NOT NULL,
    konsekuensi TEXT NOT NULL,
    guru_bk TEXT DEFAULT 'Wiwik Ismiati, S.Pd',
    wali_kelas TEXT,
    kepala_sekolah TEXT DEFAULT 'Drs. Edy Suprayitno, M.M.',
    status TEXT DEFAULT 'Aktif',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL FORM H: Berita Acara Konferensi Kasus Siswa
CREATE TABLE IF NOT EXISTS public.bk_konferensi_kasus (
    id TEXT PRIMARY KEY,
    nomor_dokumen TEXT NOT NULL,
    tanggal DATE NOT NULL,
    waktu TEXT NOT NULL,
    tempat TEXT DEFAULT 'Ruang BK SMPN 7 Pasuruan',
    siswa_id TEXT,
    nama_siswa TEXT NOT NULL,
    nisn TEXT,
    kelas TEXT NOT NULL,
    kasus_dibahas TEXT NOT NULL,
    tujuan_konferensi TEXT NOT NULL,
    peserta_hadir TEXT NOT NULL,
    pokok_pembahasan TEXT,
    kesepakatan_solusi TEXT NOT NULL,
    tindak_lanjut TEXT NOT NULL,
    pimpinan_sidang TEXT DEFAULT 'Drs. Edy Suprayitno, M.M.',
    notulis TEXT DEFAULT 'Wiwik Ismiati, S.Pd',
    status TEXT DEFAULT 'Dalam Pemantauan',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL FORM I: Penanganan Siswa ATS (Anak Tidak Sekolah)
CREATE TABLE IF NOT EXISTS public.bk_siswa_ats (
    id TEXT PRIMARY KEY,
    tanggal_identifikasi DATE NOT NULL,
    siswa_id TEXT,
    nama_siswa TEXT NOT NULL,
    nisn TEXT,
    kelas TEXT NOT NULL,
    jenis_kelamin TEXT DEFAULT 'L',
    alamat TEXT,
    nama_ortu TEXT,
    no_telp TEXT,
    kategori_ats TEXT NOT NULL DEFAULT 'Rentan Putus Sekolah',
    faktor_penyebab TEXT NOT NULL,
    lama_tidak_sekolah TEXT NOT NULL,
    upaya_penanganan TEXT NOT NULL,
    status_penanganan TEXT DEFAULT 'Pendampingan',
    catatan_hasil TEXT,
    petugas_pendamping TEXT DEFAULT 'Wiwik Ismiati, S.Pd & Tim Satgas ATS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS & HAK AKSES
ALTER TABLE public.bk_agenda_kerja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_undangan_ortu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_home_visit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_transaksi_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_konseling_individual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_konseling_kelompok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_surat_pernyataan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_konferensi_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_siswa_ats ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Full Access bk_agenda_kerja" ON public.bk_agenda_kerja;
    CREATE POLICY "Public Full Access bk_agenda_kerja" ON public.bk_agenda_kerja FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_undangan_ortu" ON public.bk_undangan_ortu;
    CREATE POLICY "Public Full Access bk_undangan_ortu" ON public.bk_undangan_ortu FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_home_visit" ON public.bk_home_visit;
    CREATE POLICY "Public Full Access bk_home_visit" ON public.bk_home_visit FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_transaksi_kasus" ON public.bk_transaksi_kasus;
    CREATE POLICY "Public Full Access bk_transaksi_kasus" ON public.bk_transaksi_kasus FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_konseling_individual" ON public.bk_konseling_individual;
    CREATE POLICY "Public Full Access bk_konseling_individual" ON public.bk_konseling_individual FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_konseling_kelompok" ON public.bk_konseling_kelompok;
    CREATE POLICY "Public Full Access bk_konseling_kelompok" ON public.bk_konseling_kelompok FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_surat_pernyataan" ON public.bk_surat_pernyataan;
    CREATE POLICY "Public Full Access bk_surat_pernyataan" ON public.bk_surat_pernyataan FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_konferensi_kasus" ON public.bk_konferensi_kasus;
    CREATE POLICY "Public Full Access bk_konferensi_kasus" ON public.bk_konferensi_kasus FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access bk_siswa_ats" ON public.bk_siswa_ats;
    CREATE POLICY "Public Full Access bk_siswa_ats" ON public.bk_siswa_ats FOR ALL USING (true) WITH CHECK (true);
END $$;

GRANT ALL ON TABLE public.bk_agenda_kerja TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_undangan_ortu TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_home_visit TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_transaksi_kasus TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_konseling_individual TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_konseling_kelompok TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_surat_pernyataan TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_konferensi_kasus TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_siswa_ats TO anon, authenticated, service_role;
`;

// Helper to check Supabase table status
export const checkSabdaTablesStatus = async (): Promise<{
  tables: Record<string, boolean>;
  allExist: boolean;
  checkedCount: number;
}> => {
  const tableNames = [
    'bk_agenda_kerja',
    'bk_undangan_ortu',
    'bk_home_visit',
    'bk_transaksi_kasus',
    'bk_konseling_individual',
    'bk_konseling_kelompok',
    'bk_surat_pernyataan',
    'bk_konferensi_kasus',
    'bk_siswa_ats'
  ];

  const results: Record<string, boolean> = {};

  if (!supabase) {
    tableNames.forEach(t => { results[t] = false; });
    return { tables: results, allExist: false, checkedCount: 0 };
  }

  await Promise.all(
    tableNames.map(async (table) => {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error || error.code !== '42P01') {
          results[table] = true;
        } else {
          results[table] = false;
        }
      } catch {
        results[table] = false;
      }
    })
  );

  const allExist = tableNames.every(t => results[t]);
  return { tables: results, allExist, checkedCount: tableNames.length };
};

const SABDA_SYNC_BUCKET = 'bukti_fisik';
const SABDA_SYNC_PREFIX = 'sabda_bk_sync';

interface CloudSnapshot<T> {
  records: T[];
  deletedIds: string[];
  updatedAt?: string;
}

const getDeletedStorageKey = (storageKey: string) => `${storageKey}_deleted`;

const readLocalDeletedIds = (storageKey: string): string[] => {
  try {
    const raw = localStorage.getItem(getDeletedStorageKey(storageKey));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const writeLocalDeletedIds = (storageKey: string, ids: string[]) => {
  try {
    localStorage.setItem(getDeletedStorageKey(storageKey), JSON.stringify(Array.from(new Set(ids.map(String)))));
  } catch {}
};

const emitSabdaUpdated = (tableName: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sabda-bk-updated', { detail: { tableName } }));
  }
};

const sortRecordsDesc = <T>(list: T[]): T[] => {
  return [...list].sort((a: any, b: any) => {
    const dateA = (a.tanggal || a.tanggal_hadir || a.tanggal_identifikasi || '').toString();
    const dateB = (b.tanggal || b.tanggal_hadir || b.tanggal_identifikasi || '').toString();
    if (dateA && dateB && dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
};

const readCloudSnapshot = async <T>(tableName: string): Promise<CloudSnapshot<T> | null> => {
  if (!supabase) return null;
  try {
    const path = `${SABDA_SYNC_PREFIX}/${tableName}.json`;
    const { data: pubData } = supabase.storage.from(SABDA_SYNC_BUCKET).getPublicUrl(path);
    if (!pubData?.publicUrl) return null;

    const resp = await fetch(`${pubData.publicUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!resp.ok) return null;

    const json = await resp.json();
    if (json && Array.isArray(json.records)) {
      return {
        records: json.records as T[],
        deletedIds: Array.isArray(json.deletedIds) ? json.deletedIds.map(String) : [],
        updatedAt: json.updatedAt
      };
    }
  } catch (e) {
    console.warn(`[SABDA BK] Notice reading cloud snapshot for ${tableName}:`, e);
  }
  return null;
};

const writeCloudSnapshot = async <T>(tableName: string, records: T[], deletedIds: string[]): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const path = `${SABDA_SYNC_PREFIX}/${tableName}.json`;
    const payload: CloudSnapshot<T> = {
      records,
      deletedIds: Array.from(new Set(deletedIds.map(String))),
      updatedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const { error } = await supabase.storage.from(SABDA_SYNC_BUCKET).upload(path, blob, {
      upsert: true,
      contentType: 'application/json',
      cacheControl: '0'
    });
    if (!error) return true;
    console.warn(`[SABDA BK] Notice writing cloud snapshot for ${tableName}:`, error.message);
  } catch (e) {
    console.warn(`[SABDA BK] Exception writing cloud snapshot for ${tableName}:`, e);
  }
  return false;
};

const upsertSqlRecord = async <T extends Record<string, any>>(tableName: string, record: T): Promise<boolean> => {
  if (!supabase) return false;
  let payload: Record<string, any> = { ...record };

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { error } = await supabase.from(tableName).upsert([payload]);
      if (!error) return true;

      // If a column doesn't exist yet in Supabase SQL schema (PGRST204), strip it and retry
      const msg = error.message || '';
      const colMatch = msg.match(/Could not find the '([^']+)' column/i);
      if (colMatch && colMatch[1] && colMatch[1] in payload) {
        const missingCol = colMatch[1];
        const nextPayload = { ...payload };
        delete nextPayload[missingCol];
        payload = nextPayload;
        continue;
      }

      return false;
    } catch {
      return false;
    }
  }
  return false;
};

const isRecordDifferent = (a: any, b: any): boolean => {
  if (!a || !b) return true;
  const norm = (obj: any) => {
    const copy: Record<string, any> = {};
    Object.keys(obj).sort().forEach(k => {
      if (k !== 'created_at' && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
        copy[k] = obj[k];
      }
    });
    return JSON.stringify(copy);
  };
  return norm(a) !== norm(b);
};

// Generic helper to get data with Supabase SQL + Cloud Storage Sync + localStorage merge
export const getSabdaData = async <T>(tableName: string, storageKey: string, initialData: T[]): Promise<T[]> => {
  let sqlData: T[] | null = null;
  let cloudSnapshot: CloudSnapshot<T> | null = null;

  try {
    const [sqlResult, snapshotResult] = await Promise.all([
      (async () => {
        if (!supabase) return null;
        try {
          const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
          if (!error && data) return data as T[];
        } catch (e) {
          console.warn(`[SABDA BK] Notice reading ${tableName} from Supabase:`, e);
        }
        return null;
      })(),
      readCloudSnapshot<T>(tableName)
    ]);
    sqlData = sqlResult;
    cloudSnapshot = snapshotResult;
  } catch (e) {
    console.warn(`[SABDA BK] Error fetching cloud data for ${tableName}:`, e);
  }

  let localData: T[] = [];
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) localData = parsed;
    }
  } catch {}

  const localDeletedIds = readLocalDeletedIds(storageKey);
  const cloudDeletedIds = cloudSnapshot?.deletedIds || [];
  const allDeletedSet = new Set<string>([...cloudDeletedIds, ...localDeletedIds]);

  const initialMap = new Map<string, T>();
  initialData.forEach(item => {
    if (item && (item as any).id) initialMap.set(String((item as any).id), item);
  });

  const cloudMap = new Map<string, T>();
  (cloudSnapshot?.records || []).forEach(item => {
    if (item && (item as any).id) {
      const id = String((item as any).id);
      if (!allDeletedSet.has(id)) cloudMap.set(id, item);
    }
  });
  (sqlData || []).forEach(item => {
    if (item && (item as any).id) {
      const id = String((item as any).id);
      if (!allDeletedSet.has(id)) cloudMap.set(id, item);
    }
  });

  const mergedMap = new Map<string, T>();

  // 1. Base initial sample items (unless deleted)
  initialData.forEach(item => {
    const id = String((item as any)?.id || '');
    if (id && !allDeletedSet.has(id)) {
      mergedMap.set(id, item);
    }
  });

  // 2. Cloud snapshot + SQL records
  cloudMap.forEach((item, id) => {
    if (!allDeletedSet.has(id)) {
      mergedMap.set(id, item);
    }
  });

  // 3. Merge unsynced local records (e.g., created in AI Studio before cloud sync) and push to cloud
  let needsCloudPush = false;
  const unsyncedLocalRecords: T[] = [];

  if (localDeletedIds.some(id => !cloudDeletedIds.includes(id))) {
    needsCloudPush = true;
  }

  localData.forEach(localItem => {
    const id = String((localItem as any)?.id || '');
    if (!id || allDeletedSet.has(id)) return;

    const cloudItem = cloudMap.get(id);
    const initialItem = initialMap.get(id);

    if (!cloudItem) {
      const isUntouchedSample = initialItem && !isRecordDifferent(localItem, initialItem);
      if (!isUntouchedSample) {
        mergedMap.set(id, localItem);
        unsyncedLocalRecords.push(localItem);
        needsCloudPush = true;
      }
    } else {
      const localTime = (localItem as any).created_at ? new Date((localItem as any).created_at).getTime() : 0;
      const cloudTime = (cloudItem as any).created_at ? new Date((cloudItem as any).created_at).getTime() : 0;
      if (localTime > cloudTime && isRecordDifferent(localItem, cloudItem)) {
        mergedMap.set(id, localItem);
        unsyncedLocalRecords.push(localItem);
        needsCloudPush = true;
      }
    }
  });

  const merged = sortRecordsDesc(Array.from(mergedMap.values()));

  try {
    localStorage.setItem(storageKey, JSON.stringify(merged));
    writeLocalDeletedIds(storageKey, Array.from(allDeletedSet));
  } catch {}

  // Push any unsynced local records or deletions to Cloud automatically
  if (needsCloudPush && supabase) {
    const snapshotRecords = merged.filter(item => {
      const id = String((item as any)?.id || '');
      const initialItem = initialMap.get(id);
      return !initialItem || isRecordDifferent(item, initialItem);
    });
    writeCloudSnapshot(tableName, snapshotRecords, Array.from(allDeletedSet)).catch(() => {});

    if (sqlData !== null && unsyncedLocalRecords.length > 0) {
      Promise.all(unsyncedLocalRecords.map(rec => upsertSqlRecord(tableName, rec as any))).catch(() => {});
    }
  }

  return merged;
};

// Generic helper to save record with Supabase SQL + Cloud Storage sync
export const saveSabdaRecord = async <T extends { id: string }>(
  tableName: string,
  storageKey: string,
  record: T
): Promise<T[]> => {
  let existing: T[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    existing = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }

  const deletedIds = readLocalDeletedIds(storageKey).filter(id => id !== String(record.id));
  writeLocalDeletedIds(storageKey, deletedIds);

  const index = existing.findIndex(item => String(item.id) === String(record.id));
  let updatedList: T[] = [];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = record;
  } else {
    updatedList = [record, ...existing];
  }
  updatedList = sortRecordsDesc(updatedList);
  localStorage.setItem(storageKey, JSON.stringify(updatedList));

  let sqlOk = false;
  let storageOk = false;
  let supabaseError = null;

  // 1. Sync to Supabase SQL table (if it exists)
  try {
    sqlOk = await upsertSqlRecord(tableName, record as any);
  } catch (e: any) {
    supabaseError = e;
  }

  // 2. Sync to Supabase Storage Cloud Snapshot (always works across AI Studio & Vercel)
  try {
    const currentCloud = await readCloudSnapshot<T>(tableName);
    const cloudMap = new Map<string, T>();
    (currentCloud?.records || []).forEach(item => {
      if (item && (item as any).id) cloudMap.set(String((item as any).id), item);
    });
    // Include any non-sample local records too so nothing is lost
    updatedList.forEach(item => {
      if (item && (item as any).id) cloudMap.set(String((item as any).id), item);
    });
    cloudMap.set(String(record.id), record);

    const mergedDeleted = Array.from(new Set([...(currentCloud?.deletedIds || []), ...deletedIds])).filter(
      id => id !== String(record.id)
    );
    const snapshotRecords = sortRecordsDesc(Array.from(cloudMap.values()).filter(item => !mergedDeleted.includes(String((item as any).id))));

    storageOk = await writeCloudSnapshot(tableName, snapshotRecords, mergedDeleted);
    if (storageOk) {
      // Keep local list synchronized with cloud merge as well
      const localMap = new Map<string, T>();
      updatedList.forEach(item => localMap.set(String(item.id), item));
      snapshotRecords.forEach(item => localMap.set(String(item.id), item));
      updatedList = sortRecordsDesc(Array.from(localMap.values()).filter(item => !mergedDeleted.includes(String(item.id))));
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      writeLocalDeletedIds(storageKey, mergedDeleted);
    }
  } catch (e: any) {
    supabaseError = supabaseError || e;
  }

  const isSavedToSupabase = sqlOk || storageOk;
  (updatedList as any).isSavedToSupabase = isSavedToSupabase;
  (updatedList as any).supabaseError = isSavedToSupabase ? null : supabaseError;

  emitSabdaUpdated(tableName);
  return updatedList;
};

// Generic helper to delete record
export const deleteSabdaRecord = async <T extends { id: string }>(
  tableName: string,
  storageKey: string,
  id: string
): Promise<T[]> => {
  let existing: T[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    existing = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }

  const updatedList = existing.filter(item => String(item.id) !== String(id));
  localStorage.setItem(storageKey, JSON.stringify(updatedList));

  const updatedDeletedIds = Array.from(new Set([...readLocalDeletedIds(storageKey), String(id)]));
  writeLocalDeletedIds(storageKey, updatedDeletedIds);

  try {
    if (supabase) {
      await supabase.from(tableName).delete().eq('id', id);
    }
  } catch (e) {
    console.warn(`[SABDA BK] Supabase delete for ${tableName} skipped:`, e);
  }

  try {
    const currentCloud = await readCloudSnapshot<T>(tableName);
    const mergedDeleted = Array.from(new Set([...(currentCloud?.deletedIds || []), ...updatedDeletedIds]));
    const updatedCloudRecords = (currentCloud?.records || updatedList).filter(
      item => !mergedDeleted.includes(String((item as any).id))
    );
    await writeCloudSnapshot(tableName, updatedCloudRecords, mergedDeleted);
  } catch (e) {
    console.warn(`[SABDA BK] Cloud snapshot delete for ${tableName} skipped:`, e);
  }

  emitSabdaUpdated(tableName);
  return updatedList;
};

// Form specific functions
export const sabdaService = {
  // Form A: Agenda Kerja
  getAgenda: () => getSabdaData<AgendaKerjaBK>('bk_agenda_kerja', 'sabda_bk_agenda', INITIAL_AGENDA),
  saveAgenda: (record: AgendaKerjaBK) => saveSabdaRecord<AgendaKerjaBK>('bk_agenda_kerja', 'sabda_bk_agenda', record),
  deleteAgenda: (id: string) => deleteSabdaRecord<AgendaKerjaBK>('bk_agenda_kerja', 'sabda_bk_agenda', id),

  // Form B: Undangan Orang Tua
  getUndangan: () => getSabdaData<UndanganOrtuBK>('bk_undangan_ortu', 'sabda_bk_undangan', INITIAL_UNDANGAN),
  saveUndangan: (record: UndanganOrtuBK) => saveSabdaRecord<UndanganOrtuBK>('bk_undangan_ortu', 'sabda_bk_undangan', record),
  deleteUndangan: (id: string) => deleteSabdaRecord<UndanganOrtuBK>('bk_undangan_ortu', 'sabda_bk_undangan', id),

  // Form C: Home Visit
  getHomeVisit: () => getSabdaData<HomeVisitBK>('bk_home_visit', 'sabda_bk_home_visit', INITIAL_HOME_VISIT),
  saveHomeVisit: (record: HomeVisitBK) => saveSabdaRecord<HomeVisitBK>('bk_home_visit', 'sabda_bk_home_visit', record),
  deleteHomeVisit: (id: string) => deleteSabdaRecord<HomeVisitBK>('bk_home_visit', 'sabda_bk_home_visit', id),

  // Form E: Konseling Individual
  getKonselingIndividual: () => getSabdaData<KonselingIndividualBK>('bk_konseling_individual', 'sabda_bk_individual', INITIAL_INDIVIDUAL),
  saveKonselingIndividual: (record: KonselingIndividualBK) => saveSabdaRecord<KonselingIndividualBK>('bk_konseling_individual', 'sabda_bk_individual', record),
  deleteKonselingIndividual: (id: string) => deleteSabdaRecord<KonselingIndividualBK>('bk_konseling_individual', 'sabda_bk_individual', id),

  // Form F: Konseling Kelompok
  getKonselingKelompok: () => getSabdaData<KonselingKelompokBK>('bk_konseling_kelompok', 'sabda_bk_kelompok', INITIAL_KELOMPOK),
  saveKonselingKelompok: (record: KonselingKelompokBK) => saveSabdaRecord<KonselingKelompokBK>('bk_konseling_kelompok', 'sabda_bk_kelompok', record),
  deleteKonselingKelompok: (id: string) => deleteSabdaRecord<KonselingKelompokBK>('bk_konseling_kelompok', 'sabda_bk_kelompok', id),

  // Form G: Surat Pernyataan Siswa
  getPernyataan: () => getSabdaData<SuratPernyataanBK>('bk_surat_pernyataan', 'sabda_bk_pernyataan', INITIAL_PERNYATAAN),
  savePernyataan: (record: SuratPernyataanBK) => saveSabdaRecord<SuratPernyataanBK>('bk_surat_pernyataan', 'sabda_bk_pernyataan', record),
  deletePernyataan: (id: string) => deleteSabdaRecord<SuratPernyataanBK>('bk_surat_pernyataan', 'sabda_bk_pernyataan', id),

  // Form H: Konferensi Kasus Siswa
  getKonferensi: () => getSabdaData<KonferensiKasusBK>('bk_konferensi_kasus', 'sabda_bk_konferensi', INITIAL_KONFERENSI),
  saveKonferensi: (record: KonferensiKasusBK) => saveSabdaRecord<KonferensiKasusBK>('bk_konferensi_kasus', 'sabda_bk_konferensi', record),
  deleteKonferensi: (id: string) => deleteSabdaRecord<KonferensiKasusBK>('bk_konferensi_kasus', 'sabda_bk_konferensi', id),

  // Form I: Siswa ATS
  getATS: () => getSabdaData<SiswaATSBK>('bk_siswa_ats', 'sabda_bk_ats', INITIAL_ATS),
  saveATS: (record: SiswaATSBK) => saveSabdaRecord<SiswaATSBK>('bk_siswa_ats', 'sabda_bk_ats', record),
  deleteATS: (id: string) => deleteSabdaRecord<SiswaATSBK>('bk_siswa_ats', 'sabda_bk_ats', id),

  // Check Table Status
  checkTables: checkSabdaTablesStatus,
  sqlSchema: SABDA_BK_SQL_SCHEMA,
};


