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

/**
 * Mengecek apakah data siswa merupakan data periode 2026 murni (bukan 2025 / 2024 / demo).
 */
export const isSiswa2026Only = (s: any): boolean => {
  if (!s) return false;
  const idStr = (s.id || s.siswa_id || '').toString().trim();
  if (idStr.startsWith('demo-') || idStr === 'manual-1789089696988') {
    return false;
  }
  const p = (s.periode || '').toString().trim();
  if (p === '2025' || p === '2024' || p === '2024/2025' || p === '2025/2026' || p.startsWith('2024') || p.startsWith('2025')) {
    return false;
  }
  const nisStr = (s.nis || '').toString().trim();
  if (
    nisStr.startsWith('2024') ||
    nisStr.startsWith('247') ||
    nisStr.startsWith('248') ||
    nisStr.startsWith('249')
  ) {
    return false;
  }
  return true;
};

const normalizeKelasKey = (kls: string = ''): string => {
  if (!kls) return '7A';
  let cleaned = kls.toString().toUpperCase().trim().replace(/^KELAS\s*/i, '').replace(/[\s\-_./\\]+/g, '');
  if (cleaned.startsWith('VIII')) cleaned = cleaned.replace(/^VIII/, '8');
  else if (cleaned.startsWith('VII')) cleaned = cleaned.replace(/^VII/, '7');
  else if (cleaned.startsWith('IX')) cleaned = cleaned.replace(/^IX/, '9');
  return cleaned || '7A';
};

export const filterLatestStudents = (allStudents: any[]): any[] => {
  if (!allStudents || !Array.isArray(allStudents) || allStudents.length === 0) return [];

  // 1. Hanya ambil siswa periode 2026 (hapus semua data periode 2025 & demo)
  const only2026 = allStudents.filter(isSiswa2026Only).map(s => ({
    ...s,
    kelas: normalizeKelasKey(s.kelas),
    periode: '2026'
  }));

  const sorted = [...only2026].sort((a, b) => {
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

  const studentMapByKey = new Map<string, any>();
  const studentMapByNis = new Map<string, any>();

  sorted.forEach(s => {
    if (!s.nama) return;
    const normNama = s.nama.toString().toLowerCase().replace(/\s+/g, ' ').trim();
    const normKelas = normalizeKelasKey(s.kelas);
    const nameClassKey = `${normNama}__${normKelas}`;
    const nisStr = (s.nis || '').toString().trim();

    const existingByKey = studentMapByKey.get(nameClassKey);
    const existingByNis = nisStr && nisStr !== '-' ? studentMapByNis.get(nisStr) : null;

    if (!existingByKey && !existingByNis) {
      studentMapByKey.set(nameClassKey, s);
      if (nisStr && nisStr !== '-') studentMapByNis.set(nisStr, s);
    }
  });

  const uniqueList = Array.from(studentMapByKey.values());
  return uniqueList.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
};

/**
 * Bersihkan localStorage (sitelat_siswa & master_siswa) dari data siswa 2025 dan duplikat
 */
export const sanitizeLocalSiswaStorage = (): number => {
  if (typeof window === 'undefined') return 0;
  let removedCount = 0;
  ['sitelat_siswa', 'master_siswa'].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const beforeLen = parsed.length;
          const cleaned = filterLatestStudents(parsed);
          removedCount += Math.max(0, beforeLen - cleaned.length);
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      }
    } catch (_) {}
  });
  return removedCount;
};

// Jalankan pembersihan otomatis saat modul dimuat
sanitizeLocalSiswaStorage();

