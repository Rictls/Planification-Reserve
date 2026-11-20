// ============================================================
// PLANNING RÉSERVE — Logique application
// ============================================================

const STORE_KEY_PREFIX = "planningReserve_v1";
const STORE_KEY_LEGACY = "planningReserve_v1"; // clé legacy avant multi-années
const THEME_KEY = "planningReserve_theme";
const ACTIVE_YEAR_KEY = "planningReserve_activeYear";

const MOIS_FR = ["JANVIER","FÉVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOÛT","SEPTEMBRE","OCTOBRE","NOVEMBRE","DÉCEMBRE"];
const JOURS_FR = ["L","M","M","J","V","S","D"];

let state = null;
let currentMonthIndex = new Date().getMonth();
let pendingCell = null; // {mission, dateISO}

// ---------- Clé de stockage par année ----------
function storeKeyForYear(y){ return `${STORE_KEY_PREFIX}_${y}`; }

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
function defaultStateForYear(y){
  // Pour 2026, utiliser les données migrées existantes
  // Pour les autres années, partir d'un calendrier vierge avec les missions de 2026 comme base
  return {
    year: y,
    tarifJournalier: TARIF_JOURNALIER_DEFAULT,
    missions: y === 2027 ? [...MISSIONS_DEFAULT_2027] : MISSIONS_DEFAULT.filter(m => m !== "Vacances scolaires"),
    feries: y === 2026 ? [...FERIES_2026] : y === 2027 ? [...FERIES_2027] : computeFeriesForYear(y),
    recup: y === 2026 ? [...RECUP_DEFAULT] : [],
    vacancesZone: VACANCES_ZONE_DEFAULT,
    vacancesOverrides: {},
    entries: y === 2026 ? stripVacancesScolairesEntries({ ...ENTRIES_MIGRATED_2026 })
           : y === 2027 ? { ...ENTRIES_MIGRATED_2027 }
           : {}
  };
}

function defaultState(){ return defaultStateForYear(2026); }

