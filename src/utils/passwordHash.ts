/**
 * Password hashing utilities using the Web Crypto API (SHA-256).
 *
 * NOTE: SHA-256 is a fast hash — it's significantly better than plain text
 * but not as strong as bcrypt/scrypt/argon2. For a client-side app that
 * cannot run server-side bcrypt, this is the practical minimum.
 *
 * Migration: On first login with a plain-text password, the hash is computed
 * and the stored password is upgraded in-place.
 */

/**
 * Hash a plain-text password with SHA-256 and return a hex string.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Check whether a stored value looks like a SHA-256 hex digest (64 hex chars).
 */
export const isHashed = (value: string): boolean => {
  return /^[a-f0-9]{64}$/.test(value);
};

/**
 * Verify a candidate password against a stored value.
 * Handles both legacy plain-text and hashed passwords.
 *
 * Returns `{ match, needsUpgrade }`.
 * • match — whether the password is correct.
 * • needsUpgrade — true when the stored value was still plain-text and should
 *   be re-saved as a hash after a successful match.
 */
export const verifyPassword = async (
  candidate: string,
  stored: string,
): Promise<{ match: boolean; needsUpgrade: boolean }> => {
  if (isHashed(stored)) {
    const hashed = await hashPassword(candidate);
    return { match: hashed === stored, needsUpgrade: false };
  }

  // Legacy plain-text comparison
  const match = candidate === stored;
  return { match, needsUpgrade: match };
};
