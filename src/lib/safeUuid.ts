/**
 * Safe UUID v4 generator that functions in all environments,
 * including non-secure contexts (such as smartphone access via local HTTP LAN e.g. http://192.168.x.x:3000)
 * where window.crypto.randomUUID is undefined.
 */
export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback if crypto.randomUUID throws in restrictive sandbox
    }
  }

  // RFC4122 version 4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default safeUUID;
