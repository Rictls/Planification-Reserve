// ============================================================
// PLANNING RÉSERVE — Logique application
// ============================================================

const STORE_KEY = "planningReserve_v1";
const THEME_KEY = "planningReserve_theme";

const MOIS_FR = ["JANVIER","FÉVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOÛT","SEPTEMBRE","OCTOBRE","NOVEMBRE","DÉCEMBRE"];
const JOURS_FR = ["L","M","M","J","V","S","D"];

let state = null;
let currentMonthIndex = new Date().getMonth();
let pendingCell = null; // {mission, dateISO}

// ---------- Theme (light = high readability outdoors, dark = default) ----------
function loadTheme(){
  try{ return localStorage.getItem(THEME_KEY) || "dark"; }
  catch(e){ return "dark"; }
}
function applyTheme(theme){
  const root = document.documentElement;
  if(theme === "light"){
    root.setAttribute("data-theme","light");
  }else{
    root.removeAttribute("data-theme");
  }
  const btn = document.getElementById("themeToggleBtn");
  if(btn) btn.textContent = theme === "light" ? "☾" : "☀";
  const meta = document.getElementById("metaThemeColor");
  if(meta) meta.setAttribute("content", theme === "light" ? "#F7F5F0" : "#0E1B2E");
}
function setupThemeToggle(){
  let theme = loadTheme();
  applyTheme(theme);
  document.getElementById("themeToggleBtn").addEventListener("click", ()=>{
    theme = theme === "light" ? "dark" : "light";
    try{ localStorage.setItem(THEME_KEY, theme); }catch(e){}
    applyTheme(theme);
    showToast(theme === "light" ? "Mode jour (extérieur)" : "Mode nuit");
  });
}

// ---------- Persistence ----------
function defaultState(){
  return {
    year: 2026,
    tarifJournalier: TARIF_JOURNALIER_DEFAULT,
    missions: MISSIONS_DEFAULT.filter(m => m !== "Vacances scolaires"),
    feries: [...FERIES_2026],
    recup: [...RECUP_DEFAULT],
    vacancesZone: VACANCES_ZONE_DEFAULT,
    // person-edited holiday periods, overriding official/estimated data.
    // key format: "ZONE|2027-2028" -> [{debut,fin}, ...]
    vacancesOverrides: {},
    // entries: { "MissionName|YYYY-MM-DD": "C" }
    entries: stripVacancesScolairesEntries({ ...ENTRIES_MIGRATED_2026 })
  };
}

// The "Vacances scolaires" mission used to be a regular, clickable mission row
// with its own saved entries. It's now a read-only info band computed live
// from the official calendar, so any leftover saved entries for it are no
// longer relevant and are dropped here to avoid confusion.
function stripVacancesScolairesEntries(entries){
  Object.keys(entries).forEach(key=>{
    if(key.startsWith("Vacances scolaires|")) delete entries[key];
  });
  return entries;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      // merge with defaults for any missing keys (forward-compat)
      const merged = Object.assign(defaultState(), parsed);
      merged.missions = merged.missions.filter(m => m !== "Vacances scolaires");
      merged.entries = stripVacancesScolairesEntries(merged.entries || {});
      if(!merged.vacancesZone) merged.vacancesZone = VACANCES_ZONE_DEFAULT;
      if(!merged.vacancesOverrides) merged.vacancesOverrides = {};
      return merged;
    }
  }catch(e){ console.warn("Lecture stockage impossible", e); }
  return defaultState();
}

function saveState(){
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }catch(e){
    console.error("Sauvegarde impossible", e);
    showToast("Erreur de sauvegarde locale");
  }
}

// Returns the set of ISO dates covered by school holidays (official, estimated,
// or person-corrected) for the currently selected zone, in the visible year —
// computed live, never stored.
function getVacancesScolairesSet(year){
  if(typeof getVacancesScolairesForYear !== "function") return new Set();
  const zone = state.vacancesZone || VACANCES_ZONE_DEFAULT;
  return new Set(getVacancesScolairesForYear(year, zone, state.vacancesOverrides));
}

// ---------- Helpers dates ----------
function pad2(n){ return n<10 ? "0"+n : ""+n; }
function isoDate(y,m,d){ return `${y}-${pad2(m+1)}-${pad2(d)}`; }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function jsWeekday(y,m,d){ // 0=lundi..6=dimanche
  const w = new Date(y,m,d).getDay(); // 0=dim..6=sam
  return (w+6)%7;
}
function entryKey(mission, dateISO){ return mission + "|" + dateISO; }

function statutByCode(code){
  return STATUTS.find(s=>s.code===code);
}

// ---------- Toast ----------
let toastTimer=null;
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
}

// ============================================================
// RENDER: TABS / VIEWS
// ============================================================
function setupTabs(){
  document.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("view-"+tab.dataset.view).classList.add("active");
      if(tab.dataset.view === "synthesis") renderSynthesis();
      if(tab.dataset.view === "settings") renderSettings();
    });
  });
}

