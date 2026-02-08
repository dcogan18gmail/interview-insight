// Crypto service for BYOK API key management
// Uses Web Crypto API exclusively — no npm dependencies

const STORAGE_KEY_ENCRYPTED = 'gemini_encrypted_key';
const STORAGE_KEY_PASSPHRASE = 'gemini_key_passphrase';

/**
 * Derive an AES-GCM 256-bit key from a passphrase using PBKDF2.
 * 100,000 iterations with SHA-256.
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt an API key with AES-GCM using a derived PBKDF2 key.
 * Returns base64-encoded string of salt(16) + iv(12) + ciphertext.
 * Fresh salt and IV are generated on every call.
 */
export async function encryptApiKey(
  apiKey: string,
  passphrase: string
): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(apiKey)
  );

  const ciphertext = new Uint8Array(encrypted);
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an API key from base64-encoded storage format.
 * Expects salt(16) + iv(12) + ciphertext layout.
 */
export async function decryptApiKey(
  storedData: string,
  passphrase: string
): Promise<string> {
  const raw = Uint8Array.from(atob(storedData), (c) => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ciphertext = raw.slice(28);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Get or create an app-generated passphrase stored in localStorage.
 * Generates a 32-character random base64 passphrase if none exists.
 */
export function getOrCreatePassphrase(): string {
  const existing = localStorage.getItem(STORAGE_KEY_PASSPHRASE);
  if (existing) {
    return existing;
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(24));
  const passphrase = btoa(String.fromCharCode(...randomBytes));
  localStorage.setItem(STORAGE_KEY_PASSPHRASE, passphrase);
  return passphrase;
}

/**
 * Validate a Gemini API key by making a lightweight request to the models endpoint.
 * Never throws — returns a result object with valid flag and optional error message.
 */
export async function validateGeminiApiKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`
    );

    if (response.ok) {
      return { valid: true };
    }

    return { valid: false, error: 'Invalid API key' };
  } catch {
    return {
      valid: false,
      error: 'Could not validate key. Check your network connection.',
    };
  }
}

/**
 * Check whether an encrypted API key exists in localStorage.
 */
export function hasStoredKey(): boolean {
  return !!localStorage.getItem(STORAGE_KEY_ENCRYPTED);
}

/**
 * Remove both the encrypted key and passphrase from localStorage.
 */
export function clearStoredKey(): void {
  localStorage.removeItem(STORAGE_KEY_ENCRYPTED);
  localStorage.removeItem(STORAGE_KEY_PASSPHRASE);
}

/**
 * Retrieve and decrypt the stored API key.
 * Returns null if no key is stored or if decryption fails (clears corrupted data).
 */
export async function getDecryptedKey(): Promise<string | null> {
  const storedData = localStorage.getItem(STORAGE_KEY_ENCRYPTED);
  if (!storedData) {
    return null;
  }

  try {
    const passphrase = getOrCreatePassphrase();
    return await decryptApiKey(storedData, passphrase);
  } catch {
    clearStoredKey();
    return null;
  }
}
