/**
 * Test script for encryption functionality
 * Run with: pnpm tsx scripts/test-encryption.ts
 */

import { encrypt, decrypt, isEncrypted, maskSensitive } from '../src/lib/crypto'

// Set a test encryption key
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-development-only-do-not-use-in-production'

console.log('🔐 Testing Encryption Functionality\n')

// Test 1: Basic encryption/decryption
console.log('Test 1: Basic Encryption/Decryption')
const plaintext = 'sk-test123456789abcdefghijklmnopqrstuvwxyz'
console.log('Original:', plaintext)

const encrypted = encrypt(plaintext)
console.log('Encrypted:', encrypted.substring(0, 50) + '...')

const decrypted = decrypt(encrypted)
console.log('Decrypted:', decrypted)
console.log('Match:', plaintext === decrypted ? '✓' : '✗')
console.log()

// Test 2: Check isEncrypted
console.log('Test 2: isEncrypted Detection')
console.log('Plaintext detected:', isEncrypted(plaintext) ? '✗ (false positive)' : '✓')
console.log('Encrypted detected:', isEncrypted(encrypted) ? '✓' : '✗ (false negative)')
console.log()

// Test 3: maskSensitive
console.log('Test 3: maskSensitive')
console.log('API Key sk-test123...:', maskSensitive('sk-test123456789'))
console.log('Short key ab:', maskSensitive('ab'))
console.log('Empty:', maskSensitive(''))
console.log()

// Test 4: Multiple encryptions produce different results (due to random salt/IV)
console.log('Test 4: Random Salt/IV (each encryption should be different)')
const encrypted1 = encrypt(plaintext)
const encrypted2 = encrypt(plaintext)
console.log('Encryption 1:', encrypted1.substring(0, 30) + '...')
console.log('Encryption 2:', encrypted2.substring(0, 30) + '...')
console.log('Different:', encrypted1 !== encrypted2 ? '✓' : '✗')
console.log('Both decrypt to same:', decrypt(encrypted1) === decrypt(encrypted2) ? '✓' : '✗')
console.log()

// Test 5: Decryption with wrong key fails
console.log('Test 5: Key Security')
process.env.ENCRYPTION_KEY = 'different-key'
try {
  decrypt(encrypted)
  console.log('Decryption with wrong key: ✗ (should have failed)')
} catch (error) {
  console.log('Decryption with wrong key: ✓ (correctly failed)')
  console.log('  Error:', (error as Error).message)
}
console.log()

// Test 6: No encryption key throws error
console.log('Test 6: Missing Key Validation')
delete process.env.ENCRYPTION_KEY
try {
  encrypt('test')
  console.log('Encrypt without key: ✗ (should have failed)')
} catch (error) {
  console.log('Encrypt without key: ✓ (correctly failed)')
  console.log('  Error:', (error as Error).message)
}
console.log()

console.log('✅ All encryption tests completed!')
