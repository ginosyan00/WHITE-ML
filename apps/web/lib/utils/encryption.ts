/**
 * Encryption Utility
 * 
 * Provides AES-256-GCM encryption/decryption for sensitive data
 */

import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Get encryption key from environment variable
 * Falls back to JWT_SECRET if PAYMENT_ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PAYMENT_ENCRYPTION_KEY || process.env.JWT_SECRET;
  
  if (!key) {
    throw new Error(
      "PAYMENT_ENCRYPTION_KEY or JWT_SECRET must be set for payment config encryption"
    );
  }

  // Derive a 32-byte key using PBKDF2
  return crypto.pbkdf2Sync(key, "payment-gateway-encryption", ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Encrypt sensitive data
 * 
 * @param text - Plain text to encrypt
 * @returns Encrypted string (format: salt:iv:tag:encrypted)
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, ITERATIONS, KEY_LENGTH, "sha512");

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Return format: salt:iv:tag:encrypted
    return `${salt.toString("hex")}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("[Encryption] Error encrypting data:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt sensitive data
 * 
 * @param encryptedText - Encrypted string (format: salt:iv:tag:encrypted)
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");

    if (parts.length !== 4) {
      throw new Error("Invalid encrypted data format");
    }

    const [saltHex, ivHex, tagHex, encrypted] = parts;
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    // Derive key from salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, ITERATIONS, KEY_LENGTH, "sha512");

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Encryption] Error decrypting data:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Encrypt object (recursively encrypts string values)
 * 
 * @param obj - Object to encrypt
 * @param fieldsToEncrypt - Array of field paths to encrypt (e.g., ['idramKey', 'accounts.AMD.password'])
 * @returns Encrypted object
 */
export function encryptObject(
  obj: Record<string, any>,
  fieldsToEncrypt: string[] = []
): Record<string, any> {
  const encrypted = { ...obj };

  for (const fieldPath of fieldsToEncrypt) {
    const keys = fieldPath.split(".");
    let current: any = encrypted;

    // Navigate to the field
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    if (current[lastKey] && typeof current[lastKey] === "string" && current[lastKey].length > 0) {
      // Only encrypt if value exists and is not already encrypted
      if (!current[lastKey].includes(":")) {
        current[lastKey] = encrypt(current[lastKey]);
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt object (recursively decrypts encrypted string values)
 * 
 * @param obj - Object to decrypt
 * @param fieldsToDecrypt - Array of field paths to decrypt
 * @returns Decrypted object
 */
export function decryptObject(
  obj: Record<string, any>,
  fieldsToDecrypt: string[] = []
): Record<string, any> {
  const decrypted = { ...obj };

  for (const fieldPath of fieldsToDecrypt) {
    const keys = fieldPath.split(".");
    let current: any = decrypted;

    // Navigate to the field
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        continue;
      }
      current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    if (current[lastKey] && typeof current[lastKey] === "string" && current[lastKey].includes(":")) {
      try {
        current[lastKey] = decrypt(current[lastKey]);
      } catch (error) {
        // If decryption fails, keep original value (might be plain text)
        console.warn(`[Encryption] Failed to decrypt field ${fieldPath}, keeping original value`);
      }
    }
  }

  return decrypted;
}

/**
 * Check if a string is encrypted
 * 
 * @param text - String to check
 * @returns True if encrypted (format: salt:iv:tag:encrypted)
 */
export function isEncrypted(text: string): boolean {
  if (typeof text !== "string") {
    return false;
  }
  const parts = text.split(":");
  return parts.length === 4 && parts.every((part) => /^[0-9a-f]+$/i.test(part));
}







