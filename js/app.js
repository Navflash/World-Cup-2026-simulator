let groupOrders = {};
let selectedThirdPlace = new Set();
let matchResults = {};

Object.keys(GROUPS).forEach(g => { groupOrders[g] = [...GROUPS[g]]; });

// ── Tabs ──
function switchTab(tab) {
  const tabEl = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (tabEl.classList.contains('disabled')) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  tabEl.classList.add('active');
  document.getElementById(tab + '-section').classList.add('active');
  if (tab === 'third') renderThirdPlace();
  if (tab === 'live') renderLive();
}

// ── Bracket logic ──
function getTeamByPosition(group, pos) { return groupOrders[group][pos - 1]; }

function resolveThirdPlaceAssignments() {
  const qualGroups = [...selectedThirdPlace].sort().join('');
  const assignment = THIRD_PLACE_MAP[qualGroups];
  if (!assignment) { console.warn('No mapping for:', qualGroups); return null; }
  const matchIds = [74,77,79,80,81,82,85,87];
  const result = {};
  for (let i = 0; i < 8; i++) result[matchIds[i]] = assignment[i];
  return result;
}

function generateBracket() {
  matchResults = {};
  const thirdAssign = resolveThirdPlaceAssignments();
  if (!thirdAssign) { alert('Could not resolve third-place assignments.'); return; }
  document.querySelector('.tab[data-tab="bracket"]').classList.remove('disabled');

  const matches = {};
  R32_STRUCTURE.forEach(m => {
    const hPos = parseInt(m.home[0]), hGroup = m.home[1];
    const homeTeam = getTeamByPosition(hGroup, hPos);
    if (m.away === '3?') {
      const ag = thirdAssign[m.id];
      matches[m.id] = { home: homeTeam, away: getTeamByPosition(ag, 3), homeLabel: `1${hGroup}`, awayLabel: `3${ag}` };
    } else {
      const aPos = parseInt(m.away[0]), aGroup = m.away[1];
      matches[m.id] = { home: homeTeam, away: getTeamByPosition(aGroup, aPos), homeLabel: m.home, awayLabel: m.away };
    }
  });
  [R16_STRUCTURE, QF_STRUCTURE, SF_STRUCTURE, FINAL_STRUCTURE].forEach(round => {
    round.forEach(m => { matches[m.id] = { home: null, away: null, homeLabel: m.home, awayLabel: m.away }; });
  });
  window.allMatches = matches;
  renderBracket();
  switchTab('bracket');
}


function selectWinner(matchId, team) {
  if (matchResults[matchId] === team) { clearFromMatch(matchId); renderBracket(); return; }
  if (matchResults[matchId]) clearDownstream(matchId);
  matchResults[matchId] = team;
  propagateWinner(matchId, team);
  renderBracket();
}

function clearFromMatch(matchId) { delete matchResults[matchId]; clearDownstream(matchId); }

function clearDownstream(matchId) {
  const all = [...R16_STRUCTURE, ...QF_STRUCTURE, ...SF_STRUCTURE, ...FINAL_STRUCTURE];
  all.forEach(m => {
    if (m.home === `W${matchId}` || m.away === `W${matchId}`) {
      const match = window.allMatches[m.id];
      if (m.home === `W${matchId}`) match.home = null;
      if (m.away === `W${matchId}`) match.away = null;
      if (matchResults[m.id]) clearFromMatch(m.id);
    }
  });
}

function propagateWinner(matchId, team) {
  const all = [...R16_STRUCTURE, ...QF_STRUCTURE, ...SF_STRUCTURE, ...FINAL_STRUCTURE];
  all.forEach(m => {
    const match = window.allMatches[m.id];
    if (m.home === `W${matchId}`) { match.home = team; match.homeLabel = `W${matchId}`; }
    if (m.away === `W${matchId}`) { match.away = team; match.awayLabel = `W${matchId}`; }
  });
}

function resetBracket() {
  matchResults = {};
  [...R16_STRUCTURE, ...QF_STRUCTURE, ...SF_STRUCTURE, ...FINAL_STRUCTURE].forEach(m => {
    window.allMatches[m.id].home = null;
    window.allMatches[m.id].away = null;
  });
  renderBracket();
}

function simulateAll() {
  resetBracket();
  const allRounds = [R32_STRUCTURE, R16_STRUCTURE, QF_STRUCTURE, SF_STRUCTURE, FINAL_STRUCTURE];
  allRounds.forEach(round => {
    round.forEach(m => {
      const match = window.allMatches[m.id];
      if (match.home && match.away) {
        const winner = Math.random() < 0.5 ? match.home : match.away;
        matchResults[m.id] = winner;
        propagateWinner(m.id, winner);
      }
    });
  });
  renderBracket();
}

renderGroups();