// ============================================================
// RENDER: CALENDAR
// ============================================================
function renderCalendarHeader(){
  document.getElementById("yearLabel").textContent = state.year;
  document.getElementById("monthLabel").textContent = MOIS_FR[currentMonthIndex];
  const archiveLabel = document.getElementById("archiveYearLabel");
  const archiveBtnLabel = document.getElementById("archiveYearBtnLabel");
  if(archiveLabel) archiveLabel.textContent = state.year;
  if(archiveBtnLabel) archiveBtnLabel.textContent = state.year;
}

function renderCalendarTable(){
  const y = state.year, m = currentMonthIndex;
  const nbDays = daysInMonth(y,m);
  const table = document.getElementById("calTable");
  table.innerHTML = "";

  // thead: weekday letters
  const theadWeekday = document.createElement("thead");
  const rowWeekday = document.createElement("tr");
  rowWeekday.className = "daynum-row";
  const thCorner1 = document.createElement("th");
  thCorner1.className = "mission-name";
  thCorner1.textContent = "";
  rowWeekday.appendChild(thCorner1);
  for(let d=1; d<=nbDays; d++){
    const wd = jsWeekday(y,m,d);
    const iso = isoDate(y,m,d);
    const th = document.createElement("th");
    th.textContent = JOURS_FR[wd];
    if(wd>=5) th.classList.add("weekend");
    if(state.feries.includes(iso)) th.classList.add("ferie");
    rowWeekday.appendChild(th);
  }
  theadWeekday.appendChild(rowWeekday);

  // thead: day numbers
  const rowNum = document.createElement("tr");
  const thCorner2 = document.createElement("th");
  thCorner2.className = "mission-name";
  thCorner2.textContent = MOIS_FR[m].slice(0,3);
  rowNum.appendChild(thCorner2);
  for(let d=1; d<=nbDays; d++){
    const wd = jsWeekday(y,m,d);
    const iso = isoDate(y,m,d);
    const th = document.createElement("th");
    th.textContent = d;
    if(wd>=5) th.classList.add("weekend");
    if(state.feries.includes(iso)) th.classList.add("ferie");
    rowNum.appendChild(th);
  }
  theadWeekday.appendChild(rowNum);
  table.appendChild(theadWeekday);

  // info band: school holidays (read-only), right above the mission rows
  const vacancesSet = getVacancesScolairesSet(y);
  const tbodyVac = document.createElement("tbody");
  const rowVac = document.createElement("tr");
  rowVac.className = "vacances-row";
  const tdVacLabel = document.createElement("td");
  tdVacLabel.className = "mission-name vacances-label";
  const zoneActuelle = state.vacancesZone || VACANCES_ZONE_DEFAULT;
  tdVacLabel.textContent = `Vac. scol. (${zoneActuelle})`;
  tdVacLabel.title = `Zone ${zoneActuelle}`;
  rowVac.appendChild(tdVacLabel);
  for(let d=1; d<=nbDays; d++){
    const iso = isoDate(y,m,d);
    const wd = jsWeekday(y,m,d);
    const td = document.createElement("td");
    td.className = "day-cell vacances-cell";
    if(wd>=5) td.classList.add("weekend");
    if(state.feries.includes(iso)) td.classList.add("ferie");
    if(vacancesSet.has(iso)) td.classList.add("vacances-on");
    rowVac.appendChild(td);
  }
  tbodyVac.appendChild(rowVac);
  table.appendChild(tbodyVac);

  // tbody: one row per mission
  const tbody = document.createElement("tbody");
  state.missions.forEach(mission=>{
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.className = "mission-name";
    tdName.textContent = mission;
    tdName.title = mission;
    tr.appendChild(tdName);

    for(let d=1; d<=nbDays; d++){
      const iso = isoDate(y,m,d);
      const wd = jsWeekday(y,m,d);
      const td = document.createElement("td");
      td.className = "day-cell";
      if(wd>=5) td.classList.add("weekend");
      if(state.feries.includes(iso)) td.classList.add("ferie");

      const code = state.entries[entryKey(mission, iso)];
      if(code){
        const pill = document.createElement("div");
        pill.className = "pill";
        pill.style.background = `var(--c-${code}, #444)`;
        pill.textContent = code;
        td.appendChild(pill);
      }
      td.addEventListener("click", ()=> openStatusSheet(mission, iso));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderLegend(){
  const row = document.getElementById("legendRow");
  row.innerHTML = "";
  STATUTS.filter(s=>s.code !== "X").forEach(s=>{
    const chip = document.createElement("div");
    chip.className = "legend-chip";
    chip.innerHTML = `<span class="dot" style="background:var(--c-${s.code})"></span>${s.code} — ${s.label}`;
    row.appendChild(chip);
  });
  const chipFerie = document.createElement("div");
  chipFerie.className = "legend-chip";
  chipFerie.innerHTML = `<span class="dot" style="background:#3a1f4d"></span>Jour férié`;
  row.appendChild(chipFerie);
}

function renderCalendar(){
  renderCalendarHeader();
  renderCalendarTable();
  renderLegend();
}

// ---------- Status picker sheet ----------
function isoAddDays(iso, n){
  const d = new Date(iso+"T00:00:00");
  d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function getContiguousRangeForMission(mission, dateISO){
  // Walk backward and forward from dateISO while consecutive days have an entry for this mission.
  // Stops at the first gap (unsaisi day) on either side — does not cross into separate blocks.
  const dates = [dateISO];

  let cursor = isoAddDays(dateISO, -1);
  while(state.entries[entryKey(mission, cursor)]){
    dates.unshift(cursor);
    cursor = isoAddDays(cursor, -1);
  }

  cursor = isoAddDays(dateISO, 1);
  while(state.entries[entryKey(mission, cursor)]){
    dates.push(cursor);
    cursor = isoAddDays(cursor, 1);
  }

  return dates;
}

function openStatusSheet(mission, dateISO){
  pendingCell = { mission, dateISO };
  document.getElementById("sheetMissionName").textContent = mission;
  const d = new Date(dateISO+"T00:00:00");
  const label = d.toLocaleDateString("fr-FR", { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById("sheetDateLabel").textContent = label;

  const grid = document.getElementById("statusGrid");
  grid.innerHTML = "";
  const currentCode = state.entries[entryKey(mission, dateISO)];

  // Only relevant if the clicked day itself already has an entry — otherwise there's no
  // existing block to extend around it.
  const missionDates = currentCode ? getContiguousRangeForMission(mission, dateISO) : [];
  const toggleRow = document.getElementById("scopeToggleRow");
  const toggle = document.getElementById("scopeToggle");
  const toggleLabel = document.getElementById("scopeToggleLabel");
  toggle.checked = false;

  if(missionDates.length > 1){
    toggleRow.classList.remove("disabled");
    const first = missionDates[0], last = missionDates[missionDates.length-1];
    const fmt = iso => new Date(iso+"T00:00:00").toLocaleDateString("fr-FR",{day:'numeric',month:'short'});
    toggleLabel.textContent = `Appliquer à toute la période (${missionDates.length} jours, du ${fmt(first)} au ${fmt(last)})`;
  }else{
    toggleRow.classList.add("disabled");
    toggleLabel.textContent = "Appliquer à toute la période (jour isolé)";
  }

  function applyStatus(code){
    const scopeAll = toggle.checked && missionDates.length > 1;
    const targets = scopeAll ? missionDates : [dateISO];
    if(scopeAll && !confirm(`Appliquer "${code}" aux ${targets.length} jours déjà saisis pour "${mission}" ?`)) return;
    targets.forEach(iso=>{ state.entries[entryKey(mission, iso)] = code; });
    saveState();
    closeStatusSheet();
    renderCalendarTable();
    if(scopeAll) showToast(`${targets.length} jours mis à jour pour ${mission}`);
  }

  STATUTS.forEach(s=>{
    const btn = document.createElement("button");
    btn.className = "status-btn" + (s.code===currentCode ? " selected" : "");
    btn.style.background = `var(--c-${s.code})`;
    btn.textContent = s.code;
    btn.addEventListener("click", ()=> applyStatus(s.code));
    grid.appendChild(btn);
  });

  const clearBtn = document.createElement("button");
  clearBtn.className = "status-btn clear";
  clearBtn.textContent = "Effacer";
  clearBtn.addEventListener("click", ()=>{
    const scopeAll = toggle.checked && missionDates.length > 1;
    const targets = scopeAll ? missionDates : [dateISO];
    if(scopeAll && !confirm(`Effacer les ${targets.length} jours déjà saisis pour "${mission}" ?`)) return;
    targets.forEach(iso=>{ delete state.entries[entryKey(mission, iso)]; });
    saveState();
    closeStatusSheet();
    renderCalendarTable();
    if(scopeAll) showToast(`${targets.length} jours effacés pour ${mission}`);
  });
  grid.appendChild(clearBtn);

  document.getElementById("statusSheet").classList.add("active");
}
function closeStatusSheet(){
  document.getElementById("statusSheet").classList.remove("active");
  pendingCell = null;
}

// ============================================================
// RENDER: SYNTHESIS
// ============================================================
function computeMissionStats(mission){
  let counts = {};
  STATUTS.forEach(s=>counts[s.code]=0);
  Object.keys(state.entries).forEach(key=>{
    const [m, iso] = key.split("|");
    if(m===mission && iso.startsWith(state.year+"-")){
      const code = state.entries[key];
      if(counts[code]!==undefined) counts[code]++;
    }
  });
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  return { counts, total };
}

function renderStatCards(){
  const wrap = document.getElementById("statCards");
  wrap.innerHTML = "";
  let totalC=0,totalP=0,totalNR=0,totalV=0,totalAll=0;
  state.missions.forEach(m=>{
    const {counts,total} = computeMissionStats(m);
    totalC += counts["C"]||0;
    totalP += counts["P"]||0;
    totalNR += counts["NR"]||0;
    totalV += counts["V"]||0;
    totalAll += total;
  });
  const totalConvocations = totalC + totalP;
  const cards = [
    { val: totalConvocations, lbl: "Total convocations", highlight: true },
    { val: totalAll, lbl: "Total saisies" },
    { val: totalP, lbl: "Payé" },
    { val: totalNR, lbl: "Non retenu" },
    { val: totalC, lbl: "Convoqué (en attente)" },
    { val: totalV, lbl: "Volontaire" }
  ];
  cards.forEach(c=>{
    const div = document.createElement("div");
    div.className = "stat-card" + (c.highlight ? " stat-card-highlight" : "");
    div.innerHTML = `<div class="val">${c.val}</div><div class="lbl">${c.lbl}</div>`;
    wrap.appendChild(div);
  });
}

function renderSynthTable(){
  document.getElementById("synthYear").textContent = state.year;
  const table = document.getElementById("synthTable");
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  trh.innerHTML = `<th>Mission</th>` + STATUTS.map(s=>`<th>${s.code}</th>`).join("") + `<th>Total</th>`;
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let grandTotals = {}; STATUTS.forEach(s=>grandTotals[s.code]=0);
  let grandTotal = 0;

  state.missions.forEach(mission=>{
    const {counts, total} = computeMissionStats(mission);
    const tr = document.createElement("tr");
    let cellsHtml = `<td>${mission}</td>`;
    STATUTS.forEach(s=>{
      cellsHtml += `<td>${counts[s.code]||0}</td>`;
      grandTotals[s.code] += counts[s.code]||0;
    });
    cellsHtml += `<td>${total}</td>`;
    grandTotal += total;
    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const trf = document.createElement("tr");
  let footHtml = `<td>TOTAL</td>`;
  STATUTS.forEach(s=> footHtml += `<td>${grandTotals[s.code]}</td>`);
  footHtml += `<td>${grandTotal}</td>`;
  trf.innerHTML = footHtml;
  tfoot.appendChild(trf);
  table.appendChild(tfoot);
}

function renderFinanceTable(){
  const table = document.getElementById("financeTable");
  table.innerHTML = "";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>Mois</th><th>Jours travaillés (C+P)</th><th>Solde (€)</th></tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let totalJours = 0, totalSolde = 0;
  for(let m=0; m<12; m++){
    let joursTravailles = 0;
    Object.keys(state.entries).forEach(key=>{
      const [mission, iso] = key.split("|");
      if(!iso.startsWith(state.year+"-")) return;
      const monthOfIso = parseInt(iso.split("-")[1],10)-1;
      if(monthOfIso !== m) return;
      const code = state.entries[key];
      if(code==="C" || code==="P") joursTravailles++;
    });
    const solde = joursTravailles * state.tarifJournalier;
    totalJours += joursTravailles;
    totalSolde += solde;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${MOIS_FR[m]}</td><td>${joursTravailles}</td><td>${solde.toFixed(2)} €</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const trf = document.createElement("tr");
  trf.innerHTML = `<td>TOTAL</td><td>${totalJours}</td><td>${totalSolde.toFixed(2)} €</td>`;
  tfoot.appendChild(trf);
  table.appendChild(tfoot);
}

function renderSynthesis(){
  renderStatCards();
  renderSynthTable();
  renderFinanceTable();
}

// ============================================================
// RENDER: SETTINGS
// ============================================================
function renderSettings(){
  document.getElementById("yearDisplay").textContent = state.year;
  document.getElementById("tarifInput").value = state.tarifJournalier;
  document.getElementById("vacancesZoneInput").value = state.vacancesZone || VACANCES_ZONE_DEFAULT;

  const missionList = document.getElementById("missionList");
  missionList.innerHTML = "";
  state.missions.forEach((m, idx)=>{
    const row = document.createElement("div");
    row.className = "mission-row";
    row.innerHTML = `
      <div class="reorder-btns">
        <button class="reorder-btn" data-idx="${idx}" data-dir="up" ${idx===0 ? "disabled" : ""}>▲</button>
        <button class="reorder-btn" data-idx="${idx}" data-dir="down" ${idx===state.missions.length-1 ? "disabled" : ""}>▼</button>
      </div>
      <input type="text" data-idx="${idx}" value="${m.replace(/"/g,'&quot;')}">
      <button class="delete-btn" data-idx="${idx}">✕</button>`;
    missionList.appendChild(row);
  });
  missionList.querySelectorAll(".reorder-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{
      const idx = parseInt(e.currentTarget.dataset.idx,10);
      const dir = e.currentTarget.dataset.dir;
      const targetIdx = dir === "up" ? idx-1 : idx+1;
      if(targetIdx < 0 || targetIdx >= state.missions.length) return;
      const tmp = state.missions[idx];
      state.missions[idx] = state.missions[targetIdx];
      state.missions[targetIdx] = tmp;
      saveState();
      renderSettings();
      renderCalendar();
    });
  });
  missionList.querySelectorAll("input").forEach(inp=>{
    inp.addEventListener("change", e=>{
      const idx = parseInt(e.target.dataset.idx,10);
      const oldName = state.missions[idx];
      const newName = e.target.value.trim();
      if(!newName) { e.target.value = oldName; return; }
      if(newName !== oldName){
        // rename keys in entries
        Object.keys(state.entries).forEach(key=>{
          if(key.startsWith(oldName+"|")){
            const dateISO = key.split("|")[1];
            state.entries[entryKey(newName, dateISO)] = state.entries[key];
            delete state.entries[key];
          }
        });
        state.missions[idx] = newName;
        saveState();
        showToast("Mission renommée");
      }
    });
  });
  missionList.querySelectorAll(".delete-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{
      const idx = parseInt(e.target.dataset.idx,10);
      const name = state.missions[idx];
      if(!confirm(`Supprimer la mission "${name}" ainsi que toutes ses saisies ?`)) return;
      Object.keys(state.entries).forEach(key=>{
        if(key.startsWith(name+"|")) delete state.entries[key];
      });
      state.missions.splice(idx,1);
      saveState();
      renderSettings();
      renderCalendar();
    });
  });

  // Fériés
  const ferieList = document.getElementById("ferieList");
  document.getElementById("ferieCount").textContent = state.feries.length;
  ferieList.innerHTML = "";
  state.feries.slice().sort().forEach(iso=>{
    const row = document.createElement("div");
    row.className = "mission-row";
    const label = new Date(iso+"T00:00:00").toLocaleDateString("fr-FR",{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    row.innerHTML = `<input type="text" value="${label}" readonly style="color:var(--text-dim)"><button data-iso="${iso}">✕</button>`;
    ferieList.appendChild(row);
  });
  ferieList.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", e=>{
      state.feries = state.feries.filter(f=>f!==e.target.dataset.iso);
      saveState();
      renderSettings();
      renderCalendar();
    });
  });

  // Récup
  const recupList = document.getElementById("recupList");
  recupList.innerHTML = "";
  state.recup.slice().sort().forEach(iso=>{
    const row = document.createElement("div");
    row.className = "mission-row";
    const label = new Date(iso+"T00:00:00").toLocaleDateString("fr-FR",{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    row.innerHTML = `<input type="text" value="${label}" readonly style="color:var(--text-dim)"><button data-iso="${iso}">✕</button>`;
    recupList.appendChild(row);
  });
  recupList.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", e=>{
      state.recup = state.recup.filter(f=>f!==e.target.dataset.iso);
      saveState();
      renderSettings();
    });
  });

  renderVacancesAnneeEditor();
}

