// Linear model exported by train_web_model.py.
// Returns the predicted math score and each input's contribution relative to
// an average student in the dataset (contributions + baseline = prediction).
function explainMathScore(model, row) {
  let baseline = model.intercept, total = model.intercept;
  const parts = [];
  for (const [col, w] of Object.entries(model.numeric)) {
    const v = Number(row[col]), mean = model.num_mean[col];
    baseline += w * mean; total += w * v;
    parts.push({ col, value: v, effect: w * (v - mean) });
  }
  for (const [col, table] of Object.entries(model.offsets)) {
    if (!(row[col] in table)) throw new Error(`Unknown ${col}: ${row[col]}`);
    const off = table[row[col]], mean = model.offset_mean[col];
    baseline += mean; total += off;
    parts.push({ col, value: row[col], effect: off - mean });
  }
  return { score: total, baseline, parts };
}
function predictMathScore(model, row) { return explainMathScore(model, row).score; }

if (typeof module !== "undefined") module.exports = { explainMathScore, predictMathScore };
