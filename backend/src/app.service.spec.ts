import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AppService } from './app.service.js'
import { DemoTelemetryService } from './demo/demo-telemetry.service.js'
import { UserRole } from './schemas/user.schema.js'

describe('AppService', () => {
  let appService: AppService
  let demoTelemetryService: DemoTelemetryService
  let mockCertModel: any
  let mockProgressModel: any
  let mockUserModel: any
  let mockGateway: any

  beforeEach(() => {
    demoTelemetryService = new DemoTelemetryService()

    mockCertModel = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        lean: vi.fn().mockResolvedValue([]),
      }),
    }

    mockProgressModel = {
      ensureIndexes: vi.fn().mockResolvedValue(undefined),
      aggregate: vi.fn().mockResolvedValue([{}]),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 15 }),
    }

    mockUserModel = {
      findOne: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            strictLessonProgress: false,
            isInitialSyncCompleted: true,
          }),
        }),
      }),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    }

    mockGateway = {
      notifyTelemetryUpdated: vi.fn(),
    }

    appService = new AppService(
      mockCertModel,
      mockProgressModel,
      mockUserModel,
      mockGateway,
      demoTelemetryService,
    )
  })

  it('isolates DEMO_USER requests in RAM without querying MongoDB models', async () => {
    const result = await appService.getGeoStats('recruiter-tech-lead', UserRole.DEMO_USER)

    expect(result.data.regions.europe.percentage).toBe(100)
    expect(result.data.regions.africa.percentage).toBe(71)
    expect(mockProgressModel.aggregate).not.toHaveBeenCalled()
    expect(mockCertModel.find).not.toHaveBeenCalled()
  })

  it('calculates 100% for certified region when strictLessonProgress is false, and exact % when true', async () => {
    mockCertModel.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ slug: 'responsive-web-design-v9' }]),
    })
    mockProgressModel.aggregate.mockResolvedValue([
      { europe: [{ count: 155 }] },
    ])

    // 1. Default mode (strictLessonProgress = false): certificate locks Europe at 100%
    const normalRes = await appService.getGeoStats('alice-dev', UserRole.USER)
    expect(normalRes.cacheHit).toBe(false)
    expect(normalRes.data.regions.europe.percentage).toBe(100)
    expect(normalRes.data.regions.europe.hasCertificate).toBe(true)

    // Second call hits isolated RAM cache
    const cachedRes = await appService.getGeoStats('alice-dev', UserRole.USER)
    expect(cachedRes.cacheHit).toBe(true)

    // 2. Strict mode (strictLessonProgress = true): calculates 155 / 1552 = 10%
    appService.evictUserGeoCache('alice-dev')
    mockUserModel.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          strictLessonProgress: true,
          isInitialSyncCompleted: true,
        }),
      }),
    })

    const strictRes = await appService.getGeoStats('alice-dev', UserRole.USER)
    expect(strictRes.data.regions.europe.percentage).toBe(10)
    expect(strictRes.data.regions.europe.hasCertificate).toBe(true)
  })

  it('isolates resetUserProgress by username and sector while invalidating user cache', async () => {
    const res = await appService.resetUserProgress('bob-coder', 'europe')

    expect(mockProgressModel.deleteMany).toHaveBeenCalledWith({
      username: 'bob-coder',
      category: 'responsive-web-design-v9',
    })
    expect(res).toEqual({
      success: true,
      deletedCount: 15,
      regionId: 'europe',
    })
  })
})
