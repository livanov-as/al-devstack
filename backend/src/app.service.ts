import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
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
import { UserRole } from './schemas/user.schema.js'

interface CachedTaskSnapshot {
  _id: string
  task_name: string
  category: string
  date: Date
  url: string
}

// --- ADVANCED FINOPS LEARNING FALLBACK STORAGE (IN-MEMORY OVERRIDES) ---
// Initialize with actual production snapshot verified from freeCodeCamp
let PERSISTENT_GEO_CACHE: any = {
  regions: {
    europe: { id: 'europe', name: 'Europe', completed: 154, total: 1552, percentage: 100, hasCertificate: true },
    asia: { id: 'asia', name: 'Asia', completed: 223, total: 1341, percentage: 100, hasCertificate: true },
    africa: { id: 'africa', name: 'Africa', completed: 372, total: 524, percentage: 71, hasCertificate: false },
    north_america: { id: 'north_america', name: 'North America', completed: 0, total: 578, percentage: 0, hasCertificate: false },
    south_america: { id: 'south_america', name: 'South America', completed: 5, total: 64, percentage: 8, hasCertificate: false },
    australia_oceania: { id: 'australia_oceania', name: 'Australia & Oceania', completed: 0, total: 111, percentage: 0, hasCertificate: false },
  },
  globalFullStack: false,
  isSyncing: false,
}

let PERSISTENT_CERT_CACHE: any[] = [
  { slug: 'javascript-algorithms-and-data-structures', title: 'View Legacy JavaScript Algorithms and Data Structures V7 Certification', url: 'freecodecamp.org/certification/livanov-as/javascript-algorithms-and-data-structures' },
  { slug: 'javascript-v9', title: 'View JavaScript Certification', url: 'freecodecamp.org/certification/livanov-as/javascript-v9' },
  { slug: 'responsive-web-design', title: 'View Legacy Responsive Web Design V8 Certification', url: 'freecodecamp.org/certification/livanov-as/responsive-web-design' },
  { slug: 'responsive-web-design-v9', title: 'View Responsive Web Design Certification', url: 'freecodecamp.org/certification/livanov-as/responsive-web-design-v9' },
]

// Seed tasks initialized with historical timestamps (triggers adaptive time-shifting until live sync occurs)
let PERSISTENT_TASKS_CACHE: CachedTaskSnapshot[] = [81, 80, 79, 78, 77, 76, 75, 74, 73, 72].map((step) => ({
  _id: `seed-node-envelope-v9-${step}`,
  task_name: `Build an Envelope Budget App - Step ${step}`,
  category: 'javascript-v9',
  date: new Date('2025-01-01T00:00:00.000Z'),
  url: `freecodecamp.org/learn/javascript-v9/workshop-envelope-budget-app/step-${step}`,
}))

/**
 * Resolves demo timeline and calendar telemetry from RAM cache.
 * Preserves authentic timestamps if tasks occurred within the last 31 days;
 * otherwise dynamically shifts dates in realistic waves (5 + 3 + 2) for varied heatmap intensity.
 */