// Calcul approximatif des jours fériés pour une année donnée
function computeFeriesForYear(y){
  // Pâques (algorithme de Butcher)
  const a=y%19, b=Math.floor(y/100), c=y%100, d=Math.floor(b/4), e=b%4;
  const f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const pMois=Math.floor((h+l-7*m+114)/31);
  const pJour=((h+l-7*m+114)%31)+1;
  const paques = new Date(y, pMois-1, pJour);
  const lundi = new Date(paques); lundi.setDate(lundi.getDate()+1);
  const ascension = new Date(paques); ascension.setDate(ascension.getDate()+39);
  const pentecote = new Date(paques); pentecote.setDate(pentecote.getDate()+50);
  const f2 = (d) => `${y}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return [
    `${y}-01-01`, `${y}-05-01`, `${y}-05-08`, `${y}-07-14`,
    `${y}-08-15`, `${y}-11-01`, `${y}-11-11`, `${y}-12-25`,
    f2(lundi), f2(ascension), f2(pentecote)
  ].sort();
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

function loadStateForYear(y){
  try{
    // 1. Chercher la clé par année
    let raw = localStorage.getItem(storeKeyForYear(y));
    // 2. Migration : si on charge 2026 et qu'il n'y a pas encore de clé par année,
    //    essayer la clé legacy (avant la feature multi-années)
    if(!raw && y === 2026){
      raw = localStorage.getItem(STORE_KEY_LEGACY);
      if(raw){
        // Migrer vers la nouvelle clé
        try{ localStorage.setItem(storeKeyForYear(2026), raw); }catch(e){}
      }
    }
    if(raw){
      const parsed = JSON.parse(raw);
      const def = defaultStateForYear(y);
      const merged = Object.assign(def, parsed);
      merged.year = y; // forcer l'année correcte
      merged.missions = merged.missions.filter(m => m !== "Vacances scolaires");
      merged.entries = stripVacancesScolairesEntries(merged.entries || {});
      if(!merged.vacancesZone) merged.vacancesZone = VACANCES_ZONE_DEFAULT;
      if(!merged.vacancesOverrides) merged.vacancesOverrides = {};
      return merged;
    }
  }catch(e){ console.warn("Lecture stockage impossible", e); }
  return defaultStateForYear(y);
}

function loadState(){
  // Chercher l'année active mémorisée, sinon 2026
  let activeYear = 2026;
  try{
    const stored = localStorage.getItem(ACTIVE_YEAR_KEY);
    if(stored){ const y = parseInt(stored, 10); if(y >= 2020 && y <= 2099) activeYear = y; }
  }catch(e){}
  return loadStateForYear(activeYear);
}

function saveState(){
  try{
    localStorage.setItem(storeKeyForYear(state.year), JSON.stringify(state));
    localStorage.setItem(ACTIVE_YEAR_KEY, String(state.year));
  }catch(e){
    console.error("Sauvegarde impossible", e);
    showToast("Erreur de sauvegarde locale");
  }
}

// Retourne toutes les années qui ont des données en localStorage
function getAllStoredYears(){
  const years = new Set();
  years.add(state ? state.year : 2026);
  // Années avec données migrées embarquées — toujours disponibles
  years.add(2026);
  years.add(2027);
  try{
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(STORE_KEY_PREFIX+"_")){
        const y = parseInt(k.replace(STORE_KEY_PREFIX+"_",""), 10);
        if(y >= 2020 && y <= 2099) years.add(y);
      }
    }
    // Vérifier legacy
    const legacy = localStorage.getItem(STORE_KEY_LEGACY);
    if(legacy && !localStorage.getItem(storeKeyForYear(2026))) years.add(2026);
  }catch(e){}
  return [...years].sort((a,b)=>b-a); // décroissant
}

// Stats rapides pour une année (sans charger tout le state)
function getYearStats(y){
  try{
    let raw = localStorage.getItem(storeKeyForYear(y));
    if(!raw && y===2026) raw = localStorage.getItem(STORE_KEY_LEGACY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    const entries = parsed.entries || {};
    let C=0, P=0, retard=0;
    const todayIso = getTodayIso();
    Object.keys(entries).forEach(k=>{
      const iso = k.split("|")[1];
      if(!iso || !iso.startsWith(y+"-")) return;
      const code = entries[k];
      if(code==="C"){ C++; if(iso < todayIso) retard++; }
      if(code==="P") P++;
    });
    return { C, P, retard };
  }catch(e){ return null; }
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
function getTodayIso(){
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}
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
  // yearLabel peut être absent (remplacé par la pill topbar)
  const yl = document.getElementById("yearLabel");
  if(yl) yl.textContent = state.year;
  // Mettre à jour la pill si présente
  const pl = document.getElementById("yearPillLabel");
  if(pl) pl.textContent = state.year;
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
  const todayIso = getTodayIso();

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
        if(code === "C" && iso < todayIso){
          pill.classList.add("pill-overdue");
        }
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
  STATUTS.forEach(s=>{
    const chip = document.createElement("div");
    chip.className = "legend-chip";
    chip.innerHTML = `<span class="dot" style="background:var(--c-${s.code})"></span>${s.code} — ${s.label}`;
    row.appendChild(chip);
  });
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
  const todayIso = getTodayIso();
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>Mois</th><th>Payé</th><th>À venir</th><th>En retard</th></tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let totalPaye = 0, totalAVenir = 0, totalRetard = 0;
  for(let m=0; m<12; m++){
    let jp = 0, ja = 0, jr = 0;
    Object.keys(state.entries).forEach(key=>{
      const [mission, iso] = key.split("|");
      if(!iso.startsWith(state.year+"-")) return;
      const monthOfIso = parseInt(iso.split("-")[1],10)-1;
      if(monthOfIso !== m) return;
      const code = state.entries[key];
      if(code==="P") jp++;
      if(code==="C"){
        if(iso < todayIso) jr++; else ja++;
      }
    });
    const soldePaye = jp*state.tarifJournalier;
    const soldeAVenir = ja*state.tarifJournalier;
    const soldeRetard = jr*state.tarifJournalier;
    totalPaye += soldePaye;
    totalAVenir += soldeAVenir;
    totalRetard += soldeRetard;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${MOIS_FR[m]}</td><td>${soldePaye.toFixed(2)} €</td><td>${soldeAVenir.toFixed(2)} €</td><td class="${soldeRetard>0?'cell-overdue':''}">${soldeRetard.toFixed(2)} €</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const trf = document.createElement("tr");
  trf.innerHTML = `<td>TOTAL</td><td>${totalPaye.toFixed(2)} €</td><td>${totalAVenir.toFixed(2)} €</td><td class="cell-overdue">${totalRetard.toFixed(2)} €</td>`;
  tfoot.appendChild(trf);
  table.appendChild(tfoot);

  document.getElementById("financeStatPaye").textContent = totalPaye.toFixed(0)+" €";
  document.getElementById("financeStatAVenir").textContent = totalAVenir.toFixed(0)+" €";
  document.getElementById("financeStatRetard").textContent = totalRetard.toFixed(0)+" €";
}

// ============================================================
// RENDER: SYNTHÈSE 12 MOIS (accordéon mensuel)
// ============================================================
function renderSynthMonths(){
  const yr = state.year;
  const tarif = state.tarifJournalier || 84.2;
  const container = document.getElementById("synthMonthList");
  const yearLabel = document.getElementById("synthMonthYear");
  if(!container) return;
  if(yearLabel) yearLabel.textContent = yr;
  container.innerHTML = "";

  // Formater une date ISO en "JJ mois" lisible
  const MOIS_COURT = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
  function fmtDate(iso){
    const [,m,d] = iso.split("-");
    return `${parseInt(d,10)} ${MOIS_COURT[parseInt(m,10)-1]}`;
  }

  // Regrouper les entrées C/P par mois puis par mission → périodes consécutives
  for(let mIdx=0; mIdx<12; mIdx++){
    const monthStr = String(mIdx+1).padStart(2,"0");
    const prefix = `${yr}-${monthStr}-`;

    // Collecter toutes les entrées C/P de ce mois
    const byMission = {}; // mission → [{iso, code}]
    Object.keys(state.entries).forEach(key=>{
      const [mission, iso] = key.split("|");
      if(!iso || !iso.startsWith(prefix)) return;
      const code = state.entries[key];
      if(code !== "C" && code !== "P") return;
      if(!byMission[mission]) byMission[mission] = [];
      byMission[mission].push({iso, code});
    });

    // Construire les périodes pour chaque mission
    const periods = []; // {mission, start, end, code, nb}
    state.missions.forEach(mission=>{
      const days = (byMission[mission] || []).sort((a,b)=>a.iso.localeCompare(b.iso));
      if(!days.length) return;
      // Découper en blocs contigus de même code
      let start = days[0].iso, end = days[0].iso, code = days[0].code, nb = 1;
      for(let i=1; i<days.length; i++){
        const d = days[i];
        // Calculer si consécutif (diff 1 jour) et même code
        const prevDate = new Date(end+"T00:00:00");
        const curDate  = new Date(d.iso+"T00:00:00");
        const diffMs = curDate - prevDate;
        const isConsec = diffMs === 86400000 && d.code === code;
        if(isConsec){
          end = d.iso; nb++;
        } else {
          periods.push({mission, start, end, code, nb});
          start = d.iso; end = d.iso; code = d.code; nb = 1;
        }
      }
      periods.push({mission, start, end, code, nb});
    });

    // Trier par date de début
    periods.sort((a,b)=>a.start.localeCompare(b.start));

    const jC = periods.filter(p=>p.code==="C").reduce((s,p)=>s+p.nb,0);
    const jP = periods.filter(p=>p.code==="P").reduce((s,p)=>s+p.nb,0);
    const hasData = periods.length > 0;
    const totalEur = (jC + jP) * tarif;

    const block = document.createElement("div");
    block.className = "sm-block" + (hasData ? " sm-open" : "");

    const chips = hasData
      ? `${jC>0?`<span class="sm-chip c">${jC}j C</span>`:""}${jP>0?`<span class="sm-chip p">${jP}j P</span>`:""}<span class="sm-chip eur">${Math.round(totalEur).toLocaleString("fr-FR")} €</span>`
      : `<span style="font-size:11px;color:var(--text-faint)">—</span>`;

    let rowsHtml = "";
    if(hasData){
      periods.forEach(p=>{
        const dateLabel = p.start === p.end ? fmtDate(p.start) : `${fmtDate(p.start)} → ${fmtDate(p.end)}`;
        const eur = Math.round(p.nb * tarif).toLocaleString("fr-FR");
        rowsHtml += `<div class="sm-row">
          <div class="sm-dot ${p.code.toLowerCase()}"></div>
          <div class="sm-info">
            <div class="sm-mname">${p.mission}</div>
            <div class="sm-dates">${dateLabel}</div>
          </div>
          <div class="sm-right">
            <span class="sm-days ${p.code.toLowerCase()}">${p.nb} j.</span>
            <span class="sm-eur">${eur} €</span>
          </div>
        </div>`;
      });
    } else {
      rowsHtml = `<div class="sm-empty">Aucune mission C/P ce mois</div>`;
    }

    block.innerHTML = `
      <div class="sm-header">
        <span class="sm-name">${MOIS_FR[mIdx]}</span>
        <div class="sm-chips">${chips}</div>
        <span class="sm-toggle">▼</span>
      </div>
      <div class="sm-body">${rowsHtml}</div>`;

    block.querySelector(".sm-header").addEventListener("click", ()=>{
      block.classList.toggle("sm-open");
    });

    container.appendChild(block);
  }
}

function renderSynthesis(){
  renderStatCards();
  renderSynthMonths();
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
  // Sauvegarder l'année courante avant de changer
  saveState();
  // Charger (ou créer) le state de la nouvelle année
  state = loadStateForYear(y);
  saveState();
  currentMonthIndex = 0; // revenir à janvier de la nouvelle année
  renderCalendar();
  renderSettings();
  renderYearPill();
  showToast("Planning " + y + " chargé");
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

  const missionInput = document.getElementById("periodMission");
  missionInput.addEventListener("input", e=>{
    updatePeriodSummary();
    openMissionDropdown();
    renderMissionDropdown(e.target.value);
  });
  missionInput.addEventListener("focus", ()=> openMissionDropdown());

  document.getElementById("periodMissionToggle").addEventListener("click", e=>{
    e.stopPropagation();
    e.preventDefault();
    missionInput.focus();
    openMissionDropdown();
  });

  // close the dropdown when tapping anywhere outside the combo box
  document.addEventListener("click", e=>{
    const combo = document.querySelector(".mission-combo");
    if(combo && !combo.contains(e.target)) closeMissionDropdown();
  });

  document.getElementById("periodStart").addEventListener("focus", closeMissionDropdown);
  document.getElementById("periodEnd").addEventListener("focus", closeMissionDropdown);
  document.getElementById("periodStart").addEventListener("change", updatePeriodSummary);
  document.getElementById("periodEnd").addEventListener("change", updatePeriodSummary);
  document.getElementById("periodApply").addEventListener("click", applyPeriodEntry);
}

function renderMissionDropdown(filterText){
  const dropdown = document.getElementById("periodMissionDropdown");
  const filter = (filterText || "").trim().toLowerCase();
  const matches = filter
    ? state.missions.filter(m => m.toLowerCase().includes(filter))
    : state.missions;

  if(matches.length === 0){
    dropdown.innerHTML = `<div class="mission-combo-item" style="color:var(--text-faint);">Aucune mission existante ne correspond</div>`;
    return;
  }
  dropdown.innerHTML = matches.map(m=>
    `<button type="button" class="mission-combo-item" data-mission="${m.replace(/"/g,'&quot;')}">${m}</button>`
  ).join("");
  dropdown.querySelectorAll(".mission-combo-item[data-mission]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.getElementById("periodMission").value = btn.dataset.mission;
      closeMissionDropdown();
      updatePeriodSummary();
    });
  });
}

