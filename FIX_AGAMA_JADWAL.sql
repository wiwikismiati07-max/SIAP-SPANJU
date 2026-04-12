-- SQL to create agama_jadwal table
-- Execute this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.agama_jadwal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kegiatan_id UUID REFERENCES public.agama_program(id) ON DELETE CASCADE,
    hari TEXT NOT NULL,
    minggu_ke INTEGER NOT NULL,
    bulan TEXT NOT NULL,
    tahun INTEGER NOT NULL,
    kelas TEXT NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agama_jadwal ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all for agama_jadwal" ON public.agama_jadwal;
CREATE POLICY "Allow all for agama_jadwal" ON public.agama_jadwal FOR ALL USING (true);
