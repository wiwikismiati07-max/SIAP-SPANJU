-- ENSURE SIPENA KUNJUNGAN WARTA TABLE AND RLS
-- Run this in your Supabase SQL Editor

-- Check and add columns if they are missing (using plpgsql to be safe)
DO $$
BEGIN
    -- Ensure tanggal column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sipena_kunjungan_warta' AND column_name='tanggal') THEN
        ALTER TABLE sipena_kunjungan_warta ADD COLUMN tanggal DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Ensure jam column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sipena_kunjungan_warta' AND column_name='jam') THEN
        ALTER TABLE sipena_kunjungan_warta ADD COLUMN jam TIME NOT NULL DEFAULT CURRENT_TIME;
    END IF;

    -- Ensure kelas column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sipena_kunjungan_warta' AND column_name='kelas') THEN
        ALTER TABLE sipena_kunjungan_warta ADD COLUMN kelas TEXT;
    END IF;

    -- Ensure guru_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sipena_kunjungan_warta' AND column_name='guru_id') THEN
        ALTER TABLE sipena_kunjungan_warta ADD COLUMN guru_id TEXT;
    END IF;

    -- Ensure mapel_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sipena_kunjungan_warta' AND column_name='mapel_id') THEN
        ALTER TABLE sipena_kunjungan_warta ADD COLUMN mapel_id TEXT;
    END IF;
END $$;

-- Fix RLS
ALTER TABLE public.sipena_kunjungan_warta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to sipena_kunjungan_warta" ON public.sipena_kunjungan_warta;
CREATE POLICY "Allow all access to sipena_kunjungan_warta" ON public.sipena_kunjungan_warta FOR ALL USING (true) WITH CHECK (true);
