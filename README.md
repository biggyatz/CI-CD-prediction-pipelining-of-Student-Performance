# Student Performance Prediction — End-to-End ML Pipeline

**Live demo:** <https://biggyatz.github.io/student-performance-insights/>: estimate a math score, see which inputs moved it, and explore group averages (runs entirely in the browser).

Predicts a student's **math score** from demographics, lunch type, test
preparation and their reading/writing scores. The project is structured as a
production-style ML pipeline (ingestion → transformation → training →
prediction) with custom logging and exceptions, served by a Flask app.

## Results

Nine regressors were compared in `notebook/2. MODEL TRAINING.ipynb`; the
linear models generalised best.

| Model | Test R² |
| --- | --- |
| Ridge | 0.881 |
| **Linear Regression** (deployed) | **0.880** |
| Random Forest | 0.855 |
| CatBoost | 0.852 |
| AdaBoost | 0.844 |
| XGBoost | 0.828 |
| Lasso | 0.825 |
| K-Neighbours | 0.784 |
| Decision Tree | 0.734 |

Linear Regression test RMSE 5.40, MAE 4.22.

## Pipeline

```
notebook/data/stud.csv
   │  src/components/data_ingestion.py       read → artifacts/data.csv, 80/20 train/test split
   ▼
   │  src/components/data_transformation.py  impute + scale numerics, impute + one-hot + scale categoricals
   ▼                                          → artifacts/proprocessor.pkl
   │  src/components/model_trainer.py        GridSearchCV over 7 models, keep best by test R² (≥ 0.6)
   ▼                                          → artifacts/model.pkl
application.py ── src/pipeline/predict_pipeline.py  (loads both pickles, predicts)
```

## Project layout

| Path | What it is |
| --- | --- |
| `application.py` | Flask app: landing (`/`), form + prediction (`/predictdata`), health (`/health`) |
| `src/` | Pipeline components, `logger.py`, `exception.py`, `utils.py` |
| `artifacts/` | Trained preprocessor and model (scikit-learn 1.3.2) plus the data splits |
| `notebook/` | EDA and model-training notebooks, raw data |
| `templates/` | HTML pages |
| `web/`, `train_web_model.py` | The web app (GitHub Pages) and the script that trains and exports its model |
| `Dockerfile`, `render.yaml`, `Procfile`, `.ebextensions/` | Deployment config (Render/Docker, or AWS Elastic Beanstalk) |

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python application.py                  # http://localhost:5000/predictdata
```

Retrain from scratch:

```bash
pip install -r requirements-train.txt
python -m src.components.data_ingestion
```

Docker:

```bash
docker build -t student-performance .
docker run -p 8000:8000 student-performance
```

## Deploy

### GitHub Pages (live)

The web app in `web/` is a static page: inputs as one-tap chips and sliders, a
live estimate with a ±RMSE range, a chart of how many points each input adds or
removes compared with an average student, and average scores by group for all
1,000 students.

Its model comes from `train_web_model.py`: the same features and 80/20 split as
the pipeline, but with `OneHotEncoder(drop="first")`. The original
`artifacts/model.pkl` fell into the dummy-variable trap (one-hot columns plus an
intercept), which made its coefficients about ±10¹⁴, so they cancelled and were
numerically fragile. Dropping a baseline category removes that, and every
coefficient now reads directly as points.

| Metric | Value |
| --- | --- |
| Test R² (200 unseen students) | 0.880 |
| 5-fold CV R² | 0.872 ± 0.011 |
| Test RMSE / MAE | 5.39 / 4.21 points |

`web/predict.js` reproduces scikit-learn's predictions exactly (max difference
3e-14 over all 1,000 students). After changing the data or features, run
`python train_web_model.py` and commit `web/model.json`.
`.github/workflows/pages.yml` publishes `web/` to `gh-pages` on every push to `main`.

> Effects are conditional on reading and writing scores. For example, test
> preparation shows little effect on math *once reading and writing are known*,
> because its benefit shows up mainly in those scores.

### Flask server (optional)

The Flask app (`Dockerfile`, `render.yaml`) is still here for running the
original server version, for example on Render: **New → Blueprint →** pick
this repo **→ Apply**.

## Changelog (2026 clean-up)

* Fixed a bug where the reading and writing scores from the form were swapped
  before prediction.
* Fixed the Elastic Beanstalk `WSGIPath` (it had a stray space).
* Split runtime vs. training dependencies and pinned versions so the saved
  pickles load.
* Made the training data path work on Linux/macOS (it used Windows `\` separators).
* Removed CatBoost training logs from version control.
* Added Dockerfile, Render blueprint and `/health` endpoint.
