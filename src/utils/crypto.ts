const SALT_PREFIX = 'apes_salt_';
const HASH_PREFIX = 'apes_hash_';

function getSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = getSalt();
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    key,
    new TextEncoder().encode(password)
  );
  const hash = Array.from(new Uint8Array(encrypted), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${SALT_PREFIX}${salt}:${HASH_PREFIX}${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return password.length === 0;
  if (!stored.startsWith(SALT_PREFIX) || !stored.includes(`:${HASH_PREFIX}`)) {
    return password === stored;
  }
  const salt = stored.split(':')[0].replace(SALT_PREFIX, '');
  const expectedHash = stored.split(':')[1].replace(HASH_PREFIX, '');
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    key,
    new TextEncoder().encode(password)
  );
  const actualHash = Array.from(new Uint8Array(encrypted), (b) => b.toString(16).padStart(2, '0')).join('');
  return actualHash === expectedHash;
}

export function isHashedPassword(stored: string): boolean {
  return stored.startsWith(SALT_PREFIX) && stored.includes(`:${HASH_PREFIX}`);
}
