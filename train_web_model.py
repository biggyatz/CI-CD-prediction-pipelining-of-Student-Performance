"""Train the model behind the web app (web/) and export it to web/model.json.

Same features and split as the original pipeline (80/20, random_state=42), but
the one-hot encoder drops the first category of each column. That removes the
dummy-variable trap that made the original LinearRegression's coefficients
explode to ~1e14, so the coefficients are small, stable and directly readable
as "points added vs. the baseline category".

The export also carries what the web app needs to explain a prediction
(feature averages over the dataset) and the dataset summaries shown on the page.

    python train_web_model.py
"""
import json
import os

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE = os.path.dirname(os.path.abspath(__file__))
NUM = ["reading_score", "writing_score"]
CAT = ["gender", "race_ethnicity", "parental_level_of_education", "lunch", "test_preparation_course"]
EDU_ORDER = ["some high school", "high school", "some college", "associate's degree", "bachelor's degree", "master's degree"]

df = pd.read_csv(os.path.join(BASE, "notebook", "data", "stud.csv"))
X, y = df[NUM + CAT], df["math_score"]

categories = [EDU_ORDER if c == "parental_level_of_education" else sorted(df[c].unique()) for c in CAT]
model = Pipeline([
    ("prep", ColumnTransformer([("num", "passthrough", NUM),
                                ("cat", OneHotEncoder(categories=categories, drop="first"), CAT)])),
    ("reg", LinearRegression()),
])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model.fit(X_train, y_train)
pred = model.predict(X_test)
cv = cross_val_score(model, X, y, cv=KFold(5, shuffle=True, random_state=42), scoring="r2")
metrics = {
    "test_r2": round(r2_score(y_test, pred), 4),
    "test_rmse": round(float(np.sqrt(mean_squared_error(y_test, pred))), 3),
    "test_mae": round(mean_absolute_error(y_test, pred), 3),
    "cv_r2_mean": round(cv.mean(), 4),
    "cv_r2_std": round(cv.std(), 4),
    "n_train": len(X_train), "n_test": len(X_test),
}

coef = model.named_steps["reg"].coef_
num_coef = dict(zip(NUM, coef[:len(NUM)].tolist()))
offsets, k = {}, len(NUM)
for col, cats in zip(CAT, categories):
    offsets[col] = {cats[0]: 0.0}
    for c in cats[1:]:
        offsets[col][c] = float(coef[k]); k += 1

# Dataset averages, used to explain a prediction relative to an "average student".
num_mean = {c: float(df[c].mean()) for c in NUM}
offset_mean = {col: float(df[col].map(offsets[col]).mean()) for col in CAT}

groups = {}
for col, cats in zip(CAT, categories):
    g = df.groupby(col)[["math_score", "reading_score", "writing_score"]].mean().reindex(cats)
    groups[col] = [{"value": c, "n": int((df[col] == c).sum()), "math": round(r.math_score, 2),
                    "reading": round(r.reading_score, 2), "writing": round(r.writing_score, 2)} for c, r in g.iterrows()]

export = {
    "intercept": float(model.named_steps["reg"].intercept_),
    "numeric": num_coef,
    "offsets": offsets,
    "num_mean": num_mean,
    "offset_mean": offset_mean,
    "metrics": metrics,
    "groups": groups,
    "overall": {s: round(float(df[s].mean()), 2) for s in ("math_score", "reading_score", "writing_score")},
    "n": len(df),
}
with open(os.path.join(BASE, "web", "model.json"), "w") as f:
    json.dump(export, f, indent=1)
print(json.dumps(metrics, indent=1))
print("intercept", export["intercept"], "numeric", num_coef)
print(json.dumps(offsets, indent=1))
