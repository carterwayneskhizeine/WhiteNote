import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

/**
 * Get encryption key from environment variable
 * Throws error if key is not configured
 */
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for API key encryption. ' +
      'Generate one with: openssl rand -base64 32'
    )
  }

  // Use PBKDF2 to derive a 32-byte key from the environment variable
  // This allows us to use a variable-length secret
  return pbkdf2Sync(key, 'salt', 100000, 32, 'sha256')
}

/**
 * Encrypt sensitive data (API keys, secrets, etc.)
 * @param plaintext - The sensitive data to encrypt
 * @returns Base64-encoded encrypted string with salt, IV, and auth tag
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getKey()

    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH)
    const iv = randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv)

    // Encrypt the plaintext
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ])

    // Get the authentication tag
    const tag = cipher.getAuthTag()

    // Combine salt + iv + tag + encrypted
    const combined = Buffer.concat([salt, iv, tag, encrypted])

    // Return as base64
    return combined.toString('base64')
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decrypt sensitive data that was encrypted using encrypt()
 * @param ciphertext - Base64-encoded encrypted string
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string): string {
  try {
    const key = getKey()

    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64')

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, TAG_POSITION)
    const tag = combined.subarray(TAG_POSITION, ENCRYPTED_POSITION)
    const encrypted = combined.subarray(ENCRYPTED_POSITION)

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid ciphertext'}`)
  }
}

/**
 * Check if a string is encrypted (basic check)
 * @param value - The value to check
 * @returns true if the value appears to be encrypted
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }

  // Encrypted values are base64-encoded and typically longer than the original
  // This is a heuristic check
  try {
    const decoded = Buffer.from(value, 'base64')
    return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * Mask sensitive value for logging (show first 4 and last 4 chars)
 * @param value - The value to mask
 * @returns Masked string like "sk...1234"
 */
export function maskSensitive(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  if (value.length <= 8) {
    return '****'
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`
}
