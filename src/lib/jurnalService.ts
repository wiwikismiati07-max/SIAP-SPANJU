import { supabase, fetchAllSiswa } from './supabase';
import { JurnalPembelajaran, SiswaJurnalItem, DEFAULT_MAPEL } from '../types/jurnalpembelajaran';
import { 
  idbGetAllJurnal, 
  idbSaveJurnal, 
  idbSaveAllJurnal, 
  idbDeleteJurnal 
} from './jurnalIdb';

const LOCAL_STORAGE_KEY = 'jurnal_pembelajaran_data';

// Standard RFC-4122 UUID v4 generator working across all browser/iframe contexts
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isValidUUID = (val?: string): boolean => {
  return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const getStoredJurnalList = (): JurnalPembelajaran[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Returns current locally stored journals from IndexedDB, falling back to localStorage
 */
export const getLocalOrIdbJurnalList = async (): Promise<JurnalPembelajaran[]> => {
  try {
    const idbData = await idbGetAllJurnal();
    if (idbData && idbData.length > 0) {
      return idbData;
    }
  } catch (e) {}
  return getStoredJurnalList();
};

/**
 * Saves jurnal list locally with safety guards against localStorage QuotaExceededError.
 * IndexedDB acts as the primary large-capacity store, while localStorage acts as a lightweight backup.
 */
export const saveLocalJurnalList = (list: JurnalPembelajaran[]) => {
  // 1. Always persist full data to IndexedDB asynchronously
  idbSaveAllJurnal(list).catch(() => {});

  // 2. Safe save to localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e: any) {
    // If quota exceeded, store a lightweight version without bulky base64 photos
    try {
      const lightweightList = list.map(item => ({
        ...item,
        // Keep at most 1 thumbnail or clear photos in localStorage since IndexedDB holds the originals
        foto_kegiatan: item.foto_kegiatan && item.foto_kegiatan.length > 0 ? [item.foto_kegiatan[0]] : []
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweightList));
    } catch (innerErr) {
      try {
        // Extreme fallback: strip all photos for localStorage cache
        const minimalList = list.map(item => ({ ...item, foto_kegiatan: [] }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimalList));
      } catch (finalErr) {
        // Fail silently; IndexedDB holds the full records
      }
    }
  }
};

/**
 * Fetches all journals. Merges Supabase remote data with local records so that
 * any locally created or offline records are NEVER lost.
 */
export const fetchAllJurnal = async (): Promise<JurnalPembelajaran[]> => {
  // 1. Get current local/offline records first
  const localList = await getLocalOrIdbJurnalList();

  // 2. Try fetching from Supabase
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .order('tanggal', { ascending: false });

      if (!error && data) {
        // Merge Supabase and Local:
        // Local records that are not in Supabase yet must NOT be lost!
        const map = new Map<string, JurnalPembelajaran>();
        
        // Put local first
        localList.forEach(item => {
          if (item && item.id) map.set(item.id, item);
        });

        // Overlay Supabase data (authoritative)
        data.forEach((remote: any) => {
          const localItem = map.get(remote.id);
          const merged: JurnalPembelajaran = {
            ...remote,
            // Keep local photos if remote photos are empty/stripped
            foto_kegiatan: (remote.foto_kegiatan && remote.foto_kegiatan.length > 0)
              ? remote.foto_kegiatan
              : (localItem?.foto_kegiatan || []),
            periode: remote.periode || localItem?.periode || ''
          };
          map.set(remote.id, merged);
        });

        const mergedList = Array.from(map.values());
        mergedList.sort((a, b) => 
          (b.tanggal || '').localeCompare(a.tanggal || '') || 
          (b.created_at || '').localeCompare(a.created_at || '')
        );

        saveLocalJurnalList(mergedList);
        return mergedList;
      }
    }
  } catch (err) {
    console.warn('Supabase fetch jurnal error, using local fallback:', err);
  }

  return localList;
};

/**
 * Safely synchronizes a single journal to Supabase with automatic schema-fallback:
 * - If Supabase table does not have 'periode' column yet, retries without 'periode'.
 * - If payload is too large due to base64 images, retries without base64 photos so attendance/data is saved.
 */