function resolveDemoTelemetryPipeline() {
  const calendarStats: Record<string, number> = {}
  const currentRuntimeClock = new Date()
  const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000

  const latestTaskTimestamp = PERSISTENT_TASKS_CACHE.reduce((maxTime, task) => {
    const taskTime = new Date(task.date).getTime()
    return taskTime > maxTime ? taskTime : maxTime
  }, 0)

  const isFreshWithin31Days =
    latestTaskTimestamp > 0 &&
    currentRuntimeClock.getTime() - latestTaskTimestamp <= thirtyOneDaysMs

  if (isFreshWithin31Days) {
    const timelineTasksList = PERSISTENT_TASKS_CACHE.map((task) => {
      const taskDate = new Date(task.date)
      const calendarKey = taskDate.toISOString().split('T')[0]
      calendarStats[calendarKey] = (calendarStats[calendarKey] || 0) + 1

      return {
        ...task,
        date: taskDate,
      }
    })

    return { calendarStats, timelineTasks: { tasks: timelineTasksList } }
  }

  // Wave distribution (5 today, 3 three days ago, 2 nine days ago) to render multi-tier emerald intensity
  const waveOffsets = [0, 0, 0, 0, 0, 3, 3, 3, 9, 9]

  const shiftedTasksList = PERSISTENT_TASKS_CACHE.map((task, idx) => {
    const offsetDays = waveOffsets[idx] ?? idx
    const calculatedDate = new Date(currentRuntimeClock.getTime())
    calculatedDate.setDate(currentRuntimeClock.getDate() - offsetDays)
    calculatedDate.setMinutes(currentRuntimeClock.getMinutes() - idx * 15)

    const calendarKey = calculatedDate.toISOString().split('T')[0]
    calendarStats[calendarKey] = (calendarStats[calendarKey] || 0) + 1

    return {
      ...task,
      date: calculatedDate,
    }
  })

  return { calendarStats, timelineTasks: { tasks: shiftedTasksList } }
}

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name)
  private geoStatsCache: Record<string, any> = {}

  constructor(
    @InjectModel(Certificate.name)
    private certificateModel: Model<CertificateDocument>,
    @InjectModel(Progress.name)
    private progressModel: Model<ProgressDocument>,
    private readonly progressGateway: ProgressGateway,
  ) {}

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
    const isActiveDemo = role === UserRole.DEMO_USER || username === 'recruiter-tech-lead'

    if (isActiveDemo) {
      const { calendarStats } = resolveDemoTelemetryPipeline()
      return calendarStats
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
    const isActiveDemo = role === UserRole.DEMO_USER || username === 'recruiter-tech-lead'

    if (isActiveDemo) {
      const { timelineTasks } = resolveDemoTelemetryPipeline()
      return timelineTasks
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
        PERSISTENT_TASKS_CACHE = tasksList.map((task) => ({
          _id: String(task._id),
          task_name: task.task_name,
          category: task.category,
          date: new Date(task.date),
          url: task.url,
        }))
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
    const isActiveDemo = role === UserRole.DEMO_USER || username === 'recruiter-tech-lead'

    if (isActiveDemo) {
      return PERSISTENT_CERT_CACHE
    }

    try {
      const certsList = await this.certificateModel
        .find({ _id: new RegExp(`^${username}-`) })
        .sort({ slug: 1 })
        .lean()

      // Learning Layer: Update persistent certificate schemas if the live dataset changes
      if (username === 'livanov-as' && certsList && certsList.length > 0) {
        PERSISTENT_CERT_CACHE = certsList.map((c) => ({
          slug: c.slug,
          title: c.title,
          url: c.url,
        }))
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
    const isActiveDemo = role === UserRole.DEMO_USER || username === 'recruiter-tech-lead'

    if (isActiveDemo) {
      if (this.geoStatsCache['livanov-as']) {
        return {
          data: { ...this.geoStatsCache['livanov-as'], isSyncing: false },
          cacheHit: true,
        }
      }
      return {
        data: { ...PERSISTENT_GEO_CACHE, isSyncing: false },
        cacheHit: false,
      }
    }

    // Priority 1: Instant cache extraction from isolated memory cells
    if (this.geoStatsCache[username]) {
      return { data: this.geoStatsCache[username], cacheHit: true }
    }

    try {
      const certsList = await this.certificateModel.find({ _id: new RegExp(`^${username}-`) }).lean()
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
        if (hasRegionCertificate) {
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

      const isSyncing = totalCompletedAcrossRegions === 0 && certsList.length === 0

      const compiledPayload = {
        regions: stats,
        globalFullStack: hasGlobalFullStack,
        isSyncing,
      }

      // Cache only synchronized datasets so initial empty states re-evaluate cleanly until scraper completes
      if (!isSyncing) {
        this.geoStatsCache[username] = compiledPayload

        // Learning Layer: Synchronize calculated live states back into the dynamic Fallback Core
        if (username === 'livanov-as') {
          PERSISTENT_GEO_CACHE = compiledPayload
        }
      }

      this.logger.log(
        `Successfully compiled GIS regional progress statistics facets for "${username}" (isSyncing: ${isSyncing}).`,
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
        },
        cacheHit: false,
      }
    }
  }

  /**
   * Secure endpoint utilized by the parser execution lifecycle to invalidate local memory caches.
   */
  flushCache(
    tokenFromHeader: string | null,
    tokenFromBody: string | null,
    targetUsername?: string,
  ): { success: boolean; message: string } {
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

    // Flush distributed runtime query caches cleanly
    this.geoStatsCache = {}
    this.logger.log('♻️ In-Memory regional GIS stats cache successfully cleared across all multi-user domains.')

    // Notify connected WebSocket rooms to invalidate client telemetry caches
    this.progressGateway.notifyTelemetryUpdated(targetUsername)

    return { success: true, message: 'Cache invalidated successfully' }
  }
}
