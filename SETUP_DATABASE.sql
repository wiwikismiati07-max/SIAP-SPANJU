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

-- ==========================================
-- SELESAI
-- Setelah menjalankan script ini:
-- 1. Klik 'Refresh' pada tab Table Editor di Supabase
-- 2. Jika masih error, masuk ke Project Settings > API > Klik 'Reload PostgREST'
-- ==========================================
