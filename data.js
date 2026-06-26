// Données de référence — Planning Réserve 2026
const MISSIONS_DEFAULT = [
  "PORNIC - DEPP",
  "PORNIC - PGCV",
  "NOIRMOUTIER - DEPP",
  "GUERANDE - DEPP",
  "St BRV - PGCV",
  "PMG",
  "BLOC n°02",
  "Acculturation",
  "helfest clisson",
  "Poseidon",
  "Poseidon - bis",
  "DHPP-73",
  "DHPP-73 BIS",
  "suavetgae tactique",
  "formation",
  "Vacances scolaires"
];

// Codes de statut (reprend Légende AT7:AT13 du fichier Excel)
const STATUTS = [
  { code: "C",   label: "Convoqué",         color: "#2E7D32" },
  { code: "P",   label: "Payé",             color: "#6A4C93" },
  { code: "D",   label: "Disponible",       color: "#1565C0" },
  { code: "V",   label: "Volontaire",       color: "#0097A7" },
  { code: "NR",  label: "Non retenue",      color: "#B71C1C" },
  { code: "X",   label: "Vacances scolaire",color: "#EF6C00" },
  { code: "OFF", label: "Off",              color: "#8D6E63" }
];

// Jours fériés France 2026 (calculés depuis le fichier Excel, AP7:AP17)
const FERIES_2026 = [
  "2026-01-01", // Jour de l'an
  "2026-04-06", // Lundi de Pâques
  "2026-05-01", // Fête du travail
  "2026-05-08", // Victoire 1945
  "2026-05-14", // Ascension
  "2026-05-25", // Lundi de Pentecôte
  "2026-07-14", // Fête nationale
  "2026-08-15", // Assomption
  "2026-11-01", // Toussaint
  "2026-11-11", // Armistice
  "2026-12-25"  // Noël
];

// Jours de récupération donnés par l'employeur (AQ7 du fichier Excel)
const RECUP_DEFAULT = ["2026-07-11"];

const TARIF_JOURNALIER_DEFAULT = 84.2;

// Vacances scolaires France — zones A, B, C.
// Périodes officielles du Ministère de l'Éducation nationale, par année scolaire.
// Chaque entrée couvre du premier jour de vacances (départ) au dernier jour inclus
// (reprise des cours le lendemain). Toussaint, Noël et Été sont communs aux 3 zones ;
// Hiver et Printemps sont décalés par zone.
//
// Zone A : Besançon, Bordeaux, Clermont-Ferrand, Dijon, Grenoble, Limoges, Lyon, Poitiers
// Zone B : Aix-Marseille, Amiens, Lille, Nancy-Metz, Nantes, Nice, Normandie,
//          Orléans-Tours, Reims, Rennes, Strasbourg
// Zone C : Créteil, Montpellier, Paris, Toulouse, Versailles
const VACANCES_SCOLAIRES = {
  A: {
    "2025-2026": [
      { debut: "2025-10-18", fin: "2025-11-03" },  // Toussaint
      { debut: "2025-12-20", fin: "2026-01-05" },  // Noël
      { debut: "2026-02-07", fin: "2026-02-23" },  // Hiver
      { debut: "2026-04-04", fin: "2026-04-20" },  // Printemps
      { debut: "2026-05-13", fin: "2026-05-18" },  // Pont de l'Ascension
      { debut: "2026-07-04", fin: "2026-08-31" },  // Été
    ],
    "2026-2027": [
      { debut: "2026-10-17", fin: "2026-11-02" },  // Toussaint
      { debut: "2026-12-19", fin: "2027-01-04" },  // Noël
      { debut: "2027-02-13", fin: "2027-03-01" },  // Hiver
      { debut: "2027-04-10", fin: "2027-04-26" },  // Printemps
      { debut: "2027-05-05", fin: "2027-05-10" },  // Pont de l'Ascension
      { debut: "2027-07-03", fin: "2027-08-31" },  // Été
    ]
  },
  B: {
    "2025-2026": [
      { debut: "2025-10-18", fin: "2025-11-03" },  // Toussaint
      { debut: "2025-12-20", fin: "2026-01-04" },  // Noël
      { debut: "2026-02-14", fin: "2026-03-01" },  // Hiver
      { debut: "2026-04-11", fin: "2026-04-26" },  // Printemps
      { debut: "2026-05-15", fin: "2026-05-16" },  // Pont de l'Ascension
      { debut: "2026-07-04", fin: "2026-08-31" },  // Été
    ],
    "2026-2027": [
      { debut: "2026-10-17", fin: "2026-11-01" },  // Toussaint
      { debut: "2026-12-19", fin: "2027-01-03" },  // Noël
      { debut: "2027-02-13", fin: "2027-02-28" },  // Hiver (publié "1er mars" repos = jusqu'au 28 inclus pour cohérence semaine)
      { debut: "2027-04-10", fin: "2027-04-25" },  // Printemps
      { debut: "2027-05-07", fin: "2027-05-07" },  // Pont de l'Ascension
      { debut: "2027-07-03", fin: "2027-08-31" },  // Été
    ]
  },
  C: {
    "2025-2026": [
      { debut: "2025-10-18", fin: "2025-11-03" },  // Toussaint
      { debut: "2025-12-20", fin: "2026-01-05" },  // Noël
      { debut: "2026-02-21", fin: "2026-03-09" },  // Hiver
      { debut: "2026-04-18", fin: "2026-05-04" },  // Printemps
      { debut: "2026-05-13", fin: "2026-05-18" },  // Pont de l'Ascension
      { debut: "2026-07-04", fin: "2026-08-31" },  // Été
    ],
    "2026-2027": [
      { debut: "2026-10-17", fin: "2026-11-02" },  // Toussaint
      { debut: "2026-12-19", fin: "2027-01-04" },  // Noël
      { debut: "2027-02-06", fin: "2027-02-22" },  // Hiver
      { debut: "2027-04-03", fin: "2027-04-19" },  // Printemps
      { debut: "2027-05-05", fin: "2027-05-10" },  // Pont de l'Ascension
      { debut: "2027-07-03", fin: "2027-08-31" },  // Été
    ]
  }
};

