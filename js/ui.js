// ── Live tab ──
async function renderLive() {
  await loadLiveData();

  // Set today's date
  document.getElementById('live-date').textContent = '— ' + new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Updated timestamp
  const header = document.querySelector('.live-header');
  const existing = header.querySelector('.updated-at');
  if (existing) existing.remove();
  if (DATA_UPDATED_AT) {
    const ts = document.createElement('span');
    ts.className = 'updated-at';
    ts.style.cssText = 'margin-left:auto;font-size:11px;color:var(--text-dim)';
    const d = new Date(DATA_UPDATED_AT);
    ts.textContent = 'Updated: ' + d.toLocaleString();
    header.appendChild(ts);
  }

  // Today's matches
  const todayEl = document.getElementById('today-matches');
  todayEl.innerHTML = '';
  if (!TODAY_MATCHES.length) {
    todayEl.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center">No matches scheduled today</div>';
  }
  TODAY_MATCHES.forEach(m => {
    const card = document.createElement('div');
    card.className = 'today-card';
    const isLive = m.status === 'LIVE';
    const isFT = m.status === 'FT';
    let statusBadge = '';
    if (isLive) statusBadge = `<span style="color:var(--red);font-weight:600">${m.elapsed || 'LIVE'}</span>`;
    else if (isFT) statusBadge = `<span style="color:var(--green);font-weight:600">FT</span>`;

    const hasScore = m.home_score !== null && m.away_score !== null;
    const scoreOrVs = hasScore
      ? `<span style="font-size:18px;font-weight:700;color:var(--text-bright);padding:0 8px">${m.home_score} - ${m.away_score}</span>`
      : `<span class="vs">vs</span>`;

    card.innerHTML = `
      <div class="match-time">${esc(m.time)}${m.group ? ' &mdash; Group ' + esc(m.group) : ''} ${statusBadge}</div>
      <div class="match-teams">
        <span>${getFlag(m.home)}</span> <strong>${esc(m.home)}</strong>
        ${scoreOrVs}
        <strong>${esc(m.away)}</strong> <span>${getFlag(m.away)}</span>
      </div>
      <div class="venue">${esc(m.venue || '')}</div>
    `;
    todayEl.appendChild(card);
  });

  // Standings
  const grid = document.getElementById('standings-grid');
  grid.innerHTML = '';
  Object.keys(LIVE_STANDINGS).sort().forEach(g => {
    const card = document.createElement('div');
    card.className = 'standings-card';
    card.innerHTML = `<h3>Group ${g}</h3>`;
    const table = document.createElement('table');
    table.className = 'standings-table';
    table.innerHTML = `<tr><th></th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>`;
    LIVE_STANDINGS[g].forEach((team, idx) => {
      const gd = team.gf - team.ga;
      const played = team.gp || (team.w + team.d + team.l);
      const cls = idx < 2 ? 'qual' : idx === 3 ? 'elim' : '';
      const row = document.createElement('tr');
      row.className = cls;
      row.innerHTML = `
        <td class="pos-cell">${idx+1}</td>
        <td>${getFlag(team.t)} ${esc(team.t)}</td>
        <td>${played}</td><td>${team.w}</td><td>${team.d}</td><td>${team.l}</td>
        <td>${team.gf}</td><td>${team.ga}</td>
        <td>${gd > 0 ? '+' : ''}${gd}</td>
        <td><strong>${team.p}</strong></td>
      `;
      table.appendChild(row);
    });
    card.appendChild(table);
    grid.appendChild(card);
  });
}

