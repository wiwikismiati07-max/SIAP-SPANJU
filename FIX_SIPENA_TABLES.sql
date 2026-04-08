-- FIX FOR SIPENA TABLES (UUID COMPATIBILITY VERSION)
-- Execute this in your Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Master Buku
CREATE TABLE IF NOT EXISTS public.sipena_buku (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul_buku TEXT NOT NULL,
  jenis_buku TEXT, -- Fiksi, Non-Fiksi, Referensi, dll
  mapel_id UUID REFERENCES public.master_mapel(id), -- Changed to UUID to match master_mapel
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
  guru_id UUID REFERENCES public.master_guru(id), -- Changed to UUID to match master_guru
  pengarang TEXT,
  subjek TEXT,
  kode_eksemplar TEXT UNIQUE,
  stok_eksemplar INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Kunjungan Siswa
CREATE TABLE IF NOT EXISTS public.sipena_kunjungan_siswa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  kelas TEXT NOT NULL,
  siswa_id UUID REFERENCES public.master_siswa(id), -- Changed to UUID
  keperluan TEXT CHECK (keperluan IN ('Membaca', 'Belajar', 'Mengembalikan', 'Meminjam Buku', 'Lain-lain')),
  keterangan_lain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Kunjungan Warta (Guru/Staf)
CREATE TABLE IF NOT EXISTS public.sipena_kunjungan_warta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME NOT NULL DEFAULT CURRENT_TIME,
  kelas TEXT,
  guru_id UUID REFERENCES public.master_guru(id), -- Changed to UUID
  mapel_id UUID REFERENCES public.master_mapel(id), -- Changed to UUID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Peminjaman Buku
CREATE TABLE IF NOT EXISTS public.sipena_peminjaman (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal_pinjam DATE NOT NULL DEFAULT CURRENT_DATE,
  jam_pinjam TIME NOT NULL DEFAULT CURRENT_TIME,
  kelas TEXT NOT NULL,
  siswa_id UUID REFERENCES public.master_siswa(id), -- Changed to UUID
  tanggal_kembali_rencana DATE NOT NULL,
  status TEXT DEFAULT 'Dipinjam' CHECK (status IN ('Dipinjam', 'Kembali', 'Terlambat')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Item Peminjaman (Detail Buku yang dipinjam)
CREATE TABLE IF NOT EXISTS public.sipena_peminjaman_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peminjaman_id UUID REFERENCES public.sipena_peminjaman(id) ON DELETE CASCADE,
  buku_id UUID REFERENCES public.sipena_buku(id),
  jumlah INTEGER DEFAULT 1 CHECK (jumlah >= 1 AND jumlah <= 50),
  tanggal_kembali_aktual DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS Policies
ALTER TABLE public.sipena_buku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sipena_kunjungan_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sipena_kunjungan_warta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sipena_peminjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sipena_peminjaman_item ENABLE ROW LEVEL SECURITY;

-- Allow all access for now to facilitate development
DROP POLICY IF EXISTS "Allow all access to sipena_buku" ON public.sipena_buku;
CREATE POLICY "Allow all access to sipena_buku" ON public.sipena_buku FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to sipena_kunjungan_siswa" ON public.sipena_kunjungan_siswa;
CREATE POLICY "Allow all access to sipena_kunjungan_siswa" ON public.sipena_kunjungan_siswa FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to sipena_kunjungan_warta" ON public.sipena_kunjungan_warta;
CREATE POLICY "Allow all access to sipena_kunjungan_warta" ON public.sipena_kunjungan_warta FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to sipena_peminjaman" ON public.sipena_peminjaman;
CREATE POLICY "Allow all access to sipena_peminjaman" ON public.sipena_peminjaman FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to sipena_peminjaman_item" ON public.sipena_peminjaman_item;
CREATE POLICY "Allow all access to sipena_peminjaman_item" ON public.sipena_peminjaman_item FOR ALL USING (true) WITH CHECK (true);

-- 8. Functions to update stock
CREATE OR REPLACE FUNCTION public.sipena_update_stock_borrow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sipena_buku
  SET stok_eksemplar = stok_eksemplar - NEW.jumlah
  WHERE id = NEW.buku_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sipena_borrow_stock ON public.sipena_peminjaman_item;
CREATE TRIGGER trg_sipena_borrow_stock
AFTER INSERT ON public.sipena_peminjaman_item
FOR EACH ROW EXECUTE FUNCTION public.sipena_update_stock_borrow();

CREATE OR REPLACE FUNCTION public.sipena_update_stock_return()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tanggal_kembali_aktual IS NULL AND NEW.tanggal_kembali_aktual IS NOT NULL THEN
    UPDATE public.sipena_buku
    SET stok_eksemplar = stok_eksemplar + NEW.jumlah
    WHERE id = NEW.buku_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sipena_return_stock ON public.sipena_peminjaman_item;
CREATE TRIGGER trg_sipena_return_stock
AFTER UPDATE ON public.sipena_peminjaman_item
FOR EACH ROW EXECUTE FUNCTION public.sipena_update_stock_return();