// ---------- Vacances scolaires: school-year editor ----------
const PERIODE_LABELS = ["Toussaint", "Noël", "Hiver", "Printemps", "Ascension", "Été"];

function listAllSchoolYearKeys(){
  // official years first, then the 10 estimated years that follow them, in order
  const officialKeys = Object.keys(VACANCES_SCOLAIRES.B).sort();
  const estimatedKeys = Object.keys(VACANCES_SCOLAIRES_ESTIMEES.B).sort();
  return [...officialKeys, ...estimatedKeys];
}

function getCurrentSchoolYearKey(){
  // picks the school year that contains Jan 1 of the visible year, defaulting
  // sensibly so the dropdown opens on something relevant to what's on screen
  const y = state.year;
  return `${y-1}-${y}`;
}

function getPeriodesForSchoolYear(zone, key){
  const overrideKey = `${zone}|${key}`;
  if(state.vacancesOverrides && state.vacancesOverrides[overrideKey]){
    return state.vacancesOverrides[overrideKey];
  }
  if(VACANCES_SCOLAIRES[zone] && VACANCES_SCOLAIRES[zone][key]){
    return VACANCES_SCOLAIRES[zone][key];
  }
  if(VACANCES_SCOLAIRES_ESTIMEES[zone] && VACANCES_SCOLAIRES_ESTIMEES[zone][key]){
    return VACANCES_SCOLAIRES_ESTIMEES[zone][key];
  }
  return [];
}

