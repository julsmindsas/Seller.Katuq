export type WompiCardBrand = 'visa' | 'mastercard' | 'amex' | 'unknown';

export interface WompiCardData {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
  card_holder: string;
}

export function onlyDigits(value: string, maxLength: number): string {
  return String(value || '').replace(/\D/g, '').slice(0, maxLength);
}

export function detectCardBrand(value: string): WompiCardBrand {
  const digits = onlyDigits(value, 19);
  if (/^4/.test(digits)) return 'visa';
  if (/^3[47]/.test(digits)) return 'amex';

  const firstTwo = Number(digits.slice(0, 2));
  const firstFour = Number(digits.slice(0, 4));
  if ((firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720)) {
    return 'mastercard';
  }
  return 'unknown';
}

export function formatCardNumber(value: string): string {
  const digits = onlyDigits(value, 19);
  const brand = detectCardBrand(digits);
  if (brand === 'amex') {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(' ');
  }
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function passesLuhn(value: string): boolean {
  const digits = onlyDigits(value, 19);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(monthValue: string, yearValue: string, now = new Date()): boolean {
  const month = Number(onlyDigits(monthValue, 2));
  const yearDigits = onlyDigits(yearValue, 4);
  if (month < 1 || month > 12 || ![2, 4].includes(yearDigits.length)) return false;

  const fullYear = yearDigits.length === 2 ? 2000 + Number(yearDigits) : Number(yearDigits);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return fullYear > currentYear || (fullYear === currentYear && month >= currentMonth);
}

export function isValidCvc(cvcValue: string, brand: WompiCardBrand): boolean {
  const cvc = onlyDigits(cvcValue, 4);
  if (brand === 'amex') return cvc.length === 4;
  if (brand === 'visa' || brand === 'mastercard') return cvc.length === 3;
  return cvc.length === 3 || cvc.length === 4;
}

export function isValidCardHolder(value: string): boolean {
  const holder = String(value || '').trim();
  return holder.length >= 3 && holder.length <= 80 &&
    !/\d/.test(holder) && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(holder);
}

export function isValidReceiptEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToSpki(pem: string): ArrayBuffer {
  const base64 = String(pem || '')
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');
  if (!base64) throw new Error('Wompi no entregó una llave de cifrado válida');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

/**
 * Cifra los datos de tarjeta como JWE compacto antes de cualquier petición.
 * Wompi exige RSA-OAEP-256 para envolver la CEK y A256GCM para el contenido.
 */
export async function encryptCardDataForWompi(card: WompiCardData, publicKeyPem: string): Promise<string> {
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    throw new Error('El pago solo puede abrirse desde una conexión HTTPS segura');
  }
  if (!window.crypto?.subtle) {
    throw new Error('Este navegador no permite cifrar la tarjeta de forma segura');
  }

  const rsaKey = await window.crypto.subtle.importKey(
    'spki',
    pemToSpki(publicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  );
  const rawCek = new Uint8Array(await window.crypto.subtle.exportKey('raw', aesKey));
  const encryptedKey = new Uint8Array(await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKey, rawCek));
  rawCek.fill(0);

  const protectedHeader = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })),
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = new Uint8Array(await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(protectedHeader),
      tagLength: 128,
    },
    aesKey,
    new TextEncoder().encode(JSON.stringify(card)),
  ));
  const authenticationTag = encryptedContent.slice(encryptedContent.length - 16);
  const ciphertext = encryptedContent.slice(0, encryptedContent.length - 16);

  return [
    protectedHeader,
    bytesToBase64Url(encryptedKey),
    bytesToBase64Url(iv),
    bytesToBase64Url(ciphertext),
    bytesToBase64Url(authenticationTag),
  ].join('.');
}
