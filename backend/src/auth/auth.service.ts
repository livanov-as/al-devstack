import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InjectModel, InjectConnection } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import type { Connection } from 'mongoose'
import * as crypto from 'crypto'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { User, UserDocument, UserRole } from '../schemas/user.schema.js'
import { Progress, ProgressDocument } from '../schemas/progress.schema.js'
import { Certificate, CertificateDocument } from '../schemas/certificate.schema.js'
import { AuthCredentialsDto } from './dto/auth-credentials.dto.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    @InjectModel(Certificate.name) private certificateModel: Model<CertificateDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Registers a new account. Assigns ADMIN role if username matches system configuration.
   * Enforces FinOps FIFO limitation capacity solely on standard USER roles.
   */
  async register(authCredentialsDto: AuthCredentialsDto): Promise<User> {
    const { username, password } = authCredentialsDto

    const existingUser = await this.userModel.findOne({ username }).lean()
    if (existingUser) {
      throw new ConflictException(`Username "${username}" already exists`)
    }

    // Determine target SaaS role based on environment configuration overrides
    const initialAdminName = process.env.ADMIN_INITIAL_USERNAME || 'livanov-as'
    const targetRole = username === initialAdminName ? UserRole.ADMIN : UserRole.USER

    // FinOps capacity control: Rotate only if the registering account is standard user
    if (targetRole === UserRole.USER) {
      const userCount = await this.userModel.countDocuments({ role: UserRole.USER })
      if (userCount >= 10) {
        this.logger.warn(`FinOps Guard: Active user limit (10) reached. Triggering FIFO rotation sequence.`)
        await this.executeFifoRotation()
      }
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = this.hashPassword(password, salt)
    const storedHashWithSalt = `${salt}:${passwordHash}`

    try {
      const newUser = new this.userModel({
        username,
        passwordHash: storedHashWithSalt,
        role: targetRole,
      })
      const savedUser = await newUser.save()

      // Spawn immediate asynchronous background metadata sync parser pipeline
      this.triggerBackgroundParserSync(username)

      return savedUser
    } catch (error) {
      this.logger.error(`Failed to register new user "${username}": ${(error as Error).message}`)
      throw new InternalServerErrorException('Registration workflow aborted due to server error')
    }
  }

  /**
   * Spawns an isolated background process to warm up freeCodeCamp telemetry metrics.
   * Utilizes spawn streams for live real-time pagination log outputs.
   */
  private triggerBackgroundParserSync(username: string): void {
    const parserScriptPath = path.resolve(__dirname, '../../../../parser/main.py')
    this.logger.log(`Infrastructure: Spawning background parser process for user "${username}".`)

    const pythonBinary = '../parser/venv/bin/python3'
    const parserProcess = spawn(pythonBinary, [parserScriptPath, username])

    // Stream real-time stdout chunks directly into the backend logging infrastructure matrix
    parserProcess.stdout.on('data', (data: Buffer) => {
      const logLine = data.toString().trim()
      if (logLine) {
        this.logger.log(`[Parser Stream Out] [${username}]: ${logLine}`)
      }
    })

    // Stream real-time stderr chunks directly into the backend warnings system layer
    parserProcess.stderr.on('data', (data: Buffer) => {
      const errorLine = data.toString().trim()
      if (errorLine) {
        this.logger.warn(`[Parser Stream Err] [${username}]: ${errorLine}`)
      }
    })

    parserProcess.on('close', (code) => {
      this.logger.log(`Infrastructure: Background parser process for "${username}" exited with status code ${code}.`)
    })

    parserProcess.on('error', (error) => {
      this.logger.error(`Infrastructure: Failed to spawn background parser process for "${username}": ${error.message}`)
    })
  }

  /**
   * Validates user credentials and issues a secure zero-dependency JWT token string payload.
   * Dynamically auto-provisions the global sandbox profile if DB cluster states are empty.
   */
  async login(authCredentialsDto: AuthCredentialsDto): Promise<{ token: string; username: string; role: UserRole }> {
    const { username, password } = authCredentialsDto

    let user = await this.userModel.findOne({ username }).lean()
    
    // Auto-Provisioning Core Layer for the FinOps Sandbox environment
    if (!user && username === 'recruiter-tech-lead') {
      this.logger.log(`FinOps Sandbox: Auto-provisioning target demo profile "${username}" in active cluster.`)
      
      const salt = crypto.randomBytes(16).toString('hex')
      const passwordHash = this.hashPassword(password, salt)
      const storedHashWithSalt = `${salt}:${passwordHash}`
      
      try {
        const newDemoUser = new this.userModel({
          username,
          passwordHash: storedHashWithSalt,
          role: UserRole.DEMO_USER,
        })
        const savedDemo = await newDemoUser.save()
        user = savedDemo.toObject()
      } catch (error) {
        this.logger.error(`Failed to auto-provision sandbox profile "${username}": ${(error as Error).message}`)
        throw new InternalServerErrorException('Sandbox orchestration failed during provisioning')
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid security credentials provided')
    }

    const [salt, storedHash] = user.passwordHash.split(':')
    const incomingHash = this.hashPassword(password, salt)

    const bufferStored = Buffer.from(storedHash, 'hex')
    const bufferIncoming = Buffer.from(incomingHash, 'hex')

    // Strictly enforce Uint8Array boundaries to fully satisfy Mongoose & NestJS compiler architectures
    const isPasswordMatch = crypto.timingSafeEqual(
      new Uint8Array(bufferStored),
      new Uint8Array(bufferIncoming)
    )

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid security credentials provided')
    }

    // Generate lightweight customized cryptographically signed JSON Web Token
    const jwtPayload = {
      username: user.username,
      role: user.role,
    }
    const token = this.generateJwt(jwtPayload)

    return {
      token,
      username: user.username,
      role: user.role,
    }
  }

  /**
   * SaaS Management: Updates target profile role specs dynamically.
   * Enforces strict circuit-breaker safety guarding against the Last Admin Dilemma.
   */
  async updateUserRole(targetUsername: string, newRole: UserRole): Promise<{ status: string; username: string; role: UserRole }> {
    const targetUser = await this.userModel.findOne({ username: targetUsername })
    if (!targetUser) {
      throw new BadRequestException(`Target user '${targetUsername}' does not exist inside active cluster nodes.`)
    }

    // Safeguard Implementation: Block administrative self-demotion if no other admins exist
    if (targetUser.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      const activeAdminCount = await this.userModel.countDocuments({ role: UserRole.ADMIN })
      if (activeAdminCount <= 1) {
        throw new BadRequestException('SaaS Security Alert: Cannot demote the last remaining active system ADMINISTRATOR.')
      }
    }

    try {
      targetUser.role = newRole
      await targetUser.save()
      
      this.logger.log(`RBAC Update: Successfully shifted roles layout matrix for '${targetUsername}' to ${newRole}.`)
      return {
        status: 'SUCCESS',
        username: targetUser.username,
        role: targetUser.role,
      }
    } catch (error) {
      this.logger.error(`Failed to execute administrative update sequence for '${targetUsername}': ${(error as Error).message}`)
      throw new InternalServerErrorException('Data mutation layout failed due to cluster transactional errors')
    }
  }

  /**
   * Cryptographically utility to generate a secure deterministic PBKDF2 password hash.
   */
  private hashPassword(password: string, salt: string): string {
    return crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex')
  }

  /**
   * Compiles and signs a manual zero-dependency secure JWT token compliant with OAuth standards.
   */
  private generateJwt(payload: Record<string, any>): string {
    const secret = process.env.CACHE_SECRET_TOKEN || 'fallback_jwt_secret_token_key'
    const header = { alg: 'HS256', typ: 'JWT' }
    
    const expandedPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
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

  /**
   * FinOps Capacity Control Core: Evicts the oldest user and all their aggregated telemetry data.
   */
  private async executeFifoRotation(): Promise<void> {
    const oldestUser = await this.userModel
      .findOne({ role: UserRole.USER })
      .sort({ createdAt: 1 })
      .lean()

    if (!oldestUser) {
      return
    }

    const targetEvictionUsername = oldestUser.username
    this.logger.log(`FIFO Eviction: Selected oldest user "${targetEvictionUsername}" for resource reclamation.`)

    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      await this.progressModel.deleteMany({ username: targetEvictionUsername }).session(session)
      await this.certificateModel.deleteMany({ _id: new RegExp(`^${targetEvictionUsername}-`) }).session(session)
      await this.userModel.deleteOne({ _id: oldestUser._id }).session(session)

      await session.commitTransaction()
      this.logger.log(`FIFO Eviction: Successfully reclaimed cloud storage space from user "${targetEvictionUsername}".`)
    } catch (error) {
      await session.abortTransaction()
      this.logger.error(`FIFO Eviction Crash: Failed atomic rotation wipe for "${targetEvictionUsername}": ${(error as Error).message}`)
      throw new InternalServerErrorException('FinOps FIFO capacity reclamation transaction failed')
    } finally {
      session.endSession()
    }
  }
}
