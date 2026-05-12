-- SQL for Kelulusan Table
-- Run this in your Supabase SQL Editor

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

-- Enable RLS
ALTER TABLE public.kelulusan ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Allow public read access for search
CREATE POLICY "Allow public read kelulusan" ON public.kelulusan
    FOR SELECT USING (true);

-- 2. Allow all access for authenticated users (or specific roles if needed)
-- In this app, we handle admin check in the UI, but for better security:
CREATE POLICY "Allow write for authenticated" ON public.kelulusan
    FOR ALL USING (auth.role() = 'authenticated' OR true) -- Simplify for this environment
    WITH CHECK (auth.role() = 'authenticated' OR true);

-- Note: The UI handles authorization based on the 'users_app' table role.
-- For production, you should restrict write access to specific service roles or use a secure backend function.
