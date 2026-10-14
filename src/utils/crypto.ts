/**
 * Cryptographic utility for SHA-256 Transaction Hashing & Column-Level Encryption (CLE)
 */

export function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes deterministic composite SHA-256 hash for duplicate detection:
 * Hash(Date + Amount.toFixed(2) + Normalized(Original Description) + Account_ID)
 */
export async function computeTransactionHash(
  date: string,
  amount: number,
  description: string,
  accountId: string
): Promise<string> {
  const normalizedDesc = normalizeDescription(description);
  const payload = `${date}|${amount.toFixed(2)}|${normalizedDesc}|${accountId}`;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash string if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sim_hash_' + Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Synchronous hash version for instant memory indexing
 */
export function computeSyncTransactionHash(
  date: string,
  amount: number,
  description: string,
  accountId: string
): string {
  const normalizedDesc = normalizeDescription(description);
  const payload = `${date}|${amount.toFixed(2)}|${normalizedDesc}|${accountId}`;
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) + payload.charCodeAt(i);
    hash = hash & hash;
  }
  return 'tx_h_' + Math.abs(hash).toString(16).padStart(12, '0');
}

/**
 * Column-Level Encryption (CLE) demonstration utilities
 * Simulates AES-256-GCM envelope encryption using a Master Key / KMS Key ARN
 */
export interface EncryptedFieldEnvelope {
  ciphertext: string;
  iv: string;
  tag: string;
  kmsKeyArn: string;
  algorithm: 'AES-256-GCM';
}

const DEMO_KMS_KEY_ARN = 'arn:aws:kms:eu-west-1:360968999853:key/fin-ledger-cle-master-prod';

export async function encryptField(plainText: string): Promise<EncryptedFieldEnvelope> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Create simulated deterministic-looking AES-256-GCM ciphertext representation
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  let hashHex = '';
  if (window.crypto && window.crypto.subtle) {
    const buffer = await window.crypto.subtle.digest('SHA-256', data);
    hashHex = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    hashHex = btoa(plainText);
  }

  const ciphertext = `enc_v1:${btoa(plainText + '::' + ivHex).substring(0, 32)}...${hashHex.substring(0, 16)}`;
  const tag = hashHex.substring(16, 32);

  return {
    ciphertext,
    iv: ivHex,
    tag,
    kmsKeyArn: DEMO_KMS_KEY_ARN,
    algorithm: 'AES-256-GCM'
  };
}

export function maskSensitiveAccount(accountNumber: string): string {
  if (!accountNumber) return '•••• 0000';
  const clean = accountNumber.replace(/\s+/g, '');
  const last4 = clean.slice(-4);
  return `•••• ${last4}`;
}
