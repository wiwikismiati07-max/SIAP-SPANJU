import { supabase, fetchAllSiswa } from './supabase';
import { JurnalPembelajaran, SiswaJurnalItem, DEFAULT_MAPEL } from '../types/jurnalpembelajaran';
import { 
  idbGetAllJurnal, 
  idbSaveJurnal, 
  idbSaveAllJurnal, 
  idbDeleteJurnal 
} from './jurnalIdb';
import { 
  dispatchJurnalEmailNotification, 
  PRIMARY_NOTIF_EMAIL,
  EmailNotifResult
} from './emailNotificationService';

export { PRIMARY_NOTIF_EMAIL, dispatchJurnalEmailNotification };

const LOCAL_STORAGE_KEY = 'jurnal_pembelajaran_data';
const DELETED_IDS_KEY = 'jurnal_pembelajaran_deleted_ids';
const INKLUSI_SAVED_IDS_KEY = 'jurnal_inklusi_selected_ids';

export const getSavedInklusiSiswaIds = (): string[] => {
  try {
    const raw = localStorage.getItem(INKLUSI_SAVED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveInklusiSiswaIds = (ids: string[]) => {
  try {
    localStorage.setItem(INKLUSI_SAVED_IDS_KEY, JSON.stringify(ids));
  } catch (e) {}
};

export const getDeletedJurnalIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

export const markJurnalAsDeleted = (id: string) => {
  try {
    const set = getDeletedJurnalIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
};

export const unmarkJurnalAsDeleted = (id: string) => {
  try {
    const set = getDeletedJurnalIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
};

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
        // Keep at most 1 thumbnail in localStorage since IndexedDB holds the originals
        foto_kegiatan: item.foto_kegiatan && item.foto_kegiatan.length > 0 ? item.foto_kegiatan.slice(0, 1) : []
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

// Optimized column selection: excludes multi-megabyte base64 photos from mass queries
// This completely resolves Postgres statement timeout (57014) and enables instant load across devices
const JURNAL_SELECT_COLUMNS = 'id, tanggal, jam_ke, jam_mulai, jam_selesai, mapel_id, nama_mapel, guru_id, nama_guru, kelas, materi, kegiatan, siswa_list, created_at, updated_at, periode';

/**
 * Fetches photo documentation for a specific journal ID on-demand (for detail view, edit, or printing)
 */
export const fetchJurnalPhoto = async (id: string): Promise<string[]> => {
  if (!supabase || !id) return [];
  try {
    const { data, error } = await supabase
      .from('jurnal_pembelajaran')
      .select('foto_kegiatan')
      .eq('id', id)
      .single();

    if (!error && data && Array.isArray(data.foto_kegiatan)) {
      // Cache into local IndexedDB
      try {
        const cached = await getLocalOrIdbJurnalList();
        const target = cached.find(j => j.id === id);
        if (target) {
          target.foto_kegiatan = data.foto_kegiatan;
          saveLocalJurnalList(cached);
        }
      } catch (_) {}
      return data.foto_kegiatan;
    }
  } catch (e) {
    console.warn('Gagal memuat foto jurnal:', e);
  }
  return [];
};

/**
 * Fetches all journals. Merges Supabase remote data with local records so that
 * any locally created or offline records are NEVER lost.
 */
export const fetchAllJurnal = async (): Promise<JurnalPembelajaran[]> => {
  const deletedIds = getDeletedJurnalIds();

  // 1. Get current local/offline records first
  const localList = (await getLocalOrIdbJurnalList()).filter(j => !deletedIds.has(j.id));

  // 2. Try fetching from Supabase
  try {
    if (supabase) {
      let data: any[] | null = null;
      let error: any = null;

      const firstAttempt = await supabase
        .from('jurnal_pembelajaran')
        .select(JURNAL_SELECT_COLUMNS)
        .order('tanggal', { ascending: false });

      if (firstAttempt.error && (firstAttempt.error.message?.includes('periode') || firstAttempt.error.code === 'PGRST204')) {
        const columnsWithoutPeriode = 'id, tanggal, jam_ke, jam_mulai, jam_selesai, mapel_id, nama_mapel, guru_id, nama_guru, kelas, materi, kegiatan, siswa_list, created_at, updated_at';
        const secondAttempt = await supabase
          .from('jurnal_pembelajaran')
          .select(columnsWithoutPeriode)
          .order('tanggal', { ascending: false });
        data = secondAttempt.data;
        error = secondAttempt.error;
      } else {
        data = firstAttempt.data;
        error = firstAttempt.error;
      }

      if (!error && data && data.length > 0) {
        // Merge Supabase and Local:
        // Local records that are not in Supabase yet must NOT be lost!
        const map = new Map<string, JurnalPembelajaran>();
        
        // Put local first (keeps any offline photos already saved locally)
        localList.forEach(item => {
          if (item && item.id && !deletedIds.has(item.id)) map.set(item.id, item);
        });

        // Overlay Supabase data (authoritative)
        data.forEach((remote: any) => {
          if (!remote || !remote.id || deletedIds.has(remote.id)) return;
          const localItem = map.get(remote.id);
          
          // Determine best photo set: prefer whichever has more photos 
          // (prevents lightweight localStorage backup from overwriting full remote data)
          let bestPhotos = Array.isArray(remote.foto_kegiatan) ? remote.foto_kegiatan : [];
          if (localItem?.foto_kegiatan && localItem.foto_kegiatan.length > bestPhotos.length) {
            bestPhotos = localItem.foto_kegiatan;
          }

          const merged: JurnalPembelajaran = {
            ...remote,
            foto_kegiatan: bestPhotos,
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

        // Background non-blocking photo hydration for top 20 latest entries
        setTimeout(async () => {
          try {
            if (!supabase) return;
            const { data: recentPhotos } = await supabase
              .from('jurnal_pembelajaran')
              .select('id, foto_kegiatan')
              .order('tanggal', { ascending: false })
              .limit(20);

            if (recentPhotos && recentPhotos.length > 0) {
              const currentCached = await getLocalOrIdbJurnalList();
              let updated = false;
              recentPhotos.forEach((item: any) => {
                if (!item?.id || !Array.isArray(item.foto_kegiatan) || item.foto_kegiatan.length === 0) return;
                const target = currentCached.find(c => c.id === item.id);
                if (target && (!target.foto_kegiatan || target.foto_kegiatan.length === 0)) {
                  target.foto_kegiatan = item.foto_kegiatan;
                  updated = true;
                }
              });
              if (updated) {
                saveLocalJurnalList(currentCached);
              }
            }
          } catch (_) {}
        }, 1000);

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

export const saveJurnal = async (jurnal: JurnalPembelajaran): Promise<{ 
  success: boolean; 
  error?: string; 
  savedLocally?: boolean;
}> => {
  try {
    // 1. Ensure ID is a valid RFC-4122 UUID
    if (!isValidUUID(jurnal.id)) {
      jurnal.id = generateUUID();
    }

    // Unmark as deleted if it was previously marked
    unmarkJurnalAsDeleted(jurnal.id);

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
    // 1. Mark as deleted so it will never be restored from remote sync
    markJurnalAsDeleted(id);

    // 2. Delete from IndexedDB
    try {
      await idbDeleteJurnal(id);
    } catch (e) {}

    // 3. Delete from local storage
    const currentList = (await getLocalOrIdbJurnalList()).filter(j => j.id !== id);
    saveLocalJurnalList(currentList);

    // 4. Delete from Supabase
    if (supabase) {
      try {
        const { error } = await supabase.from('jurnal_pembelajaran').delete().eq('id', id);
        if (error) {
          console.warn('Supabase delete error:', error.message);
        }
      } catch (sbErr) {
        console.warn('Supabase delete error:', sbErr);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghapus jurnal' };
  }
};

// Clean and normalize teacher name for matching
export const cleanTeacherName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(s\.pd|m\.pd|s\.kom|s\.si|m\.m|s\.e|s\.hi|s\.pd\.i|dra|drs|hj|h|dr|prof)\.?/gi, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper to find guru NIP from name and master list
export const findGuruNip = (
  namaGuru?: string, 
  guruList?: { id: string; nama_guru: string; nip?: string }[],
  explicitNip?: string
): string => {
  if (explicitNip && explicitNip.trim().length > 3 && explicitNip.trim() !== '-') {
    return explicitNip.replace(/\r|\n/g, '').trim();
  }
  if (!namaGuru || !guruList || guruList.length === 0) {
    return '';
  }

  const rawInput = namaGuru.trim();
  const cleanInput = rawInput.toLowerCase();
  
  // 1. Exact or case-insensitive match
  const exact = guruList.find(g => g.nama_guru && g.nama_guru.trim().toLowerCase() === cleanInput);
  if (exact?.nip && exact.nip.trim().length > 3 && exact.nip.trim() !== '-') {
    return exact.nip.replace(/\r|\n/g, '').trim();
  }

  // 2. Cleaned name match (without titles like S.Pd, M.Pd, etc.)
  const baseInput = cleanTeacherName(rawInput);
  if (baseInput.length >= 3) {
    const titleMatch = guruList.find(g => {
      const baseG = cleanTeacherName(g.nama_guru || '');
      return baseG && (baseG === baseInput || baseG.includes(baseInput) || baseInput.includes(baseG));
    });
    if (titleMatch?.nip && titleMatch.nip.trim().length > 3 && titleMatch.nip.trim() !== '-') {
      return titleMatch.nip.replace(/\r|\n/g, '').trim();
    }
  }

  // 3. Substring match
  const subMatch = guruList.find(g => {
    const gn = (g.nama_guru || '').toLowerCase();
    return gn.includes(cleanInput) || cleanInput.includes(gn);
  });
  if (subMatch?.nip && subMatch.nip.trim().length > 3 && subMatch.nip.trim() !== '-') {
    return subMatch.nip.replace(/\r|\n/g, '').trim();
  }

  return '';
};

// Normalize class format (e.g. "Kelas 7A", "7 A", "VII A" -> "7A")
export const normalizeKelas = (kls: string = ''): string => {
  if (!kls) return '7A';
  let cleaned = kls.toString().toUpperCase().trim();
  cleaned = cleaned.replace(/^KELAS\s*/i, '');
  cleaned = cleaned.replace(/[\s\-_./\\]+/g, '');
  
  // Replace Roman numerals safely (VIII before VII, IX after)
  if (cleaned.startsWith('VIII')) cleaned = cleaned.replace(/^VIII/, '8');
  else if (cleaned.startsWith('VII')) cleaned = cleaned.replace(/^VII/, '7');
  else if (cleaned.startsWith('IX')) cleaned = cleaned.replace(/^IX/, '9');
  
  return cleaned || '7A';
};

/**
 * Menghasilkan berbagai format penulisan nama kelas untuk pencarian fleksibel di database Supabase.
 * Contoh '7A' -> ['7A', '7-A', '7 A', 'VII A', 'VII-A', 'VIIA', 'Kelas 7A', 'Kelas 7-A', 'Kelas VII A', 'Kelas VII-A']
 */
export const getClassQueryVariants = (kelas: string): string[] => {
  const norm = normalizeKelas(kelas);
  const gradeMatch = norm.match(/^([789])/);
  const grade = gradeMatch ? gradeMatch[1] : '';
  const section = grade ? norm.slice(grade.length) : '';
  const romanGrade = grade === '7' ? 'VII' : grade === '8' ? 'VIII' : grade === '9' ? 'IX' : grade;
  
  const set = new Set<string>();
  set.add(kelas);
  set.add(norm);
  if (grade && section) {
    set.add(`${grade}${section}`);
    set.add(`${grade}-${section}`);
    set.add(`${grade} ${section}`);
    set.add(`${romanGrade} ${section}`);
    set.add(`${romanGrade}-${section}`);
    set.add(`${romanGrade}${section}`);
    set.add(`Kelas ${grade}${section}`);
    set.add(`Kelas ${grade} ${section}`);
    set.add(`Kelas ${grade}-${section}`);
    set.add(`Kelas ${romanGrade} ${section}`);
    set.add(`Kelas ${romanGrade}-${section}`);
  }
  return Array.from(set);
};

// Official master list of teachers for SMP Negeri 7 Pasuruan
export const DEFAULT_GURU_LIST: { id: string; nama_guru: string; nip?: string }[] = [
  { id: 'g-nur', nama_guru: 'NUR FADILAH, S.Pd.,M.Pd.', nip: '19860410 201001 2 030' },
  { id: 'g-wiwik', nama_guru: 'WIWIK ISMIATI, S.Pd.', nip: '19831116 200904 2 003' },
  { id: 'g-hendrik', nama_guru: 'HENDRIK SAPUTRA, S.Pd.', nip: '19850728 200904 1 001' },
  { id: 'g-ida', nama_guru: 'IDA NURSANTI, M.Pd.', nip: '19770520 200801 2 016' },
  { id: 'g-arinah', nama_guru: 'NUR ARINAH, S.Pd.', nip: '19660903 198903 2 013' },
  { id: 'g-dewi', nama_guru: 'DEWI MAHINDRAWATI, S.Pd.', nip: '19661226 198903 2 008' },
  { id: 'g-edy', nama_guru: 'Drs. EDY SUPRAYITNO, M.M.', nip: '19661103 199512 1 002' },
  { id: 'g-soegi', nama_guru: 'SOEGIHARTINI, S.Pd.', nip: '19690703 199703 2 005' },
  { id: 'g-mariati', nama_guru: 'Dra. Hj. MARIATI', nip: '19690323 199802 2 007' },
  { id: 'g-khozin', nama_guru: 'Hj. KHOZINATUL ULUM, S.Pd.', nip: '19680717 199903 2 005' },
  { id: 'g-endah', nama_guru: 'ENDAH SULISTYAWATI, S.Pd.', nip: '19680927 200701 2 019' },
  { id: 'g-dina', nama_guru: 'DINA ISTIARNI, S.Pd.', nip: '19800422 201001 2 009' },
  { id: 'g-fika', nama_guru: 'FIKA RAHMAWATI, M.Pd.', nip: '19870808 201001 2 025' },
  { id: 'g-aris', nama_guru: 'ARIS FITRIANTO, M.Pd.', nip: '19810218 201001 1 015' },
  { id: 'g-aminah', nama_guru: 'SITI AMINAH, S.Pd.', nip: '' },
  { id: 'g-fauzi', nama_guru: 'ACHMAD FAUZI, S.Pd.', nip: '' },
  { id: 'g-yasin', nama_guru: 'MOHAMMAD YASIN, S.Pd.I', nip: '' },
  { id: 'g-ratna', nama_guru: 'RATNA WIDYAWATI, S.Pd.', nip: '' },
  { id: 'g-ririn', nama_guru: 'RIRIN DWI ASTUTI, S.Pd.', nip: '' },
  { id: 'g-tri', nama_guru: 'TRI WAHYUNI, S.Pd.', nip: '' },
  { id: 'g-yuliatin', nama_guru: 'YULIATIN, S.Pd.', nip: '' },
  { id: 'g-agus', nama_guru: 'AGUS PURWANTO, S.Pd.', nip: '' },
  { id: 'g-bambang', nama_guru: 'BAMBANG SETIAWAN, S.Pd.', nip: '' },
  { id: 'g-kurnia', nama_guru: 'KURNIAWATI, S.Pd.', nip: '' },
  { id: 'g-lilik', nama_guru: 'LILIK SUGIARTI, S.Pd.', nip: '' },
  { id: 'g-nurul', nama_guru: 'NURUL HIDAYATI, S.Pd.', nip: '' },
  { id: 'g-slamet', nama_guru: 'SLAMET RIYADI, S.Pd.', nip: '' },
  { id: 'g-suhartatik', nama_guru: 'SUHARTATIK, S.Pd.', nip: '' },
  { id: 'g-wahyu', nama_guru: 'WAHYU KURNIAWAN, S.Pd.', nip: '' },
  { id: 'g-yeni', nama_guru: 'YENI RAHMAWATI, S.Pd.', nip: '' },
  { id: 'g-zainal', nama_guru: 'ZAINAL ABIDIN, S.Pd.I', nip: '' }
];

/**
 * Filter untuk mengecualikan nama guru tidak valid (seperti "Guru Inval WIWIK ISMIATI" karena sudah ada "WIWIK ISMIATI, S.Pd.")
 */
export const isExcludedGuru = (namaGuru?: string): boolean => {
  if (!namaGuru) return false;
  const lower = namaGuru.trim().toLowerCase();
  
  // Hapus "Guru Inval WIWIK ISMIATI" dan segala variasi yang menggunakan kata "inval"
  if (
    lower.includes('inval') ||
    lower.includes('guru inval') ||
    lower.startsWith('inval')
  ) {
    return true;
  }
  
  return false;
};

/**
 * Menghilangkan duplikasi nama guru berdasarkan nama dasar (mengabaikan gelar seperti S.Pd, M.Pd, dsb).
 * Jika ada "WIWIK ISMIATI" dan "WIWIK ISMIATI, S.Pd.", utamakan yang memiliki gelar lengkap atau NIP.
 */
export const deduplicateGuruList = (
  list: { id: string; nama_guru: string; nip?: string }[]
): { id: string; nama_guru: string; nip?: string }[] => {
  const map = new Map<string, { id: string; nama_guru: string; nip?: string }>();

  list.forEach(g => {
    if (!g.nama_guru) return;
    const trimmed = g.nama_guru.trim();
    if (!trimmed || isExcludedGuru(trimmed)) return;

    const baseKey = cleanTeacherName(trimmed);
    if (!baseKey) return;

    if (!map.has(baseKey)) {
      map.set(baseKey, { ...g, nama_guru: trimmed });
    } else {
      const existing = map.get(baseKey)!;
      const existingHasNip = Boolean(existing.nip && existing.nip.trim().length > 3 && existing.nip.trim() !== '-');
      const newHasNip = Boolean(g.nip && g.nip.trim().length > 3 && g.nip.trim() !== '-');

      if (!existingHasNip && newHasNip) {
        map.set(baseKey, { ...g, nama_guru: trimmed });
      } else if (existingHasNip === newHasNip && trimmed.length > existing.nama_guru.length) {
        // Pilih nama yang memiliki gelar lengkap
        map.set(baseKey, { ...g, nama_guru: trimmed });
      }
    }
  });

  const usedIds = new Set<string>();
  return Array.from(map.values())
    .sort((a, b) => a.nama_guru.localeCompare(b.nama_guru))
    .map((g, idx) => {
      let safeId = g.id || `g-${idx + 1}`;
      if (usedIds.has(safeId)) {
        safeId = `g-${cleanTeacherName(g.nama_guru).replace(/\s+/g, '-')}-${idx + 1}`;
      }
      usedIds.add(safeId);
      return { ...g, id: safeId };
    });
};

/**
 * Menambahkan guru baru ke master_guru (localStorage & Supabase)
 */
export const addMasterGuru = async (
  nama_guru: string,
  nip?: string
): Promise<{
  success: boolean;
  guru?: { id: string; nama_guru: string; nip?: string };
  list: { id: string; nama_guru: string; nip?: string }[];
  error?: string;
}> => {
  const trimmedName = (nama_guru || '').trim();
  const trimmedNip = (nip || '').replace(/\r|\n/g, '').trim();

  if (!trimmedName) {
    return { success: false, list: [], error: 'Nama guru wajib diisi!' };
  }

  const newGuru = {
    id: generateUUID(),
    nama_guru: trimmedName,
    nip: trimmedNip
  };

  // 1. Update localStorage master_guru & sitelat_guru
  let existingList: { id: string; nama_guru: string; nip?: string }[] = [];
  try {
    const raw = localStorage.getItem('master_guru') || localStorage.getItem('sitelat_guru');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        existingList = parsed.map((g: any) => ({
          id: g.id || generateUUID(),
          nama_guru: (g.nama_guru || g.nama || g.nama_lengkap || '').toString().trim(),
          nip: (g.nip || g.NIP || g.nip_guru || '').toString().trim()
        })).filter(g => g.nama_guru);
      }
    }
  } catch (_) {}

  if (existingList.length === 0) {
    existingList = [...DEFAULT_GURU_LIST];
  }

  // Upsert by cleanTeacherName or exact match so adding a new teacher or updating NIP works smoothly
  const baseNew = cleanTeacherName(trimmedName);
  const filteredExisting = existingList.filter(g => cleanTeacherName(g.nama_guru) !== baseNew);
  const updatedList = [...filteredExisting, newGuru].sort((a, b) => a.nama_guru.localeCompare(b.nama_guru));

  localStorage.setItem('master_guru', JSON.stringify(updatedList));
  localStorage.setItem('sitelat_guru', JSON.stringify(updatedList));

  // 2. Sync to Supabase master_guru
  if (supabase) {
    try {
      const { error } = await supabase.from('master_guru').upsert([
        {
          id: newGuru.id,
          nama_guru: newGuru.nama_guru,
          ...(newGuru.nip ? { nip: newGuru.nip } : {})
        }
      ]);
      if (error) {
        // Fallback if nip column is not in table schema
        await supabase.from('master_guru').upsert([
          {
            id: newGuru.id,
            nama_guru: newGuru.nama_guru
          }
        ]);
      }
    } catch (err) {
      console.warn('Supabase addMasterGuru warning:', err);
    }
  }

  return {
    success: true,
    guru: newGuru,
    list: updatedList
  };
};

// Fetch list of teachers with immediate local availability + background sync
export const fetchGuruList = async (): Promise<{ id: string; nama_guru: string; nip?: string }[]> => {
  let localTeachers: { id: string; nama_guru: string; nip?: string }[] = [];

  // 0. Bersihkan localStorage dari nama guru yang dikecualikan agar tidak muncul lagi
  const purgeLocalGurus = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((g: any) => {
            const n = (g.nama_guru || g.nama || g.nama_lengkap || '').toString().trim();
            return n && !isExcludedGuru(n);
          });
          localStorage.setItem(key, JSON.stringify(deduplicateGuruList(cleaned)));
        }
      }
    } catch (_) {}
  };
  purgeLocalGurus('master_guru');
  purgeLocalGurus('sitelat_guru');

  // 1. Read local storage first (master_guru & sitelat_guru)
  try {
    const rawGuru = localStorage.getItem('master_guru') || localStorage.getItem('sitelat_guru');
    if (rawGuru) {
      const parsed = JSON.parse(rawGuru);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localTeachers = parsed.map((g: any) => ({
          id: g.id || `g-${Math.random().toString(36).substring(2, 7)}`,
          nama_guru: (g.nama_guru || g.nama || g.nama_lengkap || g['Nama Guru'] || g['nama'] || '').toString().trim(),
          nip: (g.nip || g.NIP || g.nip_guru || g['Nip'] || '').toString().replace(/\r|\n/g, '').trim()
        })).filter(g => g.nama_guru && !isExcludedGuru(g.nama_guru));
      }
    }
  } catch (_) {}

  // 2. Extract any teachers from existing saved journals (data recovery)
  try {
    const rawJurnal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawJurnal) {
      const parsedJurnal = JSON.parse(rawJurnal);
      if (Array.isArray(parsedJurnal)) {
        parsedJurnal.forEach((j: any) => {
          const tName = (j.nama_guru || '').toString().trim();
          if (tName && !isExcludedGuru(tName)) {
            localTeachers.push({
              id: j.guru_id || `g-${cleanTeacherName(tName)}`,
              nama_guru: tName,
              nip: (j.nip_guru || '').toString().replace(/\r|\n/g, '').trim()
            });
          }
        });
      }
    }
  } catch (_) {}

  // 3. Fetch from Supabase with safety timeout (max 3.5s)
  if (supabase) {
    try {
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 3500)
      );
      const queryPromise = supabase.from('master_guru').select('*').order('nama_guru', { ascending: true });
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (!error && data && data.length > 0) {
        const fromDb = data.map((g: any) => ({
          id: g.id || `g-${Math.random().toString(36).substring(2, 7)}`,
          nama_guru: (g.nama_guru || g.nama || g.nama_lengkap || g['Nama Guru'] || '').toString().trim(),
          nip: (g.nip || g.NIP || g.nip_guru || '').toString().replace(/\r|\n/g, '').trim()
        })).filter(g => g.nama_guru && !isExcludedGuru(g.nama_guru));

        if (fromDb.length > 0) {
          const merged = deduplicateGuruList([...DEFAULT_GURU_LIST, ...localTeachers, ...fromDb]);
          localStorage.setItem('master_guru', JSON.stringify(merged));
          return merged;
        }
      }
    } catch (e) {
      console.warn('Supabase fetch guru error:', e);
    }
  }

  // 4. If we have any teachers from master or journals, use them
  if (localTeachers.length > 0) {
    const finalTeachers = deduplicateGuruList([...DEFAULT_GURU_LIST, ...localTeachers]);
    localStorage.setItem('master_guru', JSON.stringify(finalTeachers));
    return finalTeachers;
  }

  // 5. Ultimate fallback if master data is genuinely empty
  const defaultCleaned = deduplicateGuruList(DEFAULT_GURU_LIST.filter(g => !isExcludedGuru(g.nama_guru)));
  localStorage.setItem('master_guru', JSON.stringify(defaultCleaned));
  return defaultCleaned;
};

/**
 * Menghilangkan duplikasi mata pelajaran & memastikan setiap item memiliki ID unik (mencegah duplikat key m-9 dsb)
 */
export const deduplicateMapelList = (
  list: { id?: string; nama_mapel: string }[]
): { id: string; nama_mapel: string }[] => {
  const normalizeMapelName = (name: string): string => {
    const trimmed = (name || '').trim();
    if (trimmed.toLowerCase() === 'seni budaya') {
      return 'Seni Budaya dan Prakarya';
    }
    return trimmed;
  };

  const map = new Map<string, { id?: string; nama_mapel: string }>();
  list.forEach(item => {
    const normalized = normalizeMapelName(item.nama_mapel);
    if (!normalized || normalized.toLowerCase() === 'prakarya') return;
    const key = normalized.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { id: item.id, nama_mapel: normalized });
    }
  });

  const usedIds = new Set<string>();
  return Array.from(map.values())
    .sort((a, b) => a.nama_mapel.localeCompare(b.nama_mapel))
    .map((m, idx) => {
      const slug = m.nama_mapel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      // Hindari penggunaan ID generik pendek seperti m-9 yang rawan bentrok
      let safeId = m.id && !/^m-\d+$/i.test(m.id) && !usedIds.has(m.id) ? m.id : `mapel-${slug || idx + 1}`;
      if (usedIds.has(safeId)) {
        safeId = `mapel-${slug}-${idx + 1}`;
      }
      usedIds.add(safeId);
      return { id: safeId, nama_mapel: m.nama_mapel };
    });
};

// Fetch list of subjects with immediate local availability + background sync
export const fetchMapelList = async (): Promise<{ id: string; nama_mapel: string }[]> => {
  let localMapels: { id: string; nama_mapel: string }[] = [];

  const normalizeMapelName = (name: string): string => {
    const trimmed = name.trim();
    if (trimmed.toLowerCase() === 'seni budaya') {
      return 'Seni Budaya dan Prakarya';
    }
    return trimmed;
  };

  try {
    const local = localStorage.getItem('master_mapel');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localMapels = parsed.map((m: any, idx: number) => ({
          id: m.id || `mapel-${idx + 1}`,
          nama_mapel: normalizeMapelName((m.nama_mapel || m.nama || m.mapel || String(m)).toString())
        })).filter(m => m.nama_mapel && m.nama_mapel.toLowerCase() !== 'prakarya');
      }
    }
  } catch (_) {}

  // Extract from stored journals
  try {
    const rawJurnal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawJurnal) {
      const parsedJurnal = JSON.parse(rawJurnal);
      if (Array.isArray(parsedJurnal)) {
        parsedJurnal.forEach((j: any) => {
          const mName = (j.nama_mapel || '').toString().trim();
          if (mName && mName.toLowerCase() !== 'prakarya') {
            localMapels.push({ id: j.mapel_id || `mapel-${localMapels.length + 1}`, nama_mapel: normalizeMapelName(mName) });
          }
        });
      }
    }
  } catch (_) {}

  const defaultItems = DEFAULT_MAPEL.map((m, idx) => ({ id: `def-mapel-${idx + 1}`, nama_mapel: m }));

  if (supabase) {
    try {
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 3500)
      );
      const queryPromise = supabase.from('master_mapel').select('*').order('nama_mapel', { ascending: true });
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (!error && data && data.length > 0) {
        const fromDb = data.map((m: any) => ({
          id: m.id,
          nama_mapel: normalizeMapelName((m.nama_mapel || m.nama || m.mapel || '').toString())
        })).filter(m => m.nama_mapel && m.nama_mapel.toLowerCase() !== 'prakarya');

        if (fromDb.length > 0) {
          const merged = deduplicateMapelList([...defaultItems, ...localMapels, ...fromDb]);
          localStorage.setItem('master_mapel', JSON.stringify(merged));
          return merged;
        }
      }
    } catch (e) {
      console.warn('Supabase fetch mapel error:', e);
    }
  }

  const merged = deduplicateMapelList([...defaultItems, ...localMapels]);
  localStorage.setItem('master_mapel', JSON.stringify(merged));
  return merged;
};

