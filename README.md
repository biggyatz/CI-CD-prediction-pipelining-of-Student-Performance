# Student Performance Prediction — End-to-End ML Pipeline

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

The original AWS Elastic Beanstalk environment
(`studentperformance-env-1…elasticbeanstalk.com`) has been shut down.
Two options:

* **Render (free):** <https://dashboard.render.com> → **New → Blueprint** →
  select this repo → **Apply**. Free services sleep after 15 minutes idle.
* **AWS Elastic Beanstalk (paid):** `eb init -p python-3.11 student-performance && eb create`.
  `.ebextensions/python.config` points EB at `application:application`.

## Changelog (2026 clean-up)

* Fixed a bug where the reading and writing scores from the form were swapped
  before prediction.
* Fixed the Elastic Beanstalk `WSGIPath` (it had a stray space).
* Split runtime vs. training dependencies and pinned versions so the saved
  pickles load.
* Made the training data path work on Linux/macOS (it used Windows `\` separators).
* Removed CatBoost training logs from version control.
* Added Dockerfile, Render blueprint and `/health` endpoint.
