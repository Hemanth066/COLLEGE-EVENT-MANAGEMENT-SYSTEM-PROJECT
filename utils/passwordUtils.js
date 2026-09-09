const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Checks if a given password string is already a bcrypt hash
 */
function isHashed(password) {
  if (!password || typeof password !== 'string') return false;
  return /^\$2[abxy]\$\d{2}\$.{53}$/.test(password);
}

/**
 * Hashes a plain-text password using bcryptjs
 */
async function hashPassword(password) {
  if (!password) return '';
  if (isHashed(password)) return password; // Already hashed
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Synchronously hashes a plain-text password (useful in seed scripts)
 */
function hashPasswordSync(password) {
  if (!password) return '';
  if (isHashed(password)) return password;
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Verifies an input password against a stored password string (hashed or plain-text).
 * Returns { isValid, isLegacyPlaintext } so the caller can auto-hash legacy plain-text passwords upon login.
 */
async function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) {
    return { isValid: false, isLegacyPlaintext: false };
  }

  if (isHashed(storedPassword)) {
    const isValid = await bcrypt.compare(inputPassword, storedPassword);
    return { isValid, isLegacyPlaintext: false };
  }

  // Legacy plain-text fallback check
  const isValid = inputPassword === storedPassword;
  return { isValid, isLegacyPlaintext: isValid };
}

module.exports = {
  isHashed,
  hashPassword,
  hashPasswordSync,
  verifyPassword
};