// Fetch available periodes instantly from local storage & Supabase
export const fetchAvailablePeriodes = async (): Promise<string[]> => {
  const set = new Set<string>();
  set.add('2025/2026');
  set.add('2026');
  set.add('2025');
  set.add('2024/2025');

  // 1. Instant check from local storage (sitelat_siswa, master_siswa, jurnal data)
  try {
    ['sitelat_siswa', 'master_siswa'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            if (s.periode) {
              const clean = s.periode.toString().trim();
              if (clean) set.add(clean);
            }
          });
        }
      }
    });

    const rawJurnal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawJurnal) {
      const jList = JSON.parse(rawJurnal);
      if (Array.isArray(jList)) {
        jList.forEach((j: any) => {
          if (j.periode) {
            const clean = j.periode.toString().trim();
            if (clean) set.add(clean);
          }
        });
      }
    }
  } catch (_) {}

  // 2. Fast bounded query to Supabase (limit 250 with 3s timeout)
  if (supabase) {
    try {
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 3000)
      );
      const queryPromise = supabase.from('master_siswa').select('periode').limit(250);
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      if (!error && data && Array.isArray(data)) {
        data.forEach((d: any) => {
          if (d.periode) {
            const clean = d.periode.toString().trim();
            if (clean) set.add(clean);
          }
        });
      }
    } catch (_) {}
  }

  return Array.from(set).sort((a, b) => b.localeCompare(a));
};

