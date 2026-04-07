-- UKS SMPN7 SCHEMA

-- 1. Master Keluhan
CREATE TABLE IF NOT EXISTS uks_keluhan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_keluhan TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stok Obat
CREATE TABLE IF NOT EXISTS uks_obat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_obat TEXT NOT NULL UNIQUE,
  stok INTEGER DEFAULT 0,
  satuan TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Kunjungan / Periksa
CREATE TABLE IF NOT EXISTS uks_kunjungan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  siswa_id TEXT REFERENCES master_siswa(id),
  keluhan_id UUID REFERENCES uks_keluhan(id),
  penanganan TEXT CHECK (penanganan IN ('Minum Obat', 'Pulang', 'Istirahat')),
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Penggunaan Obat (Detail Kunjungan)
CREATE TABLE IF NOT EXISTS uks_kunjungan_obat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kunjungan_id UUID REFERENCES uks_kunjungan(id) ON DELETE CASCADE,
  obat_id UUID REFERENCES uks_obat(id),
  jumlah INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Screening
CREATE TABLE IF NOT EXISTS uks_screening (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  siswa_id TEXT REFERENCES master_siswa(id),
  evaluasi TEXT CHECK (evaluasi IN ('Sehat', 'Pemantauan', 'Perlu Rujukan')),
  catatan TEXT,
  petugas TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE uks_keluhan ENABLE ROW LEVEL SECURITY;
ALTER TABLE uks_obat ENABLE ROW LEVEL SECURITY;
ALTER TABLE uks_kunjungan ENABLE ROW LEVEL SECURITY;
ALTER TABLE uks_kunjungan_obat ENABLE ROW LEVEL SECURITY;
ALTER TABLE uks_screening ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to uks_keluhan" ON uks_keluhan;
CREATE POLICY "Allow all access to uks_keluhan" ON uks_keluhan FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to uks_obat" ON uks_obat;
CREATE POLICY "Allow all access to uks_obat" ON uks_obat FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to uks_kunjungan" ON uks_kunjungan;
CREATE POLICY "Allow all access to uks_kunjungan" ON uks_kunjungan FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to uks_kunjungan_obat" ON uks_kunjungan_obat;
CREATE POLICY "Allow all access to uks_kunjungan_obat" ON uks_kunjungan_obat FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to uks_screening" ON uks_screening;
CREATE POLICY "Allow all access to uks_screening" ON uks_screening FOR ALL USING (true) WITH CHECK (true);

-- Initial Data for Keluhan
INSERT INTO uks_keluhan (nama_keluhan) VALUES 
('Pusing'), ('Sakit Perut'), ('Mual'), ('Luka Ringan'), ('Demam'), ('Sesak Napas')
ON CONFLICT (nama_keluhan) DO NOTHING;
