// src/security/secureToken.js

const ENCODE = new TextEncoder();
const DECODE = new TextDecoder();

// Base64 helpers
function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}
function fromBase64(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

// Use secrets from environment variables
const SECRET_KEY = process.env.REACT_APP_SECRET_KEY || 'defaultsecretkey123';
const SALT = process.env.REACT_APP_ENCRYPTION_SALT || 'defaultsalt';

async function getKey() {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    ENCODE.encode(SECRET_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: ENCODE.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token) {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await getKey();
    const encoded = ENCODE.encode(token);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return JSON.stringify({
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(encrypted)),
    });
  } catch (err) {
    console.error('Encryption failed:', err);
    return null;
  }
}

export async function decryptToken(cipherText) {
  try {
    const { iv, data } = JSON.parse(cipherText);
    const key = await getKey();

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv) },
      key,
      fromBase64(data)
    );

    return DECODE.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}

// Optional helper
export async function isValidEncryptedToken(encryptedToken) {
  try {
    const decrypted = await decryptToken(encryptedToken);
    return !!decrypted;
  } catch {
    return false;
  }
}
// src/utils/securetoken.js

export async function decryptAdminToken(encryptedBase64, ivBase64, base64Key) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    encryptedData
  );

  return decoder.decode(decryptedBuffer);
}