function renderVacancesAnneeEditor(){
  const sel = document.getElementById("vacancesAnneeInput");
  if(!sel) return;
  const allKeys = listAllSchoolYearKeys();
  const wanted = getCurrentSchoolYearKey();
  sel.innerHTML = allKeys.map(k=>{
    const tag = isVacancesAnneeEstimee(k) ? " (estimée)" : "";
    return `<option value="${k}">${k}${tag}</option>`;
  }).join("");
  sel.value = allKeys.includes(wanted) ? wanted : allKeys[0];

  renderVacancesPeriodesForSelectedYear();
}

function renderVacancesPeriodesForSelectedYear(){
  const sel = document.getElementById("vacancesAnneeInput");
  const key = sel.value;
  const zone = state.vacancesZone || VACANCES_ZONE_DEFAULT;
  const estimee = isVacancesAnneeEstimee(key);

  const badge = document.getElementById("vacancesAnneeBadge");
  badge.innerHTML = estimee
    ? `<span class="vacances-badge estimee">⚠ Estimation — dates non publiées par le Ministère</span>`
    : `<span class="vacances-badge officielle">✓ Dates officielles publiées</span>`;

  const periodes = getPeriodesForSchoolYear(zone, key);
  const list = document.getElementById("vacancesPeriodesList");
  list.innerHTML = "";
  periodes.forEach((p, idx)=>{
    const row = document.createElement("div");
    row.className = "periode-row";
    const label = PERIODE_LABELS[idx] || `Période ${idx+1}`;
    row.innerHTML = `
      <span class="periode-label">${label}</span>
      <input type="date" data-idx="${idx}" data-field="debut" value="${p.debut}">
      <span style="color:var(--text-faint);font-size:11px;">→</span>
      <input type="date" data-idx="${idx}" data-field="fin" value="${p.fin}">`;
    list.appendChild(row);
  });

  list.querySelectorAll("input[type='date']").forEach(inp=>{
    inp.addEventListener("change", e=>{
      const idx = parseInt(e.target.dataset.idx,10);
      const field = e.target.dataset.field;
      const overrideKey = `${zone}|${key}`;
      // start from current effective periods (official/estimated/already-overridden)
      const current = getPeriodesForSchoolYear(zone, key).map(p=>({...p}));
      if(!current[idx]) return;
      current[idx][field] = e.target.value;
      if(!state.vacancesOverrides) state.vacancesOverrides = {};
      state.vacancesOverrides[overrideKey] = current;
      saveState();
      renderCalendar();
      showToast("Période corrigée");
    });
  });
}

