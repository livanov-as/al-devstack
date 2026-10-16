import express, { Request, Response, Router } from 'express'
import { Progress } from '../models/Progress.js'
import { Certificate } from '../models/Certificate.js'
import { GEO_MAPPING, GLOBAL_TRIGGER_SLUG } from '../config/constants.js'

// --- Global In-Memory Cache Storage ---
let geoStatsCache: any = null

const router: Router = express.Router()

/**
 * GET /progress/calendar
 * Aggregates and groups user activity history over the last 31 days directly in the database.
 */
router.get('/progress/calendar', async (req: Request, res: Response) => {
  try {
    const targetDays = 31
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - targetDays)

    let clientTimezone = (req.query.timezone as string) || 'UTC'

    const timezoneRegex = /^[A-Za-z0-9_\-\/]+$/
    if (!timezoneRegex.test(clientTimezone)) {
      clientTimezone = 'UTC'
    }

    const aggregation = await Progress.aggregate([
      {
        $match: {
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

    const calendarMap = aggregation.reduce((acc: Record<string, number>, curr) => {
      acc[curr._id] = curr.count
      return acc
    }, {})

    res.json(calendarMap)
  } catch (error) {
    console.error('Error fetching calendar stats:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * GET /progress/timeline
 * Retrieves exactly the 10 most recent tasks for the streaming feed.
 */
router.get('/progress/timeline', async (req: Request, res: Response) => {
  try {
    const tasksList = await Progress.find({})
      .sort({ date: -1 })
      .limit(10)
      .select('task_name category date url')
      .lean()

    res.json({ tasks: tasksList })
  } catch (error) {
    console.error('Error fetching timeline tasks:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * GET /certificates
 * Retrieves the list of earned certificates sorted optimally by slug layout indices.
 */
router.get('/certificates', async (req: Request, res: Response) => {
  try {
    const certsList = await Certificate.find({}).sort({ slug: 1 }).lean()
    res.json(certsList)
  } catch (error) {
    console.error('Error fetching certificates:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * GET /progress/geo-stats
 * Aggregates freeCodeCamp v9 progress statistics mapped by geographical regions.
 */
router.get('/progress/geo-stats', async (req: Request, res: Response) => {
  try {
    if (geoStatsCache) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(geoStatsCache)
    }

    const certsList = await Certificate.find({}).lean()
    const earnedCertSlugs = new Set(certsList.map((c) => c.slug))
    const hasGlobalFullStack = earnedCertSlugs.has(GLOBAL_TRIGGER_SLUG)

    const facetPipeline: Record<string, any[]> = {}
    for (const [key, config] of Object.entries(GEO_MAPPING)) {
      facetPipeline[key] = [
        {
          $match: {
            category: config.sectionSlug,
          },
        },
        {
          $count: 'count',
        },
      ]
    }

    const [aggregationResult] = await Progress.aggregate([
      { $facet: facetPipeline },
    ])

    const stats: Record<string, any> = {}
    for (const [key, config] of Object.entries(GEO_MAPPING)) {
      const dbFacetRows = aggregationResult && aggregationResult[key]
      const completedTasksCount = dbFacetRows && dbFacetRows[0] ? dbFacetRows[0].count : 0

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

    geoStatsCache = {
      regions: stats,
      globalFullStack: hasGlobalFullStack,
    }

    res.setHeader('X-Cache', 'MISS')
    res.json(geoStatsCache)
  } catch (error) {
    console.error('GIS aggregation error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * POST /progress/cache-flush
 * Secure endpoint utilized by the parser execution lifecycle to invalidate local memory caches.
 */
router.post('/progress/cache-flush', (req: Request, res: Response) => {
  const secretToken = process.env.CACHE_SECRET_TOKEN

  if (!secretToken) {
    return res.status(500).json({ error: 'Cache secret token is not configured on server' })
  }

  const authHeader = req.headers.authorization
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
  const tokenFromBody = req.body && req.body.token

  if (tokenFromHeader !== secretToken && tokenFromBody !== secretToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid cache flush security token signature' })
  }

  geoStatsCache = null
  console.log(' ♻️ In-Memory regional GIS stats cache successfully cleared via web-hook trigger.')

  res.json({ success: true, message: 'Cache invalidated successfully' })
})

export default router
