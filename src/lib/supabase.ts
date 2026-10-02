import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials for SMPN7APL
const DEFAULT_SUPABASE_URL = 'https://ltfwkunozemldjivnqfq.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_CXRMrPZk7aIhJMdomAqZig_DdhECr-9';

// Get URL and Key from import.meta.env, localStorage, or defaults
export const getStoredSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = typeof window !== 'undefined' ? (localStorage.getItem('VITE_SUPABASE_URL') || localStorage.getItem('supabase_url') || '') : '';
  const localKey = typeof window !== 'undefined' ? (localStorage.getItem('VITE_SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key') || '') : '';

  const activeUrl = (localUrl || envUrl || DEFAULT_SUPABASE_URL).trim();
  const activeKey = (localKey || envKey || DEFAULT_SUPABASE_KEY).trim();

  return {
    url: activeUrl,
    key: activeKey,
    isCustom: !!(localUrl || localKey),
    hasEnv: !!(envUrl && envKey)
  };
};

let currentClient: SupabaseClient | null = null;

export const initSupabaseClient = (): SupabaseClient | null => {
  const config = getStoredSupabaseConfig();
  if (config.url && config.key) {
    try {
      currentClient = createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        },
        global: {
          headers: {
            apikey: config.key
          }
        }
      });
      return currentClient;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      currentClient = null;
      return null;
    }
  }
  currentClient = null;
  return null;
};

// Initialize once
initSupabaseClient();

export const supabase: SupabaseClient | null = currentClient;

export const getSupabase = (): SupabaseClient | null => {
  if (!currentClient) {
    return initSupabaseClient();
  }
  return currentClient;
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem('VITE_SUPABASE_URL', url.trim());
      localStorage.setItem('supabase_url', url.trim());
    } else {
      localStorage.removeItem('VITE_SUPABASE_URL');
      localStorage.removeItem('supabase_url');
    }

    if (key.trim()) {
      localStorage.setItem('VITE_SUPABASE_ANON_KEY', key.trim());
      localStorage.setItem('supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
      localStorage.removeItem('supabase_anon_key');
    }

    initSupabaseClient();
    window.location.reload();
  }
};

export const clearSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('VITE_SUPABASE_URL');
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
    localStorage.removeItem('supabase_anon_key');
    initSupabaseClient();
    window.location.reload();
  }
};

export const testSupabaseConnection = async (testUrl?: string, testKey?: string): Promise<{ success: boolean; message: string; isUnhealthy?: boolean }> => {
  const config = getStoredSupabaseConfig();
  const urlToTest = (testUrl || config.url).trim().replace(/\/+$/, '');
  const keyToTest = (testKey || config.key).trim();

  if (!urlToTest || !keyToTest) {
    return { success: false, message: 'URL atau API Key Supabase belum diisi.' };
  }

  // 1. Direct Ping test via HTTP fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${urlToTest}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': keyToTest,
        'Authorization': `Bearer ${keyToTest}`
      },
      signal: controller.signal
    }).catch(err => {
      if (err.name === 'AbortError') {
        throw new Error('Timeout: Proyek Supabase tidak merespons dalam 6 detik.');
      }
      throw err;
    });

    clearTimeout(timeoutId);

    if (response.status === 502 || response.status === 503 || response.status === 504) {
      return { 
        success: false, 
        isUnhealthy: true,
        message: `Status Server Unhealthy (HTTP ${response.status}): Database Supabase sedang tidak aktif/restarting. Buka dashboard Supabase dan lakukan Restart/Unpause proyek.` 
      };
    }

    if (response.status === 401 || response.status === 403) {
      return { 
        success: false, 
        message: 'Koneksi ditolak (401/403): API Key tidak valid. Jika menggunakan "sb_publishable_...", coba gunakan JWT Anon Key (berawalan "eyJhbGci...") dari Project Settings → API.' 
      };
    }

    return { 
      success: true, 
      message: 'Koneksi ke Supabase berhasil! REST API endpoint merespons dengan normal.' 
    };
  } catch (err: any) {
    return { 
      success: false, 
      isUnhealthy: true,
      message: `Gagal Terhubung (TypeError: Failed to fetch): Server Supabase berstatus "Unhealthy" di dashboard Supabase. Silakan buka dashboard Supabase dan lakukan "Restart Project" atau "Unpause Project".` 
    };
  }
};

export const filterLatestStudents = (allStudents: any[]): any[] => {
  if (!allStudents || !Array.isArray(allStudents) || allStudents.length === 0) return [];
  
  const sorted = [...allStudents].sort((a, b) => {
    const pA = (a.periode || '').toString().trim();
    const pB = (b.periode || '').toString().trim();
    if (pA !== pB) {
      if (!pA) return 1;
      if (!pB) return -1;
      return pB.localeCompare(pA);
    }
    if (a.created_at && b.created_at) {
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
        return tB - tA;
      }
    }
    return (b.id || '').toString().localeCompare((a.id || '').toString());
  });

  const studentMapByNama = new Map<string, any>();
  const studentMapByNis = new Map<string, any>();

  sorted.forEach(s => {
    if (!s.nama) return;
    const normNama = s.nama.toString().toLowerCase().replace(/\s+/g, ' ').trim();
    const nisStr = (s.nis || '').toString().trim();

    const existingByName = studentMapByNama.get(normNama);
    const existingByNis = nisStr ? studentMapByNis.get(nisStr) : null;

    if (!existingByName && !existingByNis) {
      studentMapByNama.set(normNama, s);
      if (nisStr) studentMapByNis.set(nisStr, s);
    }
  });

  const uniqueList = Array.from(new Set(studentMapByNama.values()));
  return uniqueList.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
};

export const fetchAllSiswa = async (): Promise<any[]> => {
  const client = getSupabase();
  if (!client) return [];
  let allSiswa: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await client
      .from('master_siswa')
      .select('*')
      .order('nama')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allSiswa = [...allSiswa, ...data];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return filterLatestStudents(allSiswa);
};