function setupVacancesAnneeEditor(){
  const sel = document.getElementById("vacancesAnneeInput");
  if(!sel) return;
  sel.addEventListener("change", renderVacancesPeriodesForSelectedYear);

  document.getElementById("vacancesResetBtn").addEventListener("click", ()=>{
    const key = sel.value;
    const zone = state.vacancesZone || VACANCES_ZONE_DEFAULT;
    const overrideKey = `${zone}|${key}`;
    if(!state.vacancesOverrides || !state.vacancesOverrides[overrideKey]){
      showToast("Aucune correction à annuler pour cette année");
      return;
    }
    if(!confirm(`Effacer tes corrections pour l'année scolaire ${key} (zone ${zone}) et revenir aux dates ${isVacancesAnneeEstimee(key) ? "estimées" : "officielles"} ?`)) return;
    delete state.vacancesOverrides[overrideKey];
    saveState();
    renderCalendar();
    renderVacancesPeriodesForSelectedYear();
    showToast("Année réinitialisée");
  });
}

let pendingYearChange = null; // { oldYear, newYear }

function changeYearTo(y){
  if(!y || y<2020 || y>2099 || y===state.year) return;
  const oldYear = state.year;
  const hasEntriesForOldYear = Object.keys(state.entries).some(k=>{
    const iso = k.split("|")[1];
    return iso && iso.startsWith(oldYear+"-");
  });

  if(hasEntriesForOldYear){
    pendingYearChange = { oldYear, newYear: y };
    openYearArchiveSheet(oldYear, y);
  }else{
    applyYearChange(y);
  }
}

