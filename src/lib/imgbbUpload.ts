/**
 * Utility for uploading images to ImgBB (ImageBB) cloud storage and Supabase Storage.
 * Automatically converts base64/file images into permanent public direct URLs (https://i.ibb.co/...).
 * Keeps Supabase PostgreSQL database storage footprint virtually zero.
 */

import { supabase } from './supabase';

export function getImgbbApiKey(): string {
  return (
    localStorage.getItem('IMGBB_API_KEY') ||
    import.meta.env.VITE_IMGBB_API_KEY ||
    ''
  );
}

export function setImgbbApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem('IMGBB_API_KEY', key.trim());
  } else {
    localStorage.removeItem('IMGBB_API_KEY');
  }
}

/**
 * Test whether an ImgBB API key is valid by sending a tiny test ping.
 */
export async function testImgbbKey(key: string): Promise<boolean> {
  if (!key || key.trim().length < 8) return false;

  try {
    const sample1x1 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 gif
    const formData = new FormData();
    formData.append('key', key.trim());
    formData.append('image', sample1x1);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) return false;
    const json = await response.json();
    return !!(json.success && json.data && (json.data.url || json.data.display_url));
  } catch (err) {
    console.warn('Test ImgBB key error:', err);
    return false;
  }
}

/**
 * Fallback to Supabase Storage if bucket exists
 */
async function uploadToSupabaseStorageFallback(
  fileOrBase64: File | string,
  onStatusUpdate?: (msg: string) => void
): Promise<string | null> {
  if (!supabase) return null;

  try {
    onStatusUpdate?.('Mencoba menyimpan ke Supabase Storage Bucket...');
    let blob: Blob;
    let ext = 'jpg';

    if (typeof fileOrBase64 === 'string') {
      const cleanBase64 = fileOrBase64.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
    } else {
      blob = fileOrBase64;
      ext = fileOrBase64.name.split('.').pop() || 'jpg';
    }

    const candidateBuckets = ['jurnal-photos', 'jurnal_pembelajaran', 'dokumentasi', 'images', 'public'];
    for (const b of candidateBuckets) {
      const filename = `jurnal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { data, error } = await supabase.storage.from(b).upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

      if (!error && data) {
        const { data: pubData } = supabase.storage.from(b).getPublicUrl(filename);
        if (pubData?.publicUrl) {
          onStatusUpdate?.('✓ Foto berhasil tersimpan di Supabase Storage Bucket');
          return pubData.publicUrl;
        }
      }
    }
  } catch (e) {
    console.warn('Supabase storage fallback error:', e);
  }

  return null;
}

/**
 * Uploads a file or base64 string to ImgBB and returns the direct image URL (https://i.ibb.co/...).
 */
export async function uploadToImgBB(
  fileOrBase64: File | string,
  onStatusUpdate?: (msg: string) => void,
  customApiKey?: string
): Promise<string> {
  const activeKey = customApiKey || getImgbbApiKey();

  // If no ImgBB key configured, try Supabase Storage first or prompt user
  if (!activeKey) {
    const storageUrl = await uploadToSupabaseStorageFallback(fileOrBase64, onStatusUpdate);
    if (storageUrl) return storageUrl;

    throw new Error('Kunci API ImgBB belum diatur. Silakan atur Kunci API ImgBB di pengaturan.');
  }

  onStatusUpdate?.('Mengunggah foto ke server ImgBB...');

  try {
    const formData = new FormData();
    formData.append('key', activeKey.trim());

    if (typeof fileOrBase64 === 'string') {
      const cleanBase64 = fileOrBase64.replace(/^data:image\/\w+;base64,/, '');
      formData.append('image', cleanBase64);
    } else {
      formData.append('image', fileOrBase64);
    }

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson: any;
      try { errJson = JSON.parse(errText); } catch (_) {}
      const errMsg = errJson?.error?.message || `HTTP ${response.status}`;

      if (errMsg.toLowerCase().includes('invalid api') || errMsg.toLowerCase().includes('api v1 key')) {
        // Try Supabase Storage fallback before giving up
        const storageUrl = await uploadToSupabaseStorageFallback(fileOrBase64, onStatusUpdate);
        if (storageUrl) return storageUrl;

        throw new Error('Invalid API v1 key: Kunci API ImgBB tidak valid atau telah kedaluwarsa.');
      }

      throw new Error(errMsg);
    }

    const result = await response.json();
    if (result.success && result.data && (result.data.url || result.data.display_url)) {
      onStatusUpdate?.('✓ Sukses terhubung ke ImgBB!');
      return result.data.url || result.data.display_url;
    } else {
      throw new Error(result.error?.message || 'Respon ImgBB tidak valid');
    }
  } catch (err: any) {
    // If it's a key issue, check Supabase Storage
    const storageUrl = await uploadToSupabaseStorageFallback(fileOrBase64, onStatusUpdate);
    if (storageUrl) return storageUrl;

    throw err;
  }
}
