"""Export the trained preprocessor + model to web/model.json.

The GitHub Pages version of the app (web/) computes the same prediction in
the browser:

  score = intercept + sum(coef * (x - mean) / scale)      numeric columns
                    + sum(offset[column][category])       categorical columns

The saved LinearRegression fell into the dummy-variable trap (one-hot columns
plus an intercept), so its raw coefficients are around +/-1e14 and cancel each
other out; evaluating them directly in float64 is only accurate to ~0.5 points.
Because exactly one category per column is active, each column's one-hot
weights can be folded into small per-category offsets and the intercept. That
is done here with exact rational arithmetic, so the exported numbers give the
model's true prediction without the cancellation error.

    python export_web_model.py
"""
import json
import os
from fractions import Fraction

from src.utils import load_object

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

preprocessor = load_object(os.path.join(BASE_DIR, "artifacts", "proprocessor.pkl"))
model = load_object(os.path.join(BASE_DIR, "artifacts", "model.pkl"))

num = preprocessor.named_transformers_["num_pipeline"]
cat = preprocessor.named_transformers_["cat_pipelines"]
num_cols = list(next(c for n, _, c in preprocessor.transformers_ if n == "num_pipeline"))
cat_cols = list(next(c for n, _, c in preprocessor.transformers_ if n == "cat_pipelines"))
encoder = cat.named_steps["one_hot_encoder"]

coef = [Fraction(c) for c in model.coef_.ravel().tolist()]
intercept = Fraction(float(model.intercept_))
n_num = len(num_cols)
cat_scale = [Fraction(v) for v in cat.named_steps["scaler"].scale_.tolist()]

offsets = {}
k = 0
for col, categories in zip(cat_cols, encoder.categories_):
    weights = [coef[n_num + k + j] / cat_scale[k + j] for j in range(len(categories))]
    base = weights[0]
    intercept += base
    offsets[col] = {str(c): float(w - base) for c, w in zip(categories, weights)}
    k += len(categories)

export = {
    "numeric": {
        "columns": num_cols,
        "mean": num.named_steps["scaler"].mean_.tolist(),
        "scale": num.named_steps["scaler"].scale_.tolist(),
        "coef": [float(c) for c in coef[:n_num]],
    },
    "offsets": offsets,
    "intercept": float(intercept),
}
with open(os.path.join(BASE_DIR, "web", "model.json"), "w") as f:
    json.dump(export, f, indent=1)
print("Wrote web/model.json")
