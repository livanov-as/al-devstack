import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CryptoService } from './crypto.service.js'

describe('CryptoService', () => {
  let cryptoService: CryptoService

  beforeEach(() => {
    process.env.CACHE_SECRET_TOKEN = 'test_unit_secret_token_key'
    cryptoService = new CryptoService()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Password Hashing & Timing-Safe Verification', () => {
    it('generates deterministic PBKDF2 hash and verifies matching passwords', () => {
      const salt = 'a1b2c3d4e5f60718'
      const hash1 = cryptoService.hashPassword('SecurePass123!', salt)
      const hash2 = cryptoService.hashPassword('SecurePass123!', salt)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(128)
      expect(cryptoService.comparePasswords(hash1, hash2)).toBe(true)
    })

    it('rejects mismatched password hashes safely', () => {
      const salt = 'a1b2c3d4e5f60718'
      const storedHash = cryptoService.hashPassword('CorrectPassword!', salt)
      const wrongHash = cryptoService.hashPassword('WrongPassword!', salt)

      expect(cryptoService.comparePasswords(storedHash, wrongHash)).toBe(false)
    })
  })

  describe('Zero-Dependency JWT Lifecycle', () => {
    it('signs and verifies a valid JWT payload', () => {
      const token = cryptoService.generateJwt({
        username: 'livanov-as',
        role: 'ADMIN',
      })

      const decoded = cryptoService.verifyJwt(token)
      expect(decoded).not.toBeNull()
      expect(decoded?.username).toBe('livanov-as')
      expect(decoded?.role).toBe('ADMIN')
      expect(typeof decoded?.exp).toBe('number')
    })

    it('rejects a JWT with tampered payload or invalid signature', () => {
      const token = cryptoService.generateJwt({
        username: 'standard-user',
        role: 'USER',
      })

      const parts = token.split('.')
      const tamperedPayload = Buffer.from(
        JSON.stringify({ username: 'standard-user', role: 'ADMIN' }),
      )
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')

      const forgedToken = `${parts}.${tamperedPayload}.${parts}`
      expect(cryptoService.verifyJwt(forgedToken)).toBeNull()
    })

    it('rejects an expired JWT token after 24 hours', () => {
      vi.useFakeTimers()
      const baseTime = new Date('2026-01-01T00:00:00.000Z')
      vi.setSystemTime(baseTime)

      const token = cryptoService.generateJwt({
        username: 'recruiter-tech-lead',
        role: 'DEMO_USER',
      })
      expect(cryptoService.verifyJwt(token)).not.toBeNull()

      // Advance clock by 24 hours + 5 seconds
      vi.setSystemTime(new Date(baseTime.getTime() + 24 * 60 * 60 * 1000 + 5000))
      expect(cryptoService.verifyJwt(token)).toBeNull()
    })

    it('returns null for malformed token strings', () => {
      expect(cryptoService.verifyJwt('not.a.valid.jwt.token')).toBeNull()
      expect(cryptoService.verifyJwt('')).toBeNull()
    })
  })
})