export const syncJurnalToSupabase = async (jurnal: JurnalPembelajaran): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: true };

  try {
    const payloadWithPeriode: any = {
      id: jurnal.id,
      tanggal: jurnal.tanggal,
      jam_ke: jurnal.jam_ke,
      jam_mulai: jurnal.jam_mulai || '',
      jam_selesai: jurnal.jam_selesai || '',
      periode: jurnal.periode || '',
      mapel_id: jurnal.mapel_id || null,
      nama_mapel: jurnal.nama_mapel,
      guru_id: jurnal.guru_id || null,
      nama_guru: jurnal.nama_guru,
      kelas: jurnal.kelas,
      materi: jurnal.materi,
      kegiatan: jurnal.kegiatan || '',
      foto_kegiatan: Array.isArray(jurnal.foto_kegiatan) ? jurnal.foto_kegiatan : [],
      siswa_list: Array.isArray(jurnal.siswa_list) ? jurnal.siswa_list : [],
      created_at: jurnal.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Attempt 1: Full payload
    let { error } = await supabase
      .from('jurnal_pembelajaran')
      .upsert([payloadWithPeriode], { onConflict: 'id' });

    // If table doesn't have 'periode' column in Postgres
    if (error && (
      error.message?.toLowerCase().includes('periode') || 
      error.code === 'PGRST204' || 
      error.message?.toLowerCase().includes('schema cache')
    )) {
      const { periode, ...payloadWithoutPeriode } = payloadWithPeriode;
      const res = await supabase
        .from('jurnal_pembelajaran')
        .upsert([payloadWithoutPeriode], { onConflict: 'id' });
      error = res.error;
    }

    // If payload is too large due to base64 photos, retry without photo array so critical records are saved
    if (error && (
      error.message?.toLowerCase().includes('payload') ||
      error.message?.toLowerCase().includes('too large') ||
      error.code === '413'
    )) {
      const lightweight = {
        ...payloadWithPeriode,
        foto_kegiatan: []
      };
      const res = await supabase
        .from('jurnal_pembelajaran')
        .upsert([lightweight], { onConflict: 'id' });
      error = res.error;
    }

    if (error) {
      console.warn('Supabase upsert warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Supabase sync exception:', err);
    return { success: false, error: err?.message || 'Gagal sinkronisasi ke server Supabase' };
  }
};

export const saveJurnal = async (jurnal: JurnalPembelajaran): Promise<{ success: boolean; error?: string; savedLocally?: boolean }> => {
  try {
    // 1. Ensure ID is a valid RFC-4122 UUID
    if (!isValidUUID(jurnal.id)) {
      jurnal.id = generateUUID();
    }

    // 2. Immediately save to IndexedDB (always succeeds offline or online)
    try {
      await idbSaveJurnal(jurnal);
    } catch (idbErr) {
      console.warn('IndexedDB save warning:', idbErr);
    }

    // 3. Update local cache safely without wiping un-synced journals
    const currentList = await getLocalOrIdbJurnalList();
    const index = currentList.findIndex(j => j.id === jurnal.id);
    if (index >= 0) {
      currentList[index] = jurnal;
    } else {
      currentList.unshift(jurnal);
    }
    saveLocalJurnalList(currentList);

    // 4. Sync to Supabase
    if (supabase) {
      const syncRes = await syncJurnalToSupabase(jurnal);
      if (!syncRes.success) {
        console.warn('Jurnal tersimpan secara lokal di memori perangkat (sinkronisasi server gagal):', syncRes.error);
        return { success: true, savedLocally: true };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fatal error saving jurnal:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan jurnal pembelajaran' };
  }
};

export const deleteJurnal = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Delete from IndexedDB
    try {
      await idbDeleteJurnal(id);
    } catch (e) {}

    // 2. Delete from local storage
    const currentList = (await getLocalOrIdbJurnalList()).filter(j => j.id !== id);
    saveLocalJurnalList(currentList);

    // 3. Delete from Supabase
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

// Fetch available periodes from master_siswa
export const fetchAvailablePeriodes = async (): Promise<string[]> => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('master_siswa')
        .select('periode');
      if (!error && data && data.length > 0) {
        const set = new Set<string>();
        data.forEach(d => {
          if (d.periode) {
            const clean = d.periode.toString().trim();
            if (clean) set.add(clean);
          }
        });
        if (set.size > 0) {
          return Array.from(set).sort((a, b) => b.localeCompare(a));
        }
      }
    }
  } catch (e) {
    console.error('Error fetching periodes:', e);
  }

  // Fallback to local storage
  try {
    const sitelat = localStorage.getItem('sitelat_siswa') || localStorage.getItem('master_siswa');
    if (sitelat) {
      const parsed = JSON.parse(sitelat);
      const set = new Set<string>();
      parsed.forEach((s: any) => {
        if (s.periode) {
          const clean = s.periode.toString().trim();
          if (clean) set.add(clean);
        }
      });
      if (set.size > 0) {
        return Array.from(set).sort((a, b) => b.localeCompare(a));
      }
    }
  } catch (e) {}

  return ['2026', '2025'];
};

