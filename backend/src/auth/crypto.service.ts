import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name)

  /**
   * Cryptographic utility to generate a secure deterministic PBKDF2 password hash string.
   */
  hashPassword(password: string, salt: string): string {
    return crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex')
  }

  /**
   * Safely compares a stored hash with an incoming hash using timing-safe operations
   * to strictly mitigate side-channel vulnerability discovery vectors.
   */
  comparePasswords(storedHash: string, incomingHash: string): boolean {
    const bufferStored = Buffer.from(storedHash, 'hex')
    const bufferIncoming = Buffer.from(incomingHash, 'hex')

    // Enforce clear Uint8Array boundaries to perfectly satisfy Mongoose & NestJS core architectures
    return crypto.timingSafeEqual(
      new Uint8Array(bufferStored),
      new Uint8Array(bufferIncoming)
    )
  }

  /**
   * Compiles and signs a manual zero-dependency secure JWT token compliant with OAuth standards.
   */
  generateJwt(payload: Record<string, any>): string {
    const secret = process.env.CACHE_SECRET_TOKEN || 'fallback_jwt_secret_token_key'
    const header = { alg: 'HS256', typ: 'JWT' }
    
    const expandedPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Matches the manual token 24h expiration limit
    }

    const toBase64Url = (obj: Record<string, any>) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')

    const encodedHeader = toBase64Url(header)
    const encodedPayload = toBase64Url(expandedPayload)

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  /**
   * Validates incoming raw JWT string signatures against active environment context tokens.
   */
  verifyJwt(token: string): Record<string, any> | null {
    const secret = process.env.CACHE_SECRET_TOKEN || 'fallback_jwt_secret_token_key'
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [encodedHeader, encodedPayload, signature] = parts

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    if (signature !== expectedSignature) {
      return null
    }

    try {
      const decodedPayload = JSON.parse(
        Buffer.from(
          encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
          'base64'
        ).toString('utf-8')
      )

      if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) {
        return null
      }

      return decodedPayload
    } catch {
      return null
    }
  }
}
