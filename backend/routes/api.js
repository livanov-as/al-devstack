import express from "express";
import { Progress } from "../models/Progress.js";
import { Certificate } from "../models/Certificate.js";
import { GEO_MAPPING, GLOBAL_TRIGGER_SLUG } from "../config/constants.js";

const router = express.Router();

// 1. GET /api/health — Redundant lightweight route (for structure/sanity check)
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// 2. GET /api/progress/geo-stats — GIS map percentage aggregation route handling legacy fCC task migration
router.get("/progress/geo-stats", async (req, res) => {
  try {
    const hasGlobalCert = await Certificate.findOne({
      slug: GLOBAL_TRIGGER_SLUG,
    });
    const userCerts = await Certificate.find();
    const certSlugsList = userCerts.map((c) => c.slug);

    const geoStats = {};

    for (const [key, config] of Object.entries(GEO_MAPPING)) {
      // 1. Global trigger condition (Full-Stack Developer)
      if (hasGlobalCert) {
        geoStats[key] = {
          name: config.name,
          progress: 100,
          lessonsProgress: 85,
          certBonus: 15,
          completedLessons: config.maxLessons,
          maxLessons: config.maxLessons,
          isFullyMastered: true,
        };
        continue;
      }

      // 2. Smart calculation accounting for legacy fCC task migration (Killer feature!)
      // Verify if ALL required certificates for the current region are earned
      const hasAllRegionCerts = config.certSlugs.every((slug) =>
        certSlugsList.includes(slug),
      );

      let completedLessons = 0;

      if (hasAllRegionCerts) {
        // If official regional certificates exist in the DB, the course is completed!
        // Force the maximum value, overriding missing tasks caused by fCC migration
        completedLessons = config.maxLessons;
      } else {
        // If certificates are missing yet (e.g., Eurasia or Africa) — perform a raw DB count
        completedLessons = await Progress.countDocuments({
          category: { $regex: config.matchRegex },
        });
      }

      // Percentage calculation based on our formula weights (85% lessons + 15% cert)
      const rawLessonsPercent = (completedLessons / config.maxLessons) * 100;
      const lessonsProgress = Math.min(rawLessonsPercent * 0.85, 85);

      // Check for at least one certificate to apply the partial milestone bonus (+15%)
      const hasAnyRegionCert = config.certSlugs.some((slug) =>
        certSlugsList.includes(slug),
      );
      const certBonus = hasAnyRegionCert ? 15 : 0;

      const totalProgress = Math.round(lessonsProgress + certBonus);

      geoStats[key] = {
        name: config.name,
        progress: Math.min(totalProgress, 100),
        lessonsProgress: Math.round(lessonsProgress),
        certBonus: certBonus,
        completedLessons: completedLessons,
        maxLessons: config.maxLessons,
        isFullyMastered: totalProgress >= 100,
      };
    }

    res.json({
      success: true,
      globalTriggerActive: !!hasGlobalCert,
      stats: geoStats,
    });
  } catch (error) {
    console.error("❌ GIS aggregation error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during geo aggregation" });
  }
});

// 3. GET /api/progress?page=1&limit=50 — Paginated live feed of recent completed tasks
router.get("/progress", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch tasks, sorting from newest to oldest
    const tasks = await Progress.find()
      .sort({ date: -1 }) // Sorting by the date field from fCC v9
      .skip(skip)
      .limit(limit);

    // Count total documents for correct pagination math
    const totalTasks = await Progress.countDocuments();

    res.json({
      success: true,
      tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTasks / limit),
        totalTasks: totalTasks,
      },
    });
  } catch (error) {
    console.error("❌ Task stream fetching error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during progress stream fetching" });
  }
});

export default router;
