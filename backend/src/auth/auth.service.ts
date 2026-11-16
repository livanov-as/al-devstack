import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import { InjectModel, InjectConnection } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import type { Connection } from 'mongoose'
import * as crypto from 'crypto'
import * as https from 'https'
import { User, UserDocument, UserRole } from '../schemas/user.schema.js'
import { Progress, ProgressDocument } from '../schemas/progress.schema.js'
import { Certificate, CertificateDocument } from '../schemas/certificate.schema.js'
import { AuthCredentialsDto } from './dto/auth-credentials.dto.js'
import { CryptoService } from './crypto.service.js'

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    @InjectModel(Certificate.name) private certificateModel: Model<CertificateDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Technical lifecycle hook to strictly enforce immediate index creation
   * within MongoDB Atlas during early DI container bootstrap orchestration.
   */
  async onModuleInit() {
    try {
      await this.userModel.ensureIndexes()
      this.logger.log('🚀 Mongoose indices strictly enforced for Users registry core.')
    } catch (error) {
      this.logger.error(`Failed to force populate user schemas indexes: ${(error as Error).message}`)
    }
  }

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
   * Utilizes zero-dependency native https module to safely bypass Railway network engine flaws.
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

    const payload = JSON.stringify({
      event_type: 'trigger-user-sync',
      client_payload: {
        username: username,
      },
    })

    const options: https.RequestOptions = {
      hostname: '://github.com',
      path: `/repos/${githubRepo}/dispatches`,
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'al-devstack-backend-service', // Required by GitHub API boundary rules
        'Content-Length': Buffer.byteLength(payload),
      },
    }

    const req = https.request(options, (res) => {
      let responseBody = ''

      res.on('data', (chunk) => {
        responseBody += chunk
      })

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          this.logger.log(`Infrastructure: GitHub cloud execution pipeline successfully orchestrated for "${username}".`)
        } else {
          this.logger.error(
            `Infrastructure Error: GitHub API rejected workflow trigger dispatch. Status: ${res.statusCode}. Payload: ${responseBody}`,
          )
        }
      })
    })

    req.on('error', (error) => {
      this.logger.error(
        `Infrastructure Crash: Failed to dispatch cloud synchronization request payload for "${username}": ${error.message}`,
      )
    })

    req.write(payload)
    req.end()
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
   * Retrieves cluster-wide user telemetry and FinOps capacity metrics for the Admin Panel.
   * Returns an isolated in-memory snapshot for DEMO_USER to eliminate Atlas reads and protect real accounts.
   */
  async getAdminUsersTelemetry(operatorRole: UserRole) {
    if (operatorRole === UserRole.DEMO_USER) {
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000

      const sandboxUsers = [
        {
          username: 'core-architect',
          role: UserRole.ADMIN,
          taskCount: 754,
          createdAt: new Date(now - 45 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          username: 'alex-frontend',
          role: UserRole.USER,
          taskCount: 412,
          createdAt: new Date(now - 28 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          username: 'maria-fullstack',
          role: UserRole.USER,
          taskCount: 618,
          createdAt: new Date(now - 21 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 1 * dayMs).toISOString(),
        },
        {
          username: 'dev-navigator',
          role: UserRole.USER,
          taskCount: 195,
          createdAt: new Date(now - 16 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 2 * dayMs).toISOString(),
        },
        {
          username: 'elena-ts-coder',
          role: UserRole.USER,
          taskCount: 340,
          createdAt: new Date(now - 11 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 3 * dayMs).toISOString(),
        },
        {
          username: 'max-backend-pro',
          role: UserRole.USER,
          taskCount: 529,
          createdAt: new Date(now - 7 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 4 * dayMs).toISOString(),
        },
        {
          username: 'kate-ui-craft',
          role: UserRole.USER,
          taskCount: 88,
          createdAt: new Date(now - 3 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          username: 'ivan-cloud-ops',
          role: UserRole.USER,
          taskCount: 147,
          createdAt: new Date(now - 1 * dayMs).toISOString(),
          lastActiveAt: new Date(now - 30 * 60 * 1000).toISOString(),
        },
      ]

      return {
        isSandbox: true,
        finops: {
          activeUserSlots: 7,
          maxUserSlots: 10,
          totalUsers: sandboxUsers.length,
          totalProgressDocs: 3083,
          totalCertificateDocs: 14,
          clusterStatus: 'HEALTHY (RAM MOCK)',
        },
        users: sandboxUsers,
      }
    }

    try {
      const [usersList, progressCounts, totalProgressDocs, totalCertificateDocs] = await Promise.all([
        this.userModel
          .find({ username: { $ne: 'recruiter-tech-lead' } })
          .select('username role createdAt lastActiveAt')
          .sort({ createdAt: 1 })
          .lean(),
        this.progressModel.aggregate([
          { $group: { _id: '$username', count: { $sum: 1 } } },
        ]),
        this.progressModel.countDocuments(),
        this.certificateModel.countDocuments(),
      ])

      const taskCountMap = new Map<string, number>(
        progressCounts.map((item) => [String(item._id), Number(item.count)]),
      )

      const enrichedUsers = usersList.map((u) => ({
        username: u.username,
        role: u.role,
        taskCount: taskCountMap.get(u.username) ?? 0,
        createdAt: u.createdAt,
        lastActiveAt: u.lastActiveAt,
      }))

      const activeUserSlots = enrichedUsers.filter((u) => u.role === UserRole.USER).length

      return {
        isSandbox: false,
        finops: {
          activeUserSlots,
          maxUserSlots: 10,
          totalUsers: enrichedUsers.length,
          totalProgressDocs,
          totalCertificateDocs,
          clusterStatus: 'CONNECTED',
        },
        users: enrichedUsers,
      }
    } catch (error) {
      this.logger.error(`Failed to compile Admin FinOps telemetry: ${(error as Error).message}`)
      throw new InternalServerErrorException('Failed to aggregate cluster user telemetry')
    }
  }

  /**
   * Forcefully removes a target user and all associated progress and certificates in a transaction.
   * Enforces strict safeguards against self-deletion and removing the last active ADMIN.
   */
  async deleteUserByAdmin(
    operatorUsername: string,
    targetUsername: string,
  ): Promise<{ status: string; deletedUsername: string }> {
    if (operatorUsername === targetUsername) {
      throw new BadRequestException('Operation denied: Administrators cannot delete their own active account.')
    }

    if (targetUsername === 'recruiter-tech-lead') {
      throw new BadRequestException('Operation denied: System sandbox profile cannot be removed.')
    }

    const targetUser = await this.userModel.findOne({ username: targetUsername }).lean()
    if (!targetUser) {
      throw new BadRequestException(`Target user '${targetUsername}' does not exist in active cluster nodes.`)
    }

    if (targetUser.role === UserRole.ADMIN) {
      const activeAdminCount = await this.userModel.countDocuments({ role: UserRole.ADMIN })
      if (activeAdminCount <= 1) {
        throw new BadRequestException('SaaS Security Alert: Cannot delete the last remaining active system ADMINISTRATOR.')
      }
    }

    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      await this.progressModel.deleteMany({ username: targetUsername }).session(session)
      await this.certificateModel.deleteMany({ _id: new RegExp(`^${targetUsername}-`) }).session(session)
      await this.userModel.deleteOne({ _id: targetUser._id }).session(session)

      await session.commitTransaction()
      this.logger.log(`Admin Cascade Delete: User "${targetUsername}" purged by "${operatorUsername}".`)

      return {
        status: 'DELETED',
        deletedUsername: targetUsername,
      }
    } catch (error) {
      await session.abortTransaction()
      this.logger.error(`Admin Cascade Delete Crash for "${targetUsername}": ${(error as Error).message}`)
      throw new InternalServerErrorException('Cascade user deletion transaction failed')
    } finally {
      session.endSession()
    }
  }

  /**
   * Manually triggers an out-of-schedule GitHub Actions parser workflow dispatch for a target user.
   */
  async triggerManualUserSync(
    operatorUsername: string,
    targetUsername: string,
  ): Promise<{ status: string; username: string }> {
    if (targetUsername === 'recruiter-tech-lead') {
      throw new BadRequestException('Operation denied: Sandbox profile is isolated from live scraping pipelines.')
    }

    const targetUser = await this.userModel.findOne({ username: targetUsername }).lean()
    if (!targetUser) {
      throw new BadRequestException(`Target user '${targetUsername}' does not exist in active cluster nodes.`)
    }

    this.logger.log(`Admin Manual Sync: "${operatorUsername}" dispatched parser pipeline for "${targetUsername}".`)
    this.triggerBackgroundParserSync(targetUsername)

    return {
      status: 'DISPATCHED',
      username: targetUsername,
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
