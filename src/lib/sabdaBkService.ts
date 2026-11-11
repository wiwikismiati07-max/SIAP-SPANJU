import { supabase } from './supabase';

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
    created_at: new Date().toISOString()
  },
  {
    id: 'ag-2',
    tanggal: '2026-11-10',
    sasaran: 'Kelas 8C & 8D',
    uraian_kegiatan: 'Bimbingan klasikal tentang pencegahan perundungan (Anti-Bullying) dan penguatan karakter Ramah Anak.',
    hasil: 'Terbentuk deklarasi kelas bebas bullying dan saling menghormati.',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    created_at: new Date().toISOString()
  },
  {
    id: 'ag-3',
    tanggal: '2026-11-09',
    sasaran: 'Kelas 9A, 9B, 9C',
    uraian_kegiatan: 'Layanan informasi karir dan persiapan studi lanjut ke jenjang SMA/SMK.',
    hasil: 'Siswa mulai memetakan minat jurusan dan bakat vokasi.',
    guru_bk: 'Wiwik Ismiati, S.Pd',
    created_at: new Date().toISOString()
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
    created_at: new Date().toISOString()
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
    created_at: new Date().toISOString()
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
    created_at: new Date().toISOString()
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
    created_at: new Date().toISOString()
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
    created_at: new Date().toISOString()
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
    created_at: new Date().toISOString()
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
    created_at: new Date().toISOString()
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

// Generic helper to get data with Supabase priority and localStorage fallback
export const getSabdaData = async <T>(tableName: string, storageKey: string, initialData: T[]): Promise<T[]> => {
  let supabaseData: T[] | null = null;
  try {
    if (supabase) {
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (!error && data) {
        supabaseData = data as T[];
      }
    }
  } catch (e) {
    console.warn(`[SABDA BK] Notice reading ${tableName} from Supabase:`, e);
  }

  let localData: T[] = [];
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      localData = JSON.parse(cached);
    }
  } catch {}

  // Merge Initial data, Local data, and Supabase data uniquely by id
  const map = new Map<string, T>();
  
  // 1. Add initial sample data first
  initialData.forEach(item => {
    if (item && (item as any).id) {
      map.set(String((item as any).id), item);
    }
  });

  // 2. Add local data (user saved/edited items take precedence over initial)
  localData.forEach(item => {
    if (item && (item as any).id) {
      map.set(String((item as any).id), item);
    }
  });

  // 3. Add Supabase data (cloud data takes highest precedence)
  if (supabaseData) {
    supabaseData.forEach(item => {
      if (item && (item as any).id) {
        map.set(String((item as any).id), item);
      }
    });
  }

  const merged = Array.from(map.values());
  merged.sort((a: any, b: any) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  localStorage.setItem(storageKey, JSON.stringify(merged));
  return merged;
};

// Generic helper to save record with Supabase sync
export const saveSabdaRecord = async <T extends { id: string }>(
  tableName: string,
  storageKey: string,
  record: T
): Promise<T[]> => {
  let existing: T[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    existing = raw ? JSON.parse(raw) : [];
  } catch {
    existing = [];
  }

  const index = existing.findIndex(item => String(item.id) === String(record.id));
  let updatedList: T[] = [];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = record;
  } else {
    updatedList = [record, ...existing];
  }
  localStorage.setItem(storageKey, JSON.stringify(updatedList));

  let isSavedToSupabase = false;
  let supabaseError = null;

  // Sync to Supabase
  try {
    if (supabase) {
      const { error } = await supabase.from(tableName).upsert([record]);
      if (!error) {
        isSavedToSupabase = true;
      } else {
        supabaseError = error;
        console.warn(`[SABDA BK] Upsert pada tabel "${tableName}" Supabase: ${error.message} (Data tetap aman tersimpan di cache lokal).`);
      }
    }
  } catch (e: any) {
    supabaseError = e;
    console.warn(`[SABDA BK] Exception saat upsert ke Supabase (${tableName}):`, e);
  }

  // Attach status metadata safely to array
  (updatedList as any).isSavedToSupabase = isSavedToSupabase;
  (updatedList as any).supabaseError = supabaseError;

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
  } catch {
    existing = [];
  }

  const updatedList = existing.filter(item => String(item.id) !== String(id));
  localStorage.setItem(storageKey, JSON.stringify(updatedList));

  try {
    if (supabase) {
      await supabase.from(tableName).delete().eq('id', id);
    }
  } catch (e) {
    console.warn(`[SABDA BK] Supabase delete for ${tableName} skipped:`, e);
  }

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


