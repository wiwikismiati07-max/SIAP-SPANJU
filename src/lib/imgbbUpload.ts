/**
 * Utility for uploading images to ImgBB (ImageBB) cloud storage.
 * Automatically converts base64/file images into permanent public direct URLs (https://i.ibb.co/...).
 * Keeps Supabase database storage footprint virtually zero.
 */

// Primary & Fallback public developer API keys for ImgBB
const IMGBB_KEYS = [
  '6d023421b4171e21b229f9e802331cdb',
  'a3449cb869fa5b5f6a91724dd4c6aeeb',
  '8d61399e5eeffbc45ca35e4063df4d53',
  '3b3b2c286dcd8bfca87b00ec5a1b3be0'
];

export function getImgbbApiKey(): string {
  return (
    import.meta.env.VITE_IMGBB_API_KEY ||
    localStorage.getItem('IMGBB_API_KEY') ||
    IMGBB_KEYS[0]
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
 * Uploads a file or base64 string to ImgBB and returns the direct image URL (https://i.ibb.co/...).
 */
export async function uploadToImgBB(
  fileOrBase64: File | string,
  onStatusUpdate?: (msg: string) => void
): Promise<string> {
  onStatusUpdate?.('Mengunggah foto ke server ImgBB...');

  // Build candidate key list starting with custom or env key
  const customKey = localStorage.getItem('IMGBB_API_KEY') || import.meta.env.VITE_IMGBB_API_KEY;
  const keysToTry = customKey ? [customKey, ...IMGBB_KEYS] : IMGBB_KEYS;

  let lastError: Error | null = null;

  for (let i = 0; i < keysToTry.length; i++) {
    const currentKey = keysToTry[i];
    try {
      const formData = new FormData();
      formData.append('key', currentKey);

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
        let errJson;
        try { errJson = JSON.parse(errText); } catch (_) {}
        throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data && (result.data.url || result.data.display_url)) {
        onStatusUpdate?.('Sukses diunggah ke ImgBB!');
        return result.data.url || result.data.display_url;
      } else {
        throw new Error(result.error?.message || 'Respon ImgBB tidak valid');
      }
    } catch (err: any) {
      console.warn(`ImgBB upload attempt with key ${i + 1} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal mengunggah foto ke ImgBB. Silakan periksa koneksi internet.');
}
