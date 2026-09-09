import express from 'express'
import { Progress } from '../models/Progress.js'
import { Certificate } from '../models/Certificate.js'
import { GEO_MAPPING, GLOBAL_TRIGGER_SLUG } from '../config/constants.js'

// --- Global In-Memory Cache Storage ---
let geoStatsCache = null

const router = express.Router()

/**
 * GET /api/progress/calendar
 * Aggregates and groups user activity history over the last 31 days directly in the database.
 * Supports dynamic client timezone alignment passed via query params to prevent date shifts.
 * Returns a lightweight map object: { "YYYY-MM-DD": count, ... }
 */
router.get('/progress/calendar', async (req, res) => {
  try {
    const targetDays = 31
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - targetDays)

    // Fallback to UTC if the frontend client timezone option is missing
    let clientTimezone = req.query.timezone || 'UTC'

    // Secure timezone injection validation protecting MongoDB aggregation pipelines against DoS
    const timezoneRegex = /^[A-Za-z0-9_\-\/]+$/
    if (!timezoneRegex.test(clientTimezone)) {
      clientTimezone = 'UTC'
    }

    // Execute aggregation pipeline leveraging MongoDB index on { date: -1 }
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

    // Reduce aggregated collection payload into a flat calendar tracking matrix mapping
    const calendarMap = aggregation.reduce((acc, curr) => {
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
 * GET /api/progress/timeline
 * Retrieves exactly the 10 most recent tasks for the streaming feed with explicit URL projection.
 */
router.get('/progress/timeline', async (req, res) => {
  try {
    const tasksList = await Progress.find({})
      .sort({ date: -1 })
      .limit(10)
      .select('task_name category date url') // Optimized field selection including specific tasks URLs
      .lean()

    res.json({ tasks: tasksList })
  } catch (error) {
    console.error('Error fetching timeline tasks:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * GET /api/progress/geo-stats
 * Aggregates freeCodeCamp v9 progress statistics mapped by geographical regions.
 * Implements high-performance MongoDB Atlas pipeline aggregation with In-Memory caching mechanisms.
 */
router.get('/progress/geo-stats', async (req, res) => {
  try {
    // 1. Check if finalized dataset is already compiled inside system memory
    if (geoStatsCache) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(geoStatsCache)
    }

    // 2. Fetch earned credentials to verify milestones and global full-stack statuses
    const certsList = await Certificate.find({}).lean()
    const earnedCertSlugs = new Set(certsList.map((c) => c.slug))
    const hasGlobalFullStack = earnedCertSlugs.has(GLOBAL_TRIGGER_SLUG)

    // 3. Construct dynamic database aggregation facets utilizing exact string matches
    const facetPipeline = {}
    for (const [key, config] of Object.entries(GEO_MAPPING)) {
      facetPipeline[key] = [
        {
          $match: {
            category: { $in: config.sectionSlugs },
          },
        },
        {
          $count: 'count',
        },
      ]
    }

    // Execute heavy calculations directly on MongoDB Atlas server layer via optimized indices
    const [aggregationResult] = await Progress.aggregate([
      { $facet: facetPipeline },
    ])

    // 4. Map calculated scalar numbers into finalized GIS structural entities
    const stats = {}
    for (const [key, config] of Object.entries(GEO_MAPPING)) {
      const dbFacetRows = aggregationResult && aggregationResult[key]
      const completedTasksCount = dbFacetRows && dbFacetRows[0] ? dbFacetRows[0].count : 0

      const hasRegionCertificate = config.certSlugs.some((slug) =>
        earnedCertSlugs.has(slug),
      )

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

    // 5. Commit compiled data object into memory architecture matrix
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
 * GET /api/certificates
 * Retrieves the list of earned certificates for the CertificatesGrid widget.
 */
router.get('/certificates', async (req, res) => {
  try {
    const certsList = await Certificate.find({}).sort({ createdAt: -1 }).lean()
    res.json(certsList)
  } catch (error) {
    console.error('Error fetching certificates:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

/**
 * POST /api/progress/cache-flush
 * Secure endpoint utilized by the parser execution lifecycle to invalidate local memory caches.
 * Validates incoming payloads leveraging the system CACHE_SECRET_TOKEN.
 */
router.post('/progress/cache-flush', (req, res) => {
  const secretToken = process.env.CACHE_SECRET_TOKEN

  if (!secretToken) {
    return res.status(500).json({ error: 'Cache secret token is not configured on server' })
  }

  // Extract token from both Bearer Authorization header or JSON request body payload
  const authHeader = req.headers.authorization
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
  const tokenFromBody = req.body && req.body.token

  if (tokenFromHeader !== secretToken && tokenFromBody !== secretToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid cache flush security token signature' })
  }

  // Invalidate local in-memory dataset mapping
  geoStatsCache = null
  console.log(' ♻️ In-Memory regional GIS stats cache successfully cleared via web-hook trigger.')

  res.json({ success: true, message: 'Cache invalidated successfully' })
})

export default router
