-- SQL for Missing Tables in SIAP SPANJU
-- Execute this in your Supabase SQL Editor

-- 1. Table for Si-Telat (Sistem Keterlambatan Siswa)
CREATE TABLE IF NOT EXISTS public.transaksi_terlambat (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    siswa_id TEXT REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    alasan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table for Si-PRESTASI (Prestasi Siswa)
CREATE TABLE IF NOT EXISTS public.prestasi_siswa (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    siswa_id TEXT REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    kelas TEXT NOT NULL,
    jenis_prestasi TEXT NOT NULL CHECK (jenis_prestasi IN ('Akademik', 'Non Akademik')),
    nama_lomba TEXT NOT NULL,
    juara TEXT NOT NULL,
    tingkat TEXT NOT NULL,
    bukti_url TEXT,
    wali_kelas_id TEXT REFERENCES public.master_guru(id),
    guru_bk TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fix for Keagamaan Schema (Inconsistency in master_guru reference)
-- If agama_absensi already exists with UUID, we might need to recreate or alter it.
-- Here is the correct version for agama_absensi:
CREATE TABLE IF NOT EXISTS public.agama_absensi_new (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    siswa_id TEXT REFERENCES public.master_siswa(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TEXT NOT NULL,
    kegiatan_id UUID REFERENCES public.agama_program(id) ON DELETE CASCADE,
    wali_kelas_id TEXT REFERENCES public.master_guru(id) ON DELETE SET NULL,
    alasan TEXT NOT NULL CHECK (alasan IN ('Sakit', 'Izin', 'Haid', 'Alpa', 'Pulang sebelum waktunya', 'Hadir')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.transaksi_terlambat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestasi_siswa ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Allow all for transaksi_terlambat" ON public.transaksi_terlambat FOR ALL USING (true);
CREATE POLICY "Allow all for prestasi_siswa" ON public.prestasi_siswa FOR ALL USING (true);

-- 6. Default Data for Master Pelanggaran (If not already populated)
INSERT INTO public.master_pelanggaran (nama_pelanggaran, kategori, poin)
VALUES 
('Terlambat masuk sekolah', 'Ringan', 5),
('Tidak memakai atribut lengkap', 'Ringan', 5),
('Rambut tidak rapi (putra)', 'Ringan', 5),
('Membawa HP tanpa izin', 'Sedang', 15),
('Keluar kelas tanpa izin', 'Ringan', 5),
('Berkelahi', 'Berat', 50),
('Merusak fasilitas sekolah', 'Berat', 30),
('Mencuri', 'Berat', 75),
('Membawa senjata tajam', 'Berat', 100)
ON CONFLICT DO NOTHING;
