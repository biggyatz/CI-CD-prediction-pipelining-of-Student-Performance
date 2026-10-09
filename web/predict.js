// Predicted math score from web/model.json (see export_web_model.py).
// `row` maps column name -> value, e.g. {gender: "female", reading_score: 72, ...}.
function predictMathScore(model, row) {
  const num = model.numeric;
  let y = model.intercept;
  num.columns.forEach((col, i) => { y += num.coef[i] * (Number(row[col]) - num.mean[i]) / num.scale[i]; });
  for (const [col, table] of Object.entries(model.offsets)) {
    if (!(row[col] in table)) throw new Error(`Unknown ${col}: ${row[col]}`);
    y += table[row[col]];
  }
  return y;
}

if (typeof module !== "undefined") module.exports = { predictMathScore };