function openMissionDropdown(){
  renderMissionDropdown(document.getElementById("periodMission").value);
  document.getElementById("periodMissionDropdown").classList.add("open");
}
function closeMissionDropdown(){
  document.getElementById("periodMissionDropdown").classList.remove("open");
}

function openPeriodSheet(){
  document.getElementById("periodMission").value = "";
  closeMissionDropdown();

  // default dates: current visible month, day 1 to last day
  const y = state.year, m = currentMonthIndex;
  document.getElementById("periodStart").value = isoDate(y,m,1);
  document.getElementById("periodEnd").value = isoDate(y,m,daysInMonth(y,m));

  // status grid
  periodSelectedStatus = null;
  const grid = document.getElementById("periodStatusGrid");
  grid.innerHTML = "";
  STATUTS.filter(s=>s.code !== "OFF").forEach(s=>{
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

  const actionLabel = periodSelectedStatus === "__CLEAR__"
    ? "effacer le statut de"
    : periodSelectedStatus
      ? `appliquer le statut "${periodSelectedStatus}" à`
      : "appliquer un statut à (choisis un statut ci-dessus pour)";

  const isNewMission = !state.missions.includes(mission);

  let existing = 0;
  dates.forEach(iso=>{
    if(state.entries[entryKey(mission, iso)]) existing++;
  });

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
  const dates = getPeriodDates();

  if(dates.length === 0){
    showToast("Plage de dates invalide");
    return;
  }
  if(!periodSelectedStatus){
    showToast("Choisis un statut à appliquer");
    return;
  }

  const mission = document.getElementById("periodMission").value.trim();
  if(!mission){
    showToast("Indique le nom d'une mission");
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
// SAISIE D'INDISPONIBILITÉ (toutes les missions à la fois)
// ============================================================
let indispoSelectedStatus = null;

function setupIndispoEntry(){
  document.getElementById("openIndispoBtn").addEventListener("click", openIndispoSheet);
  document.getElementById("indispoCancel").addEventListener("click", closeIndispoSheet);
  document.getElementById("indispoSheet").addEventListener("click", e=>{
    if(e.target.id === "indispoSheet") closeIndispoSheet();
  });
  document.getElementById("indispoStart").addEventListener("change", updateIndispoSummary);
  document.getElementById("indispoEnd").addEventListener("change", updateIndispoSummary);
  document.getElementById("indispoApply").addEventListener("click", applyIndispoEntry);
}

function openIndispoSheet(){
  const y = state.year, m = currentMonthIndex;
  document.getElementById("indispoStart").value = isoDate(y,m,1);
  document.getElementById("indispoEnd").value = isoDate(y,m,daysInMonth(y,m));

  indispoSelectedStatus = "OFF"; // sensible default: Indisponible
  const grid = document.getElementById("indispoStatusGrid");
  grid.innerHTML = "";
  STATUTS.filter(s=>s.code === "OFF").forEach(s=>{
    const btn = document.createElement("button");
    btn.className = "status-btn" + (s.code === "OFF" ? " selected" : "");
    btn.style.background = `var(--c-${s.code})`;
    btn.textContent = s.code;
    btn.dataset.code = s.code;
    btn.addEventListener("click", ()=>{
      indispoSelectedStatus = s.code;
      grid.querySelectorAll(".status-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      updateIndispoSummary();
    });
    grid.appendChild(btn);
  });
  const clearBtn = document.createElement("button");
  clearBtn.className = "status-btn clear";
  clearBtn.textContent = "Effacer";
  clearBtn.addEventListener("click", ()=>{
    indispoSelectedStatus = "__CLEAR__";
    grid.querySelectorAll(".status-btn").forEach(b=>b.classList.remove("selected"));
    clearBtn.classList.add("selected");
    updateIndispoSummary();
  });
  grid.appendChild(clearBtn);

  updateIndispoSummary();
  document.getElementById("indispoSheet").classList.add("active");
}

function closeIndispoSheet(){
  document.getElementById("indispoSheet").classList.remove("active");
}

function getIndispoDates(){
  const startStr = document.getElementById("indispoStart").value;
  const endStr = document.getElementById("indispoEnd").value;
  if(!startStr || !endStr) return [];
  const start = new Date(startStr+"T00:00:00");
  const end = new Date(endStr+"T00:00:00");
  if(end < start) return [];
  const dates = [];
  let cur = new Date(start);
  while(cur <= end){
    dates.push(`${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())}`);
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

function updateIndispoSummary(){
  const summary = document.getElementById("indispoSummary");
  const dates = getIndispoDates();

  if(dates.length === 0){
    summary.className = "period-summary warn";
    summary.textContent = "Plage de dates invalide (vérifie que la date de fin est après la date de début).";
    return;
  }

  let existing = 0;
  state.missions.forEach(m=>{
    dates.forEach(iso=>{
      if(state.entries[entryKey(m, iso)]) existing++;
    });
  });

  const actionLabel = indispoSelectedStatus === "__CLEAR__"
    ? "effacer le statut de"
    : indispoSelectedStatus
      ? `appliquer le statut "${indispoSelectedStatus}" à`
      : "appliquer un statut à (choisis un statut ci-dessus pour)";

  summary.className = "period-summary" + (existing>0 ? " warn" : "");
  let txt = `<strong>${dates.length}</strong> jour${dates.length>1?'s':''} pour <strong>les ${state.missions.length} missions</strong> — ${actionLabel} cette période sur chacune d'elles.`;
  if(existing > 0){
    txt += ` ${existing} saisie${existing>1?'s':''} déjà présente${existing>1?'s':''} sera${existing>1?'ont':''} remplacée${existing>1?'s':''}.`;
  }
  summary.innerHTML = txt;
}

function applyIndispoEntry(){
  const dates = getIndispoDates();

  if(dates.length === 0){
    showToast("Plage de dates invalide");
    return;
  }
  if(!indispoSelectedStatus){
    showToast("Choisis un statut à appliquer");
    return;
  }
  if(state.missions.length === 0){
    showToast("Aucune mission enregistrée pour le moment");
    return;
  }

  let existing = 0;
  state.missions.forEach(m=>{
    dates.forEach(iso=>{
      if(state.entries[entryKey(m, iso)]) existing++;
    });
  });

  const actionWord = indispoSelectedStatus === "__CLEAR__" ? "Effacer" : indispoSelectedStatus;
  let confirmMsg = `Appliquer "${actionWord}" à ${dates.length} jour${dates.length>1?'s':''} sur les ${state.missions.length} missions ?`;
  if(existing>0) confirmMsg += ` (${existing} saisie${existing>1?'s':''} déjà présente${existing>1?'s':''} sera${existing>1?'ont':''} remplacée${existing>1?'s':''})`;
  if(!confirm(confirmMsg)) return;

  state.missions.forEach(m=>{
    dates.forEach(iso=>{
      const key = entryKey(m, iso);
      if(indispoSelectedStatus === "__CLEAR__"){
        delete state.entries[key];
      }else{
        state.entries[key] = indispoSelectedStatus;
      }
    });
  });

  saveState();
  closeIndispoSheet();
  renderCalendar();
  showToast(`${dates.length} jour${dates.length>1?'s':''} mis à jour sur ${state.missions.length} missions`);
}

// ============================================================
// PILL ANNÉE (topbar dropdown)
// ============================================================
function renderYearPill(){
  const pill = document.getElementById("yearPillBtn");
  const pillLabel = document.getElementById("yearPillLabel");
  const list = document.getElementById("ydList");
  const addBtn = document.getElementById("ydAddBtn");
  const addLabel = document.getElementById("ydAddLabel");
  if(!pill || !list) return;

  // Mettre à jour le label de la pill
  if(pillLabel) pillLabel.textContent = state.year;

  // Vider la liste
  list.innerHTML = "";

  const todayIso = getTodayIso();
  const years = getAllStoredYears();
  const nextYear = Math.max(...years, state.year) + 1;

  if(addLabel) addLabel.textContent = `Créer le planning ${nextYear}`;

  years.forEach(y=>{
    const stats = (y === state.year)
      ? (() => {
          let C=0, P=0, retard=0;
          Object.keys(state.entries).forEach(k=>{
            const iso = k.split("|")[1];
            if(!iso) return;
            const code = state.entries[k];
            if(code==="C"){ C++; if(iso < todayIso) retard++; }
            if(code==="P") P++;
          });
          return {C, P, retard};
        })()
      : getYearStats(y);

    const item = document.createElement("div");
    item.className = "yd-item" + (y === state.year ? " active" : "");

    let statsHtml = "";
    if(stats && (stats.C > 0 || stats.P > 0)){
      statsHtml += `<div class="yd-stat"><span class="yd-dot c"></span><span class="yd-stat-label">Convoqué</span><span class="yd-stat-val">${stats.C} j.</span></div>`;
      statsHtml += `<div class="yd-stat"><span class="yd-dot p"></span><span class="yd-stat-label">Payé</span><span class="yd-stat-val">${stats.P} j.</span></div>`;
      if(stats.retard > 0)
        statsHtml += `<div class="yd-stat"><span class="yd-dot retard"></span><span class="yd-stat-label">En retard</span><span class="yd-stat-val">${stats.retard} j.</span></div>`;
    } else {
      statsHtml = `<div class="yd-stat" style="font-style:italic;color:var(--text-faint)">Aucune donnée</div>`;
    }

    item.innerHTML = `
      <div class="yd-left">
        <span class="yd-num">${y}</span>
        ${y === state.year ? '<span class="yd-badge">● EN COURS</span>' : ''}
      </div>
      <div class="yd-stats">${statsHtml}</div>`;

    item.addEventListener("click", ()=>{
      if(y === state.year){ closeYearDropdown(); return; }
      saveState();
      state = loadStateForYear(y);
      saveState();
      currentMonthIndex = 0;
      renderCalendar();
      renderSettings();
      renderYearPill();
      closeYearDropdown();
      // Revenir sur calendrier
      document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
      const calTab = document.querySelector('[data-view="calendar"]');
      if(calTab) calTab.classList.add("active");
      document.getElementById("view-calendar").classList.add("active");
      showToast("Planning " + y + " chargé");
    });

    list.appendChild(item);
  });

  // Bouton créer — re-wire à chaque render pour avoir le bon nextYear
  if(addBtn){
    addBtn.onclick = ()=>{
      closeYearDropdown();
      const confirmMsg = `Créer un nouveau planning pour ${nextYear} ?\nLes missions de ${state.year} seront copiées comme base.`;
      if(!confirm(confirmMsg)) return;
      const newState = defaultStateForYear(nextYear);
      newState.missions = [...state.missions];
      newState.tarifJournalier = state.tarifJournalier;
      newState.vacancesZone = state.vacancesZone;
      try{ localStorage.setItem(storeKeyForYear(nextYear), JSON.stringify(newState)); }catch(e){}
      saveState();
      state = loadStateForYear(nextYear);
      saveState();
      currentMonthIndex = 0;
      renderCalendar();
      renderSettings();
      renderYearPill();
      document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
      const calTab = document.querySelector('[data-view="calendar"]');
      if(calTab) calTab.classList.add("active");
      document.getElementById("view-calendar").classList.add("active");
      showToast("Planning " + nextYear + " créé");
    };
  }
}

function closeYearDropdown(){
  const dd = document.getElementById("yearDropdown");
  const btn = document.getElementById("yearPillBtn");
  if(dd) dd.classList.remove("open");
  if(btn) btn.classList.remove("open");
}

function setupYearPill(){
  const pillBtn = document.getElementById("yearPillBtn");
  const dropdown = document.getElementById("yearDropdown");
  const wrap = document.getElementById("yearPillWrap");
  if(!pillBtn || !dropdown) return;

  pillBtn.addEventListener("click", (e)=>{
    e.stopPropagation();
    const open = dropdown.classList.toggle("open");
    pillBtn.classList.toggle("open", open);
    if(open) renderYearPill(); // re-render au clic pour stats fraîches
  });

  // Fermer si clic ailleurs
  document.addEventListener("click", (e)=>{
    if(wrap && !wrap.contains(e.target)) closeYearDropdown();
  });
}

// ============================================================
// EXPORT PDF — fiche synthèse A4
// ============================================================
function exportSynthesePDF(){
  const tarif = state.tarifJournalier || 84.2;
  const year  = state.year;
  const todayIso = getTodayIso();
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
  const fmt = n => n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const z   = n => n===0 ? '<span class="zero">0,00 €</span>' : fmt(n);
  const zn  = n => n===0 ? '<span class="zero">0</span>' : n;
  const MOIS_AB = ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"];
  const MOIS_L  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  // ── Tableau 1 : solde financier mensuel ──────────────────
  let rowsFin = '', totP=0, totC=0, totR=0;
  for(let m=0;m<12;m++){
    let jp=0,ja=0,jr=0;
    Object.keys(state.entries).forEach(key=>{
      const [,iso]=key.split("|");
      if(!iso||!iso.startsWith(year+"-")) return;
      if(parseInt(iso.split("-")[1],10)-1 !== m) return;
      const code=state.entries[key];
      if(code==="P") jp++;
      if(code==="C"){ if(iso<todayIso) jr++; else ja++; }
    });
    totP+=jp; totC+=ja; totR+=jr;
    const p=jp*tarif,a=ja*tarif,r=jr*tarif;
    rowsFin+=`<tr>
      <td>${MOIS_L[m]}</td>
      <td class="${jp?'cp':''}">${z(p)}</td>
      <td class="${ja?'cc':''}">${z(a)}</td>
      <td class="${jr?'cr':''}">${z(r)}</td>
    </tr>`;
  }
  rowsFin+=`</tbody><tfoot><tr>
    <td>TOTAL</td>
    <td>${fmt(totP*tarif)}</td>
    <td>${fmt(totC*tarif)}</td>
    <td class="${totR?'cr':''}">${fmt(totR*tarif)}</td>
  </tr></tfoot>`;

  // ── Tableau 2 : missions par mois ───────────────────────
  const missions = {};
  Object.keys(state.entries).forEach(key=>{
    const [mission,iso]=key.split("|");
    const v=state.entries[key];
    if(!iso||!iso.startsWith(year+"-")||v==="OFF"||v==="NR") return;
    const mo=parseInt(iso.split("-")[1],10)-1;
    if(!missions[mission]) missions[mission]={};
    if(!missions[mission][mo]) missions[mission][mo]={C:0,P:0,V:0,dates:[]};
    missions[mission][mo][v]=(missions[mission][mo][v]||0)+1;
    missions[mission][mo].dates.push(iso);
  });
  const missionList=Object.keys(missions).sort((a,b)=>
    Math.min(...Object.keys(missions[a]).map(Number))-Math.min(...Object.keys(missions[b]).map(Number)));
  const rows=[];
  for(let m=0;m<12;m++){
    for(const mission of missionList){
      if(missions[mission]&&missions[mission][m]) rows.push({m,mission,data:missions[mission][m]});
    }
  }
  let rowsMis='', lastM=-1, gC=0,gP=0,gV=0,gTot=0;
  for(const {m,mission,data} of rows){
    if(m!==lastM){
      rowsMis+=`<tr class="mhd"><td colspan="6">${MOIS_L[m].toUpperCase()}</td></tr>`;
      lastM=m;
    }
    const dts=data.dates.sort();
    const fmtD=d=>`${parseInt(d.split('-')[2],10)} ${MOIS_AB[parseInt(d.split('-')[1],10)-1]}`;
    const per=dts[0]===dts[dts.length-1]?fmtD(dts[0]):`${fmtD(dts[0])} → ${fmtD(dts[dts.length-1])}`;
    const c=data.C||0,p=data.P||0,v=data.V||0,tot=c+p+v;
    gC+=c;gP+=p;gV+=v;gTot+=tot;
    rowsMis+=`<tr>
      <td>${mission}</td>
      <td class="per">${per}</td>
      <td class="${c?'cc':''}">${zn(c)}</td>
      <td class="${p?'cp':''}">${zn(p)}</td>
      <td class="${v?'cv':''}">${zn(v)}</td>
      <td>${tot}</td>
    </tr>`;
  }
  rowsMis+=`</tbody><tfoot><tr>
    <td colspan="2">TOTAL</td>
    <td class="cc">${gC}</td>
    <td class="cp">${gP}</td>
    <td class="cv">${gV}</td>
    <td>${gTot}</td>
  </tr></tfoot>`;

  const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8">
<title>Synthèse ${year} — MDC(R) Ricard Dimitri</title>
<style>
@page{size:A4 portrait;margin:16mm 14mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff}
.hdr{background:#1E3A5F;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:flex-end;border-radius:4px 4px 0 0;margin-bottom:0}
.hdr-title{font-size:14px;font-weight:700}
.hdr-meta{font-size:9px;opacity:.7;margin-top:2px}
.hdr-year{font-size:24px;font-weight:700;opacity:.25}
.section{font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#6B7280;padding:7px 10px 5px;background:#F5F6F8;border-bottom:1px solid #D1D5DB;border-top:1px solid #D1D5DB}
table{width:100%;border-collapse:collapse;font-size:10.5px}
th{font-size:9px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:#6B7280;padding:6px 10px;text-align:right;border-bottom:1px solid #D1D5DB;white-space:nowrap}
th:first-child{text-align:left}
td{padding:5px 10px;border-bottom:1px solid #E5E7EB;text-align:right}
td:first-child{text-align:left;font-weight:500}
tfoot td{font-weight:700;background:#F5F6F8;border-top:2px solid #D1D5DB;color:#1E3A5F;font-size:10px}
tfoot td:first-child{text-align:left}
.mhd td{padding:4px 10px;background:#F5F6F8;text-align:left!important;font-size:9px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#6B7280}
.per{text-align:left!important;color:#6B7280;font-size:9.5px;font-weight:400!important}
.zero{color:#D1D5DB}
.cp{color:#166534}.cc{color:#5B21B6}.cr{color:#991B1B;font-weight:700}.cv{color:#1D4ED8}
.sep{height:1px;background:#D1D5DB}
.footer{padding:7px 10px;font-size:9px;color:#6B7280;border-top:1px solid #D1D5DB;display:flex;justify-content:space-between}
</style></head><body>
<div class="hdr"><div><div class="hdr-title">Synthèse Planning Réserve</div><div class="hdr-meta">MDC (R) Ricard Dimitri · COB Pornic · Tarif ${tarif.toFixed(2).replace('.',',')} €/j</div></div><div class="hdr-year">${year}</div></div>
<div class="section">Solde financier mensuel</div>
<table><thead><tr><th style="text-align:left">Mois</th><th>Payé</th><th>À venir</th><th>En retard</th></tr></thead><tbody>${rowsFin}
<div class="sep"></div>
<div class="section">Missions par mois — détail</div>
<table><thead><tr><th style="text-align:left;width:36%">Mission</th><th style="text-align:left">Période</th><th>C</th><th>P</th><th>V</th><th>Total</th></tr></thead><tbody>${rowsMis}
<div class="footer"><span>Réserve Gendarmerie Nationale · Région Pays de la Loire</span><span>Généré le ${dateStr} · Tarif ${tarif.toFixed(2).replace('.',',')} €/j</span></div>
</body></html>`;

  const win = window.open('','_blank');
  if(!win){ alert("Autorisez les pop-ups pour exporter le PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); }, 400);
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
  setupIndispoEntry();
  setupExportImport();
  setupYearPill();
  renderCalendar();
  renderYearPill();

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
});
