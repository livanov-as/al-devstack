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
import { User, UserDocument, UserRole } from '../schemas/user.schema.js'
import { Progress, ProgressDocument } from '../schemas/progress.schema.js'
import { Certificate, CertificateDocument } from '../schemas/certificate.schema.js'
import { AuthCredentialsDto } from './dto/auth-credentials.dto.js'
import { CryptoService } from './crypto.service.js'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    @InjectModel(Certificate.name) private certificateModel: Model<CertificateDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cryptoService: CryptoService,
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

    const initialAdminName = process.env.ADMIN_INITIAL_USERNAME || 'livanov-as'
    const targetRole = username === initialAdminName ? UserRole.ADMIN : UserRole.USER

    if (targetRole === UserRole.USER) {
      const userCount = await this.userModel.countDocuments({ role: UserRole.USER })
      if (userCount >= 10) {
        this.logger.warn(`FinOps Guard: Active user limit (10) reached. Triggering FIFO rotation sequence.`)
        await this.executeFifoRotation()
      }
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const passwordHash = this.cryptoService.hashPassword(password, salt)
    const storedHashWithSalt = `${salt}:${passwordHash}`

    try {
      const newUser = new this.userModel({
        username,
        passwordHash: storedHashWithSalt,
        role: targetRole,
      })
      const savedUser = await newUser.save()

      // Dispatch explicit asynchronous background metadata sync pipeline via GitHub API
      this.triggerBackgroundParserSync(username)

      return savedUser
    } catch (error) {
      this.logger.error(`Failed to register new user "${username}": ${(error as Error).message}`)
      throw new InternalServerErrorException('Registration workflow aborted due to server error')
    }
  }

  /**
   * Dispatches an isolated cloud background automation task via GitHub Actions Repository Dispatch API.
   * Offloads heavy Playwright scrapers entirely to GitHub infrastructure protecting Railway nodes.
   */
  private triggerBackgroundParserSync(username: string): void {
    const githubToken = process.env.GITHUB_TOKEN
    const githubRepo = process.env.GITHUB_REPOSITORY // Expected format: 'owner/repo'

    if (!githubToken || !githubRepo) {
      this.logger.warn(
        `Cloud Dispatch Bypass: GITHUB_TOKEN or GITHUB_REPOSITORY variable is missing. Cloud parser trigger aborted.`,
      )
      return
    }

    this.logger.log(`Infrastructure: Triggering external GitHub Actions workflow dispatch for user "${username}".`)

    fetch(`https://github.com{githubRepo}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'al-devstack',
      },
      body: JSON.stringify({
        event_type: 'trigger-user-sync',
        client_payload: {
          username: username,
        },
      }),
    })
      .then((response) => {
        if (response.ok) {
          this.logger.log(`Infrastructure: GitHub cloud execution pipeline successfully orchestrated for "${username}".`)
        } else {
          response.text().then((errText) => {
            this.logger.error(
              `Infrastructure Error: GitHub API rejected workflow trigger dispatch. Status: ${response.status}. Payload: ${errText}`,
            )
          })
        }
      })
      .catch((error) => {
        this.logger.error(
          `Infrastructure Crash: Failed to dispatch cloud synchronization request payload for "${username}": ${error.message}`,
        )
      })
  }

  /**
   * Validates user credentials and issues a secure zero-dependency JWT token string payload.
   * Dynamically auto-provisions the global sandbox profile if DB cluster states are empty.
   */
  async login(authCredentialsDto: AuthCredentialsDto): Promise<{ token: string; username: string; role: UserRole }> {
    const { username, password } = authCredentialsDto

    let user = await this.userModel.findOne({ username }).lean()
    
    if (!user && username === 'recruiter-tech-lead') {
      this.logger.log(`FinOps Sandbox: Auto-provisioning target demo profile "${username}" in active cluster.`)
      
      const salt = crypto.randomBytes(16).toString('hex')
      const passwordHash = this.cryptoService.hashPassword(password, salt)
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
    const incomingHash = this.cryptoService.hashPassword(password, salt)

    if (!this.cryptoService.comparePasswords(storedHash, incomingHash)) {
      throw new UnauthorizedException('Invalid security credentials provided')
    }

    const jwtPayload = {
      username: user.username,
      role: user.role,
    }
    const token = this.cryptoService.generateJwt(jwtPayload)

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
   * Proxy validation call directly executing underlying verification mechanics of CryptoService layer.
   */
  verifyJwt(token: string): Record<string, any> | null {
    return this.cryptoService.verifyJwt(token)
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