export const initSupabaseClient = (): SupabaseClient | null => {
  const config = getStoredSupabaseConfig();
  if (config.url && config.key) {
    try {
      const customFetch: typeof fetch = async (input, init) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const headersObj = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        const isRawMasterSiswa = headersObj.get('x-raw-master-siswa') === 'true';

        // Untuk query HEAD/GET ke master_siswa, pastikan hanya data 2026 yang dihitung/diambil
        if (!isRawMasterSiswa && urlStr.includes('/rest/v1/master_siswa') && (method === 'GET' || method === 'HEAD')) {
          let modifiedInput = input;
          if (!urlStr.includes('periode=')) {
            const sep = urlStr.includes('?') ? '&' : '?';
            modifiedInput = `${urlStr}${sep}periode=eq.2026`;
          }

          const response = await fetch(modifiedInput, init);
          if (method === 'GET' && response.ok) {
            try {
              const cloned = response.clone();
              const data = await cloned.json();
              if (Array.isArray(data)) {
                let filtered = data;
                if (data.length > 0 && ('nama' in data[0] || 'kelas' in data[0])) {
                  filtered = filterLatestStudents(data);
                } else {
                  filtered = data
                    .filter(isSiswa2026Only)
                    .map(item => ('periode' in item ? { ...item, periode: '2026' } : item));
                }

                const newHeaders = new Headers(response.headers);
                if (newHeaders.has('content-range')) {
                  newHeaders.set(
                    'content-range',
                    filtered.length > 0 ? `0-${filtered.length - 1}/${filtered.length}` : `*/0`
                  );
                }
                return new Response(JSON.stringify(filtered), {
                  status: response.status,
                  statusText: response.statusText,
                  headers: newHeaders
                });
              }
            } catch (_) {
              // Jika gagal parse JSON, kembalikan response asli
            }
          }
          return response;
        }

        // Untuk query GET ke master_guru, gabungkan dengan localStorage master_guru & normalisasi kolom NIP
        if (urlStr.includes('/rest/v1/master_guru') && method === 'GET') {
          const response = await fetch(input, init);
          if (response.ok) {
            try {
              const cloned = response.clone();
              const data = await cloned.json();
              if (Array.isArray(data)) {
                const map = new Map<string, any>();
                data.forEach((g: any) => {
                  const nama = (g.nama_guru || g.nama || '').toString().trim();
                  if (!nama || nama.toLowerCase().includes('inval')) return;
                  const nipVal = (g.nip || g.NIP || '').toString().replace(/\r|\n/g, '').trim();
                  const key = nama.toLowerCase().replace(/[^a-z0-9]/g, '');
                  map.set(key, {
                    ...g,
                    id: g.id,
                    nama_guru: nama,
                    nip: nipVal,
                    NIP: nipVal
                  });
                });

                if (typeof window !== 'undefined') {
                  try {
                    const localRaw = localStorage.getItem('master_guru') || localStorage.getItem('sitelat_guru');
                    if (localRaw) {
                      const localParsed = JSON.parse(localRaw);
                      if (Array.isArray(localParsed)) {
                        localParsed.forEach((g: any) => {
                          const nama = (g.nama_guru || g.nama || '').toString().trim();
                          if (!nama || nama.toLowerCase().includes('inval')) return;
                          const nipVal = (g.nip || g.NIP || '').toString().replace(/\r|\n/g, '').trim();
                          const key = nama.toLowerCase().replace(/[^a-z0-9]/g, '');
                          const existing = map.get(key);
                          if (!existing) {
                            map.set(key, {
                              id: g.id || crypto.randomUUID(),
                              nama_guru: nama,
                              nip: nipVal,
                              NIP: nipVal
                            });
                          } else if (nipVal && !existing.nip) {
                            map.set(key, {
                              ...existing,
                              nip: nipVal,
                              NIP: nipVal
                            });
                          }
                        });
                      }
                    }
                  } catch (_) {}
                }

                const mergedGuru = Array.from(map.values()).sort((a, b) =>
                  (a.nama_guru || '').localeCompare(b.nama_guru || '')
                );
                return new Response(JSON.stringify(mergedGuru), {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers
                });
              }
            } catch (_) {}
          }
          return response;
        }

        return fetch(input, init);
      };

      currentClient = createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        },
        global: {
          fetch: customFetch,
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
