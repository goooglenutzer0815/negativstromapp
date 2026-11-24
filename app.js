(() => {
  "use strict";

  const API_URL = "https://api.awattar.de/v1/marketdata";

  const $ = (id) => document.getElementById(id);

  let prices = []; 
  let surchargeCt = 12;
  let usingLive = false;

  const fmt = (ct) =>
    ct.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const hhmm = (ts) =>
    new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const level = (ct) => {
    if (ct < 0) return "neg";
    if (ct <= 18) return "cheap";
    if (ct <= 30) return "mid";
    return "exp";
  };

  const VERDICT = {
    neg:   ["GELD-ZURÜCK-STROM!", "Tarife mit Negativpreis-Durchgabe zahlen dir jetzt fürs Verbrauchen. Also: alles parallel anwerfen."],
    cheap: ["Günstig – JETZT laufen lassen", "Waschmaschine, Geschirrspüler oder Akku laden: Diese Stunden sind unterdurchschnittlich billig."],
    mid:   ["Normal", "Nicht falsch, aber kein Schnäppchen. Wenn es nicht dringend ist: warten."],
    exp:   ["Teuer – Finger weg", "Spitze der Preiskurve. Wenn möglich: nichts einschalten, was auch später laufen kann."],
  };

  function demoData() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const out = [];
    const negDay = Math.random() < 0.4;
    const base = 70 + Math.random() * 30;
    for (let i = 0; i < 24; i++) {
      const h = (now.getHours() + i) % 24;
      let p = base;
      if (h >= 6 && h <= 9) p += 25;          // Morgen-Peak
      if (h >= 11 && h <= 15) p -= 45;        // Solar-Dip
      if (h >= 18 && h <= 21) p += 55;        // Abend-Peak
      if (h >= 0 && h <= 4) p -= 15;          // Nacht-Tal
      p += (Math.random() - 0.5) * 18;
      if (negDay && h >= 12 && h <= 14) p = -(10 + Math.random() * 25);
      const rawCt = Math.round(p) / 10;
      out.push({ start: now.getTime() + i * 3600e3, rawCt, ct: rawCt });
    }
    return out;
  }

  function toConsumerCt(eurPerMwh) {
    return eurPerMwh / 10 + surchargeCt;
  }

  async function load() {
    try {
      const res = await fetch(`${API_URL}?start=${Date.now()}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      prices = (json.data || []).map((d) => ({
        start: d.start_timestamp,
        rawCt: d.marketprice / 10,
        ct: toConsumerCt(d.marketprice),
      }));
      if (prices.length < 6) throw new Error("zu wenig Daten");
      usingLive = true;
      $("status").textContent = "Live-Preise: aWATTar Börsenhandel (DE)";
      $("status").classList.add("live");
    } catch {
      prices = demoData();
      usingLive = false;
      $("status").textContent = "Demo-Daten (keine Live-Preise erreichbar)";
      $("status").classList.add("demo");
    }
    render();
  }

  function cheapestWindow(n, fromIdx = 0) {
    let best = { idx: 0, avg: Infinity };
    for (let i = fromIdx; i + n <= prices.length; i++) {
      const slice = prices.slice(i, i + n);
      const avg = slice.reduce((s, p) => s + p.ct, 0) / n;
      if (avg < best.avg) best = { idx: i, avg };
    }
    return best;
  }

  function render() {
    surchargeCt = Math.max(0, parseFloat($("surcharge").value) || 0);
    prices = prices.map((p) => ({ ...p, ct: p.rawCt + surchargeCt }));

    const nowIdx = 0;
    const now = prices[nowIdx];
    const lv = level(now.ct);
    const [verdict, tip] = VERDICT[lv];

    $("now-price").textContent = now.ct < 0 ? `${fmt(now.ct)} ct` : `${fmt(now.ct)} ct/kWh`;
    $("now-price").className = `now-price p-${lv}`;
    $("now-verdict").textContent = verdict;
    $("now-verdict").className = `now-verdict p-${lv}`;
    $("now-tip").textContent = tip;

    const negCount = prices.filter((p) => p.ct < 0).length;
    $("neg-hours").textContent = String(negCount);

    const w = cheapestWindow(6);
    $("cheap-window").textContent =
      w.idx === 0 ? "ab jetzt! ⚡" : `${hhmm(prices[w.idx].start)}–${hhmm(prices[Math.min(w.idx + 6, prices.length - 1) + 1]?.start ?? prices[prices.length - 1].start + 3600e3)}`;

    renderChart();
    renderPlan();
    renderSim();
    renderCalc();
    $("disclaimer").textContent = usingLive
      ? "Live: Börsenpreis (EPEX/aWATTar) + von dir gesetzter Aufschlag. Ohne Gewähr."
      : "Demo-Daten zur Veranschaulichung eines typischen Börsenpreis-Tags.";
  }

  function appliancePlan() {
    const appliances = [
      { icon: "🧺", name: "Waschmaschine", hours: 2, kwh: 1.0 },
      { icon: "🍽️", name: "Geschirrspüler", hours: 2.5, kwh: 1.5 },
      { icon: "👕", name: "Trockner", hours: 2, kwh: 2.5 },
      { icon: "🚿", name: "Boiler / Warmwasser", hours: 1, kwh: 2.0 },
      { icon: "🚗", name: "E-Auto / Akku laden", hours: 4, kwh: 10 },
    ];
    const avgAll = prices.reduce((s, p) => s + p.ct, 0) / prices.length;
    const rows = [];
    for (const a of appliances) {
      const n = Math.min(Math.round(a.hours), prices.length);
      const win = cheapestWindow(n);
      const savings = Math.max(0, (avgAll - win.avg) / 100 * a.kwh);
      rows.push({
        ...a,
        from: hhmm(prices[win.idx].start),
        to: hhmm(prices[win.idx + n - 1].start + 3600e3),
        win: win.avg,
        level: level(win.avg),
        savings,
      });
    }
    return { avgAll, rows };
  }

  function renderPlan() {
    const { rows } = appliancePlan();
    $("plan").innerHTML = rows
      .map((r) => {
        const badge =
          r.level === "neg"
            ? `<span class="plan-level p-neg">GRATIS 💰</span>`
            : r.level === "cheap"
            ? `<span class="plan-level p-cheap">spart ~${r.savings.toFixed(2).replace(".", ",")} €/Ladung</span>`
            : `<span class="plan-level p-mid">kein Schnäppchen</span>`;
        return `<div class="plan-row">
          <span class="plan-icon">${r.icon}</span>
          <span class="plan-time">${r.from} – ${r.to}</span>
          <span class="plan-what">${r.name} (${r.kwh} kWh)</span>
          ${badge}
        </div>`;
      })
      .join("");
  }

  function renderChart() {
    const max = Math.max(...prices.map((p) => p.ct), 1);
    const min = Math.min(...prices.map((p) => p.ct), 0);
    const range = max - min || 1;
    const chart = $("chart");
    chart.innerHTML = prices
      .map((p, i) => {
        const h = Math.max(4, ((p.ct - min) / range) * 100);
        const lv = level(p.ct);
        return `<div class="bar${i === 0 ? " now" : ""} b-${lv}" style="height:${h}%">
          <span class="tip">${hhmm(p.start)} · ${fmt(p.ct)} ct</span>
        </div>`;
      })
      .join("");
    chart.parentElement
      .querySelectorAll(":scope > .bar-labels")
      .forEach((el) => el.remove());
    chart.insertAdjacentHTML(
      "afterend",
      `<div class="bar-labels">${prices
        .map((p, i) => {
          const d = new Date(p.start);
          return `<span>${i % 3 === 0 ? String(d.getHours()).padStart(2, "0") + "h" : "&nbsp;"}</span>`;
        })
        .join("")}</div>`
    );
  }

  function renderCalc() {
    const usage = Math.max(0, parseFloat($("usage").value) || 0);
    const flat = Math.max(0, parseFloat($("flat").value) || 0);
    const surcharge = Math.max(0, parseFloat($("surcharge").value) || 0);

    const avgAll = prices.reduce((s, p) => s + p.ct, 0) / prices.length;
    const w6 = cheapestWindow(6);
    const shiftShare = 0.35;

    const flexSavingsPerKwh = (avgAll - w6.avg) / 100;
    const annualSavings =
      usage * ((flat - avgAll) / 100) + usage * shiftShare * flexSavingsPerKwh;
    const monthly = annualSavings / 12;

    $("calc-result").innerHTML = annualSavings > 0
      ? `Potenzial pro Jahr: <strong>${annualSavings.toFixed(0)} €</strong> <span style="color:var(--muted)">(≈ ${monthly.toFixed(0)} €/Monat)</span>`
      : `<span class="p-mid">Bei deinen Angaben lohnt der Wechsel kaum – gib deinen echten Festpreis ein.</span>`;
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SIM_APPLIANCES = [
    { icon: "\u{1F9FA}", name: "Waschmaschine", hours: 2, kwh: 1.2, dumb: 9 },
    { icon: "\u{1F37D}\uFE0F", name: "Geschirrspüler", hours: 2.5, kwh: 1.5, dumb: 20 },
    { icon: "\u{1F455}", name: "Trockner", hours: 2, kwh: 2.5, dumb: 19 },
    { icon: "\u{1F6C1}", name: "Boiler / Warmwasser", hours: 1, kwh: 2.0, dumb: 7 },
    { icon: "\u{1F697}", name: "E-Auto / Akku laden", hours: 4, kwh: 10, dumb: 19 },
  ];

  const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  function simWeek() {
    const rnd = mulberry32(20260101);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const base = 50 + rnd() * 60;
      const negDay = rnd() < 0.4;
      const raw = [];
      for (let h = 0; h < 24; h++) {
        let p = base;
        if (h >= 6 && h <= 9) p += 20 + rnd() * 10;
        if (h >= 11 && h <= 15) p -= 40 + rnd() * 15;
        if (h >= 17 && h <= 21) p += 50 + rnd() * 20;
        p += (rnd() - 0.5) * 16;
        if (negDay && h >= 12 && h <= 14) p = -(15 + rnd() * 35);
        raw.push(p / 10);
      }
      days.push({ raw, negCount: raw.filter((x) => x < 0).length });
    }
    return days;
  }

  function simRun(day, appl, auto, surcharge) {
    const n = Math.min(Math.round(appl.hours), 24);
    const cts = day.raw.map((r) => r + surcharge);
    let start = appl.dumb;
    if (auto) {
      let bestAvg = Infinity;
      for (let s = 0; s + n <= 24; s++) {
        const avg = cts.slice(s, s + n).reduce((x, y) => x + y, 0) / n;
        if (avg < bestAvg) {
          bestAvg = avg;
          start = s;
        }
      }
    }
    const avg = cts.slice(start, start + n).reduce((x, y) => x + y, 0) / n;
    return { start, avg, cost: (appl.kwh * avg) / 100 };
  }

  function renderSim() {
    const auto = $("auto-mode").checked;
    const surcharge = Math.max(0, parseFloat($("surcharge").value) || 0);
    $("sim-status").textContent = auto
      ? "Auto-Modus: AN – Geräte starten im günstigsten Fenster des Tages"
      : "Auto-Modus: AUS – Geräte laufen zur gewohnten Uhrzeit";
    $("sim-status").className = auto ? "sim-status on" : "sim-status";

    const days = simWeek();
    let costDumb = 0;
    let costOpt = 0;
    const dayStats = [];
    const runs = [];

    days.forEach((day, di) => {
      const stat = { name: DAY_SHORT[di], save: 0, negCount: day.negCount };
      for (const a of SIM_APPLIANCES) {
        const dumb = simRun(day, a, false, surcharge);
        const opt = simRun(day, a, true, surcharge);
        costDumb += dumb.cost;
        costOpt += opt.cost;
        stat.save += dumb.cost - opt.cost;
        if (di === 0) {
          runs.push({ a, dumb, opt, save: dumb.cost - opt.cost });
        }
      }
      dayStats.push(stat);
    });

    const weekSave = costDumb - costOpt;
    const yearSave = weekSave * 52;

    $("sim-total").innerHTML = auto
      ? `Ersparnis diese Woche: <strong>${fmt(weekSave)} €</strong> <span class="dumb">(unoptimiert ${fmt(costDumb)} € → optimiert ${fmt(costOpt)} €)</span> · hochgerechnet ≈ <strong>${Math.round(yearSave)} €/Jahr</strong>`
      : `Ohne Auto-Modus zahlst du <strong class="dumb">${fmt(costDumb)} €/Woche</strong> – mit Auto-Modus nur ${fmt(costOpt)} €: <strong>${fmt(weekSave)} € Ersparnis ≈ ${Math.round(yearSave)} €/Jahr</strong>`;

    $("sim-week").innerHTML = dayStats
      .map(
        (d) => `<div class="sim-day">
          <span class="day-name">${d.name}</span>
          <span class="day-save${d.save < 0.005 ? " zero" : ""}">${fmt(d.save)} €</span>
          <span class="day-neg">${d.negCount ? d.negCount + "h negativ" : ""}</span>
        </div>`
      )
      .join("");

    $("sim-runs").innerHTML = runs
      .map((r) => {
        const when = auto
          ? `${String(r.opt.start).padStart(2, "0")}:00 statt ${String(r.dumb.start).padStart(2, "0")}:00`
          : `${String(r.dumb.start).padStart(2, "0")}:00 (gewohnt)`;
        const badge = auto
          ? r.opt.avg < 0
            ? `<span class="run-badge p-neg">GRATIS 💰</span>`
            : `<span class="run-badge p-cheap">−${fmt(r.save).replace("-", "")} €/Woche</span>`
          : `<span class="run-badge p-mid">unoptimiert</span>`;
        return `<div class="sim-run">
          <span>${r.a.icon}</span>
          <span class="run-when">${when}</span>
          <span class="run-what">${r.a.name} (${r.a.kwh} kWh/Tag)</span>
          ${badge}
        </div>`;
      })
      .join("");
  }

  $("surcharge").addEventListener("change", render);
  $("auto-mode").addEventListener("change", renderSim);
  $("usage").addEventListener("input", renderCalc);
  $("flat").addEventListener("input", renderCalc);
  $("calc-btn").addEventListener("click", () => { renderPlan(); renderCalc(); });

  load();
})();
