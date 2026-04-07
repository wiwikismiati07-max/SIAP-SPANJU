-- SQL for Aplikasi Dispensasi Siswa
-- Integrated with SIAP SEPANJU

-- 1. Master Jenis Dispensasi
CREATE TABLE IF NOT EXISTS public.disp_master_jenis (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    nama_jenis TEXT NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Transaksi Dispensasi
CREATE TABLE IF NOT EXISTS public.disp_transaksi (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    kelas TEXT NOT NULL,
    siswa_id TEXT REFERENCES public.master_siswa(id),
    jenis_id TEXT REFERENCES public.disp_master_jenis(id),
    alasan TEXT,
    tindak_lanjut TEXT,
    bukti_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.disp_master_jenis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disp_transaksi ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Allow all for disp_master_jenis" ON public.disp_master_jenis FOR ALL USING (true);
CREATE POLICY "Allow all for disp_transaksi" ON public.disp_transaksi FOR ALL USING (true);

-- Insert default data for Jenis Dispensasi
INSERT INTO public.disp_master_jenis (nama_jenis) VALUES 
('Sakit ketika berada di sekolah'),
('Siswa mengikuti audisi /Kompetisi di Luar Sekolah'),
('Kepentingan Keluarga Mendadak'),
('Lain-lain')
ON CONFLICT DO NOTHING;
