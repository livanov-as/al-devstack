import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  Certificate,
  CertificateDocument,
} from './schemas/certificate.schema.js'
import { Progress, ProgressDocument } from './schemas/progress.schema.js'
import { GEO_MAPPING, GLOBAL_TRIGGER_SLUG } from '../config/constants.js'
import { ProgressGateway } from './progress/progress.gateway.js'
import { User, UserDocument, UserRole } from './schemas/user.schema.js'
import { DemoTelemetryService } from './demo/demo-telemetry.service.js'

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name)
  private geoStatsCache: Record<string, any> = {}

  constructor(
    @InjectModel(Certificate.name)
    private certificateModel: Model<CertificateDocument>,
    @InjectModel(Progress.name)
    private progressModel: Model<ProgressDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly progressGateway: ProgressGateway,
    private readonly demoTelemetryService: DemoTelemetryService,
  ) {}

  private isDemoProfile(username: string, role?: UserRole): boolean {
    return role === UserRole.DEMO_USER || username === 'recruiter-tech-lead'
  }

  /**
   * Technical lifecycle hook to strictly force compile critical indices
   * inside MongoDB Atlas cluster directly upon application boot sequence.
   */
  async onModuleInit() {
    try {
      await this.progressModel.ensureIndexes()
      this.logger.log('🚀 Mongoose indices strictly enforced for Telemetry Tasks progress track.')
    } catch (error) {
      this.logger.error(`Failed to force populate progress schemas indexes: ${(error as Error).message}`)
    }
  }

  /**
   * Aggregates and groups user activity history over the last 31 days directly in the database.
   * Isolates demo profiles strictly to RAM with adaptive 31-day time-shifting.
   */
  async getCalendarStats(
    username: string,
    clientTimezone: string,
    role?: UserRole,
  ): Promise<Record<string, number>> {
    if (this.isDemoProfile(username, role)) {
      return this.demoTelemetryService.getCalendarStats()
    }

    try {
      const targetDays = 31
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - targetDays)

      const aggregation = await this.progressModel.aggregate([
        {
          $match: {
            username: username,
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: clientTimezone,
              },
            },
            count: { $sum: 1 },
          },
        },
      ])

      return aggregation.reduce((acc: Record<string, number>, curr) => {
        acc[curr._id] = curr.count
        return acc
      }, {})
    } catch (error) {
      this.logger.error(
        `Failed to compile 31-day activity matrix stats for "${username}": ${(error as Error).message}`,
      )
      return {}
    }
  }

  /**
   * Retrieves exactly the 10 most recent tasks for the streaming feed.
   * Isolates demo profiles to RAM and returns authentic empty arrays for syncing real users.
   */
  async getTimelineTasks(username: string, role?: UserRole) {
    if (this.isDemoProfile(username, role)) {
      return this.demoTelemetryService.getTimelineTasks()
    }

    try {
      const tasksList = await this.progressModel
        .find({ username: username })
        .sort({ date: -1 })
        .limit(10)
        .select('task_name category date url')
        .lean()

      // Learning Layer: Update adaptive memory storage based on live admin progress trace loops
      if (username === 'livanov-as' && tasksList && tasksList.length > 0) {
        this.demoTelemetryService.syncAdminTasksSnapshot(
          tasksList.map((task) => ({
            _id: String(task._id),
            task_name: task.task_name,
            category: task.category,
            date: new Date(task.date),
            url: task.url,
          })),
        )
      }

      return { tasks: tasksList || [] }
    } catch (error) {
      this.logger.error(
        `Failed to fetch current timeline tasks snapshot feed for "${username}": ${(error as Error).message}`,
      )
      return { tasks: [] }
    }
  }

  /**
   * Retrieves the list of earned certificates sorted optimally by slug layout indices.
   * Isolates demo profiles to RAM and returns authentic empty arrays for syncing real users.
   */
  async getCertificates(username: string, role?: UserRole) {
    if (this.isDemoProfile(username, role)) {
      return this.demoTelemetryService.getCertificates()
    }

    try {
      const certsList = await this.certificateModel
        .find({ _id: new RegExp(`^${username}-`) })
        .sort({ slug: 1 })
        .lean()

      // Learning Layer: Update persistent certificate schemas if the live dataset changes
      if (username === 'livanov-as' && certsList && certsList.length > 0) {
        this.demoTelemetryService.syncAdminCertificatesSnapshot(
          certsList.map((c) => ({
            slug: c.slug,
            title: c.title,
            url: c.url,
          })),
        )
      }

      return certsList || []
    } catch (error) {
      this.logger.error(
        `Failed to query active certified credentials archive for "${username}": ${(error as Error).message}`,
      )
      return []
    }
  }

  /**
   * Aggregates freeCodeCamp v9 progress statistics mapped by geographical regions.
   * Isolates demo users strictly to RAM and flags initial empty states with isSyncing: true.
   */
  async getGeoStats(username: string, role?: UserRole): Promise<{ data: any; cacheHit: boolean }> {
    if (this.isDemoProfile(username, role)) {
      return this.demoTelemetryService.getGeoStats(this.geoStatsCache['livanov-as'])
    }

    // Priority 1: Instant cache extraction from isolated memory cells
    if (this.geoStatsCache[username]) {
      return { data: this.geoStatsCache[username], cacheHit: true }
    }

    try {
      const [certsList, userDoc] = await Promise.all([
        this.certificateModel.find({ _id: new RegExp(`^${username}-`) }).lean(),
        this.userModel
          .findOne({ username })
          .select('strictLessonProgress isInitialSyncCompleted')
          .lean(),
      ])

      const strictLessonProgress = Boolean(userDoc?.strictLessonProgress)
      const isInitialSyncCompleted = Boolean(userDoc?.isInitialSyncCompleted)
      const earnedCertSlugs = new Set(certsList.map((c) => c.slug))
      const hasGlobalFullStack = earnedCertSlugs.has(GLOBAL_TRIGGER_SLUG)

      const facetPipeline: Record<string, any[]> = {}
      for (const [key, config] of Object.entries(GEO_MAPPING)) {
        facetPipeline[key] = [
          {
            $match: {
              username: username,
              category: config.sectionSlug,
            },
          },
          {
            $count: 'count',
          },
        ]
      }

      const [aggregationResult] = await this.progressModel.aggregate([
        { $facet: facetPipeline },
      ])

      let totalCompletedAcrossRegions = 0
      const stats: Record<string, any> = {}

      for (const [key, config] of Object.entries(GEO_MAPPING)) {
        const dbFacetRows = aggregationResult && aggregationResult[key]
        const completedTasksCount = dbFacetRows && dbFacetRows[0] ? dbFacetRows[0].count : 0
        totalCompletedAcrossRegions += completedTasksCount

        const hasRegionCertificate = earnedCertSlugs.has(config.certSlug)

        let percentage = 0
        if (hasRegionCertificate && !strictLessonProgress) {
          percentage = 100
        } else if (config.maxLessons > 0) {
          percentage = Math.min(
            100,
            Math.round((completedTasksCount / config.maxLessons) * 100),
          )
        }

        stats[key] = {
          id: config.id,
          name: config.name,
          completed: completedTasksCount,
          total: config.maxLessons,
          percentage: percentage,
          hasCertificate: hasRegionCertificate,
        }
      }

      const hasTelemetryRecords =
        totalCompletedAcrossRegions > 0 || certsList.length > 0
      const isSyncing = !isInitialSyncCompleted && !hasTelemetryRecords

      if (!isInitialSyncCompleted && hasTelemetryRecords) {
        await this.userModel.updateOne(
          { username },
          { $set: { isInitialSyncCompleted: true } },
        )
      }

      const compiledPayload = {
        regions: stats,
        globalFullStack: hasGlobalFullStack,
        isSyncing,
        strictLessonProgress,
      }

      // Cache only synchronized datasets so initial empty states re-evaluate cleanly until scraper completes
      if (!isSyncing) {
        this.geoStatsCache[username] = compiledPayload

        // Learning Layer: Synchronize calculated live states back into the dynamic Fallback Core
        if (username === 'livanov-as') {
          this.demoTelemetryService.syncAdminGeoSnapshot(compiledPayload)
        }
      }

      this.logger.log(
        `Successfully compiled GIS regional progress statistics facets for "${username}" (isSyncing: ${isSyncing}, strict: ${strictLessonProgress}).`,
      )
      return { data: compiledPayload, cacheHit: false }
    } catch (error) {
      this.logger.error(
        `GIS telemetry matrix aggregation workflow failed for "${username}": ${(error as Error).message}`,
      )
      return {
        data: {
          regions: {},
          globalFullStack: false,
          isSyncing: false,
          strictLessonProgress: false,
        },
        cacheHit: false,
      }
    }
  }

  /**
   * Resets user progress records either globally or for a specific geographical curriculum sector.
   * Preserves earned certificates intact and invalidates isolated user GIS cache.
   */
  async resetUserProgress(
    username: string,
    regionId?: string,
  ): Promise<{ success: boolean; deletedCount: number; regionId: string }> {
    const normalizedRegion = regionId && regionId.trim() !== '' ? regionId.trim() : 'all'
    const filter: Record<string, any> = { username }

    if (normalizedRegion !== 'all') {
      const regionConfig = GEO_MAPPING[normalizedRegion]
      if (!regionConfig) {
        throw new BadRequestException(`Invalid geographical region identifier: "${normalizedRegion}"`)
      }
      filter.category = regionConfig.sectionSlug
    }

    try {
      const [deleteResult] = await Promise.all([
        this.progressModel.deleteMany(filter),
        this.userModel.updateOne(
          { username },
          { $set: { isInitialSyncCompleted: true } },
        ),
      ])
      delete this.geoStatsCache[username]

      this.logger.log(
        `Progress Reset: Cleared ${deleteResult.deletedCount} records for "${username}" (sector: ${normalizedRegion}).`,
      )

      return {
        success: true,
        deletedCount: deleteResult.deletedCount ?? 0,
        regionId: normalizedRegion,
      }
    } catch (error) {
      this.logger.error(
        `Failed to reset progress records for "${username}" (sector: ${normalizedRegion}): ${(error as Error).message}`,
      )
      throw new InternalServerErrorException('Progress reset transaction failed')
    }
  }

  /**
   * Toggles strict lesson-based percentage calculation mode on the GIS map for the user.
   * Invalidates isolated user GIS cache so new percentage math applies immediately.
   */
  async updateStrictLessonProgress(
    username: string,
    strict: boolean,
  ): Promise<{ success: boolean; strictLessonProgress: boolean }> {
    const normalizedStrict = Boolean(strict)

    try {
      await this.userModel.findOneAndUpdate(
        { username },
        { $set: { strictLessonProgress: normalizedStrict } },
        { new: true },
      )

      delete this.geoStatsCache[username]

      this.logger.log(
        `GIS Telemetry Mode: Updated strictLessonProgress=${normalizedStrict} for "${username}".`,
      )

      return {
        success: true,
        strictLessonProgress: normalizedStrict,
      }
    } catch (error) {
      this.logger.error(
        `Failed to update strictLessonProgress flag for "${username}": ${(error as Error).message}`,
      )
      throw new InternalServerErrorException('Failed to update strict progress mode')
    }
  }

  /**
   * Evicts a single user's cached GIS telemetry entry from RAM (used on admin cascade deletion).
   */
  evictUserGeoCache(username: string): void {
    if (this.geoStatsCache[username]) {
      delete this.geoStatsCache[username]
      this.logger.log(`♻️ Evicted isolated GIS cache entry for "${username}".`)
    }
  }

  /**
   * Shared internal routine to invalidate targeted or global GIS cache and notify WebSocket rooms.
   */
  private async invalidateGeoCache(
    targetUsername?: string,
    operatorContext?: string,
  ): Promise<void> {
    const normalizedTarget = targetUsername?.trim()

    if (normalizedTarget) {
      delete this.geoStatsCache[normalizedTarget]
      await this.userModel.updateOne(
        { username: normalizedTarget },
        { $set: { isInitialSyncCompleted: true } },
      )
      this.logger.log(
        `♻️ In-Memory regional GIS stats cache cleared specifically for "${normalizedTarget}".`,
      )
      this.progressGateway.notifyTelemetryUpdated(normalizedTarget)
      return
    }

    this.geoStatsCache = {}
    const sourceSuffix = operatorContext ? ` by "${operatorContext}"` : ' across all multi-user domains'
    this.logger.log(`♻️ In-Memory regional GIS stats cache successfully cleared${sourceSuffix}.`)
    this.progressGateway.notifyTelemetryUpdated()
  }

  /**
   * Secure endpoint utilized by the parser execution lifecycle to invalidate local memory caches.
   */
  async flushCache(
    tokenFromHeader: string | null,
    tokenFromBody: string | null,
    targetUsername?: string,
  ): Promise<{ success: boolean; message: string }> {
    const secretToken = process.env.CACHE_SECRET_TOKEN

    if (!secretToken) {
      this.logger.error('Configuration Failure: CACHE_SECRET_TOKEN is missing on server runtime state.')
      throw new InternalServerErrorException(
        'Cache secret token is not configured on server',
      )
    }

    if (tokenFromHeader !== secretToken && tokenFromBody !== secretToken) {
      this.logger.warn('Security Alert: Unauthorized attempts to access cache flush webhook endpoint.')
      throw new UnauthorizedException(
        'Unauthorized: Invalid cache flush security token signature',
      )
    }

    await this.invalidateGeoCache(targetUsername)
    return { success: true, message: 'Cache invalidated successfully' }
  }

  /**
   * Invalidates in-memory regional GIS stats cache when triggered by an authenticated ADMIN session.
   */
  async flushCacheByAdmin(
    adminUsername: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.invalidateGeoCache(undefined, adminUsername)
    return { success: true, message: 'Cache invalidated successfully by administrator' }
  }
}
