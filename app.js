"use strict";
const el = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const FIELDS = [
  { col: "gender", label: "Gender" },
  { col: "race_ethnicity", label: "Race / ethnicity group" },
  { col: "parental_level_of_education", label: "Parental level of education" },
  { col: "lunch", label: "Lunch type" },
  { col: "test_preparation_course", label: "Test preparation course" },
];
const LABEL = {
  reading_score: "Reading", writing_score: "Writing", gender: "Gender", race_ethnicity: "Ethnicity",
  parental_level_of_education: "Parents", lunch: "Lunch", test_preparation_course: "Test prep",
};
const state = {
  gender: "female", race_ethnicity: "group C", parental_level_of_education: "some college",
  lunch: "standard", test_preparation_course: "none", reading_score: 70, writing_score: 70,
};

// tooltip
const tip = el("tooltip");
function showTip(e, title, rows) {
  tip.innerHTML = `<b>${esc(title)}</b>` + rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("");
  tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y + h > innerHeight - 8) y = e.clientY - h - 14;
  tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
}
function bindTips(svg, lookup) {
  svg.querySelectorAll("[data-tip]").forEach(n => {
    n.addEventListener("pointermove", e => { const t = lookup(n.dataset.tip); showTip(e, t.title, t.rows); });
    n.addEventListener("pointerleave", () => { tip.hidden = true; });
  });
}
function hbar(x, y, w, h, dir = 1, r = 4) {
  // Bar from x growing right (dir=1) or left (dir=-1), rounded at the data end only.
  w = Math.max(w, 1); r = Math.min(r, w, h / 2);
  if (dir > 0) return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  return `M${x},${y}H${x - w + r}Q${x - w},${y} ${x - w},${y + r}V${y + h - r}Q${x - w},${y + h} ${x - w + r},${y + h}H${x}Z`;
}

let M;
fetch("model.json").then(r => r.json()).then(m => { M = m; init(); });

function init() {
  renderKPIs();
  buildInputs();
  update();
  setupInsights();
  renderModelStats();
  document.querySelectorAll("[data-table-toggle]").forEach(btn => btn.addEventListener("click", () => {
    const t = el(btn.dataset.tableToggle + "-table"); t.hidden = !t.hidden; btn.textContent = t.hidden ? "Show table" : "Hide table";
  }));
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { update(); renderInsights(); }, 120); });
}