function applyYearChange(y){
  state.year = y;
  saveState();
  document.getElementById("yearDisplay").textContent = y;
  renderCalendar();
  showToast("Année mise à jour : "+y);
}

function openYearArchiveSheet(oldYear, newYear){
  document.getElementById("yearArchiveOldYear").textContent = oldYear;
  document.getElementById("yearArchiveOldYear2").textContent = oldYear;
  document.getElementById("yearArchiveNewYear").textContent = newYear;
  document.getElementById("yearArchiveSheet").classList.add("active");
}

function closeYearArchiveSheet(){
  document.getElementById("yearArchiveSheet").classList.remove("active");
}

function setupYearArchivePrompt(){
  document.getElementById("archiveChoiceDownload").addEventListener("click", ()=>{
    if(!pendingYearChange) return;
    const { oldYear, newYear } = pendingYearChange;
    archiveYear(true, "download");
    closeYearArchiveSheet();
    applyYearChange(newYear);
    pendingYearChange = null;
  });

  document.getElementById("archiveChoiceShare").addEventListener("click", async ()=>{
    if(!pendingYearChange) return;
    const { oldYear, newYear } = pendingYearChange;
    await archiveYear(true, "share");
    closeYearArchiveSheet();
    applyYearChange(newYear);
    pendingYearChange = null;
  });

  document.getElementById("archiveChoiceSkip").addEventListener("click", ()=>{
    if(!pendingYearChange) return;
    const { newYear } = pendingYearChange;
    closeYearArchiveSheet();
    applyYearChange(newYear);
    pendingYearChange = null;
  });

  document.getElementById("yearArchiveSheet").addEventListener("click", e=>{
    if(e.target.id === "yearArchiveSheet"){
      // tapping the backdrop = same as "continue without saving"
      if(pendingYearChange){
        const { newYear } = pendingYearChange;
        closeYearArchiveSheet();
        applyYearChange(newYear);
        pendingYearChange = null;
      }
    }
  });
}

