-- SQL Schema for Keagamaan Application (FIXED TYPES)
-- Run this in your Supabase SQL Editor

-- 1. Table for Religious Programs
CREATE TABLE IF NOT EXISTS public.agama_program (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_kegiatan TEXT NOT NULL,
    waktu TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table for Religious Attendance
CREATE TABLE IF NOT EXISTS public.agama_absensi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    siswa_id TEXT REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TEXT NOT NULL,
    kegiatan_id UUID REFERENCES public.agama_program(id) ON DELETE CASCADE,
    wali_kelas_id TEXT REFERENCES public.master_guru(id) ON DELETE SET NULL,
    alasan TEXT NOT NULL CHECK (alasan IN ('Sakit', 'Izin', 'Haid', 'Alpha', 'Pulang sebelum waktunya', 'Hadir')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agama_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agama_absensi ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all for now as per previous patterns)
CREATE POLICY "Allow all for agama_program" ON public.agama_program FOR ALL USING (true);
CREATE POLICY "Allow all for agama_absensi" ON public.agama_absensi FOR ALL USING (true);

-- Insert some initial data if empty
INSERT INTO public.agama_program (nama_kegiatan, waktu)
VALUES 
('Sholat Dhuha', '07.00 - 07.30'),
('Sholat Dzuhur', '12.00 - 12.30'),
('Pondok Ramadhan', '08.00 - 11.00')
ON CONFLICT DO NOTHING;
