-- SQL for BK Peduli Siswa - Digital Counseling System

-- Master Pelanggaran (Types of violations)
CREATE TABLE IF NOT EXISTS master_pelanggaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_pelanggaran TEXT NOT NULL,
  kategori TEXT, -- Ringan, Sedang, Berat
  poin INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaksi Pelanggaran (Violation records)
CREATE TABLE IF NOT EXISTS transaksi_pelanggaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  siswa_id UUID REFERENCES master_siswa(id),
  pelanggaran_id UUID REFERENCES master_pelanggaran(id),
  alasan TEXT,
  penanganan TEXT, -- Akademik, Bullying, Etika, Kedisiplinan, Lainnya
  konsekuensi TEXT, -- Surat pernyataan orang tua, Surat pernyataan Siswa
  tindak_lanjut TEXT, -- Konseling Individu, Konseling Kelompok, Bimbingan Kelompok, Kunjungan Rumah/Home Visit, Tangan alih kasus/Referral, Konferensi Kasus, Mediasi
  wali_kelas TEXT,
  guru_bk TEXT, -- Wiwik Ismiati S.pd, Ekik Febriani S.pd
  status TEXT DEFAULT 'Proses', -- Proses, Selesai
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE master_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_pelanggaran ENABLE ROW LEVEL SECURITY;

-- Simple policies (allow all for now as per app pattern)
CREATE POLICY "Allow all for master_pelanggaran" ON master_pelanggaran FOR ALL USING (true);
CREATE POLICY "Allow all for transaksi_pelanggaran" ON transaksi_pelanggaran FOR ALL USING (true);
