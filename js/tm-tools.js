/* Test markazi yordamchi vositalari: laboratoriya me'yorlari jadvali va kalkulyator.
   tests.js ularni window.TMT.labs(A) va window.TMT.calc(A) orqali ochadi (A — app.js yordamchilari). */
(() => {
  "use strict";
  const lang = () => (window.I18N?.lang === "en" ? 1 : 0);

  /* Kattalar uchun o'rtacha me'yorlar (SI birliklarida). ♂ — erkak, ♀ — ayol.
     Satr: [[o'zbekcha nom, inglizcha nom], me'yor, birlik] */
  const LABS = [
    { t: ["Qonning umumiy tahlili", "Complete blood count"], r: [
      [["Gemoglobin", "Hemoglobin"], "♂ 130–160 · ♀ 120–140", "g/L"],
      [["Eritrotsitlar", "Red blood cells"], "♂ 4,0–5,0 · ♀ 3,7–4,7", "×10¹²/L"],
      [["Gematokrit", "Hematocrit"], "♂ 0,40–0,48 · ♀ 0,36–0,42", "L/L"],
      [["MCV (eritrotsitning o‘rtacha hajmi)", "MCV (mean cell volume)"], "80–100", "fL"],
      [["MCH (eritrotsitdagi o‘rtacha Hb)", "MCH (mean cell hemoglobin)"], "27–31", "pg"],
      [["MCHC (o‘rtacha Hb konsentratsiyasi)", "MCHC (mean cell Hb concentration)"], "320–360", "g/L"],
      [["Rang ko‘rsatkichi", "Color index"], "0,85–1,05", "—"],
      [["Retikulotsitlar", "Reticulocytes"], "0,2–1,2", "%"],
      [["Leykotsitlar", "White blood cells"], "4,0–9,0", "×10⁹/L"],
      [["Trombotsitlar", "Platelets"], "180–320", "×10⁹/L"],
      [["EChT (Vestergren)", "ESR (Westergren)"], "♂ 1–10 · ♀ 2–15", "mm/h"],
      [["Leykoformula: tayoqchayadroli neytrofillar", "Band neutrophils"], "1–6", "%"],
      [["Segmentyadroli neytrofillar", "Segmented neutrophils"], "47–72", "%"],
      [["Eozinofillar", "Eosinophils"], "0,5–5", "%"],
      [["Bazofillar", "Basophils"], "0–1", "%"],
      [["Limfotsitlar", "Lymphocytes"], "19–37", "%"],
      [["Monotsitlar", "Monocytes"], "3–11", "%"]
    ] },
    { t: ["Koagulyatsiya", "Coagulation"], r: [
      [["Protrombin vaqti", "Prothrombin time"], "11–15", "s"],
      [["INR", "INR"], "0,8–1,2", "—"],
      [["APTV (aktivlashgan qisman tromboplastin vaqti)", "aPTT"], "25–40", "s"],
      [["Trombin vaqti", "Thrombin time"], "14–21", "s"],
      [["Fibrinogen", "Fibrinogen"], "2–4", "g/L"]
    ] },
    { t: ["Qon biokimyosi: asosiy", "Blood chemistry: general"], r: [
      [["Glyukoza (och qoringa)", "Glucose (fasting)"], "3,3–5,5", "mmol/L"],
      [["HbA1c", "HbA1c"], "< 5,7 (≥ 6,5 — diabet)", "%"],
      [["Umumiy oqsil", "Total protein"], "65–85", "g/L"],
      [["Albumin", "Albumin"], "35–50", "g/L"],
      [["Mochevina", "Urea"], "2,5–8,3", "mmol/L"],
      [["Kreatinin", "Creatinine"], "♂ 62–115 · ♀ 53–97", "µmol/L"],
      [["Siydik kislotasi", "Uric acid"], "♂ 210–420 · ♀ 150–350", "µmol/L"],
      [["C-reaktiv oqsil (SRO)", "C-reactive protein"], "< 5", "mg/L"]
    ] },
    { t: ["Jigar va o‘t yo‘llari", "Liver and bile ducts"], r: [
      [["Umumiy bilirubin", "Total bilirubin"], "8,5–20,5", "µmol/L"],
      [["To‘g‘ri (bog‘langan) bilirubin", "Direct bilirubin"], "0–5,1", "µmol/L"],
      [["Egri (erkin) bilirubin", "Indirect bilirubin"], "≤ 15,4", "µmol/L"],
      [["ALT", "ALT"], "♂ ≤ 40 · ♀ ≤ 31", "U/L"],
      [["AST", "AST"], "♂ ≤ 40 · ♀ ≤ 31", "U/L"],
      [["Ishqoriy fosfataza", "Alkaline phosphatase"], "30–120", "U/L"],
      [["GGT", "GGT"], "♂ 10–71 · ♀ 6–42", "U/L"]
    ] },
    { t: ["Yurak va oshqozon osti bezi", "Heart and pancreas"], r: [
      [["Kreatinkinaza (umumiy)", "Creatine kinase (total)"], "♂ 24–195 · ♀ 24–170", "U/L"],
      [["KK-MB", "CK-MB"], "≤ 25", "U/L"],
      [["LDG", "LDH"], "120–250", "U/L"],
      [["Troponin I (usulga qarab)", "Troponin I (assay-dependent)"], "< 0,04", "ng/mL"],
      [["Amilaza (umumiy)", "Amylase (total)"], "28–100", "U/L"]
    ] },
    { t: ["Lipidlar", "Lipids"], r: [
      [["Umumiy xolesterin", "Total cholesterol"], "< 5,2", "mmol/L"],
      [["XS-LPNP (LDL)", "LDL cholesterol"], "< 3,0", "mmol/L"],
      [["XS-LPYUP (HDL)", "HDL cholesterol"], "♂ > 1,0 · ♀ > 1,2", "mmol/L"],
      [["Triglitseridlar", "Triglycerides"], "< 1,7", "mmol/L"]
    ] },
    { t: ["Elektrolitlar va minerallar", "Electrolytes and minerals"], r: [
      [["Natriy", "Sodium"], "135–145", "mmol/L"],
      [["Kaliy", "Potassium"], "3,5–5,1", "mmol/L"],
      [["Xlor", "Chloride"], "98–107", "mmol/L"],
      [["Kalsiy (umumiy)", "Calcium (total)"], "2,15–2,55", "mmol/L"],
      [["Kalsiy (ionlashgan)", "Calcium (ionized)"], "1,03–1,29", "mmol/L"],
      [["Magniy", "Magnesium"], "0,7–1,0", "mmol/L"],
      [["Fosfor (noorganik)", "Phosphate (inorganic)"], "0,81–1,45", "mmol/L"],
      [["Temir", "Iron"], "♂ 11,6–31,3 · ♀ 9,0–30,4", "µmol/L"]
    ] },
    { t: ["Qonning kislota-ishqor holati (arterial)", "Arterial blood gases"], r: [
      [["pH", "pH"], "7,35–7,45", "—"],
      [["PaCO₂", "PaCO₂"], "35–45", "mmHg"],
      [["PaO₂", "PaO₂"], "80–100", "mmHg"],
      [["HCO₃⁻", "HCO₃⁻"], "22–26", "mmol/L"],
      [["Asoslar farqi (BE)", "Base excess (BE)"], "−2 … +2", "mmol/L"],
      [["SaO₂", "SaO₂"], "95–100", "%"],
      [["Laktat", "Lactate"], "0,5–2,2", "mmol/L"]
    ] },
    { t: ["Qalqonsimon bez", "Thyroid"], r: [
      [["TTG", "TSH"], "0,4–4,0", "mIU/L"]
    ] },
    { t: ["Siydik", "Urine"], r: [
      [["Kunlik diurez", "Daily urine volume"], "1000–2000", "mL"],
      [["Nisbiy zichlik", "Specific gravity"], "1,010–1,025", "—"],
      [["pH", "pH"], "5,0–7,0", "—"],
      [["Oqsil", "Protein"], "yo‘q · < 0,15 g/kun", "—"],
      [["Glyukoza", "Glucose"], "yo‘q", "—"],
      [["Leykotsitlar (ko‘rish maydonida)", "Leukocytes (per field)"], "♂ 0–3 · ♀ 0–6", "—"],
      [["Eritrotsitlar (ko‘rish maydonida)", "Erythrocytes (per field)"], "0–1 (♀ 0–3)", "—"],
      [["Nechiporenko: leykotsitlar", "Nechiporenko: leukocytes"], "≤ 2000", "/mL"],
      [["Nechiporenko: eritrotsitlar", "Nechiporenko: erythrocytes"], "≤ 1000", "/mL"],
      [["Nechiporenko: silindrlar", "Nechiporenko: casts"], "≤ 20", "/mL"],
      [["Kreatinin klirensi (KFT)", "Creatinine clearance (GFR)"], "80–120", "mL/min"]
    ] }
  ];

  const NOTE = ["Me‘yorlar laboratoriya, usul va yoshga qarab farq qilishi mumkin. Test savolida me‘yor berilgan bo‘lsa, o‘shani ishlating.",
    "Reference ranges vary by laboratory, method and age. If the question gives its own range, use that one."];
  const T = {
    title: ["Laboratoriya me‘yorlari", "Laboratory reference values"],
    search: ["Qidirish…", "Search…"],
    none: ["Hech narsa topilmadi", "Nothing found"],
    close: ["Yopish", "Close"],
    calc: ["Kalkulyator", "Calculator"]
  };

  function labs(A) {
    const lg = lang();
    const body = LABS.map((s) => `<details class="tm-lab"><summary>${s.t[lg]}</summary><div class="tm-labt">${s.r.map((r) =>
      `<div class="tm-lr" data-s="${A.fold(r[0].join(" "))}"><span class="n">${r[0][lg]}</span><span class="v"><b>${r[1]}</b> <i>${r[2]}</i></span></div>`).join("")}</div></details>`).join("");
    const sh = A.sheet(`<h3>${T.title[lg]}</h3><p class="small muted" style="margin:0 0 10px">${NOTE[lg]}</p>
      <input type="search" id="labQ" class="tm-labq" placeholder="${T.search[lg]}" autocomplete="off">
      <div id="labBody" class="tm-labs">${body}</div><p id="labNone" class="small muted" hidden>${T.none[lg]}</p>
      <div class="acts"><button class="btn" data-x="close">${T.close[lg]}</button></div>`);
    const q = sh.el.querySelector("#labQ"), none = sh.el.querySelector("#labNone");
    q.addEventListener("input", () => {
      const v = A.fold(q.value.trim());
      let any = false;
      sh.el.querySelectorAll(".tm-lab").forEach((d) => {
        let n = 0;
        d.querySelectorAll(".tm-lr").forEach((tr) => { const hit = !v || tr.dataset.s.includes(v); tr.hidden = !hit; if (hit) n++; });
        d.hidden = !n; d.open = !!v && n > 0;
        if (n) any = true;
      });
      none.hidden = any;
    });
  }

  /* ---------- Kalkulyator ---------- */
  function calc(A) {
    const lg = lang();
    let cur = "0", acc = null, op = null, fresh = true, line = "";
    const fmt = (n) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(12))) : "Error");
    const apply = (a, o, b) => (o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : o === "÷" ? (b === 0 ? NaN : a / b) : b);
    const KEYS = [["C", "⌫", "%", "÷"], ["√", "x²", "log", "ln"], ["7", "8", "9", "×"], ["4", "5", "6", "−"], ["1", "2", "3", "+"], ["±", "0", ".", "="]];
    const sh = A.sheet(`<h3>${T.calc[lg]}</h3>
      <div class="tm-calc"><div class="tm-cd"><small id="cLine">&nbsp;</small><output id="cOut">0</output></div>
      <div class="tm-ck">${KEYS.flat().map((k) => `<button class="${/\d|\./.test(k) ? "n" : k === "=" ? "eq" : /[÷×−+]/.test(k) ? "op" : "fn"}" data-k="${k}">${k}</button>`).join("")}</div></div>
      <div class="acts"><button class="btn" data-x="close">${T.close[lg]}</button></div>`);
    const out = sh.el.querySelector("#cOut"), ln = sh.el.querySelector("#cLine");
    const show = () => { out.textContent = cur.replace(".", ","); ln.innerHTML = line || "&nbsp;"; };
    const val = () => parseFloat(cur);
    const bad = () => cur === "Error";
    const press = (k) => {
      if (bad() && k !== "C") return;
      if (/^\d$/.test(k)) { cur = fresh || cur === "0" ? k : (cur.length < 14 ? cur + k : cur); fresh = false; }
      else if (k === ".") { if (fresh) { cur = "0."; fresh = false; } else if (!cur.includes(".")) cur += "."; }
      else if (k === "C") { cur = "0"; acc = null; op = null; fresh = true; line = ""; }
      else if (k === "⌫") { if (!fresh) { cur = cur.length > 1 && cur !== "-0" ? cur.slice(0, -1) : "0"; if (cur === "-") cur = "0"; } }
      else if (k === "±") { cur = cur.startsWith("-") ? cur.slice(1) : cur === "0" ? cur : "-" + cur; }
      else if (k === "%") { const v = val(); cur = fmt(acc != null && (op === "+" || op === "−") ? (acc * v) / 100 : v / 100); fresh = true; }
      else if (k === "√") { cur = val() < 0 ? "Error" : fmt(Math.sqrt(val())); fresh = true; }
      else if (k === "x²") { cur = fmt(val() * val()); fresh = true; }
      else if (k === "log") { cur = val() <= 0 ? "Error" : fmt(Math.log10(val())); fresh = true; }
      else if (k === "ln") { cur = val() <= 0 ? "Error" : fmt(Math.log(val())); fresh = true; }
      else if (k === "=") {
        if (op != null) { const r = apply(acc, op, val()); line = `${fmt(acc)} ${op} ${fmt(val())} =`.replace(/\./g, ","); cur = fmt(r); acc = null; op = null; fresh = true; }
      } else { // + − × ÷
        if (op != null && !fresh) { cur = fmt(apply(acc, op, val())); }
        acc = val(); op = k; fresh = true; line = `${fmt(acc)} ${op}`.replace(/\./g, ",");
        if (bad()) { acc = null; op = null; line = ""; }
      }
      show();
    };
    sh.el.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => press(b.dataset.k)));
  }

  window.TMT = { labs, calc };
})();
