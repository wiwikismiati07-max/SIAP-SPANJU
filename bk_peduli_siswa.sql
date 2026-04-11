-- SQL for BK Peduli Siswa - Digital Counseling System

-- Master Pelanggaran (Types of violations)
CREATE TABLE IF NOT EXISTS master_pelanggaran (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  nama_pelanggaran TEXT NOT NULL,
  kategori TEXT, -- Ringan, Sedang, Berat
  poin INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaksi Pelanggaran (Violation records)
CREATE TABLE IF NOT EXISTS transaksi_pelanggaran (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  kelas TEXT, -- 7A-7H, 8A-8H, 9A-9H
  siswa_id TEXT REFERENCES master_siswa(id),
  pelanggaran_id TEXT REFERENCES master_pelanggaran(id),
  kasus_kategori TEXT, -- Kedisiplinan, Etika, Akademi, Bullying, Perkelahian, merokok, Narkoba, Lain-Lain
  kronologi TEXT, -- Up to 500 words
  bukti_fisik TEXT[], -- Multi attachment (array of URLs)
  wali_kelas TEXT,
  guru_bk TEXT, -- Wiwik Ismiati S.pd, Eki Febriani S.pd
  catatan TEXT,
  status TEXT DEFAULT 'Proses', -- Proses, Selesai
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tindak Lanjut Kasus (One case can have multiple follow-ups)
CREATE TABLE IF NOT EXISTS tindak_lanjut_kasus (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  transaksi_id TEXT REFERENCES transaksi_pelanggaran(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  tindak_lanjut TEXT, -- Konseling Individu, Konseling Kelompok, Panggilan Orang Tua, Mediasi, Home visit, Skorsing, Lain-lain
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE master_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE tindak_lanjut_kasus ENABLE ROW LEVEL SECURITY;

-- Simple policies (allow all for now as per app pattern)
CREATE POLICY "Allow all for master_pelanggaran" ON master_pelanggaran FOR ALL USING (true);
CREATE POLICY "Allow all for transaksi_pelanggaran" ON transaksi_pelanggaran FOR ALL USING (true);
CREATE POLICY "Allow all for tindak_lanjut_kasus" ON tindak_lanjut_kasus FOR ALL USING (true);
