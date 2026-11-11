-- ====================================================================
-- SKRIP SQL DATABASE SUPABASE - SABDA BK SPANJU (BK PEDULI SISWA)
-- UPT SMP NEGERI 7 PASURUAN
-- ====================================================================
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda.
-- Skrip ini akan membuat seluruh 9 tabel formulir layanan BK (Form A s/d Form I),
-- mengaktifkan Row Level Security (RLS), dan menambahkan indeks pencarian cepat.
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

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & HAK AKSES PUBLIK / ANON
-- ====================================================================

ALTER TABLE public.bk_agenda_kerja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_undangan_ortu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_home_visit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_transaksi_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_konseling_individual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_konseling_kelompok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_surat_pernyataan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_konferensi_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_siswa_ats ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Penuh (SELECT, INSERT, UPDATE, DELETE) untuk peran anon dan authenticated
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

-- Memberikan hak akses tabel ke peran anon dan authenticated
GRANT ALL ON TABLE public.bk_agenda_kerja TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_undangan_ortu TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_home_visit TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_transaksi_kasus TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_konseling_individual TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_konseling_kelompok TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_surat_pernyataan TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_konferensi_kasus TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bk_siswa_ats TO anon, authenticated, service_role;

-- Indeks pencarian
CREATE INDEX IF NOT EXISTS idx_bk_agenda_tanggal ON public.bk_agenda_kerja(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_bk_undangan_tanggal ON public.bk_undangan_ortu(tanggal_hadir DESC);
CREATE INDEX IF NOT EXISTS idx_bk_transaksi_tanggal ON public.bk_transaksi_kasus(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_bk_pernyataan_tanggal ON public.bk_surat_pernyataan(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_bk_konferensi_tanggal ON public.bk_konferensi_kasus(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_bk_ats_tanggal ON public.bk_siswa_ats(tanggal_identifikasi DESC);
