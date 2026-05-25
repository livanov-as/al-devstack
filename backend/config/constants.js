export const GEO_MAPPING = {
  // NORTH AMERICA: JavaScript v9
  north_america: {
    id: "north_america",
    name: "North America",
    matchRegex: /javascript/i,
    maxLessons: 1312,
    certSlugs: ["javascript-v9"],
  },

  // SOUTH AMERICA: HTML (302) + CSS (1234) + Libraries (541) = 2077 steps
  south_america: {
    id: "south_america",
    name: "South America",
    matchRegex:
      /responsive-web-design-v9|front-end-development-libraries-v9|css|html|styling|pseudo/i,
    maxLessons: 2077,
    certSlugs: [
      "responsive-web-design-v9",
      "front-end-development-libraries-v9",
    ],
  },

  // EURASIA: Python Fundamentals v9
  eurasia: {
    id: "eurasia",
    name: "Eurasia",
    matchRegex: /python/i,
    maxLessons: 526,
    certSlugs: ["python-v9"],
  },

  // AFRICA: SQL Databases (63) + Node.js Backend (100) = 163 lessons
  africa: {
    id: "africa",
    name: "Africa",
    matchRegex: /relational-databases-v9|back-end-development-and-apis-v9/i,
    maxLessons: 163,
    certSlugs: ["relational-databases-v9", "back-end-development-and-apis-v9"],
  },
};

export const GLOBAL_TRIGGER_SLUG = "certified-full-stack-developer-curriculum";