// ── Groups tab ──
function renderGroups() {
  const grid = document.getElementById('groups-grid');
  grid.innerHTML = '';
  Object.keys(GROUPS).forEach(g => {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.innerHTML = `<h3><span>${g}</span> Group ${g}</h3>`;
    const list = document.createElement('div');
    list.dataset.group = g;
    groupOrders[g].forEach((team, idx) => {
      const row = document.createElement('div');
      row.className = 'team-row';
      row.draggable = true;
      row.dataset.team = team;
      row.dataset.group = g;
      const total = groupOrders[g].length;
      row.innerHTML = `
        <span class="drag-handle">&#x2630;</span>
        <span class="pos-badge pos-${idx+1}">${idx+1}</span>
        <span class="team-flag">${getFlag(team)}</span>
        <span class="team-name">${esc(team)}</span>
        <div class="move-btns">
          <button class="move-btn" ${idx===0?'disabled':''} onclick="moveTeam('${g}','${team}',-1)">&#x25B2;</button>
          <button class="move-btn" ${idx===total-1?'disabled':''} onclick="moveTeam('${g}','${team}',1)">&#x25BC;</button>
        </div>
      `;
      setupDragHandlers(row, list, g);
      list.appendChild(row);
    });
    card.appendChild(list);
    grid.appendChild(card);
  });
}

