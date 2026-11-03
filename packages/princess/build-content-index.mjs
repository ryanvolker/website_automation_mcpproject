// Builds an index of princess.com blog posts, videos and news releases from
// the sitemap (no crawling). Titles are derived from the URL slug.
//
// Usage: node build-content-index.mjs
// Writes: data/sites/princess.com/content-index.json

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const sitemap = JSON.parse(await fs.readFile(path.join(siteDir, 'sitemap.json'), 'utf8'));

const SMALL = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with']);
const titleFromSlug = (slug) =>
  slug
    .replace(/\d+$/, '')
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');

// Rough topic tags so articles can be matched to destinations, ships and themes
const TOPICS = {
  alaska: /alaska|juneau|ketchikan|skagway|glacier|denali|sitka|anchorage|whittier/,
  caribbean: /caribbean|bahamas|aruba|st-thomas|st-maarten|cozumel|princess-cays|grand-turk|barbados|antigua|curacao|jamaica|roatan|belize|half-moon-cay/,
  europe: /europe|mediterranean|italy|rome|venice|greece|greek|santorini|mykonos|athens|barcelona|spain|france|portugal|lisbon|croatia|dubrovnik|norway|fjord|iceland|scandinavia|baltic|british-isles|ireland|scotland|england|london|southampton|copenhagen|stockholm|helsinki|amsterdam|hamburg/,
  asia: /asia|japan|tokyo|kyoto|osaka|kagoshima|singapore|thailand|bangkok|vietnam|hong-kong|taiwan|korea|china/,
  australia: /australia|new-zealand|sydney|melbourne|brisbane|perth|hobart|christchurch|auckland|tasmania/,
  mexico: /mexico|cabo|mazatlan|puerto-vallarta|ensenada/,
  hawaii: /hawaii|maui|honolulu|kauai|hilo|kona/,
  'panama-canal': /panama/,
  'south-america': /south-america|antarctica|amazon|chile|argentina|brazil|buenos-aires|peru/,
  'canada-new-england': /canada|new-england|quebec|halifax|boston|bar-harbor|montreal/,
  'california-pacific': /california|los-angeles|san-francisco|san-diego|seattle|vancouver|monterey|pacific-coast/,
  'south-pacific': /tahiti|south-pacific|fiji|bora-bora|polynesia/,
  'world-cruise': /world-cruise/,
  ships: /princess-ship|sun-princess|star-princess|royal-princess|sky-princess|enchanted|discovery-princess|majestic|regal|ruby|grand-princess|diamond-princess|sapphire|emerald|crown-princess|coral-princess|island-princess|caribbean-princess|ship-/,
  dining: /dining|food|restaurant|chef|wine|cocktail|drink|eat|cuisine|recipe|menu|pizza|steak|sushi/,
  family: /family|kids|teen|children|multigenerational/,
  celebrations: /wedding|honeymoon|anniversary|birthday|celebrat|romance|holiday|christmas|thanksgiving|new-year/,
  'first-time': /first-time|new-to-cruising|first-cruise|tips|what-to-pack|packing|faq|guide|how-to/,
  staterooms: /stateroom|suite|balcony|cabin|sanctuary/,
  medallion: /medallion/,
  casino: /casino/,
  wellness: /spa|wellness|fitness|lotus/,
  excursions: /excursion|things-to-do|activities|tour|snorkel|hike|whale/,
};
const topicsOf = (s) => Object.entries(TOPICS).filter(([, re]) => re.test(s)).map(([t]) => t);

const items = [];
for (const p of sitemap.pages) {
  if (!['blog', 'news'].includes(p.section)) continue;
  const parts = p.path.split('/').filter(Boolean);
  if (parts.length < 2) continue; // section landing pages
  const slug = parts[parts.length - 1];
  let type = p.section === 'blog' ? 'blog' : 'news';
  let category = null;
  let published = null;
  if (p.section === 'blog' && parts[1] === 'video') {
    type = 'video';
    category = parts[2] || null;
  } else if (p.section === 'news') {
    category = parts[1];
    if (parts[1] === 'news-releases' && /^\d{4}$/.test(parts[2])) published = `${parts[2]}-${parts[3] || '01'}`;
  }
  items.push({ type, category, title: titleFromSlug(slug), url: p.url, published, lastmod: p.lastmod?.slice(0, 10) ?? null, topics: topicsOf(p.path) });
}
items.sort((a, b) => (b.published || b.lastmod || '').localeCompare(a.published || a.lastmod || ''));

const counts = items.reduce((m, i) => ((m[i.type] = (m[i.type] || 0) + 1), m), {});
const topicCounts = {};
items.forEach((i) => i.topics.forEach((t) => (topicCounts[t] = (topicCounts[t] || 0) + 1)));
const deckPlans = sitemap.pages
  .filter((p) => p.section === 'deckPlans.do')
  .map((p) => ({ shipCode: new URL(p.url).searchParams.get('shipCode'), url: p.url }))
  .filter((d) => d.shipCode);

await fs.writeFile(
  path.join(siteDir, 'content-index.json'),
  JSON.stringify({ site: 'princess.com', builtFrom: sitemap.fetchedAt, counts, topicCounts, deckPlans, items }, null, 1) + '\n',
);
console.log(`Indexed ${items.length} items`, counts);
console.log('Topics:', topicCounts);
console.log(`Deck plans: ${deckPlans.length}`);
