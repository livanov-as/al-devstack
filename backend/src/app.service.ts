import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Certificate, CertificateDocument } from './schemas/certificate.schema.js';
import { Progress, ProgressDocument } from './schemas/progress.schema.js';
import { GEO_MAPPING, GLOBAL_TRIGGER_SLUG } from '../config/constants.js';

@Injectable()
export class AppService {
  // In-Memory regional GIS analytics stats storage cache allocation mapping
  private geoStatsCache: any = null;

  constructor(
    @InjectModel(Certificate.name) private certificateModel: Model<CertificateDocument>,
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
  ) {}

  /**
   * Aggregates and groups user activity history over the last 31 days directly in the database.
   */
  async getCalendarStats(clientTimezone: string): Promise<Record<string, number>> {
    try {
      const targetDays = 31;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - targetDays);

      const aggregation = await this.progressModel.aggregate([
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
      ]);

      return aggregation.reduce((acc: Record<string, number>, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching calendar stats:', error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /**
   * Retrieves exactly the 10 most recent tasks for the streaming feed.
   */
  async getTimelineTasks() {
    try {
      const tasksList = await this.progressModel.find({})
        .sort({ date: -1 })
        .limit(10)
        .select('task_name category date url')
        .lean();

      return { tasks: tasksList };
    } catch (error) {
      console.error('Error fetching timeline tasks:', error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /**
   * Retrieves the list of earned certificates sorted optimally by slug layout indices.
   */
  async getCertificates() {
    try {
      return await this.certificateModel.find({}).sort({ slug: 1 }).lean();
    } catch (error) {
      console.error('Error fetching certificates:', error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /**
   * Aggregates freeCodeCamp v9 progress statistics mapped by geographical regions.
   */
  async getGeoStats(): Promise<{ data: any; cacheHit: boolean }> {
    try {
      if (this.geoStatsCache) {
        return { data: this.geoStatsCache, cacheHit: true };
      }

      const certsList = await this.certificateModel.find({}).lean();
      const earnedCertSlugs = new Set(certsList.map((c) => c.slug));
      const hasGlobalFullStack = earnedCertSlugs.has(GLOBAL_TRIGGER_SLUG);

      const facetPipeline: Record<string, any[]> = {};
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
        ];
      }

      const [aggregationResult] = await this.progressModel.aggregate([
        { $facet: facetPipeline },
      ]);

      const stats: Record<string, any> = {};
      for (const [key, config] of Object.entries(GEO_MAPPING)) {
        const dbFacetRows = aggregationResult && aggregationResult[key];
        const completedTasksCount = dbFacetRows && dbFacetRows[0] ? dbFacetRows[0].count : 0;

        const hasRegionCertificate = earnedCertSlugs.has(config.certSlug);

        let percentage = 0;
        if (hasRegionCertificate) {
          percentage = 100;
        } else if (config.maxLessons > 0) {
          percentage = Math.min(
            100,
            Math.round((completedTasksCount / config.maxLessons) * 100),
          );
        }

        stats[key] = {
          id: config.id,
          name: config.name,
          completed: completedTasksCount,
          total: config.maxLessons,
          percentage: percentage,
          hasCertificate: hasRegionCertificate,
        };
      }

      this.geoStatsCache = {
        regions: stats,
        globalFullStack: hasGlobalFullStack,
      };

      return { data: this.geoStatsCache, cacheHit: false };
    } catch (error) {
      console.error('GIS aggregation error:', error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /**
   * Secure endpoint utilized by the parser execution lifecycle to invalidate local memory caches.
   */
  flushCache(tokenFromHeader: string | null, tokenFromBody: string | null): { success: boolean; message: string } {
    const secretToken = process.env.CACHE_SECRET_TOKEN;

    if (!secretToken) {
      throw new InternalServerErrorException('Cache secret token is not configured on server');
    }

    if (tokenFromHeader !== secretToken && tokenFromBody !== secretToken) {
      throw new UnauthorizedException('Unauthorized: Invalid cache flush security token signature');
    }

    this.geoStatsCache = null;
    console.log(' ♻️ In-Memory regional GIS stats cache successfully cleared via web-hook trigger.');

    return { success: true, message: 'Cache invalidated successfully' };
  }
}
