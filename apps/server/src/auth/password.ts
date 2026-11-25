import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

function deriveKey(password: string, saltHex: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, saltHex, KEY_LENGTH, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey);
    });
  });
}

/**
 * Hashes a plaintext password using scrypt with a random 16-byte salt.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltHex = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = await deriveKey(password, saltHex);
  return `${HASH_PREFIX}$${saltHex}$${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash in constant time.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return false;
  }

  const [, saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = await deriveKey(password, saltHex);
  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
