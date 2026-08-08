const SALT_PREFIX = 'apes_salt_';
const HASH_PREFIX = 'apes_hash_';
const VERSION_PREFIX = 'v1:';

function getSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKeyBits(password: string, salt: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  try {
    const salt = getSalt();
    const bits = await deriveKeyBits(password, salt);
    const hash = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
    return `${VERSION_PREFIX}${SALT_PREFIX}${salt}:${HASH_PREFIX}${hash}`;
  } catch (err) {
    // If Web Crypto is unavailable (e.g. non-secure context), fall back to plaintext
    console.error('[crypto] hashPassword failed, using plaintext fallback:', err);
    return password;
  }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return password.length === 0;

  // New PBKDF2 hash (v1: prefix)
  if (stored.startsWith(VERSION_PREFIX)) {
    try {
      const data = stored.replace(VERSION_PREFIX, '');
      const salt = data.split(':')[0].replace(SALT_PREFIX, '');
      const expectedHash = data.split(':')[1].replace(HASH_PREFIX, '');
      const bits = await deriveKeyBits(password, salt);
      const actualHash = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
      return actualHash === expectedHash;
    } catch (err) {
      console.error('[crypto] verifyPassword failed:', err);
      return false;
    }
  }

  // Legacy AES-GCM hashes (apes_salt_ prefix, no v1:) — fall back to plaintext comparison
  // These will re-hash on next successful login
  if (stored.startsWith(SALT_PREFIX) && stored.includes(`:${HASH_PREFIX}`)) {
    return false; // Cannot re-derive; user will need password reset
  }

  // Plaintext fallback (dev / seed accounts)
  return password === stored || password.toLowerCase() === stored.toLowerCase();
}

export function isHashedPassword(stored: string): boolean {
  if (typeof stored !== 'string') return false;
  // Accept both v1: (new) and legacy apes_salt_ format
  return stored.startsWith(VERSION_PREFIX) ||
    (stored.startsWith(SALT_PREFIX) && stored.includes(`:${HASH_PREFIX}`));
}
