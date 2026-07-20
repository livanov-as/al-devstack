export const GEO_MAPPING = {
  // 1. EUROPE: Responsive Web Design (1552 lessons)
  europe: {
    id: "europe",
    name: "Europe",
    matchRegex: /responsive-web-design-v9|responsive-design|html|css|styling|units|selectors|computer-basics|design-for-developers/i,
    maxLessons: 1552,
    certSlugs: ["responsive-web-design-v9"],
  },
  // 2. ASIA: JavaScript Certification (1319 lessons)
  asia: {
    id: "asia",
    name: "Asia",
    // Matches the core v9 certificate slug and any atomic JavaScript curriculum modules
    matchRegex: /javascript-v9|javascript/i,
    maxLessons: 1319,
    certSlugs: ["javascript-v9"],
  },
  // 3. AFRICA: Front-End Development Libraries (526 lessons)
  africa: {
    id: "africa",
    name: "Africa",
    matchRegex: /front-end-development-libraries-v9/i,
    maxLessons: 526,
    certSlugs: ["front-end-development-libraries-v9"],
  },
  // 4. NORTH AMERICA: Python Certification (531 lessons)
  north_america: {
    id: "north_america",
    name: "North America",
    // Matches the core v9 certificate slug and any atomic Python curriculum modules
    matchRegex: /python-v9|python/i,
    maxLessons: 531,
    certSlugs: ["python-v9"],
  },
  // 5. SOUTH AMERICA: Relational Databases (63 lessons)
  south_america: {
    id: "south_america",
    name: "South America",
    // Matches the core relational database slug variants found in the database
    matchRegex: /relational-databases-v9|relational-database/i,
    maxLessons: 63,
    certSlugs: ["relational-databases-v9"],
  },
  // 6. AUSTRALIA & OCEANIA: Back-End Development and APIs (Placeholder: 100 lessons)
  australia_oceania: {
    id: "australia_oceania",
    name: "Australia & Oceania",
    matchRegex: /back-end-development-and-apis-v9/i,
    maxLessons: 100,
    certSlugs: ["back-end-development-and-apis-v9"],
  },
};

export const GLOBAL_TRIGGER_SLUG = "certified-full-stack-developer-curriculum";
