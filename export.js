// ============================================================
// EXPORT / IMPORT
// ============================================================

function setupExportImport(){
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("exportXlsxBtn").addEventListener("click", exportXlsx);
  document.getElementById("exportIcsBtn").addEventListener("click", exportIcs);
  document.getElementById("importJsonBtn").addEventListener("click", ()=>{
    document.getElementById("importJsonFile").click();
  });
  document.getElementById("importJsonFile").addEventListener("change", handleImportJson);
  document.getElementById("resetYearBtn").addEventListener("click", handleResetYear);
  document.getElementById("archiveYearBtn").addEventListener("click", archiveYear);
}

// Builds a snapshot containing only the entries for the currently displayed
// year (plus the mission list, holidays, and zone settings needed to make
// sense of them), and downloads it as a clearly-named JSON file — a safe,
// frozen copy of that year, independent of whatever happens in the app
// afterwards (switching years, editing missions, clearing the calendar...).
function buildYearArchivePayload(){
  const year = state.year;
  const yearEntries = {};
  Object.keys(state.entries).forEach(key=>{
    const iso = key.split("|")[1];
    if(iso && iso.startsWith(year+"-")) yearEntries[key] = state.entries[key];
  });
  return {
    app: "planning-reserve",
    version: 1,
    type: "archive-annuelle",
    annee: year,
    exportedAt: new Date().toISOString(),
    state: {
      year: year,
      tarifJournalier: state.tarifJournalier,
      missions: [...state.missions],
      feries: state.feries.filter(f=>f.startsWith(year+"-")),
      recup: state.recup.filter(r=>r.startsWith(year+"-")),
      vacancesZone: state.vacancesZone,
      vacancesOverrides: state.vacancesOverrides || {},
      entries: yearEntries
    }
  };
}

async function archiveYear(skipConfirm, mode){
  const year = state.year;
  const entryCount = Object.keys(state.entries).filter(k=>{
    const iso = k.split("|")[1];
    return iso && iso.startsWith(year+"-");
  }).length;

  if(!skipConfirm){
    if(!confirm(`Archiver l'année ${year} ? Cela télécharge une sauvegarde JSON ET un export Excel contenant uniquement les ${entryCount} saisies de ${year}, à conserver de ton côté (ces fichiers ne modifient rien dans l'app).`)) return;
  }

  const payload = buildYearArchivePayload();
  const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const jsonFilename = `archive_${year}.json`;

  if(mode === "share"){
    const shared = await shareArchiveFiles(year, jsonBlob, jsonFilename);
    if(shared){
      showToast(`Année ${year} partagée (${entryCount} saisies)`);
      return;
    }
    // fall through to download if sharing isn't supported or was cancelled
  }

  downloadBlob(jsonBlob, jsonFilename);
  if(typeof XLSX !== "undefined"){
    setTimeout(()=>{
      exportXlsx(`archive_${year}`);
    }, 400);
  }
  showToast(`Année ${year} archivée (${entryCount} saisies)`);
}

// Tries to hand the archive files to the OS-level share sheet (Mail,
// Messages, Files, WhatsApp, etc. all appear there automatically on phones).
// Returns true if the native share UI was actually shown, false if the
// browser doesn't support sharing files — callers should fall back to a
// normal download in that case.
async function shareArchiveFiles(year, jsonBlob, jsonFilename){
  if(!navigator.share || !navigator.canShare){
    showToast("Partage non disponible sur ce navigateur — téléchargement classique utilisé");
    return false;
  }
  try{
    const jsonFile = new File([jsonBlob], jsonFilename, { type: "application/json" });
    const files = [jsonFile];

    if(typeof XLSX !== "undefined"){
      const xlsxBlob = buildXlsxBlob();
      const xlsxFile = new File([xlsxBlob], `archive_${year}.xlsx`, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      files.push(xlsxFile);
    }

    const shareData = {
      files,
      title: `Archive Planning Réserve ${year}`,
      text: `Sauvegarde du planning réserve — année ${year}`
    };

    if(!navigator.canShare(shareData)){
      // some browsers can share a single file but not two at once — retry with JSON only
      const singleFileData = { files: [jsonFile], title: shareData.title, text: shareData.text };
      if(!navigator.canShare(singleFileData)){
        showToast("Ce navigateur ne permet pas de partager ces fichiers — téléchargement classique utilisé");
        return false;
      }
      await navigator.share(singleFileData);
      return true;
    }

    await navigator.share(shareData);
    return true;
  }catch(err){
    if(err && err.name === "AbortError"){
      // person closed the share sheet without picking anything — not an error
      return true;
    }
    console.error("Partage impossible", err);
    showToast("Partage impossible — téléchargement classique utilisé");
    return false;
  }
}

function exportJson(){
  const payload = {
    app: "planning-reserve",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `planning_reserve_${state.year}_${dateStamp()}.json`);
  showToast("Export JSON téléchargé");
}

function dateStamp(){
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}`;
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function handleImportJson(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt=>{
    try{
      const payload = JSON.parse(evt.target.result);
      const incoming = payload.state || payload; // tolerate raw state files
      if(!incoming || !incoming.missions || !incoming.entries){
        showToast("Fichier invalide");
        return;
      }
      if(!confirm("Remplacer les données actuelles par celles de ce fichier ?")) return;
      state = Object.assign(defaultState(), incoming);
      saveState();
      currentMonthIndex = new Date().getMonth();
      renderCalendar();
      renderSettings();
      showToast("Import réussi");
    }catch(err){
      console.error(err);
      showToast("Erreur de lecture du fichier");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
}

function handleResetYear(){
  if(!confirm(`Effacer toutes les saisies de l'année ${state.year} ? Cette action est irréversible.`)) return;
  Object.keys(state.entries).forEach(key=>{
    const iso = key.split("|")[1];
    if(iso.startsWith(state.year+"-")) delete state.entries[key];
  });
  saveState();
  renderCalendar();
  showToast("Calendrier "+state.year+" réinitialisé");
}

