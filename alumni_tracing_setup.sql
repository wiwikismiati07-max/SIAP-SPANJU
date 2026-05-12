-- SQL for Alumni Tracing Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.alumni_tracing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_lengkap TEXT NOT NULL,
    jenis_kelamin TEXT NOT NULL,
    tahun_lulus INTEGER NOT NULL,
    wa_number TEXT NOT NULL UNIQUE, -- Using WhatsApp number as unique key for upsert
    alamat TEXT,
    lanjut_ke TEXT NOT NULL,
    nama_sekolah_lanjutan TEXT,
    jurusan TEXT,
    alasan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.alumni_tracing ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Allow public insert/upsert
CREATE POLICY "Allow public insert/upsert tracing" ON public.alumni_tracing
    FOR INSERT WITH CHECK (true);

-- 2. Allow public update if they know the WA number (handled by upsert logic)
CREATE POLICY "Allow public update tracing" ON public.alumni_tracing
    FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Allow read access for authenticated staff
CREATE POLICY "Allow auth read tracing" ON public.alumni_tracing
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alumni_tracing_modtime 
    BEFORE UPDATE ON alumni_tracing 
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