function renderKPIs() {
  const o = M.overall, m = M.metrics;
  const tiles = [
    ["Students", M.n.toLocaleString("en-GB"), "in the dataset"],
    ["Average math", o.math_score.toFixed(1), `reading ${o.reading_score.toFixed(1)} · writing ${o.writing_score.toFixed(1)}`],
    ["Model accuracy", `R² ${m.test_r2.toFixed(2)}`, "on 200 unseen students"],
    ["Typical error", `±${m.test_rmse.toFixed(1)}`, "points (RMSE)"],
  ];
  el("kpis").innerHTML = tiles.map(([l, v, n]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="note">${n}</div></div>`).join("");
}

function buildInputs() {
  let h = "";
  for (const f of FIELDS) {
    h += `<div class="field"><span>${f.label}</span><div class="seg" role="radiogroup" aria-label="${f.label}">` +
      Object.keys(M.offsets[f.col]).map(v => `<button class="chip" role="radio" data-col="${f.col}" data-val="${esc(v)}" aria-checked="${state[f.col] === v}">${esc(cap(v))}</button>`).join("") +
      `</div></div>`;
  }
  for (const [col, label] of [["reading_score", "Reading score"], ["writing_score", "Writing score"]]) {
    h += `<div class="field"><span id="${col}-l">${label}</span><div class="range-row"><input type="range" min="0" max="100" step="1" value="${state[col]}" id="${col}" aria-labelledby="${col}-l"><output for="${col}" id="${col}-o">${state[col]}</output></div></div>`;
  }
  el("inputs").innerHTML = h;
  el("inputs").addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    state[b.dataset.col] = b.dataset.val;
    b.parentElement.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-checked", c === b));
    update();
  });
  for (const col of ["reading_score", "writing_score"]) {
    el(col).addEventListener("input", e => { state[col] = +e.target.value; el(col + "-o").textContent = e.target.value; update(); });
  }
}

function update() {
  const ex = explainMathScore(M, state), score = Math.max(0, Math.min(100, ex.score)), rmse = M.metrics.test_rmse;
  el("score").textContent = score.toFixed(0);
  const diff = ex.score - ex.baseline;
  el("meta").innerHTML = `<span>Likely range <strong>${Math.max(0, score - rmse).toFixed(0)}–${Math.min(100, score + rmse).toFixed(0)}</strong></span>` +
    `<span>Average student <strong>${ex.baseline.toFixed(0)}</strong></span>` +
    `<span><strong>${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}</strong> vs average</span>`;
  renderContrib(ex.parts);
}

function renderContrib(parts) {
  parts = [...parts].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  const host = el("contrib-chart"), W = Math.max(300, host.clientWidth), labelW = Math.min(230, W * 0.46);
  const rowH = 30, barH = 16, H = parts.length * rowH + 4;
  const maxAbs = Math.max(5, ...parts.map(p => Math.abs(p.effect)));
  const plotL = labelW + 8, plotR = W - 8, mid = (plotL + plotR) / 2, half = (plotR - plotL) / 2 - 36;
  const sx = v => (v / maxAbs) * half;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Contribution of each input">`;
  s += `<line class="baseline" x1="${mid}" x2="${mid}" y1="0" y2="${H}"/>`;
  parts.forEach((p, i) => {
    const y = i * rowH + 7, w = Math.abs(sx(p.effect)), dir = p.effect >= 0 ? 1 : -1;
    const v = typeof p.value === "number" ? p.value : cap(p.value);
    s += `<text class="lbl" x="${labelW}" y="${y + barH / 2 + 4}" text-anchor="end">${esc(LABEL[p.col])}: ${esc(v)}</text>`;
    s += `<path class="${dir > 0 ? "pos-bar" : "neg-bar"}" d="${hbar(mid, y, w, barH, dir)}"/>`;
    s += `<text class="val" x="${mid + dir * (w + 6)}" y="${y + barH / 2 + 4}" text-anchor="${dir > 0 ? "start" : "end"}">${p.effect >= 0 ? "+" : "−"}${Math.abs(p.effect).toFixed(1)}</text>`;
    s += `<rect class="hit" data-tip="${i}" x="0" y="${y - 7}" width="${W}" height="${rowH}"/>`;
  });
  s += "</svg>";
  host.innerHTML = s;
  bindTips(host.querySelector("svg"), i => {
    const p = parts[i];
    return { title: LABEL[p.col], rows: [["Value", typeof p.value === "number" ? p.value : cap(p.value)], ["Effect vs average", (p.effect >= 0 ? "+" : "−") + Math.abs(p.effect).toFixed(2) + " pts"]] };
  });
}

// ---------- insights ----------
const SUBJECTS = [["math", "Math"], ["reading", "Reading"], ["writing", "Writing"]];
let subject = "math";
function setupInsights() {
  el("subject").innerHTML = SUBJECTS.map(([k, l]) => `<button class="chip" role="radio" data-s="${k}" aria-checked="${k === subject}">${l}</button>`).join("");
  el("subject").addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    subject = b.dataset.s; el("subject").querySelectorAll(".chip").forEach(c => c.setAttribute("aria-checked", c === b));
    renderInsights();
  });
  renderInsights();
}
function renderInsights() {
  const overall = M.overall[subject + "_score"];
  const panels = [["test_preparation_course", "Test preparation"], ["lunch", "Lunch type"], ["parental_level_of_education", "Parental education"], ["race_ethnicity", "Ethnicity group"], ["gender", "Gender"]];
  el("insights-chart").innerHTML = panels.map(([col, t], i) => `<div class="panel"><h3>${t}</h3><div id="ins-${i}"></div></div>`).join("");
  panels.forEach(([col], i) => {
    const rows = M.groups[col], box = el("ins-" + i), W = Math.max(260, box.clientWidth), labelW = Math.min(130, W * 0.42);
    const rowH = 26, barH = 14, H = rows.length * rowH + 22, lo = 50, hi = 80;
    const x = v => labelW + ((Math.max(lo, v) - lo) / (hi - lo)) * (W - labelW - 40);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Average ${subject} score by ${col}">`;
    for (const t of [50, 60, 70, 80]) s += `<line class="gridline" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 20}"/><text class="tick" x="${x(t)}" y="${H - 6}" text-anchor="middle">${t}</text>`;
    rows.forEach((r, j) => {
      const y = j * rowH + 5, v = r[subject];
      s += `<text class="lbl" x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end">${esc(cap(r.value))}</text>`;
      s += `<path d="${hbar(labelW, y, x(v) - labelW, barH)}" fill="var(--accent)"/>`;
      s += `<text class="val" x="${x(v) + 6}" y="${y + barH / 2 + 4}">${v.toFixed(1)}</text>`;
      s += `<rect class="hit" data-tip="${j}" x="0" y="${y - 6}" width="${W}" height="${rowH}"/>`;
    });
    s += `<line class="guide" x1="${x(overall)}" x2="${x(overall)}" y1="0" y2="${H - 20}"/>`;
    s += `</svg>`;
    box.innerHTML = s;
    bindTips(box.querySelector("svg"), j => ({ title: cap(rows[j].value), rows: [["Students", rows[j].n], ["Math", rows[j].math.toFixed(1)], ["Reading", rows[j].reading.toFixed(1)], ["Writing", rows[j].writing.toFixed(1)]] }));
  });
  const trows = [];
  for (const [col, t] of panels) for (const r of M.groups[col]) trows.push(`<tr><td>${t}</td><td>${esc(cap(r.value))}</td><td class="n">${r.n}</td><td class="n">${r.math.toFixed(1)}</td><td class="n">${r.reading.toFixed(1)}</td><td class="n">${r.writing.toFixed(1)}</td></tr>`);
  el("insights-table").innerHTML = `<table><thead><tr><th>Factor</th><th>Group</th><th class="n">Students</th><th class="n">Math</th><th class="n">Reading</th><th class="n">Writing</th></tr></thead><tbody>${trows.join("")}</tbody></table>`;
}

function renderModelStats() {
  const m = M.metrics;
  const tiles = [
    ["Test R²", m.test_r2.toFixed(3), "share of variation explained"],
    ["5-fold CV R²", `${m.cv_r2_mean.toFixed(3)}`, `± ${m.cv_r2_std.toFixed(3)} across folds`],
    ["Test RMSE", m.test_rmse.toFixed(2), "points"],
    ["Test MAE", m.test_mae.toFixed(2), "points, typical miss"],
  ];
  el("model-stats").innerHTML = tiles.map(([l, v, n]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="note">${n}</div></div>`).join("");
}
