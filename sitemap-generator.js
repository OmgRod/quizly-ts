// Generates sitemap.xml for Quizly
// Only includes: Home, Explore, Browse, Join (Enter PIN), Create, and Quiz detail pages

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'https://yourdomain.com'; // TODO: Set your production domain

// Static routes
const staticRoutes = [
  '/', // Home
  '/explore',
  '/browse',
  '/join',
  '/create',
];

// Fetch quiz slugs/IDs from API or DB
async function fetchQuizSlugs() {
  try {
    // Example: GET /api/quizzes/ids or similar endpoint
    const res = await axios.get(`${BASE_URL}/api/quizzes/ids`);
    return res.data.ids || [];
  } catch (e) {
    console.error('Failed to fetch quiz IDs:', e);
    return [];
  }
}

async function generateSitemap() {
  const quizSlugs = await fetchQuizSlugs();
  const quizRoutes = quizSlugs.map(slug => `/quiz/${slug}`);
  const allRoutes = [...staticRoutes, ...quizRoutes];

  const urls = allRoutes.map(route => `  <url>\n    <loc>${BASE_URL}${route}</loc>\n  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);
  console.log('Sitemap generated!');
}

generateSitemap();