// Fetch students for a specific class and period (defaults to the newest active period to prevent duplicate entries)
export const fetchSiswaByKelas = async (
  kelas: string,
  targetPeriode?: string,
  tanggal?: string
): Promise<SiswaJurnalItem[]> => {
  try {
    // 1. Determine active period (use targetPeriode or default to newest available)
    let activePeriode = targetPeriode;
    if (!activePeriode || activePeriode === 'BARU') {
      const pList = await fetchAvailablePeriodes();
      activePeriode = pList[0] || '2026';
    }

    let allSiswa: any[] = [];
    if (supabase) {
      let query = supabase
        .from('master_siswa')
        .select('*')
        .eq('kelas', kelas);

      if (activePeriode && activePeriode !== 'ALL') {
        query = query.eq('periode', activePeriode);
      }

      const { data, error } = await query.order('nama', { ascending: true });

      if (!error && data && data.length > 0) {
        allSiswa = data;
      } else {
        // Fallback: fetch all and filter in memory
        const fullList = await fetchAllSiswa();
        allSiswa = fullList.filter(s => {
          const matchKelas = s.kelas === kelas || s.kelas === kelas.replace(/\s+/g, '');
          const sPeriode = (s.periode || '2025').toString().trim();
          const matchPeriode = !activePeriode || activePeriode === 'ALL' || sPeriode === activePeriode;
          return matchKelas && matchPeriode;
        });
      }
    }

    if (allSiswa.length === 0) {
      const local = localStorage.getItem('sitelat_siswa') || localStorage.getItem('master_siswa');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          allSiswa = parsed.filter((s: any) => {
            const matchKelas = s.kelas === kelas;
            const sPeriode = (s.periode || '2025').toString().trim();
            const matchPeriode = !activePeriode || activePeriode === 'ALL' || sPeriode === activePeriode;
            return matchKelas && matchPeriode;
          });
        } catch (_) {}
      }
    }

    // Fallback: If 0 students were found with activePeriode filter, try retrieving all students for this class without period restriction
    if (allSiswa.length === 0 && activePeriode && activePeriode !== 'ALL') {
      if (supabase) {
        try {
          const { data: fallbackData } = await supabase
            .from('master_siswa')
            .select('*')
            .eq('kelas', kelas)
            .order('nama', { ascending: true });
          if (fallbackData && fallbackData.length > 0) {
            allSiswa = fallbackData;
          }
        } catch (_) {}
      }
      if (allSiswa.length === 0) {
        try {
          const fullList = await fetchAllSiswa();
          allSiswa = fullList.filter(s => s.kelas === kelas || s.kelas === kelas.replace(/\s+/g, ''));
        } catch (_) {}
      }
      if (allSiswa.length === 0) {
        const local = localStorage.getItem('sitelat_siswa') || localStorage.getItem('master_siswa');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            allSiswa = parsed.filter((s: any) => s.kelas === kelas || s.kelas === kelas.replace(/\s+/g, ''));
          } catch (_) {}
        }
      }
    }

    // 2. Deduplicate students by normalized name to guarantee NO double data
    const uniqueMap = new Map<string, any>();
    allSiswa.forEach(s => {
      const key = (s.nama || '').trim().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });
    const uniqueSiswa = Array.from(uniqueMap.values());

    // 3. Check if any student already submitted izin via Form Wali Murid on this date
    let activeIzinByStudent: Record<string, any> = {};
    if (tanggal) {
      try {
        if (supabase) {
          const { data: izinData } = await supabase
            .from('izin_siswa')
            .select('*')
            .neq('status', 'Ditolak');
          if (izinData) {
            izinData.forEach((iz: any) => {
              const start = iz.tanggal_mulai;
              const end = iz.tanggal_selesai || iz.tanggal_mulai;
              if (start <= tanggal && end >= tanggal) {
                activeIzinByStudent[iz.siswa_id] = iz;
              }
            });
          }
        } else {
          const localIzin = JSON.parse(localStorage.getItem('izinsiswa_data') || '[]');
          localIzin.forEach((iz: any) => {
            if (iz.status === 'Ditolak') return;
            const start = iz.tanggal_mulai;
            const end = iz.tanggal_selesai || iz.tanggal_mulai;
            if (start <= tanggal && end >= tanggal) {
              activeIzinByStudent[iz.siswa_id] = iz;
            }
          });
        }
      } catch (err) {
        console.warn('Error checking existing izin for date:', err);
      }
    }

    if (uniqueSiswa.length > 0) {
      return uniqueSiswa.map((s: any, idx: number) => {
        const existingIzin = activeIzinByStudent[s.id];
        let defaultAbsensi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' = 'Hadir';
        let defaultCatatan = '';
        let sudahIzin = false;
        let keteranganIzin = '';

        if (existingIzin) {
          sudahIzin = true;
          defaultAbsensi = existingIzin.jenis_izin === 'Sakit' ? 'Sakit' : 'Izin';
          keteranganIzin = `Sudah Izin (${existingIzin.jenis_izin}): ${existingIzin.alasan || 'Form Wali Murid'}`;
          defaultCatatan = `Izin via Form Wali Murid (${existingIzin.jenis_izin})`;
        }

        return {
          siswa_id: s.id || `s-${idx + 1}`,
          nama: s.nama,
          nis: s.nis || `24${kelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
          kelas: s.kelas || kelas,
          periode: s.periode || activePeriode,
          absensi: defaultAbsensi,
          nilai: '',
          catatan_siswa: defaultCatatan,
          tindakan: '',
          sudah_izin: sudahIzin,
          keterangan_izin: keteranganIzin
        };
      });
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
    periode: '2026',
    absensi: 'Hadir',
    nilai: '',
    catatan_siswa: '',
    tindakan: ''
  }));
};
