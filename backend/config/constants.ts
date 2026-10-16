// Define explicit interface structure for GIS geographical region mapping configurations
export interface GeoRegionConfig {
  id: string
  name: string
  sectionSlug: string
  maxLessons: number
  certSlug: string
}

// Strictly typed geographic registry mapped by key sections of freeCodeCamp v9
export const GEO_MAPPING: Record<string, GeoRegionConfig> = {
  europe: {
    id: 'europe',
    name: 'Europe',
    sectionSlug: 'responsive-web-design-v9',
    maxLessons: 1552,
    certSlug: 'responsive-web-design-v9',
  },
  asia: {
    id: 'asia',
    name: 'Asia',
    sectionSlug: 'javascript-v9',
    maxLessons: 1341,
    certSlug: 'javascript-v9',
  },
  africa: {
    id: 'africa',
    name: 'Africa',
    sectionSlug: 'front-end-development-libraries-v9',
    maxLessons: 524,
    certSlug: 'front-end-development-libraries-v9',
  },
  north_america: {
    id: 'north_america',
    name: 'North America',
    sectionSlug: 'python-v9',
    maxLessons: 578,
    certSlug: 'python-v9',
  },
  south_america: {
    id: 'south_america',
    name: 'South America',
    sectionSlug: 'relational-databases-v9',
    maxLessons: 64,
    certSlug: 'relational-databases-v9',
  },
  australia_oceania: {
    id: 'australia_oceania',
    name: 'Australia & Oceania',
    sectionSlug: 'back-end-development-and-apis-v9',
    maxLessons: 111,
    certSlug: 'back-end-development-and-apis-v9',
  },
}

export const GLOBAL_TRIGGER_SLUG: string = 'certified-full-stack-developer-curriculum'
