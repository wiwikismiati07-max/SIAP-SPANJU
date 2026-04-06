-- SQL for BK Peduli Siswa (Kasus Berat)
-- Separate from Disiplin Siswa (Pelanggaran Ringan)

-- 1. Master Kasus (Daftar Jenis Kasus Berat)
CREATE TABLE IF NOT EXISTS public.bk_master_kasus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_kasus TEXT NOT NULL,
    kategori TEXT DEFAULT 'Berat',
    poin INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Transaksi Kasus (Data Kasus Siswa)
CREATE TABLE IF NOT EXISTS public.bk_transaksi_kasus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    kelas TEXT NOT NULL,
    siswa_id UUID REFERENCES public.master_siswa(id),
    kasus_id UUID REFERENCES public.bk_master_kasus(id),
    kasus_kategori TEXT NOT NULL, -- Kedisiplinan, Etika, Akademi, Bullying, Perkelahian, merokok, Narkoba, Lain-Lain
    kronologi TEXT, -- Up to 500 words
    bukti_fisik TEXT[], -- Array of URLs/Paths
    wali_kelas TEXT,
    guru_bk TEXT, -- Wiwik Ismiati S.pd, Eki Febriani S.pd
    status TEXT DEFAULT 'Proses', -- Proses, Selesai
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tindak Lanjut Kasus (Sub-tabel dari Transaksi Kasus)
CREATE TABLE IF NOT EXISTS public.bk_tindak_lanjut (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaksi_id UUID REFERENCES public.bk_transaksi_kasus(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tindak_lanjut TEXT NOT NULL, -- Konseling Individu, Konseling Kelompok, Panggilan Orang Tua, Mediasi, Home visit, Skorsing, Lain-lain
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bk_master_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_transaksi_kasus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bk_tindak_lanjut ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow all for now as per previous pattern)
CREATE POLICY "Allow all for bk_master_kasus" ON public.bk_master_kasus FOR ALL USING (true);
CREATE POLICY "Allow all for bk_transaksi_kasus" ON public.bk_transaksi_kasus FOR ALL USING (true);
CREATE POLICY "Allow all for bk_tindak_lanjut" ON public.bk_tindak_lanjut FOR ALL USING (true);

-- Storage Bucket Instruction:
-- Please create a bucket named 'bukti_fisik' in Supabase Storage and set it to public.
