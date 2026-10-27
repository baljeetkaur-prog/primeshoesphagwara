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

  // Decode and return the string
  return decoder.decode(decryptedBuffer);
}
