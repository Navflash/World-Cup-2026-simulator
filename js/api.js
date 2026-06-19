let LIVE_STANDINGS = {};
let TODAY_MATCHES = [];
let DATA_UPDATED_AT = null;

const ESPN_STANDINGS_URL = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026';
const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const CACHE_KEY_STANDINGS = 'wc26_standings';
const CACHE_KEY_FIXTURES = 'wc26_fixtures';

function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data, ts: Date.now(), date: new Date().toISOString().slice(0,10)
    }));
  } catch(e) {}
}

function shouldRefetch(cache, fixtures) {
  if (!cache) return true;
  // Different day → refetch
  if (cache.date !== new Date().toISOString().slice(0,10)) return true;
  // Check fixture statuses: if any match is live or scheduled, refetch
  const matches = fixtures || cache.data || [];
  const hasLive = matches.some(m => m.status === 'LIVE');
  const allDone = matches.length > 0 && matches.every(m => m.status === 'FT');
  // Live match → refetch (scores changing)
  if (hasLive) return true;
  // All matches done → cache is final, no refetch
  if (allDone) return false;
  // Matches still scheduled → refetch if cache is older than 30 min
  const age = Date.now() - (cache.ts || 0);
  return age > 30 * 60 * 1000;
}

async function loadLiveData() {
  const fixturesCache = getCached(CACHE_KEY_FIXTURES);
  const standingsCache = getCached(CACHE_KEY_STANDINGS);

  // Load from cache first (instant render)
  if (fixturesCache) { TODAY_MATCHES = fixturesCache.data; DATA_UPDATED_AT = new Date(fixturesCache.ts).toISOString(); }
  if (standingsCache) { LIVE_STANDINGS = standingsCache.data; if (!DATA_UPDATED_AT) DATA_UPDATED_AT = new Date(standingsCache.ts).toISOString(); }

  // Decide whether to refetch
  const needRefetch = shouldRefetch(fixturesCache, TODAY_MATCHES) || shouldRefetch(standingsCache);
  if (!needRefetch) return;

  await Promise.allSettled([fetchStandings(), fetchTodayFixtures()]);
}

function parseStandings(data) {
  const groups = data.children || [];
  const result = {};
  groups.forEach(g => {
    const letter = (g.name || '').replace('Group ', '').trim();
    if (!letter) return;
    const entries = (g.standings || {}).entries || [];
    result[letter] = entries.map(e => {
      const stats = {};
      (e.stats || []).forEach(s => { if ('value' in s) stats[s.name] = s.value; });
      return {
        t: e.team.displayName,
        logo: e.team.logos?.[0]?.href || '',
        rank: stats.rank || 99,
        p: stats.points || 0,
        w: stats.wins || 0,
        d: stats.ties || 0,
        l: stats.losses || 0,
        gf: stats.pointsFor || 0,
        ga: stats.pointsAgainst || 0,
        gp: stats.gamesPlayed || 0,
      };
    }).sort((a, b) => a.rank - b.rank);
  });
  return result;
}

function parseFixtures(data) {
  const events = data.events || [];
  return events.map(ev => {
    const comp = ev.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === 'home') || comp.competitors[0];
    const away = comp.competitors.find(c => c.homeAway === 'away') || comp.competitors[1];
    const status = comp.status || {};
    const type = status.type || {};
    const isLive = type.state === 'in';
    const isDone = type.state === 'post';
    const clock = status.displayClock;
    const hasScore = isDone || isLive;
    const utcDate = comp.date || ev.date;
    const ist = utcDate ? new Date(utcDate).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true
    }) + ' IST' : '';
    return {
      home: home.team.displayName,
      away: away.team.displayName,
      home_score: hasScore ? parseInt(home.score || 0) : null,
      away_score: hasScore ? parseInt(away.score || 0) : null,
      time: ist,
      venue: (comp.venue || {}).fullName || '',
      status: isLive ? 'LIVE' : isDone ? 'FT' : 'SCH',
      elapsed: clock && isLive ? clock : null,
      group: (comp.groups || {}).name || '',
    };
  });
}

async function fetchStandings() {
  try {
    const resp = await fetch(ESPN_STANDINGS_URL);
    if (!resp.ok) return;
    const data = await resp.json();
    const result = parseStandings(data);
    if (Object.keys(result).length) {
      LIVE_STANDINGS = result;
      DATA_UPDATED_AT = new Date().toISOString();
      setCache(CACHE_KEY_STANDINGS, result);
    }
  } catch(e) { console.warn('Standings fetch failed:', e); }
}

async function fetchTodayFixtures() {
  try {
    const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const resp = await fetch(`${ESPN_SCOREBOARD_URL}?dates=${today}`);
    if (!resp.ok) return;
    const data = await resp.json();
    TODAY_MATCHES = parseFixtures(data);
    setCache(CACHE_KEY_FIXTURES, TODAY_MATCHES);
    if (!DATA_UPDATED_AT) DATA_UPDATED_AT = new Date().toISOString();
  } catch(e) { console.warn('Fixtures fetch failed:', e); }
}