// ---------- Excel export (SheetJS) ----------
function buildWorkbook(){
  const wb = XLSX.utils.book_new();

  // --- Sheet "Synthèse" ---
  const synthHeader = ["Mission", ...STATUTS.map(s=>s.code), "Total"];
  const synthRows = [synthHeader];
  let grandTotals = {}; STATUTS.forEach(s=>grandTotals[s.code]=0);
  let grandTotal = 0;
  state.missions.forEach(mission=>{
    const {counts, total} = computeMissionStats(mission);
    const row = [mission, ...STATUTS.map(s=>counts[s.code]||0), total];
    STATUTS.forEach(s=> grandTotals[s.code] += counts[s.code]||0);
    grandTotal += total;
    synthRows.push(row);
  });
  synthRows.push(["TOTAL", ...STATUTS.map(s=>grandTotals[s.code]), grandTotal]);
  const wsSynth = XLSX.utils.aoa_to_sheet(synthRows);
  XLSX.utils.book_append_sheet(wb, wsSynth, "Synthèse");

  // --- Sheet per month: calendar grid mission x days ---
  for(let m=0; m<12; m++){
    const nbDays = daysInMonth(state.year, m);
    const header = ["Mission", ...Array.from({length:nbDays}, (_,i)=>i+1)];
    const rows = [header];
    state.missions.forEach(mission=>{
      const row = [mission];
      for(let d=1; d<=nbDays; d++){
        const iso = isoDate(state.year, m, d);
        row.push(state.entries[entryKey(mission, iso)] || "");
      }
      rows.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, MOIS_FR[m].slice(0,10));
  }

  // --- Sheet "Légende" ---
  const legendRows = [["Code","Libellé"]];
  STATUTS.forEach(s=> legendRows.push([s.code, s.label]));
  const wsLegend = XLSX.utils.aoa_to_sheet(legendRows);
  XLSX.utils.book_append_sheet(wb, wsLegend, "Légende");

  // --- Sheet "Fériés & Récup" ---
  const fRows = [["Type","Date"]];
  state.feries.slice().sort().forEach(f=> fRows.push(["Férié", f]));
  state.recup.slice().sort().forEach(r=> fRows.push(["Récup", r]));
  const wsF = XLSX.utils.aoa_to_sheet(fRows);
  XLSX.utils.book_append_sheet(wb, wsF, "Fériés & Récup");

  // --- Sheet "Finances" ---
  const finRows = [["Mois","Jours travaillés (C+P)","Solde (€)"]];
  let totalJours=0, totalSolde=0;
  for(let m=0;m<12;m++){
    let jt=0;
    Object.keys(state.entries).forEach(key=>{
      const [mission, iso] = key.split("|");
      if(!iso.startsWith(state.year+"-")) return;
      const mo = parseInt(iso.split("-")[1],10)-1;
      if(mo!==m) return;
      const code = state.entries[key];
      if(code==="C"||code==="P") jt++;
    });
    const solde = jt*state.tarifJournalier;
    totalJours+=jt; totalSolde+=solde;
    finRows.push([MOIS_FR[m], jt, Number(solde.toFixed(2))]);
  }
  finRows.push(["TOTAL", totalJours, Number(totalSolde.toFixed(2))]);
  const wsFin = XLSX.utils.aoa_to_sheet(finRows);
  XLSX.utils.book_append_sheet(wb, wsFin, "Finances");

  return wb;
}

function exportXlsx(customFilename){
  if(typeof XLSX === "undefined"){
    showToast("Module Excel non chargé — vérifie ta connexion la première fois");
    return;
  }
  const wb = buildWorkbook();
  const filename = customFilename
    ? `${customFilename}.xlsx`
    : `planning_reserve_${state.year}_${dateStamp()}.xlsx`;
  XLSX.writeFile(wb, filename);
  if(!customFilename) showToast("Export Excel téléchargé");
}

// Builds the same workbook as exportXlsx but returns it as a Blob instead of
// triggering a direct download — used when sharing via the native share sheet.
function buildXlsxBlob(){
  const wb = buildWorkbook();
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ============================================================
// EXPORT iCALENDAR (.ics) — Missions Convoqué (C)
// Regroupe les jours C consécutifs (écart ≤ 1 jour, week-ends inclus)
// en périodes continues, une période = un événement dans le calendrier.
// ============================================================

function exportIcs(){
  const y = state.year;

  // 1. Collecter toutes les entrées C de l'année, groupées par mission
  const missionsDates = {};
  Object.keys(state.entries).forEach(key => {
    const sep = key.indexOf("|");
    const mission = key.slice(0, sep);
    const iso     = key.slice(sep + 1);
    if(!iso.startsWith(y + "-")) return;
    if(state.entries[key] !== "C") return;
    if(!missionsDates[mission]) missionsDates[mission] = [];
    missionsDates[mission].push(iso);
  });

  // 2. Fusionner les jours consécutifs en périodes
  function makePeriods(dates){
    dates = [...dates].sort();
    if(!dates.length) return [];
    const periods = [];
    let start = dates[0], prev = dates[0];
    for(let i = 1; i < dates.length; i++){
      const gap = (new Date(dates[i]) - new Date(prev)) / 86400000;
      if(gap <= 1){ prev = dates[i]; }
      else { periods.push([start, prev]); start = dates[i]; prev = dates[i]; }
    }
    periods.push([start, prev]);
    return periods;
  }

  // 3. Construire les événements iCalendar
  //    iCal DATE format : YYYYMMDD (journée entière)
  //    DTEND = lendemain du dernier jour (convention iCal exclusive)
  function isoToIcal(iso){ return iso.replace(/-/g, ""); }
  function dayAfter(iso){
    const d = new Date(iso);
    d.setDate(d.getDate() + 1);
    const m = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${d.getFullYear()}${m}${dd}`;
  }
  function makeUid(mission, start, end){
    // UID déterministe : même mission + mêmes dates = même UID
    // → le Calendrier iPhone met à jour l'événement existant au lieu de créer un doublon
    const slug = mission.replace(/[^A-Za-z0-9]/g,"-").replace(/-+/g,"-").toLowerCase();
    return `gend-reserve-${y}-${slug}-${start}-${end}@planning-reserve`;
  }
  function icalEscape(s){
    return s.replace(/\\/g,"\\\\").replace(/;/g,"\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
  }
  // Timestamp de création (maintenant, en UTC)
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Planning Réserve Gendarmerie//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Missions Gendarmerie ${y}`,
    "X-WR-TIMEZONE:Europe/Paris",
  ];

  let totalEvents = 0;
  Object.keys(missionsDates).sort().forEach(mission => {
    const periods = makePeriods(missionsDates[mission]);
    periods.forEach(([start, end]) => {
      const nbJours = (new Date(end) - new Date(start)) / 86400000 + 1;
      const summary = nbJours > 1
        ? `Mission ${mission} (${nbJours} j)`
        : `Mission ${mission}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${makeUid(mission, start, end)}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${isoToIcal(start)}`,
        `DTEND;VALUE=DATE:${dayAfter(end)}`,
        `SUMMARY:${icalEscape(summary)}`,
        `DESCRIPTION:${icalEscape(`Mission gendarmerie - ${mission}\\nStatut : Convoqué\\nAnnée : ${y}`)}`,
        "CATEGORIES:GENDARMERIE,RESERVE",
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT"
      );
      totalEvents++;
    });
  });

  lines.push("END:VCALENDAR");

  // 4. Télécharger ou partager le fichier
  const icsContent = lines.join("\r\n") + "\r\n";
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const filename = `missions_gendarmerie_${y}.ics`;

  // Utiliser Web Share API si disponible (iOS Safari → ajoute directement au Calendrier)
  if(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "text/calendar" })] })){
    const file = new File([blob], filename, { type: "text/calendar" });
    navigator.share({ files: [file], title: `Missions Gendarmerie ${y}` })
      .catch(err => { if(err.name !== "AbortError") dlIcs(blob, filename); });
  } else {
    dlIcs(blob, filename);
  }
}

function dlIcs(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