const VACANCES_ZONE_DEFAULT = "B";

// Years explicitly published by the Ministry — anything else is an estimate.
const VACANCES_ANNEES_OFFICIELLES = ["2025-2026", "2026-2027"];

function isoAddDaysStatic(iso, n){
  const d = new Date(iso+"T00:00:00");
  d.setDate(d.getDate()+n);
  const pad = x => x<10 ? "0"+x : ""+x;
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function isoDateStatic(d){
  const pad = x => x<10 ? "0"+x : ""+x;
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// ---------- Easter / Ascension (Gregorian algorithm — exact, not an estimate) ----------
function easterDateStatic(year){
  const a = year % 19, b = Math.floor(year/100), c = year % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c/4), k = c % 4;
  const l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l) / 451);
  const month = Math.floor((h + l - 7*m + 114) / 31);
  const day = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(year, month-1, day);
}

// ---------- Structural estimation for years beyond the official calendar ----------
// The 3-year zone rotation (A,B,C)->(C,A,B)->(B,C,A) and the ~2-week Toussaint/
// Noël/Hiver/Printemps pattern, ~9-week gap between Hiver and Printemps, are
// stable features of the French school calendar going back decades. This lets
// us project plausible (but NOT official) dates for years the Ministry hasn't
// published yet. Each generated year is tagged so the app can label it as an
// estimate and let the person correct it once real dates are known.
const ROTATION_CYCLE = [["A","B","C"], ["C","A","B"], ["B","C","A"]];