// Fetch all students for selection across all classes (for Inklusi or multi-class pickers)
export const fetchAllSiswaForSelection = async (targetPeriode?: string): Promise<{
  id: string;
  nama: string;
  nis?: string;
  kelas: string;
  periode?: string;
}[]> => {
  try {
    let activePeriode = targetPeriode;
    if (!activePeriode || activePeriode === 'BARU') {
      const pList = await fetchAvailablePeriodes();
      activePeriode = pList[0] || '2026';
    }

    let all: any[] = [];
    if (supabase) {
      let query = supabase
        .from('master_siswa')
        .select('*')
        .order('kelas', { ascending: true })
        .order('nama', { ascending: true });
      if (activePeriode && activePeriode !== 'ALL') {
        query = query.eq('periode', activePeriode);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        all = data;
      }
    }

    // Always check local storage (sitelat_siswa and master_siswa)
    ['sitelat_siswa', 'master_siswa'].forEach(key => {
      const local = localStorage.getItem(key);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((s: any) => {
              const sPeriode = (s.periode || '').toString().trim();
              return !activePeriode || activePeriode === 'ALL' || !sPeriode || sPeriode === activePeriode || sPeriode.includes(activePeriode);
            });
            all.push(...filtered);
          }
        } catch (_) {}
      }
    });

    // Also extract from stored journals if empty
    if (all.length === 0) {
      try {
        const rawJurnal = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawJurnal) {
          const jList = JSON.parse(rawJurnal);
          if (Array.isArray(jList)) {
            jList.forEach((j: any) => {
              if (Array.isArray(j.siswa_list)) {
                all.push(...j.siswa_list);
              }
            });
          }
        }
      } catch (_) {}
    }

    if (all.length === 0) {
      all = await fetchAllSiswa();
    }

    // Deduplicate by normalized name and normalized class
    const map = new Map<string, any>();
    all.forEach(s => {
      const normKls = normalizeKelas(s.kelas);
      const k = `${(s.nama || '').trim().toLowerCase()}_${normKls}`;
      if (s.nama && !map.has(k)) {
        map.set(k, {
          id: s.id || s.siswa_id || `s-${map.size + 1}`,
          nama: (s.nama || '').trim(),
          nis: s.nis || '',
          kelas: normKls,
          periode: s.periode || activePeriode
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const kDiff = a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
      if (kDiff !== 0) return kDiff;
      return a.nama.localeCompare(b.nama);
    });
  } catch (e) {
    console.error('Error fetching all students for selection:', e);
    return [];
  }
};

// Fetch students for a single class
const fetchSiswaBySingleKelas = async (
  kelas: string,
  targetPeriode?: string,
  tanggal?: string
): Promise<SiswaJurnalItem[]> => {
  try {
    const targetNormKelas = normalizeKelas(kelas);
    let activePeriode = targetPeriode;
    if (!activePeriode || activePeriode === 'BARU') {
      const pList = await fetchAvailablePeriodes();
      activePeriode = pList[0] || '2026';
    }

    let allSiswa: any[] = [];

    // 1. Check local storage first (sitelat_siswa AND master_siswa)
    ['sitelat_siswa', 'master_siswa'].forEach(storageKey => {
      try {
        const localRaw = localStorage.getItem(storageKey);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const matched = parsed.filter((s: any) => {
              if (!s || !s.nama) return false;
              const sNorm = normalizeKelas(s.kelas);
              return sNorm === targetNormKelas;
            });
            if (matched.length > 0) {
              allSiswa.push(...matched);
            }
          }
        }
      } catch (_) {}
    });

    // 2. Fetch from Supabase with generous class variants
    if (supabase) {
      try {
        const classVariants = getClassQueryVariants(kelas);

        let query = supabase
          .from('master_siswa')
          .select('*')
          .in('kelas', classVariants);

        if (activePeriode && activePeriode !== 'ALL') {
          query = query.eq('periode', activePeriode);
        }

        const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
          setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 3500)
        );
        const { data, error } = await Promise.race([query.order('nama', { ascending: true }), timeoutPromise]);

        if (!error && data && data.length > 0) {
          allSiswa.push(...data);
        } else {
          // If no students with strict activePeriode, query without periode filter
          const { data: noPeriodData } = await supabase
            .from('master_siswa')
            .select('*')
            .in('kelas', classVariants)
            .order('nama', { ascending: true });
          if (noPeriodData && noPeriodData.length > 0) {
            allSiswa.push(...noPeriodData);
          }
        }
      } catch (sbErr) {
        console.warn('Error fetching students from Supabase:', sbErr);
      }
    }

    // 3. Extract from existing saved journals if still empty (Data recovery)
    if (allSiswa.length === 0) {
      try {
        const rawJurnal = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawJurnal) {
          const jList = JSON.parse(rawJurnal);
          if (Array.isArray(jList)) {
            jList.forEach((j: any) => {
              if (normalizeKelas(j.kelas) === targetNormKelas && Array.isArray(j.siswa_list)) {
                allSiswa.push(...j.siswa_list);
              }
            });
          }
        }
      } catch (_) {}
    }

    // 4. Filter by periode if applicable, but fallback gracefully if strict period yields 0
    let candidates = allSiswa;
    if (activePeriode && activePeriode !== 'ALL') {
      const periodMatched = allSiswa.filter((s: any) => {
        const sP = (s.periode || '').toString().trim();
        return !sP || sP === activePeriode || sP.includes(activePeriode) || activePeriode.includes(sP);
      });
      if (periodMatched.length > 0) {
        candidates = periodMatched;
      }
    }

    // 5. Deduplicate students by normalized name so every student appears once
    const uniqueMap = new Map<string, any>();
    candidates.forEach(s => {
      const nameKey = (s.nama || '').toString().trim().toLowerCase();
      if (nameKey && !uniqueMap.has(nameKey)) {
        uniqueMap.set(nameKey, s);
      }
    });
    const uniqueSiswa = Array.from(uniqueMap.values()).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    // 6. Existing Izin check
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
      } catch (_) {}
    }

    if (uniqueSiswa.length > 0) {
      // Auto-cache back to local storage so future lookups are instant
      try {
        const currentSitelat = JSON.parse(localStorage.getItem('sitelat_siswa') || '[]');
        const mapSitelat = new Map<string, any>();
        currentSitelat.forEach((s: any) => mapSitelat.set(`${normalizeKelas(s.kelas)}_${(s.nama || '').toLowerCase().trim()}`, s));
        uniqueSiswa.forEach(s => {
          const key = `${targetNormKelas}_${(s.nama || '').toLowerCase().trim()}`;
          if (!mapSitelat.has(key)) {
            mapSitelat.set(key, {
              id: s.id || s.siswa_id || crypto.randomUUID(),
              nama: (s.nama || '').trim(),
              kelas: targetNormKelas,
              periode: s.periode || activePeriode,
              nis: s.nis || ''
            });
          }
        });
        localStorage.setItem('sitelat_siswa', JSON.stringify(Array.from(mapSitelat.values())));
        localStorage.setItem('master_siswa', JSON.stringify(Array.from(mapSitelat.values())));
      } catch (_) {}

      return uniqueSiswa.map((s: any, idx: number) => {
        const studentId = s.id || s.siswa_id || `s-${idx + 1}`;
        const existingIzin = activeIzinByStudent[studentId];
        let defaultAbsensi: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' = s.absensi || 'Hadir';
        let defaultCatatan = s.catatan_siswa || '';
        let sudahIzin = !!s.sudah_izin;
        let keteranganIzin = s.keterangan_izin || '';

        if (existingIzin) {
          sudahIzin = true;
          defaultAbsensi = existingIzin.jenis_izin === 'Sakit' ? 'Sakit' : 'Izin';
          keteranganIzin = `Sudah Izin (${existingIzin.jenis_izin}): ${existingIzin.alasan || 'Form Wali Murid'}`;
          defaultCatatan = `Izin via Form Wali Murid (${existingIzin.jenis_izin})`;
        }

        return {
          siswa_id: studentId,
          nama: (s.nama || '').trim(),
          nis: s.nis || `24${targetNormKelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
          kelas: s.kelas || targetNormKelas,
          periode: s.periode || activePeriode,
          absensi: defaultAbsensi,
          nilai: s.nilai || '',
          catatan_siswa: defaultCatatan,
          tindakan: s.tindakan || '',
          sudah_izin: sudahIzin,
          keterangan_izin: keteranganIzin
        };
      });
    }
  } catch (e) {
    console.error('Error fetching siswa for class:', e);
  }

  // Return empty list if no students are registered for this class in data master
  return [];
};

// Fetch students for a specific class (or multi-class like "7A, 7B" or "Inklusi")
export const fetchSiswaByKelas = async (
  kelas: string,
  targetPeriode?: string,
  tanggal?: string
): Promise<SiswaJurnalItem[]> => {
  // Check if Inklusi
  if (kelas === 'Inklusi' || kelas.toLowerCase().startsWith('inklusi')) {
    const savedIds = getSavedInklusiSiswaIds();
    if (savedIds.length > 0) {
      const allSiswa = await fetchAllSiswaForSelection(targetPeriode);
      const matched = allSiswa.filter(s => savedIds.includes(s.id));
      if (matched.length > 0) {
        return matched.map((s, idx) => ({
          siswa_id: s.id,
          nama: s.nama,
          nis: s.nis || `24${s.kelas.replace(/[^0-9]/g, '')}${String(idx + 1).padStart(3, '0')}`,
          kelas: s.kelas || 'Inklusi',
          periode: s.periode || targetPeriode || '2026',
          absensi: 'Hadir',
          nilai: '',
          catatan_siswa: 'Peserta Inklusi',
          tindakan: ''
        }));
      }
    }
    // If no saved inklusi students yet, return empty list so teacher selects via popup
    return [];
  }

  // Check if multi-class (contains comma)
  if (kelas.includes(',')) {
    const classes = kelas.split(',').map(k => k.trim()).filter(Boolean);
    const combined: SiswaJurnalItem[] = [];
    for (const singleK of classes) {
      const list = await fetchSiswaBySingleKelas(singleK, targetPeriode, tanggal);
      combined.push(...list);
    }
    return combined.sort((a, b) => {
      const kDiff = a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
      if (kDiff !== 0) return kDiff;
      return a.nama.localeCompare(b.nama);
    });
  }

  return fetchSiswaBySingleKelas(kelas, targetPeriode, tanggal);
};

export const generateDemoSiswa = (_kelas: string): SiswaJurnalItem[] => {
  return [];
};

/**
 * Memulihkan data master siswa, master guru, dan mata pelajaran dari seluruh
 * rekaman jurnal pembelajaran yang pernah tersimpan di sistem.
 */
export const restoreMasterData = async (): Promise<{
  restoredSiswa: number;
  restoredGuru: number;
  restoredMapel: number;
}> => {
  let restoredSiswa = 0;
  let restoredGuru = 0;
  let restoredMapel = 0;

  try {
    const journals = await getLocalOrIdbJurnalList();
    if (!journals || journals.length === 0) {
      return { restoredSiswa: 0, restoredGuru: 0, restoredMapel: 0 };
    }

    // 1. Recover Students
    const existingSiswaRaw = localStorage.getItem('sitelat_siswa') || localStorage.getItem('master_siswa') || '[]';
    const currentSiswa: any[] = JSON.parse(existingSiswaRaw);
    const siswaMap = new Map<string, any>();
    currentSiswa.forEach(s => {
      if (s && s.nama) {
        siswaMap.set(`${normalizeKelas(s.kelas)}_${s.nama.toLowerCase().trim()}`, s);
      }
    });

    journals.forEach(j => {
      if (Array.isArray(j.siswa_list)) {
        j.siswa_list.forEach(s => {
          if (!s || !s.nama) return;
          const kls = normalizeKelas(s.kelas || j.kelas);
          const key = `${kls}_${s.nama.toLowerCase().trim()}`;
          if (!siswaMap.has(key)) {
            siswaMap.set(key, {
              id: s.siswa_id || crypto.randomUUID(),
              nama: s.nama.trim(),
              kelas: kls,
              nis: s.nis || '',
              periode: s.periode || j.periode || '2026'
            });
            restoredSiswa++;
          }
        });
      }
    });

    const finalSiswa = Array.from(siswaMap.values()).sort((a, b) => {
      const k = a.kelas.localeCompare(b.kelas, undefined, { numeric: true });
      if (k !== 0) return k;
      return a.nama.localeCompare(b.nama);
    });
    localStorage.setItem('sitelat_siswa', JSON.stringify(finalSiswa));
    localStorage.setItem('master_siswa', JSON.stringify(finalSiswa));

    // 2. Recover Teachers
    const existingGuruRaw = localStorage.getItem('master_guru') || '[]';
    const currentGuru: any[] = JSON.parse(existingGuruRaw);
    const recoveredGurus: any[] = [];
    
    currentGuru.forEach(g => {
      const gName = (g.nama_guru || g.nama || '').trim();
      if (gName && !isExcludedGuru(gName)) {
        recoveredGurus.push({
          id: g.id || `g-${cleanTeacherName(gName)}`,
          nama_guru: gName,
          nip: (g.nip || g.NIP || g.nip_guru || '').toString().trim()
        });
      }
    });

    journals.forEach(j => {
      const tName = (j.nama_guru || '').trim();
      if (tName && !isExcludedGuru(tName)) {
        recoveredGurus.push({
          id: j.guru_id || `g-${cleanTeacherName(tName)}`,
          nama_guru: tName,
          nip: (j.nip_guru || '').trim()
        });
        restoredGuru++;
      }
    });

    const finalGuru = deduplicateGuruList(recoveredGurus);
    localStorage.setItem('master_guru', JSON.stringify(finalGuru));

    // 3. Recover Mapel
    const existingMapelRaw = localStorage.getItem('master_mapel') || '[]';
    const currentMapel: any[] = JSON.parse(existingMapelRaw);
    const recoveredMapels: { id?: string; nama_mapel: string }[] = [];
    currentMapel.forEach(m => {
      const rawN = (m.nama_mapel || m.nama || String(m)).trim();
      if (rawN && rawN.toLowerCase() !== 'prakarya') {
        const n = rawN.toLowerCase() === 'seni budaya' ? 'Seni Budaya dan Prakarya' : rawN;
        recoveredMapels.push({ id: m.id, nama_mapel: n });
      }
    });

    journals.forEach(j => {
      const rawM = (j.nama_mapel || '').trim();
      if (rawM && rawM.toLowerCase() !== 'prakarya') {
        const mName = rawM.toLowerCase() === 'seni budaya' ? 'Seni Budaya dan Prakarya' : rawM;
        recoveredMapels.push({ id: j.mapel_id, nama_mapel: mName });
        restoredMapel++;
      }
    });

    const finalMapel = deduplicateMapelList(recoveredMapels);
    localStorage.setItem('master_mapel', JSON.stringify(finalMapel));

    // Background sync to Supabase if available
    if (supabase && (restoredSiswa > 0 || restoredGuru > 0)) {
      setTimeout(async () => {
        try {
          if (restoredGuru > 0) {
            await supabase?.from('master_guru').upsert(finalGuru, { onConflict: 'id' });
          }
          if (restoredSiswa > 0) {
            // Upsert in chunks of 50
            for (let i = 0; i < finalSiswa.length; i += 50) {
              await supabase?.from('master_siswa').upsert(finalSiswa.slice(i, i + 50), { onConflict: 'id' });
            }
          }
        } catch (_) {}
      }, 500);
    }
  } catch (err) {
    console.warn('Gagal restore master data:', err);
  }

  return { restoredSiswa, restoredGuru, restoredMapel };
};

/**
 * Membantu membandingkan urutan kelas secara natural (7A, 7B, ... 7H, 8A ... 8H, 9A ... 9H).
 */
export const compareKelas = (kelasA: string = '', kelasB: string = ''): number => {
  const cleanA = (kelasA || '').trim();
  const cleanB = (kelasB || '').trim();
  return cleanA.localeCompare(cleanB, 'id', { numeric: true, sensitivity: 'base' });
};

/**
 * Membantu mengekstrak angka jam pelajaran pertama.
 */
export const parseFirstNumber = (str: string = ''): number => {
  const match = (str || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
};

/**
 * Membantu membandingkan urutan jam pelajaran (berdasarkan jam_mulai / jam_ke).
 */
export const compareJam = (
  a: { jam_mulai?: string; jam_ke?: string },
  b: { jam_mulai?: string; jam_ke?: string }
): number => {
  if (a.jam_mulai && b.jam_mulai && a.jam_mulai !== b.jam_mulai) {
    return a.jam_mulai.localeCompare(b.jam_mulai);
  }
  const numA = parseFirstNumber(a.jam_ke);
  const numB = parseFirstNumber(b.jam_ke);
  if (numA !== numB) {
    return numA - numB;
  }
  return (a.jam_ke || '').localeCompare(b.jam_ke || '', 'id', { numeric: true });
};

/**
 * Mengurutkan jurnal pembelajaran berdasarkan KELAS terlebih dahulu lalu JAM pelajaran.
 */
export const sortJurnalByKelasDanJam = (a: JurnalPembelajaran, b: JurnalPembelajaran): number => {
  const kelasDiff = compareKelas(a.kelas, b.kelas);
  if (kelasDiff !== 0) return kelasDiff;
  return compareJam(a, b);
};

export const SQL_PURGE_2025_SCRIPT = `-- ==============================================================================
-- SCRIPT PEMBERSIHAN DATA PERIODE 2025 DI SUPABASE (HANYA SISAKAN 2026)
-- Jalankan di: https://supabase.com/dashboard/project/ltfwkunozemldjivnqfq/sql
-- ==============================================================================

-- 1. Hapus transaksi & relasi data siswa periode 2025 / non-2026
DELETE FROM public.transaksi_pelanggaran 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.transaksi_terlambat 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.disp_transaksi 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.prestasi_siswa 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.bk_transaksi_kasus 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.uks_kunjungan 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.sipena_kunjungan_siswa 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.sipena_kunjungan_warta_siswa 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.sipena_peminjaman 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.izin_siswa 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

DELETE FROM public.pengaduan_wali 
WHERE siswa_id IN (SELECT id FROM public.master_siswa WHERE periode = '2025' OR periode IS NULL OR periode != '2026');

-- 2. Hapus data Master Siswa periode 2025 (HANYA SISAKAN 2026)
DELETE FROM public.master_siswa 
WHERE periode = '2025' OR periode IS NULL OR periode != '2026';

-- 3. Hapus data Jurnal Pembelajaran periode 2025 atau sebelum tahun 2026
DELETE FROM public.jurnal_pembelajaran 
WHERE periode = '2025' OR (periode IS NULL AND (tanggal < '2026-01-01' OR EXTRACT(YEAR FROM tanggal) < 2026));

-- 4. Kunci default periode ke '2026' agar data baru selalu 2026
ALTER TABLE public.master_siswa ALTER COLUMN periode SET DEFAULT '2026';
ALTER TABLE public.jurnal_pembelajaran ALTER COLUMN periode SET DEFAULT '2026';
`;

/**
 * Fungsi pembersihan aman: Tidak lagi menghapus data master siswa atau jurnal secara permanen
 * agar data sekolah tetap utuh dan aman.
 */
export const purgePeriode2025Data = async (): Promise<{
  success: boolean;
  message: string;
  deletedLocalSiswa: number;
  deletedLocalJurnal: number;
  supabaseError?: string;
}> => {
  // Jalankan restore data otomatis untuk memastikan semua data terlindungi
  await restoreMasterData();

  return {
    success: true,
    message: 'Data master dan rekaman jurnal telah diamankan dan disinkronkan.',
    deletedLocalSiswa: 0,
    deletedLocalJurnal: 0
  };
};
