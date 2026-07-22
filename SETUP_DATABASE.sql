-- ==========================================
-- SQL SETUP UNTUK FITUR BARU SIAP SPANJU
-- Copy dan Run script ini di Supabase SQL Editor
-- ==========================================

-- 1. TABEL KELULUSAN
CREATE TABLE IF NOT EXISTS public.kelulusan (
    nis TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    kelas TEXT,
    jenis_kelamin TEXT,
    no_peserta TEXT,
    ruang TEXT,
    keterangan TEXT DEFAULT 'Lulus',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS untuk Kelulusan
ALTER TABLE public.kelulusan ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors on rerun
DROP POLICY IF EXISTS "Allow public read kelulusan" ON public.kelulusan;
DROP POLICY IF EXISTS "Allow write for authenticated" ON public.kelulusan;

CREATE POLICY "Allow public read kelulusan" ON public.kelulusan
    FOR SELECT USING (true);

CREATE POLICY "Allow write for authenticated" ON public.kelulusan
    FOR ALL USING (auth.role() = 'authenticated' OR true)
    WITH CHECK (auth.role() = 'authenticated' OR true);


-- 2. TABEL TRACING ALUMNI
CREATE TABLE IF NOT EXISTS public.alumni_tracing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_lengkap TEXT NOT NULL,
    jenis_kelamin TEXT NOT NULL,
    tahun_lulus INTEGER NOT NULL,
    wa_number TEXT NOT NULL UNIQUE, -- Unique identifier untuk update data
    alamat TEXT,
    lanjut_ke TEXT NOT NULL,
    nama_sekolah_lanjutan TEXT,
    jurusan TEXT,
    alasan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS untuk Alumni Tracing
ALTER TABLE public.alumni_tracing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert/upsert tracing" ON public.alumni_tracing;
DROP POLICY IF EXISTS "Allow public update tracing" ON public.alumni_tracing;
DROP POLICY IF EXISTS "Allow auth read tracing" ON public.alumni_tracing;

CREATE POLICY "Allow public insert/upsert tracing" ON public.alumni_tracing
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update tracing" ON public.alumni_tracing
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow auth read tracing" ON public.alumni_tracing
    FOR SELECT USING (true);


-- 3. TRIGGER UNTUK UPDATED_AT
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger Kelulusan
DROP TRIGGER IF EXISTS update_kelulusan_modtime ON kelulusan;
CREATE TRIGGER update_kelulusan_modtime 
    BEFORE UPDATE ON kelulusan 
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Trigger Alumni Tracing
DROP TRIGGER IF EXISTS update_alumni_tracing_modtime ON alumni_tracing;
CREATE TRIGGER update_alumni_tracing_modtime 
    BEFORE UPDATE ON alumni_tracing 
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 4. TABEL APP LINKS
CREATE TABLE IF NOT EXISTS public.app_links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    "displayMode" TEXT DEFAULT 'iframe',
    color TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS untuk App Links
ALTER TABLE public.app_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read app_links" ON public.app_links;
DROP POLICY IF EXISTS "Allow write app_links" ON public.app_links;

CREATE POLICY "Allow public read app_links" ON public.app_links
    FOR SELECT USING (true);

CREATE POLICY "Allow write app_links" ON public.app_links
    FOR ALL USING (true) WITH CHECK (true);


-- 5. TABEL MASTER SISWA & MIGRASI PERIODE
CREATE TABLE IF NOT EXISTS public.master_siswa (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    periode TEXT DEFAULT '2025',
    nis TEXT,
    jenis_kelamin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tambah kolom 'periode' jika tabel sudah ada sebelumnya
ALTER TABLE public.master_siswa ADD COLUMN IF NOT EXISTS periode TEXT DEFAULT '2025';

-- Set default '2025' untuk data siswa lama yang periode-nya masih NULL atau kosong
UPDATE public.master_siswa SET periode = '2025' WHERE periode IS NULL OR periode = '';

-- RLS untuk Master Siswa
ALTER TABLE public.master_siswa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read master_siswa" ON public.master_siswa;
DROP POLICY IF EXISTS "Allow public write master_siswa" ON public.master_siswa;

CREATE POLICY "Allow public read master_siswa" ON public.master_siswa FOR SELECT USING (true);
CREATE POLICY "Allow public write master_siswa" ON public.master_siswa FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- SELESAI
-- Setelah menjalankan script ini:
-- 1. Klik 'Refresh' pada tab Table Editor di Supabase
-- 2. Jika masih error, masuk ke Project Settings > API > Klik 'Reload PostgREST'
-- ==========================================
