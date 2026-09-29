import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const filterLatestStudents = (allStudents: any[]): any[] => {
  if (!allStudents || !Array.isArray(allStudents) || allStudents.length === 0) return [];
  
  // Sort students by periode descending (highest periode first), then created_at descending, then id descending
  const sorted = [...allStudents].sort((a, b) => {
    // 1. Compare periode (descending, non-empty first)
    const pA = (a.periode || '').toString().trim();
    const pB = (b.periode || '').toString().trim();
    if (pA !== pB) {
      if (!pA) return 1;  // empty/null periode goes last
      if (!pB) return -1;
      return pB.localeCompare(pA); // e.g. '2026' before '2025'
    }
    // 2. Compare created_at if available (descending)
    if (a.created_at && b.created_at) {
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
        return tB - tA;
      }
    }
    // 3. Fallback ID comparison
    return (b.id || '').toString().localeCompare((a.id || '').toString());
  });

  const studentMapByNama = new Map<string, any>();
  const studentMapByNis = new Map<string, any>();

  sorted.forEach(s => {
    if (!s.nama) return;
    const normNama = s.nama.toString().toLowerCase().replace(/\s+/g, ' ').trim();
    const nisStr = (s.nis || '').toString().trim();

    // Check if student is already registered by normalized name OR by NIS
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
  if (!supabase) return [];
  let allSiswa: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
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
