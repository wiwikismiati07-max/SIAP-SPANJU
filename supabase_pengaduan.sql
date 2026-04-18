-- Create table for Parent Complaints (Pengaduan Wali Murid)
CREATE TABLE IF NOT EXISTS pengaduan_wali (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama_pelapor TEXT NOT NULL,
  hp_pelapor TEXT NOT NULL,
  hubungan_siswa TEXT NOT NULL,
  alamat_pelapor TEXT NOT NULL,
  kelas TEXT NOT NULL,
  siswa_id TEXT REFERENCES master_siswa(id),
  jenis_pengaduan TEXT NOT NULL,
  jenis_pengaduan_manual TEXT,
  uraian TEXT NOT NULL,
  waktu_kejadian TIMESTAMP WITH TIME ZONE NOT NULL,
  tempat_kejadian TEXT NOT NULL,
  bukti_url TEXT,
  harapan_orang_tua TEXT NOT NULL,
  tindakan_diharapkan TEXT,
  pernyataan_benar BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Diproses', 'Selesai', 'Ditolak')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE pengaduan_wali ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create a complaint (public access for parents)
CREATE POLICY "Allow public insert for complaints" ON pengaduan_wali
  FOR INSERT WITH CHECK (true);

-- Allow anyone to view complaints (for preview/testing)
-- In production, you should restrict this to authenticated admins
CREATE POLICY "Allow public to view complaints" ON pengaduan_wali
  FOR SELECT USING (true);

-- Allow anyone to update complaints (for preview/testing)
CREATE POLICY "Allow public update for complaints" ON pengaduan_wali
  FOR UPDATE USING (true);

-- Allow anyone to delete complaints (for preview/testing)
CREATE POLICY "Allow public delete for complaints" ON pengaduan_wali
  FOR DELETE USING (true);