function setupSettingsActions(){
  document.getElementById("yearPrevBtn").addEventListener("click", ()=> changeYearTo(state.year-1));
  document.getElementById("yearNextBtn").addEventListener("click", ()=> changeYearTo(state.year+1));
  document.getElementById("vacancesZoneInput").addEventListener("change", e=>{
    state.vacancesZone = e.target.value;
    saveState();
    renderCalendar();
    renderVacancesAnneeEditor();
    showToast("Zone scolaire : "+e.target.value);
  });
  document.getElementById("tarifInput").addEventListener("change", e=>{
    const t = parseFloat(e.target.value);
    if(!isNaN(t) && t>=0){
      state.tarifJournalier = t;
      saveState();
      showToast("Tarif journalier mis à jour");
    }
  });
  document.getElementById("addMissionBtn").addEventListener("click", ()=>{
    const inp = document.getElementById("newMissionInput");
    const name = inp.value.trim();
    if(!name) return;
    if(state.missions.includes(name)){ showToast("Mission déjà existante"); return; }
    state.missions.push(name);
    inp.value = "";
    saveState();
    renderSettings();
    renderCalendar();
    showToast("Mission ajoutée");
  });
  document.getElementById("addFerieBtn").addEventListener("click", ()=>{
    const inp = document.getElementById("newFerieInput");
    if(!inp.value) return;
    if(!state.feries.includes(inp.value)){
      state.feries.push(inp.value);
      saveState();
      renderSettings();
      renderCalendar();
      showToast("Jour férié ajouté");
    }
    inp.value = "";
  });
  document.getElementById("addRecupBtn").addEventListener("click", ()=>{
    const inp = document.getElementById("newRecupInput");
    if(!inp.value) return;
    if(!state.recup.includes(inp.value)){
      state.recup.push(inp.value);
      saveState();
      renderSettings();
      showToast("Jour de récup ajouté");
    }
    inp.value = "";
  });
}

// ============================================================
// MONTH NAVIGATION
// ============================================================
function setupMonthNav(){
  document.getElementById("prevMonth").addEventListener("click", ()=>{
    currentMonthIndex = (currentMonthIndex+11)%12;
    renderCalendar();
  });
  document.getElementById("nextMonth").addEventListener("click", ()=>{
    currentMonthIndex = (currentMonthIndex+1)%12;
    renderCalendar();
  });
}

// ============================================================
// SHEET DISMISS
// ============================================================
function setupSheetDismiss(){
  document.getElementById("sheetCancel").addEventListener("click", closeStatusSheet);
  document.getElementById("statusSheet").addEventListener("click", e=>{
    if(e.target.id === "statusSheet") closeStatusSheet();
  });
}

// ============================================================
// SAISIE PAR PÉRIODE
// ============================================================
let periodSelectedStatus = null;

function setupPeriodEntry(){
  document.getElementById("openPeriodBtn").addEventListener("click", openPeriodSheet);
  document.getElementById("periodCancel").addEventListener("click", closePeriodSheet);
  document.getElementById("periodSheet").addEventListener("click", e=>{
    if(e.target.id === "periodSheet") closePeriodSheet();
  });
  document.getElementById("periodMission").addEventListener("input", updatePeriodSummary);
  document.getElementById("periodStart").addEventListener("change", updatePeriodSummary);
  document.getElementById("periodEnd").addEventListener("change", updatePeriodSummary);
  document.getElementById("periodApply").addEventListener("click", applyPeriodEntry);
}

