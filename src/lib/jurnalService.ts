import { supabase, fetchAllSiswa } from './supabase';
import { JurnalPembelajaran, SiswaJurnalItem, DEFAULT_MAPEL } from '../types/jurnalpembelajaran';

const LOCAL_STORAGE_KEY = 'jurnal_pembelajaran_data';

export const getStoredJurnalList = (): JurnalPembelajaran[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading local jurnal:', e);
    return [];
  }
};

export const saveLocalJurnalList = (list: JurnalPembelajaran[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local jurnal:', e);
  }
};

export const fetchAllJurnal = async (): Promise<JurnalPembelajaran[]> => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .order('tanggal', { ascending: false });

      if (!error && data) {
        // Sync local storage
        saveLocalJurnalList(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Supabase fetch jurnal error, using local fallback:', err);
  }
  return getStoredJurnalList();
};

export const saveJurnal = async (jurnal: JurnalPembelajaran): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Save to local storage first (reliable offline & fallback)
    const currentList = getStoredJurnalList();
    const index = currentList.findIndex(j => j.id === jurnal.id);
    if (index >= 0) {
      currentList[index] = jurnal;
    } else {
      currentList.unshift(jurnal);
    }
    saveLocalJurnalList(currentList);

    // 2. Try Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('jurnal_pembelajaran')
          .upsert([jurnal], { onConflict: 'id' });

        if (error) {
          console.warn('Supabase upsert warning:', error.message);
        }
      } catch (sbErr) {
        console.warn('Supabase save error (saved locally):', sbErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menyimpan jurnal' };
  }
};

export const deleteJurnal = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentList = getStoredJurnalList().filter(j => j.id !== id);
    saveLocalJurnalList(currentList);

    if (supabase) {
      try {
        await supabase.from('jurnal_pembelajaran').delete().eq('id', id);
      } catch (sbErr) {
        console.warn('Supabase delete error:', sbErr);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghapus jurnal' };
  }
};

// Fetch list of teachers
export const fetchGuruList = async (): Promise<{ id: string; nama_guru: string; nip?: string }[]> => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('master_guru')
        .select('*')
        .order('nama_guru', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    }
    const local = localStorage.getItem('master_guru');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error fetching guru:', e);
  }

  // Default fallback teachers
  return [
    { id: 'g-1', nama_guru: 'Drs. H. Bambang Sujarwo, M.Pd' },
    { id: 'g-2', nama_guru: 'Siti Rahmawati, S.Pd' },
    { id: 'g-3', nama_guru: 'Ahmad Fauzi, S.Pd.I' },
    { id: 'g-4', nama_guru: 'Budi Santoso, S.Si' },
    { id: 'g-5', nama_guru: 'Endang Purwanti, M.Pd' },
    { id: 'g-6', nama_guru: 'Sri Wahyuni, S.Kom' },
    { id: 'g-7', nama_guru: 'Agus Triono, S.Pd' },
    { id: 'g-8', nama_guru: 'Nurul Hidayah, S.Pd' },
    { id: 'g-9', nama_guru: 'Tri Handayani, S.Pd' },
    { id: 'g-10', nama_guru: 'Moch. Wildan, S.Or' }
  ];
};

// Fetch list of subjects
export const fetchMapelList = async (): Promise<{ id: string; nama_mapel: string }[]> => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('master_mapel')
        .select('*')
        .order('nama_mapel', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    }
    const local = localStorage.getItem('master_mapel');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error fetching mapel:', e);
  }

  return DEFAULT_MAPEL.map((m, idx) => ({ id: `m-${idx + 1}`, nama_mapel: m }));
};

// Fetch students for a specific class
export const fetchSiswaByKelas = async (kelas: string): Promise<SiswaJurnalItem[]> => {
  try {
    let allSiswa: any[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('master_siswa')
        .select('*')
        .eq('kelas', kelas)
        .order('nama', { ascending: true });

      if (!error && data && data.length > 0) {
        allSiswa = data;
      } else {
        allSiswa = await fetchAllSiswa();
        allSiswa = allSiswa.filter(s => s.kelas === kelas || s.kelas === kelas.replace(/\s+/g, ''));
      }
    }

    if (allSiswa.length === 0) {
      const local = localStorage.getItem('master_siswa');
      if (local) {
        const parsed = JSON.parse(local);
        allSiswa = parsed.filter((s: any) => s.kelas === kelas);
      }
    }

    if (allSiswa.length > 0) {
      return allSiswa.map((s: any, idx: number) => ({
        siswa_id: s.id || `s-${idx + 1}`,
        nama: s.nama,
        nis: s.nis || `24${kelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
        kelas: s.kelas || kelas,
        absensi: 'Hadir',
        nilai: '',
        catatan_siswa: '',
        tindakan: ''
      }));
    }
  } catch (e) {
    console.error('Error fetching siswa for class:', e);
  }

  // Fallback demo students if database is empty for this class
  return generateDemoSiswa(kelas);
};

export const generateDemoSiswa = (kelas: string): SiswaJurnalItem[] => {
  const sampleNames = [
    'Aditya Pratama', 'Aisyah Putri Rahmadani', 'Alif Rizky Ramadhan', 'Amanda Citra Lestari',
    'Bayu Aji Saputra', 'Cantika Dewi Anggraini', 'Daffa Arya Nugraha', 'Dimas Wahyu Prasetyo',
    'Fadilla Nur Salsabila', 'Faris Ihsan Maulana', 'Hafizh Muhammad Zaki', 'Indah Permatasari',
    'Kayla Anindya Putri', 'Muhammad Kevin Alfiansyah', 'Nabila Shafa Az-Zahra', 'Rafi Ahmad Fauzan',
    'Rangga Aditya Putra', 'Revalina Cahya Kirana', 'Rizky Ramadhan', 'Siti Fatimah Azzahra',
    'Tegar Budi Santoso', 'Tiara Putri Maharani', 'Vicky Ardiansyah', 'Zahra Aulia Rahma'
  ];

  return sampleNames.map((nama, idx) => ({
    siswa_id: `demo-${kelas}-${idx + 1}`,
    nama,
    nis: `2024${kelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
    kelas,
    absensi: 'Hadir',
    nilai: '',
    catatan_siswa: '',
    tindakan: ''
  }));
};
