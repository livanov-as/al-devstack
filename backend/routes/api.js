import express from "express";
import { Progress } from "../models/Progress.js";
import { Certificate } from "../models/Certificate.js";
import { GEO_MAPPING, GLOBAL_TRIGGER_SLUG } from "../config/constants.js";

const router = express.Router();

/**
 * GET /api/progress/geo-stats
 * Aggregates freeCodeCamp v9 progress statistics mapped by geographical regions.
 */
router.get('/progress/geo-stats', async (req, res) => {
  try {
    const progressList = await Progress.find({}).lean();
    const certsList = await Certificate.find({}).lean();

    const earnedCertSlugs = new Set(certsList.map(c => c.slug));
    const hasGlobalFullStack = earnedCertSlugs.has(GLOBAL_TRIGGER_SLUG);

    const stats = {};

    for (const [key, config] of Object.entries(GEO_MAPPING)) {
      const completedTasksCount = progressList.filter(item => 
        config.matchRegex.test(item.category || '')
      ).length;

      const hasRegionCertificate = config.certSlugs.some(slug => earnedCertSlugs.has(slug));

      let percentage = 0;
      if (hasRegionCertificate) {
        percentage = 100;
      } else if (config.maxLessons > 0) {
        percentage = Math.min(
          100, 
          Math.round((completedTasksCount / config.maxLessons) * 100)
        );
      }

      stats[key] = {
        id: config.id,
        name: config.name,
        completed: completedTasksCount,
        total: config.maxLessons,
        percentage: percentage,
        hasCertificate: hasRegionCertificate
      };
    }

    res.json({
      regions: stats,
      globalFullStack: hasGlobalFullStack
    });

  } catch (error) {
    console.error('GIS aggregation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/certificates
 * Retrieves the list of earned certificates for the CertificatesGrid widget.
 */
router.get('/certificates', async (req, res) => {
  try {
    const certsList = await Certificate.find({}).sort({ createdAt: -1 }).lean();
    res.json(certsList);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