function openPeriodSheet(){
  // populate datalist with existing missions (input stays free-text)
  const list = document.getElementById("periodMissionList");
  list.innerHTML = state.missions.map(m=>`<option value="${m.replace(/"/g,'&quot;')}">`).join("");
  document.getElementById("periodMission").value = "";

  // default dates: current visible month, day 1 to last day
  const y = state.year, m = currentMonthIndex;
  document.getElementById("periodStart").value = isoDate(y,m,1);
  document.getElementById("periodEnd").value = isoDate(y,m,daysInMonth(y,m));

  // status grid
  periodSelectedStatus = null;
  const grid = document.getElementById("periodStatusGrid");
  grid.innerHTML = "";
  STATUTS.forEach(s=>{
    const btn = document.createElement("button");
    btn.className = "status-btn";
    btn.style.background = `var(--c-${s.code})`;
    btn.textContent = s.code;
    btn.dataset.code = s.code;
    btn.addEventListener("click", ()=>{
      periodSelectedStatus = s.code;
      grid.querySelectorAll(".status-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      updatePeriodSummary();
    });
    grid.appendChild(btn);
  });
  const clearBtn = document.createElement("button");
  clearBtn.className = "status-btn clear";
  clearBtn.textContent = "Effacer";
  clearBtn.addEventListener("click", ()=>{
    periodSelectedStatus = "__CLEAR__";
    grid.querySelectorAll(".status-btn").forEach(b=>b.classList.remove("selected"));
    clearBtn.classList.add("selected");
    updatePeriodSummary();
  });
  grid.appendChild(clearBtn);

  updatePeriodSummary();
  document.getElementById("periodSheet").classList.add("active");
  // focus the mission field since it's now free-text
  setTimeout(()=> document.getElementById("periodMission").focus(), 50);
}

function closePeriodSheet(){
  document.getElementById("periodSheet").classList.remove("active");
}

function getPeriodDates(){
  const startStr = document.getElementById("periodStart").value;
  const endStr = document.getElementById("periodEnd").value;
  if(!startStr || !endStr) return [];
  const start = new Date(startStr+"T00:00:00");
  const end = new Date(endStr+"T00:00:00");
  if(end < start) return [];
  const dates = [];
  let cur = new Date(start);
  while(cur <= end){
    const iso = `${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())}`;
    dates.push(iso);
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

function updatePeriodSummary(){
  const summary = document.getElementById("periodSummary");
  const mission = document.getElementById("periodMission").value.trim();
  const dates = getPeriodDates();

  if(!mission){
    summary.className = "period-summary";
    summary.textContent = "Choisis une mission existante ou tape le nom d'une nouvelle mission.";
    return;
  }

  if(dates.length === 0){
    summary.className = "period-summary warn";
    summary.textContent = "Plage de dates invalide (vérifie que la date de fin est après la date de début).";
    return;
  }

  const isNewMission = !state.missions.includes(mission);

  let existing = 0;
  dates.forEach(iso=>{
    if(state.entries[entryKey(mission, iso)]) existing++;
  });

  const actionLabel = periodSelectedStatus === "__CLEAR__"
    ? "effacer le statut de"
    : periodSelectedStatus
      ? `appliquer le statut "${periodSelectedStatus}" à`
      : "appliquer un statut à (choisis un statut ci-dessus pour)";

  summary.className = "period-summary" + (existing>0 ? " warn" : "");
  let txt = "";
  if(isNewMission){
    txt += `<strong>Nouvelle mission</strong> — "${mission}" sera ajoutée à ta liste. `;
  }
  txt += `<strong>${dates.length}</strong> jour${dates.length>1?'s':''} pour <strong>${mission}</strong> — ${actionLabel} cette période.`;
  if(existing > 0){
    txt += ` ${existing} jour${existing>1?'s':''} déjà saisi${existing>1?'s':''} sera${existing>1?'ont':''} remplacé${existing>1?'s':''}.`;
  }
  summary.innerHTML = txt;
}

function applyPeriodEntry(){
  const mission = document.getElementById("periodMission").value.trim();
  const dates = getPeriodDates();

  if(!mission){
    showToast("Indique le nom d'une mission");
    return;
  }
  if(dates.length === 0){
    showToast("Plage de dates invalide");
    return;
  }
  if(!periodSelectedStatus){
    showToast("Choisis un statut à appliquer");
    return;
  }

  const isNewMission = !state.missions.includes(mission);
  if(isNewMission && periodSelectedStatus === "__CLEAR__"){
    showToast("Cette mission n'existe pas encore — choisis un statut pour la créer");
    return;
  }

  let confirmMsg = "";
  if(isNewMission) confirmMsg += `Créer la mission "${mission}" et `;
  confirmMsg += `appliquer "${periodSelectedStatus === "__CLEAR__" ? "Effacer" : periodSelectedStatus}" à ${dates.length} jour${dates.length>1?'s':''}${isNewMission?'':' pour "'+mission+'"'} ?`;

  if(!confirm(confirmMsg)) return;

  if(isNewMission){
    state.missions.push(mission);
  }

  dates.forEach(iso=>{
    const key = entryKey(mission, iso);
    if(periodSelectedStatus === "__CLEAR__"){
      delete state.entries[key];
    }else{
      state.entries[key] = periodSelectedStatus;
    }
  });

  saveState();
  closePeriodSheet();
  renderCalendar();
  showToast(isNewMission
    ? `Mission "${mission}" créée, ${dates.length} jour${dates.length>1?'s':''} saisi${dates.length>1?'s':''}`
    : `${dates.length} jour${dates.length>1?'s':''} mis à jour pour ${mission}`);
}

// ============================================================
// INIT
// ============================================================
window.addEventListener("DOMContentLoaded", ()=>{
  setupThemeToggle();
  state = loadState();
  setupTabs();
  setupMonthNav();
  setupSheetDismiss();
  setupSettingsActions();
  setupYearArchivePrompt();
  setupVacancesAnneeEditor();
  setupPeriodEntry();
  setupExportImport();
  renderCalendar();

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
});
