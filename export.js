// ============================================================
// EXPORT / IMPORT
// ============================================================

function setupExportImport(){
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("exportXlsxBtn").addEventListener("click", exportXlsx);
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

function archiveYear(){
  const year = state.year;
  const entryCount = Object.keys(state.entries).filter(k=>{
    const iso = k.split("|")[1];
    return iso && iso.startsWith(year+"-");
  }).length;

  if(!confirm(`Archiver l'année ${year} ? Cela télécharge une sauvegarde JSON ET un export Excel contenant uniquement les ${entryCount} saisies de ${year}, à conserver de ton côté (ces fichiers ne modifient rien dans l'app).`)) return;

  const payload = buildYearArchivePayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `archive_${year}.json`);

  // also produce the matching Excel snapshot for this year, reusing the
  // existing export logic (already scoped to state.year)
  if(typeof XLSX !== "undefined"){
    setTimeout(()=>{
      exportXlsx(`archive_${year}`);
    }, 400);
  }

  showToast(`Année ${year} archivée (${entryCount} saisies)`);
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
function exportXlsx(customFilename){
  if(typeof XLSX === "undefined"){
    showToast("Module Excel non chargé — vérifie ta connexion la première fois");
    return;
  }
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

  const filename = customFilename
    ? `${customFilename}.xlsx`
    : `planning_reserve_${state.year}_${dateStamp()}.xlsx`;
  XLSX.writeFile(wb, filename);
  if(!customFilename) showToast("Export Excel téléchargé");
}
