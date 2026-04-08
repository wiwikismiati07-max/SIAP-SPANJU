-- SIPENA (Sistem Informasi Perpustakaan Siswa) SCHEMA

-- 1. Master Buku
CREATE TABLE IF NOT EXISTS sipena_buku (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul_buku TEXT NOT NULL,
  jenis_buku TEXT, -- Fiksi, Non-Fiksi, Referensi, dll
  mapel_id TEXT REFERENCES master_mapel(id), -- Jenis (master_Matapelajaran)
  edisi TEXT,
  isbn_issn TEXT,
  penerbit TEXT,
  tahun TEXT,
  kolasi TEXT,
  judul_seri TEXT,
  nomor_panggil TEXT,
  bahasa_buku TEXT DEFAULT 'Indonesia',
  kota_terbit TEXT,
  nomor_kelas TEXT,
  catatan TEXT,
  guru_id TEXT REFERENCES master_guru(id), -- Penanggung Jawab
  pengarang TEXT,
  subjek TEXT,
  kode_eksemplar TEXT UNIQUE,
  stok_eksemplar INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Kunjungan Siswa
CREATE TABLE IF NOT EXISTS sipena_kunjungan_siswa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  kelas TEXT NOT NULL,
  siswa_id TEXT REFERENCES master_siswa(id),
  keperluan TEXT CHECK (keperluan IN ('Membaca', 'Belajar', 'Mengembalikan', 'Meminjam Buku', 'Lain-lain')),
  keterangan_lain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Kunjungan Warta (Guru/Staf)
CREATE TABLE IF NOT EXISTS sipena_kunjungan_warta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  kelas TEXT,
  guru_id TEXT REFERENCES master_guru(id),
  mapel_id TEXT REFERENCES master_mapel(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Peminjaman Buku
CREATE TABLE IF NOT EXISTS sipena_peminjaman (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal_pinjam DATE NOT NULL DEFAULT CURRENT_DATE,
  jam_pinjam TIME NOT NULL DEFAULT CURRENT_TIME,
  kelas TEXT NOT NULL,
  siswa_id TEXT REFERENCES master_siswa(id),
  tanggal_kembali_rencana DATE NOT NULL,
  status TEXT DEFAULT 'Dipinjam' CHECK (status IN ('Dipinjam', 'Kembali', 'Terlambat')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Item Peminjaman (Detail Buku yang dipinjam)
CREATE TABLE IF NOT EXISTS sipena_peminjaman_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peminjaman_id UUID REFERENCES sipena_peminjaman(id) ON DELETE CASCADE,
  buku_id UUID REFERENCES sipena_buku(id),
  jumlah INTEGER DEFAULT 1 CHECK (jumlah >= 1 AND jumlah <= 50),
  tanggal_kembali_aktual DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE sipena_buku ENABLE ROW LEVEL SECURITY;
ALTER TABLE sipena_kunjungan_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE sipena_kunjungan_warta ENABLE ROW LEVEL SECURITY;
ALTER TABLE sipena_peminjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE sipena_peminjaman_item ENABLE ROW LEVEL SECURITY;

-- Allow all access for now to facilitate development
CREATE POLICY "Allow all access to sipena_buku" ON sipena_buku FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sipena_kunjungan_siswa" ON sipena_kunjungan_siswa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sipena_kunjungan_warta" ON sipena_kunjungan_warta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sipena_peminjaman" ON sipena_peminjaman FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sipena_peminjaman_item" ON sipena_peminjaman_item FOR ALL USING (true) WITH CHECK (true);

-- Function to update stock on borrowing
CREATE OR REPLACE FUNCTION sipena_update_stock_borrow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sipena_buku
  SET stok_eksemplar = stok_eksemplar - NEW.jumlah
  WHERE id = NEW.buku_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sipena_borrow_stock
AFTER INSERT ON sipena_peminjaman_item
FOR EACH ROW EXECUTE FUNCTION sipena_update_stock_borrow();

-- Function to update stock on return
CREATE OR REPLACE FUNCTION sipena_update_stock_return()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tanggal_kembali_aktual IS NULL AND NEW.tanggal_kembali_aktual IS NOT NULL THEN
    UPDATE sipena_buku
    SET stok_eksemplar = stok_eksemplar + NEW.jumlah
    WHERE id = NEW.buku_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sipena_return_stock
AFTER UPDATE ON sipena_peminjaman_item
FOR EACH ROW EXECUTE FUNCTION sipena_update_stock_return();
