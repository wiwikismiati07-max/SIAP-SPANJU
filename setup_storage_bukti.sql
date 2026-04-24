-- SQL Setup for Storage Bucket 'bukti_fisik' and Pengaduan Wali Table
-- This script ensures the storage bucket exists and has correct policies for file uploads.

-- 1. Create the storage bucket 'bukti_fisik' if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bukti_fisik', 'bukti_fisik', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'bukti_fisik'
-- Drop existing policies if they exist to avoid errors during re-run
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Public Update" ON storage.objects;
    DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Allow anyone to view files in the 'bukti_fisik' bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'bukti_fisik');

-- Allow anyone to upload (INSERT) files to the 'bukti_fisik' bucket
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bukti_fisik');

-- Allow anyone to update files in the 'bukti_fisik' bucket
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bukti_fisik');

-- Allow anyone to delete files in the 'bukti_fisik' bucket
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'bukti_fisik');


-- 3. Ensure pengaduan_wali table has bukti_url column
-- (The table might already exist, so we use ALTER or CREATE IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pengaduan_wali' AND column_name='bukti_url') THEN
        ALTER TABLE pengaduan_wali ADD COLUMN bukti_url TEXT;
    END IF;
END $$;
