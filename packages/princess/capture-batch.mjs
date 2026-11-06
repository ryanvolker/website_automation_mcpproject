// Runs capture-template.mjs for every Phase 3 template sample, one at a time with a pause between pages.
// The first sample of each template gets a full capture (desktop + mobile, opened menus/accordions);
// the others get a light capture (desktop structure + screenshot) to confirm they share the template.
// Usage: node capture-batch.mjs [--only deck-plan,home]   → data/sites/princess.com/captures/<template>[-<n>]/
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const B = 'https://www.princess.com';
const D = `${B}/cruise-destinations`;
const MENUS = 'Destinations,Explore Ships,Discover Princess,Deals,Search,Manage booking';
// [template, [urls], extra args for the first (full) capture]
const T = [
  ['deck-plan', [`${B}/deckPlans.do?shipCode=SA`, `${B}/deckPlans.do?shipCode=GP`, `${B}/deckPlans.do?shipCode=SU`], ['--expanders', '3']],
  ['home', [`${B}/`], ['--open', MENUS]],
  ['destinations-hub', [D], ['--expanders', '3']],
  ['destination-region', [`${D}/alaska-cruises`, `${D}/caribbean-cruises`, `${D}/european-cruises`], ['--expanders', '3']],
  ['destination-subregion', [`${D}/caribbean-cruises/eastern-caribbean`, `${D}/alaska-cruises/cruisetour-options`, `${D}/alaska-cruises/glaciers`], ['--expanders', '3']],
  ['port-guide', [`${D}/alaska-cruises/cruise-to-juneau`, `${D}/caribbean-cruises/cruises-to-freeport`, `${D}/asia-cruises/cruises-to-thailand`], ['--expanders', '3']],
  ['departure-port', [`${D}/departure-ports/cruises-from-southampton`, `${D}/departure-ports`, `${D}/departure-ports/cruises-from-fort-lauderdale`], ['--expanders', '3']],
  ['travel-tips', [`${D}/alaska-cruises/alaska-cruise-tips`, `${D}/alaska-cruises/alaska-cruise-tips/learn-about-alaska/inside-passage-alaska-cruise`, `${D}/caribbean-cruises/caribbean-cruise-tips/learn-about-the-caribbean/caribbean-cruise-weather-by-month`], ['--expanders', '2']],
  ['land-tour', [`${D}/alaska-cruises/cruisetour-options/denali-princess-wilderness-lodge`, `${D}/alaska-cruises/cruisetour-options/alaska-train-travel`], ['--expanders', '2']],
  ['fleet-list', [`${B}/ships-and-experience/ships`], ['--expanders', '2']],
  ['ship-detail', [`${B}/ships-and-experience/ships/su-sun-princess`, `${B}/ships-and-experience/ships/gp-regal-princess`, `${B}/ships-and-experience/ships/co-coral-princess`], ['--expanders', '3']],
  ['stateroom-type', [`${B}/staterooms`, `${B}/staterooms/suites`, `${B}/staterooms/mini-suites`], ['--expanders', '3']],
  ['onboard-topic', [`${B}/ships-and-experience/onboard-experience`, `${B}/ships-and-experience/onboard-experience/entertainment`, `${B}/ships-and-experience/onboard-experience/activities/casino`], ['--expanders', '2']],
  ['dining', [`${B}/cruise-dining`, `${B}/cruise-dining/kai-sushi`, `${B}/cruise-dining/specialty-restaurants/sabatinis-italian-trattoria`], ['--expanders', '3']],
  ['deals-landing', [`${B}/cruise-deals-promotions`], ['--expanders', '2']],
  ['deal-detail', [`${B}/cruise-deals-promotions/early-booking-bonus`, `${B}/cruise-deals-promotions/last-minute-cruise-deals`, `${B}/cruise-deals-promotions/plus-premier-cruise-packages`], ['--expanders', '3']],
  ['excursion-port', [`${B}/shore-excursions/barcelona-spain`, `${B}/shore-excursions/gibraltar`, `${B}/shore-excursions/aarhus-denmark`, `${B}/ports-excursions/`], ['--expanders', '2']],
  ['excursion-detail', [`${B}/shore-excursions/gibraltar/panoramic-gibraltar-gin-tasting`, `${B}/shore-excursions/new-york-city-manhattan-or-brooklyn-new-york/downtown-manhattan-walk-the-911-memorial`], ['--expanders', '3']],
  ['blog', [`${B}/blog`, `${B}/blog/best-time-to-see-northern-lights-on-an-alaska-cruise`, `${B}/blog/video/onboard-experience/activities-family-cruising`], []],
  ['news', [`${B}/news`, `${B}/news/news-releases/2026/10/princess-cruises-unveils-expansive-2028-2029-americas-season-with-return-to-the-amazon`, `${B}/news/backgrounders-and-fact-sheets/alaska-fun-facts`], []],
  ['faq', [`${B}/faq`, `${B}/faq/pre-cruise`, `${B}/faq/additional-faq`], ['--expanders', '5']],
  ['plan-policy', [`${B}/plan/ezair`, `${B}/plan/best-price-guarantee`, `${B}/why-princess/new-to-cruising`], ['--expanders', '3']],
  ['legal', [`${B}/legal`, `${B}/legal/passage-contract`, `${B}/legal/passage_contract`, `${B}/cruise-deals-promotions/plus-premier-cruise-packages/terms-and-conditions`], ['--expanders', '2']],
  ['info-page', [`${B}/company-information/about-princess`, `${B}/careers`, `${B}/find-travel-agents/`], ['--expanders', '2']],
  ['site-search', [`${B}/search`], []],
  ['account-login', [`${B}/my-princess/account-login/`], []],
];
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const started = Date.now();
for (const [name, urls, extra] of T) {
  if (only && !only.includes(name)) continue;
  urls.forEach((url, i) => {
    const out = i === 0 ? name : `${name}-${i + 1}`;
    const args = ['capture-template.mjs', out, url, ...(i === 0 ? extra : ['--light'])];
    const t0 = Date.now();
    const r = spawnSync(process.execPath, args, { cwd: here, encoding: 'utf8', timeout: 300000 });
    let status = '?';
    try { const s = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))); status = Object.entries(s.views).map(([v, x]) => `${v} ${x.status} ${x.readyMs}ms`).join(', '); } catch { status = `failed: ${(r.stderr || r.error?.message || '').slice(0, 160)}`; }
    console.log(`${out.padEnd(26)} ${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s  ${status}  ${url.replace(B, '')}`);
    sleep(4000);
  });
}
console.log(`Done in ${((Date.now() - started) / 60000).toFixed(1)} min.`);