let dragSrcEl = null;
function setupDragHandlers(row, list, group) {
  row.addEventListener('dragstart', function(e) {
    dragSrcEl = this; this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.team);
  });
  row.addEventListener('dragover', function(e) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.classList.add('drag-over');
  });
  row.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
  row.addEventListener('drop', function(e) {
    e.preventDefault(); this.classList.remove('drag-over');
    if (dragSrcEl !== this && dragSrcEl.dataset.group === this.dataset.group) {
      const parent = this.parentNode;
      const rows = [...parent.querySelectorAll('.team-row')];
      const fromIdx = rows.indexOf(dragSrcEl);
      const toIdx = rows.indexOf(this);
      if (fromIdx < toIdx) parent.insertBefore(dragSrcEl, this.nextSibling);
      else parent.insertBefore(dragSrcEl, this);
      updateGroupOrder(group, parent);
    }
  });
  row.addEventListener('dragend', function() {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
}

function updateGroupOrder(group, container) {
  const rows = container.querySelectorAll('.team-row');
  groupOrders[group] = [];
  rows.forEach((row, idx) => {
    groupOrders[group].push(row.dataset.team);
    const badge = row.querySelector('.pos-badge');
    badge.className = `pos-badge pos-${idx+1}`;
    badge.textContent = idx+1;
  });
}

function moveTeam(group, team, direction) {
  const order = groupOrders[group];
  const idx = order.indexOf(team);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  renderGroups();
}

// ── Third place ──
function renderThirdPlace() {
  const grid = document.getElementById('third-place-grid');
  grid.innerHTML = '';

  // Build third-place team info with stats from live standings
  const thirdTeams = Object.keys(GROUPS).map(g => {
    const team = groupOrders[g][2];
    const live = (LIVE_STANDINGS[g] || []).find(t => t.t === team);
    const pts = live ? live.p : 0;
    const gd = live ? live.gf - live.ga : 0;
    const gf = live ? live.gf : 0;
    return { g, team, pts, gd, gf };
  });

  // Sort by FIFA criteria to suggest best 8
  const sorted = [...thirdTeams].sort((a,b) =>
    (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf)
  );

  thirdTeams.forEach(({g, team, pts, gd, gf}) => {
    const rank = sorted.indexOf(sorted.find(s => s.g === g)) + 1;
    const item = document.createElement('div');
    item.className = 'third-place-item' + (selectedThirdPlace.has(g) ? ' selected' : '');
    const gdStr = gd > 0 ? '+' + gd : gd;
    const rankColor = rank <= 8 ? 'var(--green)' : 'var(--red)';
    const rankBg = rank <= 8 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
    item.innerHTML = `
      <div class="tp-check">${selectedThirdPlace.has(g) ? '&#x2713;' : ''}</div>
      <span style="font-size:28px">${getFlag(team)}</span>
      <strong style="font-size:13px">${esc(team)}</strong>
      <span style="color:var(--text-dim);font-size:11px">Group ${g}</span>
      <div style="display:flex;gap:6px;font-size:11px;color:var(--text-dim)">
        <span style="font-weight:700;color:var(--text)">${pts}pts</span>
        <span>${gdStr} GD</span>
        <span>${gf} GF</span>
      </div>
      <span style="background:${rankBg};color:${rankColor};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">#${rank}</span>
    `;
    item.addEventListener('click', () => {
      if (selectedThirdPlace.has(g)) selectedThirdPlace.delete(g);
      else if (selectedThirdPlace.size < 8) selectedThirdPlace.add(g);
      renderThirdPlace();
    });
    grid.appendChild(item);
  });
  const count = selectedThirdPlace.size;
  const el = document.getElementById('tp-count');
  el.textContent = `${count} of 8 selected`;
  el.className = 'tp-count' + (count === 8 ? ' complete' : count > 8 ? ' over' : '');
  document.getElementById('generate-btn').disabled = count !== 8;
}

function buildMatchCard(mId, isFinal) {
  const match = window.allMatches[mId];
  const winner = matchResults[mId];
  const card = document.createElement('div');
  card.className = 'match-card' + (isFinal ? ' final-card' : '');
  card.innerHTML = `<div class="match-label">${isFinal ? '&#x1F3C6; Final' : 'Match ' + mId}</div>`;
  ['home','away'].forEach(side => {
    const team = match[side];
    const div = document.createElement('div');
    const label = match[side + 'Label'] || '';
    if (team) {
      const isW = winner === team, isL = winner && winner !== team;
      div.className = 'match-team' + (isW ? ' winner' : '') + (isL ? ' loser' : '');
      div.innerHTML = `<span class="mt-flag">${getFlag(team)}</span><span class="mt-name">${esc(team)}</span><span class="mt-seed">${esc(label)}</span>`;
      div.addEventListener('click', () => selectWinner(mId, team));
    } else {
      div.className = 'match-team empty';
      div.innerHTML = `<span class="mt-name">${label || 'TBD'}</span>`;
    }
    card.appendChild(div);
  });
  return card;
}

function buildRound(title, matchIds, isFinal) {
  const col = document.createElement('div');
  col.className = 'round';
  col.innerHTML = `<div class="round-title">${title}</div>`;
  matchIds.forEach(id => col.appendChild(buildMatchCard(id, isFinal)));
  return col;
}

function renderBracket() {
  const wrapper = document.getElementById('bracket');
  wrapper.innerHTML = '';

  // Left half: R32 → R16 → QF (flows left to right)
  const leftHalf = document.createElement('div');
  leftHalf.className = 'bracket-half';
  leftHalf.appendChild(buildRound('Round of 32', LEFT_R32, false));
  leftHalf.appendChild(buildRound('Round of 16', LEFT_R16, false));
  leftHalf.appendChild(buildRound('Quarter-Finals', LEFT_QF, false));

  // Center: SF + Final
  const center = document.createElement('div');
  center.className = 'bracket-center';
  center.appendChild(buildRound('Semi-Finals', [101], false));
  center.appendChild(buildRound('Final', [103], true));
  center.appendChild(buildRound('Semi-Finals', [102], false));

  // Right half: QF → R16 → R32 (flows right to left, mirrored)
  const rightHalf = document.createElement('div');
  rightHalf.className = 'bracket-half';
  rightHalf.appendChild(buildRound('Quarter-Finals', RIGHT_QF, false));
  rightHalf.appendChild(buildRound('Round of 16', RIGHT_R16, false));
  rightHalf.appendChild(buildRound('Round of 32', RIGHT_R32, false));

  wrapper.appendChild(leftHalf);
  wrapper.appendChild(center);
  wrapper.appendChild(rightHalf);

  const finalMatch = matchResults[103];
  const wd = document.getElementById('winner-display');
  if (finalMatch) {
    document.getElementById('champ-name').textContent = finalMatch;
    wd.classList.add('show');
  } else {
    wd.classList.remove('show');
  }
}

