-- COMPREHENSIVE SQL FOR SIAP SPANJU & BK PEDULI SISWA
-- Execute this in your Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. App Users (Login System)
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'entry', -- 'full' (Admin), 'entry' (Staff)
  nama_lengkap TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. App Links (Dashboard Menu)
CREATE TABLE IF NOT EXISTS app_links (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  display_mode TEXT DEFAULT 'iframe', -- 'iframe', 'new_tab'
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Master Data: Siswa
CREATE TABLE IF NOT EXISTS master_siswa (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,
  nisn TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Master Data: Guru
CREATE TABLE IF NOT EXISTS master_guru (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  nama_guru TEXT NOT NULL,
  nip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Master Data: Mata Pelajaran
CREATE TABLE IF NOT EXISTS master_mapel (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  nama_mapel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Izin Siswa (Attendance System)
CREATE TABLE IF NOT EXISTS izin_siswa (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  siswa_id TEXT REFERENCES master_siswa(id) ON DELETE CASCADE,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  alasan TEXT NOT NULL,
  status TEXT DEFAULT 'Menunggu', -- 'Menunggu', 'Disetujui', 'Ditolak'
  diajukan_oleh TEXT NOT NULL, -- 'Wali Murid', 'Operator', 'Guru'
  keterangan TEXT,
  nama_wali TEXT,
  no_telp_wali TEXT,
  lampiran_url TEXT,
  guru_id TEXT REFERENCES master_guru(id),
  mapel_id TEXT REFERENCES master_mapel(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Master Pelanggaran (BK System)
CREATE TABLE IF NOT EXISTS master_pelanggaran (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  nama_pelanggaran TEXT NOT NULL,
  kategori TEXT, -- 'Ringan', 'Sedang', 'Berat'
  poin INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Transaksi Pelanggaran (BK System)
CREATE TABLE IF NOT EXISTS transaksi_pelanggaran (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  siswa_id TEXT REFERENCES master_siswa(id) ON DELETE CASCADE,
  pelanggaran_id TEXT REFERENCES master_pelanggaran(id),
  alasan TEXT,
  penanganan TEXT, -- 'Akademik', 'Bullying', 'Etika', 'Kedisiplinan', 'Lainnya'
  konsekuensi TEXT, -- 'Surat pernyataan orang tua', 'Surat pernyataan Siswa'
  tindak_lanjut TEXT, -- 'Konseling Individu', 'Konseling Kelompok', etc.
  wali_kelas TEXT,
  guru_bk TEXT, -- 'Wiwik Ismiati S.pd', 'Ekik Febriani S.pd'
  catatan TEXT,
  status TEXT DEFAULT 'Proses', -- 'Proses', 'Selesai'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Kalender Belajar
CREATE TABLE IF NOT EXISTS kalender_belajar (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tanggal DATE UNIQUE NOT NULL,
  keterangan TEXT,
  libur BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. BK Peduli Siswa: Master Kasus
CREATE TABLE IF NOT EXISTS bk_master_kasus (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    nama_kasus TEXT NOT NULL,
    kategori TEXT DEFAULT 'Berat',
    poin INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. BK Peduli Siswa: Transaksi Kasus
CREATE TABLE IF NOT EXISTS bk_transaksi_kasus (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    kelas TEXT NOT NULL,
    siswa_id TEXT REFERENCES master_siswa(id),
    kasus_id TEXT REFERENCES bk_master_kasus(id),
    kasus_kategori TEXT NOT NULL,
    kronologi TEXT,
    bukti_fisik TEXT[],
    wali_kelas TEXT,
    guru_bk TEXT,
    status TEXT DEFAULT 'Proses',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. BK Peduli Siswa: Tindak Lanjut
CREATE TABLE IF NOT EXISTS bk_tindak_lanjut (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    transaksi_id TEXT REFERENCES bk_transaksi_kasus(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tindak_lanjut TEXT NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Enable Row Level Security (RLS)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE izin_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalender_belajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_master_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_transaksi_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE bk_tindak_lanjut ENABLE ROW LEVEL SECURITY;

-- 15. Create Policies
CREATE POLICY "Allow all for app_users" ON app_users FOR ALL USING (true);
CREATE POLICY "Allow all for app_links" ON app_links FOR ALL USING (true);
CREATE POLICY "Allow all for master_siswa" ON master_siswa FOR ALL USING (true);
CREATE POLICY "Allow all for master_guru" ON master_guru FOR ALL USING (true);
CREATE POLICY "Allow all for master_mapel" ON master_mapel FOR ALL USING (true);
CREATE POLICY "Allow all for izin_siswa" ON izin_siswa FOR ALL USING (true);
CREATE POLICY "Allow all for master_pelanggaran" ON master_pelanggaran FOR ALL USING (true);
CREATE POLICY "Allow all for transaksi_pelanggaran" ON transaksi_pelanggaran FOR ALL USING (true);
CREATE POLICY "Allow all for kalender_belajar" ON kalender_belajar FOR ALL USING (true);
CREATE POLICY "Allow all for bk_master_kasus" ON bk_master_kasus FOR ALL USING (true);
CREATE POLICY "Allow all for bk_transaksi_kasus" ON bk_transaksi_kasus FOR ALL USING (true);
CREATE POLICY "Allow all for bk_tindak_lanjut" ON bk_tindak_lanjut FOR ALL USING (true);

-- 13. Insert Default Admin (Optional)
-- Password here is 'admin123' (plain text for demo, use hashing in real apps)
INSERT INTO app_users (username, password, role, nama_lengkap)
VALUES ('admin', 'admin123', 'full', 'Administrator Utama')
ON CONFLICT (username) DO NOTHING;