function nearestSaturdayOnOrAfter(d){
  const day = d.getDay(); // 0=Sun..6=Sat
  const offset = (6 - day) % 7;
  const r = new Date(d); r.setDate(r.getDate()+offset);
  return r;
}
function addWeeksGetMonday(d, weeks){
  // d is a Saturday; returns the Monday `weeks` later (end of a 2-week block when weeks=2)
  const r = new Date(d); r.setDate(r.getDate() + weeks*7 + 1);
  return r;
}
function subDays(d,n){ const r = new Date(d); r.setDate(r.getDate()-n); return r; }
function addDays(d,n){ const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function addWeeks(d,n){ return addDays(d, n*7); }

function estimateSchoolYear(startYear){
  const endYear = startYear + 1;
  const cycleIdx = ((startYear - 2025) % 3 + 3) % 3;
  const order = ROTATION_CYCLE[cycleIdx];

  const toussaintStart = nearestSaturdayOnOrAfter(new Date(startYear,9,15));
  const toussaintEnd = subDays(addWeeksGetMonday(toussaintStart,2),1);

  const noelStart = nearestSaturdayOnOrAfter(new Date(startYear,11,17));
  const noelEnd = subDays(addWeeksGetMonday(noelStart,2),1);

  const eteStart = nearestSaturdayOnOrAfter(new Date(endYear,6,1));
  const eteEnd = new Date(endYear,7,31);

  const easter = easterDateStatic(endYear);
  const ascensionThu = addDays(easter,39);
  const ascStart = subDays(ascensionThu,1);
  const ascEnd = addDays(ascensionThu,4);

  const hiverBase = nearestSaturdayOnOrAfter(new Date(endYear,1,4));
  const printempsBase = addWeeks(hiverBase,9);

  const periodsCommunes = {
    toussaint: { debut: isoDateStatic(toussaintStart), fin: isoDateStatic(toussaintEnd) },
    noel: { debut: isoDateStatic(noelStart), fin: isoDateStatic(noelEnd) },
    ascension: { debut: isoDateStatic(ascStart), fin: isoDateStatic(ascEnd) },
    ete: { debut: isoDateStatic(eteStart), fin: isoDateStatic(eteEnd) },
  };

  const result = {};
  ["A","B","C"].forEach(zone=>{
    const i = order.indexOf(zone);
    const hiverS = addWeeks(hiverBase, i);
    const hiverE = subDays(addWeeksGetMonday(hiverS,2),1);
    const printS = addWeeks(printempsBase, i);
    const printE = subDays(addWeeksGetMonday(printS,2),1);
    result[zone] = [
      periodsCommunes.toussaint,
      periodsCommunes.noel,
      { debut: isoDateStatic(hiverS), fin: isoDateStatic(hiverE) },
      { debut: isoDateStatic(printS), fin: isoDateStatic(printE) },
      periodsCommunes.ascension,
      periodsCommunes.ete,
    ];
  });
  return result;
}

// Builds estimated tables for the 10 school years following the last official
// one, merged into a zone-keyed structure matching VACANCES_SCOLAIRES' shape.
function buildEstimatedYears(){
  const lastOfficial = 2026; // 2026-2027 is the last published year (start year 2026)
  const out = { A:{}, B:{}, C:{} };
  for(let sy = lastOfficial+1; sy <= lastOfficial+10; sy++){
    const key = `${sy}-${sy+1}`;
    const est = estimateSchoolYear(sy);
    out.A[key] = est.A;
    out.B[key] = est.B;
    out.C[key] = est.C;
  }
  return out;
}
const VACANCES_SCOLAIRES_ESTIMEES = buildEstimatedYears();

// Generates the list of ISO dates covered by the given zone's school holidays
// that fall within the given calendar year (Jan 1 - Dec 31), using both
// school-year tables that can overlap that year. `overrides`, if provided, is
// state.vacancesOverrides — a { "zone|2027-2028": [{debut,fin},...] } map of
// person-edited periods that take priority over both official and estimated data.
function getVacancesScolairesForYear(year, zone, overrides){
  zone = zone || VACANCES_ZONE_DEFAULT;
  const officialTable = VACANCES_SCOLAIRES[zone] || VACANCES_SCOLAIRES[VACANCES_ZONE_DEFAULT];
  const estimatedTable = VACANCES_SCOLAIRES_ESTIMEES[zone] || {};
  const dates = new Set();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // a school year "Y-Y+1" can only ever overlap calendar years Y and Y+1
  const candidateKeys = [`${year-1}-${year}`, `${year}-${year+1}`];

  candidateKeys.forEach(key=>{
    const overrideKey = `${zone}|${key}`;
    const periods = (overrides && overrides[overrideKey])
      || officialTable[key]
      || estimatedTable[key];
    if(!periods) return;
    periods.forEach(({debut, fin})=>{
      if(fin < yearStart || debut > yearEnd) return;
      let cur = debut < yearStart ? yearStart : debut;
      const stop = fin > yearEnd ? yearEnd : fin;
      while(cur <= stop){
        dates.add(cur);
        cur = isoAddDaysStatic(cur, 1);
      }
    });
  });
  return Array.from(dates).sort();
}

// True if the given school year key ("2027-2028") has no official Ministry
// publication yet — i.e. the dates shown are a structural estimate.
function isVacancesAnneeEstimee(schoolYearKey){
  return !VACANCES_ANNEES_OFFICIELLES.includes(schoolYearKey);
}

const ENTRIES_MIGRATED_2026 = {
  "Poseidon|2026-01-12": "C",
  "Poseidon|2026-01-13": "C",
  "Poseidon|2026-01-14": "C",
  "Poseidon|2026-01-15": "C",
  "Poseidon|2026-01-16": "C",
  "Poseidon|2026-01-17": "C",
  "Poseidon|2026-01-18": "C",
  "Poseidon|2026-01-19": "C",
  "Poseidon|2026-01-20": "C",
  "Poseidon|2026-01-21": "C",
  "Poseidon|2026-01-22": "C",
  "Poseidon|2026-01-23": "C",
  "Poseidon|2026-01-24": "C",
  "Poseidon|2026-01-25": "C",
  "Poseidon|2026-01-26": "C",
  "Poseidon|2026-01-27": "C",
  "Poseidon|2026-01-28": "C",
  "DHPP-73|2026-01-28": "NR",
  "DHPP-73|2026-01-29": "NR",
  "DHPP-73|2026-01-30": "NR",
  "DHPP-73|2026-01-31": "NR",
  "DHPP-73 BIS|2026-01-13": "NR",
  "DHPP-73 BIS|2026-01-14": "NR",
  "DHPP-73 BIS|2026-01-15": "NR",
  "DHPP-73 BIS|2026-01-16": "NR",
  "DHPP-73 BIS|2026-01-17": "NR",
  "DHPP-73 BIS|2026-01-18": "NR",
  "DHPP-73 BIS|2026-01-19": "NR",
  "DHPP-73 BIS|2026-01-20": "NR",
  "DHPP-73 BIS|2026-01-21": "NR",
  "DHPP-73 BIS|2026-01-22": "NR",
  "DHPP-73 BIS|2026-01-23": "NR",
  "DHPP-73 BIS|2026-01-24": "NR",
  "DHPP-73 BIS|2026-01-25": "NR",
  "DHPP-73 BIS|2026-01-26": "NR",
  "DHPP-73 BIS|2026-01-27": "NR",
  "DHPP-73 BIS|2026-01-28": "NR",
  "DHPP-73 BIS|2026-01-29": "NR",
  "suavetgae tactique|2026-01-31": "NR",
  "PORNIC - PGCV|2026-02-01": "NR",
  "PORNIC - PGCV|2026-02-07": "NR",
  "PORNIC - PGCV|2026-02-08": "NR",
  "PORNIC - PGCV|2026-02-14": "NR",
  "PORNIC - PGCV|2026-02-15": "NR",
  "PORNIC - PGCV|2026-02-20": "NR",
  "PORNIC - PGCV|2026-02-21": "NR",
  "PORNIC - PGCV|2026-02-22": "NR",
  "PORNIC - PGCV|2026-02-27": "NR",
  "PORNIC - PGCV|2026-02-28": "NR",
  "St BRV - PGCV|2026-02-13": "NR",
  "St BRV - PGCV|2026-02-14": "NR",
  "St BRV - PGCV|2026-02-15": "NR",
  "PMG|2026-02-13": "NR",
  "PMG|2026-02-14": "NR",
  "PMG|2026-02-15": "NR",
  "PMG|2026-02-16": "NR",
  "PMG|2026-02-17": "NR",
  "PMG|2026-02-18": "NR",
  "PMG|2026-02-19": "NR",
  "PMG|2026-02-20": "NR",
  "PMG|2026-02-21": "NR",
  "PMG|2026-02-22": "NR",
  "PMG|2026-02-23": "NR",
  "PMG|2026-02-24": "NR",
  "PMG|2026-02-25": "NR",
  "PMG|2026-02-26": "NR",
  "PMG|2026-02-27": "NR",
  "PMG|2026-02-28": "NR",
  "Poseidon|2026-02-09": "NR",
  "Poseidon|2026-02-10": "NR",
  "Poseidon|2026-02-11": "NR",
  "Poseidon|2026-02-12": "NR",
  "Poseidon|2026-02-13": "NR",
  "Poseidon|2026-02-14": "NR",
  "Poseidon|2026-02-15": "NR",
  "Poseidon|2026-02-16": "NR",
  "Poseidon|2026-02-17": "NR",
  "Poseidon|2026-02-18": "NR",
  "Poseidon|2026-02-19": "NR",
  "Poseidon|2026-02-20": "NR",
  "Poseidon|2026-02-21": "NR",
  "Poseidon|2026-02-22": "NR",
  "Poseidon|2026-02-23": "NR",
  "Poseidon|2026-02-24": "NR",
  "Poseidon|2026-02-25": "NR",
  "Poseidon - bis|2026-02-23": "NR",
  "Poseidon - bis|2026-02-24": "NR",
  "Poseidon - bis|2026-02-25": "NR",
  "Poseidon - bis|2026-02-26": "NR",
  "Poseidon - bis|2026-02-27": "NR",
  "Poseidon - bis|2026-02-28": "NR",
  "DHPP-73|2026-02-01": "NR",
  "DHPP-73|2026-02-02": "NR",
  "DHPP-73|2026-02-03": "NR",
  "DHPP-73|2026-02-04": "NR",
  "DHPP-73|2026-02-05": "NR",
  "DHPP-73|2026-02-06": "NR",
  "DHPP-73|2026-02-07": "NR",
  "DHPP-73|2026-02-08": "NR",
  "DHPP-73|2026-02-09": "NR",
  "DHPP-73|2026-02-10": "NR",
  "DHPP-73|2026-02-11": "NR",
  "DHPP-73|2026-02-12": "NR",
  "DHPP-73|2026-02-13": "NR",
  "DHPP-73|2026-02-27": "NR",
  "DHPP-73|2026-02-28": "NR",
  "DHPP-73 BIS|2026-02-12": "NR",
  "DHPP-73 BIS|2026-02-13": "NR",
  "DHPP-73 BIS|2026-02-14": "NR",
  "DHPP-73 BIS|2026-02-15": "NR",
  "DHPP-73 BIS|2026-02-16": "NR",
  "DHPP-73 BIS|2026-02-17": "NR",
  "DHPP-73 BIS|2026-02-18": "NR",
  "DHPP-73 BIS|2026-02-19": "NR",
  "DHPP-73 BIS|2026-02-20": "NR",
  "DHPP-73 BIS|2026-02-21": "NR",
  "DHPP-73 BIS|2026-02-22": "NR",
  "DHPP-73 BIS|2026-02-23": "NR",
  "DHPP-73 BIS|2026-02-24": "NR",
  "DHPP-73 BIS|2026-02-25": "NR",
  "DHPP-73 BIS|2026-02-26": "NR",
  "DHPP-73 BIS|2026-02-27": "NR",
  "DHPP-73 BIS|2026-02-28": "NR",
  "suavetgae tactique|2026-02-04": "C",
  "formation|2026-02-10": "NR",
  "Vacances scolaires|2026-02-14": "X",
  "Vacances scolaires|2026-02-15": "X",
  "Vacances scolaires|2026-02-16": "X",
  "Vacances scolaires|2026-02-17": "X",
  "Vacances scolaires|2026-02-18": "X",
  "Vacances scolaires|2026-02-19": "X",
  "Vacances scolaires|2026-02-20": "X",
  "Vacances scolaires|2026-02-21": "X",
  "Vacances scolaires|2026-02-22": "X",
  "Vacances scolaires|2026-02-23": "X",
  "Vacances scolaires|2026-02-24": "X",
  "Vacances scolaires|2026-02-25": "X",
  "Vacances scolaires|2026-02-26": "X",
  "Vacances scolaires|2026-02-27": "X",
  "Vacances scolaires|2026-02-28": "X",
  "PORNIC - PGCV|2026-03-07": "NR",
  "PORNIC - PGCV|2026-03-08": "NR",
  "PORNIC - PGCV|2026-03-14": "NR",
  "PORNIC - PGCV|2026-03-15": "NR",
  "PORNIC - PGCV|2026-03-21": "NR",
  "PORNIC - PGCV|2026-03-22": "NR",
  "PORNIC - PGCV|2026-03-28": "NR",
  "PORNIC - PGCV|2026-03-29": "NR",
  "Poseidon|2026-03-09": "NR",
  "Poseidon|2026-03-10": "NR",
  "Poseidon|2026-03-11": "NR",
  "Poseidon|2026-03-12": "NR",
  "Poseidon|2026-03-13": "NR",
  "Poseidon|2026-03-14": "NR",
  "Poseidon|2026-03-15": "NR",
  "Poseidon|2026-03-16": "NR",
  "Poseidon|2026-03-17": "NR",
  "Poseidon|2026-03-18": "NR",
  "Poseidon|2026-03-19": "NR",
  "Poseidon|2026-03-20": "NR",
  "Poseidon|2026-03-21": "NR",
  "Poseidon|2026-03-22": "NR",
  "Poseidon|2026-03-23": "NR",
  "Poseidon|2026-03-24": "NR",
  "Poseidon|2026-03-25": "NR",
  "Poseidon - bis|2026-03-01": "NR",
  "Poseidon - bis|2026-03-02": "NR",
  "Poseidon - bis|2026-03-03": "NR",
  "Poseidon - bis|2026-03-04": "NR",
  "Poseidon - bis|2026-03-05": "NR",
  "Poseidon - bis|2026-03-06": "NR",
  "Poseidon - bis|2026-03-07": "NR",
  "Poseidon - bis|2026-03-08": "NR",
  "Poseidon - bis|2026-03-09": "NR",
  "Poseidon - bis|2026-03-10": "NR",
  "Poseidon - bis|2026-03-11": "NR",
  "DHPP-73|2026-03-01": "NR",
  "DHPP-73|2026-03-02": "NR",
  "DHPP-73|2026-03-03": "NR",
  "DHPP-73|2026-03-04": "NR",
  "DHPP-73|2026-03-05": "NR",
  "DHPP-73|2026-03-06": "NR",
  "DHPP-73|2026-03-07": "NR",
  "DHPP-73|2026-03-08": "NR",
  "DHPP-73|2026-03-09": "NR",
  "Vacances scolaires|2026-03-01": "X",
  "PORNIC - PGCV|2026-04-11": "NR",
  "PORNIC - PGCV|2026-04-12": "NR",
  "PORNIC - PGCV|2026-04-13": "NR",
  "PORNIC - PGCV|2026-04-14": "NR",
  "PORNIC - PGCV|2026-04-15": "NR",
  "PORNIC - PGCV|2026-04-16": "NR",
  "PMG|2026-04-10": "NR",
  "PMG|2026-04-11": "NR",
  "PMG|2026-04-12": "NR",
  "PMG|2026-04-13": "NR",
  "PMG|2026-04-14": "NR",
  "PMG|2026-04-15": "NR",
  "PMG|2026-04-16": "NR",
  "PMG|2026-04-17": "NR",
  "PMG|2026-04-18": "NR",
  "PMG|2026-04-19": "NR",
  "PMG|2026-04-20": "NR",
  "PMG|2026-04-21": "NR",
  "PMG|2026-04-22": "NR",
  "PMG|2026-04-23": "NR",
  "PMG|2026-04-24": "NR",
  "PMG|2026-04-25": "NR",
  "BLOC n°02|2026-04-19": "C",
  "BLOC n°02|2026-04-20": "C",
  "BLOC n°02|2026-04-21": "C",
  "BLOC n°02|2026-04-22": "C",
  "BLOC n°02|2026-04-23": "C",
  "BLOC n°02|2026-04-24": "C",
  "Poseidon|2026-04-06": "NR",
  "Poseidon|2026-04-07": "NR",
  "Poseidon|2026-04-08": "NR",
  "Poseidon|2026-04-09": "NR",
  "Poseidon|2026-04-10": "NR",
  "Poseidon|2026-04-11": "NR",
  "Poseidon|2026-04-12": "NR",
  "Poseidon|2026-04-13": "NR",
  "Poseidon|2026-04-14": "NR",
  "Poseidon|2026-04-15": "NR",
  "Poseidon|2026-04-16": "NR",
  "Poseidon|2026-04-17": "NR",
  "Poseidon|2026-04-18": "NR",
  "Poseidon|2026-04-19": "NR",
  "Poseidon|2026-04-20": "NR",
  "Poseidon|2026-04-21": "NR",
  "Poseidon|2026-04-22": "NR",
  "Poseidon - bis|2026-04-20": "NR",
  "Poseidon - bis|2026-04-21": "NR",
  "Poseidon - bis|2026-04-22": "NR",
  "Poseidon - bis|2026-04-23": "NR",
  "Poseidon - bis|2026-04-24": "NR",
  "Poseidon - bis|2026-04-25": "NR",
  "Poseidon - bis|2026-04-26": "NR",
  "Poseidon - bis|2026-04-27": "NR",
  "Poseidon - bis|2026-04-28": "NR",
  "Poseidon - bis|2026-04-29": "NR",
  "Poseidon - bis|2026-04-30": "NR",
  "formation|2026-04-30": "C",
  "Vacances scolaires|2026-04-11": "X",
  "Vacances scolaires|2026-04-12": "X",
  "Vacances scolaires|2026-04-13": "X",
  "Vacances scolaires|2026-04-14": "X",
  "Vacances scolaires|2026-04-15": "X",
  "Vacances scolaires|2026-04-16": "X",
  "Vacances scolaires|2026-04-17": "X",
  "Vacances scolaires|2026-04-18": "X",
  "Vacances scolaires|2026-04-19": "X",
  "Vacances scolaires|2026-04-20": "X",
  "Vacances scolaires|2026-04-21": "X",
  "Vacances scolaires|2026-04-22": "X",
  "Vacances scolaires|2026-04-23": "X",
  "Vacances scolaires|2026-04-24": "X",
  "Vacances scolaires|2026-04-25": "X",
  "PORNIC - DEPP|2026-05-23": "C",
  "PORNIC - DEPP|2026-05-24": "C",
  "PORNIC - DEPP|2026-05-25": "C",
  "PORNIC - DEPP|2026-05-26": "C",
  "PORNIC - PGCV|2026-05-23": "NR",
  "PORNIC - PGCV|2026-05-24": "NR",
  "PORNIC - PGCV|2026-05-25": "NR",
  "PORNIC - PGCV|2026-05-30": "NR",
  "PORNIC - PGCV|2026-05-31": "NR",
  "Poseidon|2026-05-01": "NR",
  "Poseidon|2026-05-02": "NR",
  "Poseidon|2026-05-03": "NR",
  "Poseidon|2026-05-04": "NR",
  "Poseidon|2026-05-05": "NR",
  "Poseidon|2026-05-06": "NR",
  "Poseidon|2026-05-18": "NR",
  "Poseidon|2026-05-19": "NR",
  "Poseidon|2026-05-20": "NR",
  "Poseidon|2026-05-21": "NR",
  "Poseidon|2026-05-22": "NR",
  "Poseidon|2026-05-23": "NR",
  "Poseidon|2026-05-24": "NR",
  "Poseidon|2026-05-25": "NR",
  "Poseidon|2026-05-26": "NR",
  "Poseidon|2026-05-27": "NR",
  "Poseidon|2026-05-28": "NR",
  "Poseidon|2026-05-29": "NR",
  "Poseidon|2026-05-30": "NR",
  "Poseidon|2026-05-31": "NR",
  "Poseidon - bis|2026-05-04": "C",
  "Poseidon - bis|2026-05-05": "C",
  "Poseidon - bis|2026-05-06": "C",
  "Poseidon - bis|2026-05-07": "C",
  "Poseidon - bis|2026-05-08": "C",
  "Poseidon - bis|2026-05-09": "C",
  "Poseidon - bis|2026-05-10": "C",
  "Poseidon - bis|2026-05-11": "C",
  "Poseidon - bis|2026-05-12": "C",
  "Poseidon - bis|2026-05-13": "C",
  "Poseidon - bis|2026-05-14": "C",
  "Poseidon - bis|2026-05-15": "C",
  "Poseidon - bis|2026-05-16": "C",
  "Poseidon - bis|2026-05-17": "C",
  "Poseidon - bis|2026-05-18": "C",
  "Poseidon - bis|2026-05-19": "C",
  "Poseidon - bis|2026-05-20": "C",
  "Vacances scolaires|2026-05-14": "X",
  "Vacances scolaires|2026-05-15": "X",
  "Vacances scolaires|2026-05-16": "X",
  "Vacances scolaires|2026-05-17": "X",
  "PORNIC - PGCV|2026-06-06": "C",
  "PORNIC - PGCV|2026-06-07": "C",
  "PORNIC - PGCV|2026-06-13": "V",
  "PORNIC - PGCV|2026-06-14": "V",
  "PORNIC - PGCV|2026-06-20": "V",
  "PORNIC - PGCV|2026-06-21": "V",
  "PORNIC - PGCV|2026-06-27": "V",
  "PORNIC - PGCV|2026-06-28": "V",
  "St BRV - PGCV|2026-06-06": "V",
  "St BRV - PGCV|2026-06-07": "V",
  "St BRV - PGCV|2026-06-13": "V",
  "St BRV - PGCV|2026-06-14": "V",
  "St BRV - PGCV|2026-06-17": "C",
  "St BRV - PGCV|2026-06-20": "V",
  "St BRV - PGCV|2026-06-21": "V",
  "St BRV - PGCV|2026-06-27": "V",
  "St BRV - PGCV|2026-06-28": "V",
  "helfest clisson|2026-06-17": "NR",
  "helfest clisson|2026-06-18": "NR",
  "helfest clisson|2026-06-19": "NR",
  "helfest clisson|2026-06-20": "NR",
  "helfest clisson|2026-06-21": "NR",
  "helfest clisson|2026-06-22": "NR",
  "Poseidon|2026-06-01": "NR",
  "Poseidon|2026-06-02": "NR",
  "Poseidon|2026-06-03": "NR",
  "Poseidon - bis|2026-06-01": "NR",
  "Poseidon - bis|2026-06-02": "NR",
  "Poseidon - bis|2026-06-03": "NR",
  "Poseidon - bis|2026-06-04": "NR",
  "Poseidon - bis|2026-06-05": "NR",
  "Poseidon - bis|2026-06-06": "NR",
  "Poseidon - bis|2026-06-07": "NR",
  "Poseidon - bis|2026-06-08": "NR",
  "Poseidon - bis|2026-06-09": "NR",
  "Poseidon - bis|2026-06-10": "NR",
  "Poseidon - bis|2026-06-11": "NR",
  "Poseidon - bis|2026-06-12": "NR",
  "Poseidon - bis|2026-06-13": "NR",
  "Poseidon - bis|2026-06-14": "NR",
  "Poseidon - bis|2026-06-15": "NR",
  "Poseidon - bis|2026-06-16": "NR",
  "Poseidon - bis|2026-06-17": "NR",
  "PMG|2026-07-12": "C",
  "PMG|2026-07-13": "C",
  "PMG|2026-07-14": "C",
  "PMG|2026-07-15": "C",
  "PMG|2026-07-16": "C",
  "PMG|2026-07-17": "C",
  "PMG|2026-07-18": "C",
  "PMG|2026-07-19": "C",
  "PMG|2026-07-20": "C",
  "PMG|2026-07-21": "C",
  "PMG|2026-07-22": "C",
  "PMG|2026-07-23": "C",
  "PMG|2026-07-24": "C",
  "PMG|2026-07-25": "C",
  "PMG|2026-07-26": "C",
  "PMG|2026-07-27": "C",
  "PMG|2026-07-28": "C",
  "PMG|2026-07-29": "C",
  "PMG|2026-07-30": "C",
  "PMG|2026-07-31": "C",
  "BLOC n°02|2026-07-13": "NR",
  "BLOC n°02|2026-07-14": "NR",
  "BLOC n°02|2026-07-15": "NR",
  "BLOC n°02|2026-07-16": "NR",
  "BLOC n°02|2026-07-17": "NR",
  "BLOC n°02|2026-07-18": "NR",
  "BLOC n°02|2026-07-19": "NR",
  "BLOC n°02|2026-07-20": "NR",
  "BLOC n°02|2026-07-21": "NR",
  "BLOC n°02|2026-07-22": "NR",
  "BLOC n°02|2026-07-23": "NR",
  "BLOC n°02|2026-07-24": "NR",
  "BLOC n°02|2026-07-25": "NR",
  "Acculturation|2026-07-06": "NR",
  "Acculturation|2026-07-07": "NR",
  "Acculturation|2026-07-08": "NR",
  "Acculturation|2026-07-09": "NR",
  "Acculturation|2026-07-10": "NR",
  "Acculturation|2026-07-11": "NR",
  "Acculturation|2026-07-12": "NR",
  "PORNIC - DEPP|2026-08-14": "C",
  "PORNIC - DEPP|2026-08-15": "C",
  "PORNIC - DEPP|2026-08-16": "C",
  "PORNIC - DEPP|2026-08-17": "C",
  "PORNIC - DEPP|2026-08-18": "C",
  "PORNIC - DEPP|2026-08-19": "C",
  "PORNIC - DEPP|2026-08-20": "C",
  "PORNIC - DEPP|2026-08-21": "C",
  "PORNIC - DEPP|2026-08-22": "C",
  "PORNIC - DEPP|2026-08-23": "C",
  "PORNIC - DEPP|2026-08-24": "NR",
  "PORNIC - DEPP|2026-08-25": "NR",
  "PORNIC - DEPP|2026-08-26": "NR",
  "PORNIC - DEPP|2026-08-27": "NR",
  "PORNIC - DEPP|2026-08-28": "NR",
  "PORNIC - DEPP|2026-08-29": "NR",
  "PORNIC - DEPP|2026-08-30": "NR",
  "PMG|2026-08-01": "C",
  "PMG|2026-08-02": "C",
  "PMG|2026-08-03": "C",
  "PMG|2026-08-04": "C",
  "PMG|2026-08-05": "C",
  "PMG|2026-08-06": "C",
  "Poseidon - bis|2026-08-24": "V",
  "Poseidon - bis|2026-08-25": "V",
  "Poseidon - bis|2026-08-26": "V",
  "Poseidon - bis|2026-08-27": "V",
  "Poseidon - bis|2026-08-28": "V",
  "Poseidon - bis|2026-08-29": "V",
  "Poseidon - bis|2026-08-30": "V",
  "Poseidon - bis|2026-08-31": "V",
  "Poseidon|2026-09-07": "NR",
  "Poseidon|2026-09-08": "NR",
  "Poseidon|2026-09-09": "NR",
  "Poseidon|2026-09-10": "NR",
  "Poseidon|2026-09-11": "NR",
  "Poseidon|2026-09-12": "NR",
  "Poseidon|2026-09-13": "NR",
  "Poseidon|2026-09-14": "NR",
  "Poseidon|2026-09-15": "NR",
  "Poseidon|2026-09-16": "NR",
  "Poseidon|2026-09-17": "NR",
  "Poseidon|2026-09-18": "NR",
  "Poseidon|2026-09-19": "NR",
  "Poseidon|2026-09-20": "NR",
  "Poseidon|2026-09-21": "NR",
  "Poseidon|2026-09-22": "NR",
  "Poseidon|2026-09-23": "NR",
  "Poseidon - bis|2026-09-01": "V",
  "Poseidon - bis|2026-09-02": "V",
  "Poseidon - bis|2026-09-03": "V",
  "Poseidon - bis|2026-09-04": "V",
  "Poseidon - bis|2026-09-05": "V",
  "Poseidon - bis|2026-09-06": "V",
  "Poseidon - bis|2026-09-07": "V",
  "Poseidon - bis|2026-09-08": "V",
  "Poseidon - bis|2026-09-09": "V",
  "Poseidon - bis|2026-09-21": "NR",
  "Poseidon - bis|2026-09-22": "NR",
  "Poseidon - bis|2026-09-23": "NR",
  "Poseidon - bis|2026-09-24": "NR",
  "Poseidon - bis|2026-09-25": "NR",
  "Poseidon - bis|2026-09-26": "NR",
  "Poseidon - bis|2026-09-27": "NR",
  "Poseidon - bis|2026-09-28": "NR",
  "Poseidon - bis|2026-09-29": "NR",
  "Poseidon - bis|2026-09-30": "NR",
  "PMG|2026-10-16": "V",
  "PMG|2026-10-17": "V",
  "PMG|2026-10-18": "V",
  "PMG|2026-10-19": "V",
  "PMG|2026-10-20": "V",
  "PMG|2026-10-21": "V",
  "PMG|2026-10-22": "V",
  "PMG|2026-10-23": "V",
  "PMG|2026-10-24": "V",
  "PMG|2026-10-25": "V",
  "PMG|2026-10-26": "V",
  "PMG|2026-10-27": "V",
  "PMG|2026-10-28": "V",
  "PMG|2026-10-29": "V",
  "PMG|2026-10-30": "V",
  "PMG|2026-10-31": "V",
  "Poseidon|2026-10-05": "NR",
  "Poseidon|2026-10-06": "NR",
  "Poseidon|2026-10-07": "NR",
  "Poseidon|2026-10-08": "NR",
  "Poseidon|2026-10-09": "NR",
  "Poseidon|2026-10-10": "NR",
  "Poseidon|2026-10-11": "NR",
  "Poseidon|2026-10-12": "NR",
  "Poseidon|2026-10-13": "NR",
  "Poseidon|2026-10-14": "NR",
  "Poseidon|2026-10-15": "NR",
  "Poseidon|2026-10-16": "NR",
  "Poseidon|2026-10-17": "NR",
  "Poseidon|2026-10-18": "NR",
  "Poseidon|2026-10-19": "NR",
  "Poseidon|2026-10-20": "NR",
  "Poseidon|2026-10-21": "NR",
  "Poseidon - bis|2026-10-01": "NR",
  "Poseidon - bis|2026-10-02": "NR",
  "Poseidon - bis|2026-10-03": "NR",
  "Poseidon - bis|2026-10-04": "NR",
  "Poseidon - bis|2026-10-05": "NR",
  "Poseidon - bis|2026-10-06": "NR",
  "Poseidon - bis|2026-10-19": "NR",
  "Poseidon - bis|2026-10-20": "NR",
  "Poseidon - bis|2026-10-21": "NR",
  "Poseidon - bis|2026-10-22": "NR",
  "Poseidon - bis|2026-10-23": "NR",
  "Poseidon - bis|2026-10-24": "NR",
  "Poseidon - bis|2026-10-25": "NR",
  "Poseidon - bis|2026-10-26": "NR",
  "Poseidon - bis|2026-10-27": "NR",
  "Poseidon - bis|2026-10-28": "NR",
  "Poseidon - bis|2026-10-29": "NR",
  "Poseidon - bis|2026-10-30": "NR",
  "Poseidon - bis|2026-10-31": "NR",
  "Vacances scolaires|2026-10-17": "X",
  "Vacances scolaires|2026-10-18": "X",
  "Vacances scolaires|2026-10-19": "X",
  "Vacances scolaires|2026-10-20": "X",
  "Vacances scolaires|2026-10-21": "X",
  "Vacances scolaires|2026-10-22": "X",
  "Vacances scolaires|2026-10-23": "X",
  "Vacances scolaires|2026-10-24": "X",
  "Vacances scolaires|2026-10-25": "X",
  "Vacances scolaires|2026-10-26": "X",
  "Vacances scolaires|2026-10-27": "X",
  "Vacances scolaires|2026-10-28": "X",
  "Vacances scolaires|2026-10-29": "X",
  "Vacances scolaires|2026-10-30": "X",
  "Vacances scolaires|2026-10-31": "X",
  "Poseidon|2026-11-02": "V",
  "Poseidon|2026-11-03": "V",
  "Poseidon|2026-11-04": "V",
  "Poseidon|2026-11-05": "V",
  "Poseidon|2026-11-06": "V",
  "Poseidon|2026-11-07": "V",
  "Poseidon|2026-11-08": "V",
  "Poseidon|2026-11-09": "V",
  "Poseidon|2026-11-10": "V",
  "Poseidon|2026-11-11": "V",
  "Poseidon|2026-11-12": "V",
  "Poseidon|2026-11-13": "V",
  "Poseidon|2026-11-14": "V",
  "Poseidon|2026-11-15": "V",
  "Poseidon|2026-11-16": "V",
  "Poseidon|2026-11-17": "V",
  "Poseidon|2026-11-18": "V",
  "Poseidon|2026-11-30": "V",
  "Poseidon - bis|2026-11-01": "NR",
  "Poseidon - bis|2026-11-02": "NR",
  "Poseidon - bis|2026-11-03": "NR",
  "Poseidon - bis|2026-11-04": "NR",
  "Poseidon - bis|2026-11-16": "V",
  "Poseidon - bis|2026-11-17": "V",
  "Poseidon - bis|2026-11-18": "V",
  "Poseidon - bis|2026-11-19": "V",
  "Poseidon - bis|2026-11-20": "V",
  "Poseidon - bis|2026-11-21": "V",
  "Poseidon - bis|2026-11-22": "V",
  "Poseidon - bis|2026-11-23": "V",
  "Poseidon - bis|2026-11-24": "V",
  "Poseidon - bis|2026-11-25": "V",
  "Poseidon - bis|2026-11-26": "V",
  "Poseidon - bis|2026-11-27": "V",
  "Poseidon - bis|2026-11-28": "V",
  "Poseidon - bis|2026-11-29": "V",
  "Poseidon - bis|2026-11-30": "V",
  "Vacances scolaires|2026-11-01": "X",
  "Vacances scolaires|2026-11-02": "X",
  "Poseidon|2026-12-01": "V",
  "Poseidon|2026-12-02": "V",
  "Poseidon|2026-12-03": "V",
  "Poseidon|2026-12-04": "V",
  "Poseidon|2026-12-05": "V",
  "Poseidon|2026-12-06": "V",
  "Poseidon|2026-12-07": "V",
  "Poseidon|2026-12-08": "V",
  "Poseidon|2026-12-09": "V",
  "Poseidon|2026-12-10": "V",
  "Poseidon|2026-12-11": "V",
  "Poseidon|2026-12-12": "V",
  "Poseidon|2026-12-13": "V",
  "Poseidon|2026-12-14": "V",
  "Poseidon|2026-12-15": "V",
  "Poseidon|2026-12-16": "V",
  "Poseidon - bis|2026-12-01": "V",
  "Poseidon - bis|2026-12-02": "V",
  "Vacances scolaires|2026-12-19": "X",
  "Vacances scolaires|2026-12-20": "X",
  "Vacances scolaires|2026-12-21": "X",
  "Vacances scolaires|2026-12-22": "X",
  "Vacances scolaires|2026-12-23": "X",
  "Vacances scolaires|2026-12-24": "X",
  "Vacances scolaires|2026-12-25": "X",
  "Vacances scolaires|2026-12-26": "X",
  "Vacances scolaires|2026-12-27": "X",
  "Vacances scolaires|2026-12-28": "X",
  "Vacances scolaires|2026-12-29": "X",
  "Vacances scolaires|2026-12-30": "X",
  "Vacances scolaires|2026-12-31": "X",
};
