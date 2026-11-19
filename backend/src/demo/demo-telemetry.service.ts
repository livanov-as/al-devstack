import { Injectable } from '@nestjs/common'
import { UserRole } from '../schemas/user.schema.js'

export interface CachedTaskSnapshot {
  _id: string
  task_name: string
  category: string
  date: Date
  url: string
}

export interface CachedCertificateSnapshot {
  slug: string
  title: string
  url: string
}

@Injectable()
export class DemoTelemetryService {
  // Initialize with actual production snapshot verified from freeCodeCamp
  private geoCache: Record<string, any> = {
    regions: {
      europe: {
        id: 'europe',
        name: 'Europe',
        completed: 154,
        total: 1552,
        percentage: 100,
        hasCertificate: true,
      },
      asia: {
        id: 'asia',
        name: 'Asia',
        completed: 223,
        total: 1341,
        percentage: 100,
        hasCertificate: true,
      },
      africa: {
        id: 'africa',
        name: 'Africa',
        completed: 372,
        total: 524,
        percentage: 71,
        hasCertificate: false,
      },
      north_america: {
        id: 'north_america',
        name: 'North America',
        completed: 0,
        total: 578,
        percentage: 0,
        hasCertificate: false,
      },
      south_america: {
        id: 'south_america',
        name: 'South America',
        completed: 5,
        total: 64,
        percentage: 8,
        hasCertificate: false,
      },
      australia_oceania: {
        id: 'australia_oceania',
        name: 'Australia & Oceania',
        completed: 0,
        total: 111,
        percentage: 0,
        hasCertificate: false,
      },
    },
    globalFullStack: false,
    isSyncing: false,
    strictLessonProgress: false,
  }

  private certCache: CachedCertificateSnapshot[] = [
    {
      slug: 'javascript-algorithms-and-data-structures',
      title: 'View Legacy JavaScript Algorithms and Data Structures V7 Certification',
      url: 'freecodecamp.org/certification/livanov-as/javascript-algorithms-and-data-structures',
    },
    {
      slug: 'javascript-v9',
      title: 'View JavaScript Certification',
      url: 'freecodecamp.org/certification/livanov-as/javascript-v9',
    },
    {
      slug: 'responsive-web-design',
      title: 'View Legacy Responsive Web Design V8 Certification',
      url: 'freecodecamp.org/certification/livanov-as/responsive-web-design',
    },
    {
      slug: 'responsive-web-design-v9',
      title: 'View Responsive Web Design Certification',
      url: 'freecodecamp.org/certification/livanov-as/responsive-web-design-v9',
    },
  ]

  // Seed tasks initialized with historical timestamps (triggers adaptive time-shifting until live sync occurs)
  private tasksCache: CachedTaskSnapshot[] = [
    81, 80, 79, 78, 77, 76, 75, 74, 73, 72,
  ].map((step) => ({
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
  private resolveTelemetryPipeline() {
    const calendarStats: Record<string, number> = {}
    const currentRuntimeClock = new Date()
    const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000

    const latestTaskTimestamp = this.tasksCache.reduce((maxTime, task) => {
      const taskTime = new Date(task.date).getTime()
      return taskTime > maxTime ? taskTime : maxTime
    }, 0)

    const isFreshWithin31Days =
      latestTaskTimestamp > 0 &&
      currentRuntimeClock.getTime() - latestTaskTimestamp <= thirtyOneDaysMs

    if (isFreshWithin31Days) {
      const timelineTasksList = this.tasksCache.map((task) => {
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

    const shiftedTasksList = this.tasksCache.map((task, idx) => {
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

  getCalendarStats(): Record<string, number> {
    return this.resolveTelemetryPipeline().calendarStats
  }

  getTimelineTasks() {
    return this.resolveTelemetryPipeline().timelineTasks
  }

  getCertificates(): CachedCertificateSnapshot[] {
    return this.certCache
  }

  getGeoStats(liveAdminSnapshot?: Record<string, any>): {
    data: Record<string, any>
    cacheHit: boolean
  } {
    const baseSnapshot = liveAdminSnapshot || this.geoCache
    return {
      data: {
        ...baseSnapshot,
        isSyncing: false,
        strictLessonProgress: false,
      },
      cacheHit: Boolean(liveAdminSnapshot),
    }
  }

  /**
   * Learning Layer: Updates adaptive memory storage from live admin telemetry snapshots.
   */
  syncAdminTasksSnapshot(tasks: CachedTaskSnapshot[]): void {
    if (tasks && tasks.length > 0) {
      this.tasksCache = tasks
    }
  }

  syncAdminCertificatesSnapshot(certs: CachedCertificateSnapshot[]): void {
    if (certs && certs.length > 0) {
      this.certCache = certs
    }
  }

  syncAdminGeoSnapshot(geoPayload: Record<string, any>): void {
    if (geoPayload) {
      this.geoCache = geoPayload
    }
  }

  /**
   * Returns an isolated in-memory FinOps & cluster user snapshot for DEMO_USER admin preview.
   */
  getAdminUsersTelemetry() {
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
}
