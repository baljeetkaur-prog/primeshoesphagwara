// src/security/obfuscation.js
export const decryptPayload = async (base64Payload, base64Iv) => {
  const keyBase64 = process.env.AES_SECRET_KEY;
  if (!keyBase64) throw new Error("Missing AES key");

  // Decode base64 inputs
  const encryptedData = base64ToArrayBuffer(base64Payload);
  const iv = base64ToArrayBuffer(base64Iv);
  const keyBuffer = base64ToArrayBuffer(keyBase64);

  // Import key for AES-CBC decryption
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  // Decrypt
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    encryptedData
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
};

// Base64 to ArrayBuffer utility
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
