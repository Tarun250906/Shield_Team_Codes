# SHIELD — Mule Account Risk Console

A working, scaled-down implementation of the ML + graph analytics core
described in `SHIELD_Solution_Document_Final.docx`, wrapped in a full
fraud-operations console UI. Built to be demoable in a hackathon setting,
**not** the full production architecture (no real Kafka/Flink/Neo4j/Drools
deployment here — see "Scope" below).

## What's in this build

- **Login** (`Login.tsx`) — session-gated entry point. Demo credentials
  (`analyst` / `shield123` or `admin` / `shield123`), backed by a real
  `/api/auth/login` endpoint on the FastAPI backend. All protected pages
  redirect here if there's no valid session; the case-action endpoint
  (freeze/escalate/dismiss) now requires a valid bearer token and logs the
  real logged-in analyst's name to the audit trail. See the Security
  section below for what's real vs. simplified here.
- **Backend** (`api.py`) — FastAPI service wrapping the trained models:
  paginated/filterable/sortable account queue, per-account SHAP
  explanations, simulated ring-detection endpoint, mock case-action
  endpoint (freeze/escalate/dismiss) with a persistent audit trail.
- **Frontend** (`frontend/`, built from `../shield_frontend`) — a full
  React + TypeScript + Tailwind + React Router console: Overview, Alerts,
  Accounts, Account Detail (with SHAP + simulated ring view + transactions),
  Network & Ring Detection, Investigations, SAR Queue, Model Monitor, Data
  Feeds, Reports, and Settings. Ten pages, one shared design system, one
  user journey: **Login → Overview → Alerts → Accounts → Account Detail →
  Network → Investigations → SAR**.
- **`frontend_classic/`** — the original single-page dashboard from the
  first prototype pass, kept as a lightweight fallback if you ever want it.

## Evaluation criteria mapping

Quick reference for judging — every point below maps to something already
built in this prototype, not a claim about future work.

**Innovation**
- Blends an unsupervised anomaly detector with a supervised classifier
  into one explainable score, rather than a single black-box model or a
  static rule engine.
- Every flagged account carries a live SHAP explanation and plain-language
  narrative, not just a number — a judge can ask "why was this flagged"
  and the system answers, in the UI, in real time.

**Technical Feasibility**
- Not a mockup: `train_model.py` trains real models on the real 9,082-account
  dataset against the dataset's own confirmed fraud target, `api.py` serves
  real predictions through a documented FastAPI service (`/docs` is live,
  not staged), and the frontend consumes that API directly — click
  Freeze/Escalate/Dismiss in the demo and it's a real network call landing
  in a real audit trail.

**Business Potential**
- Directly targets a named compliance workflow (SAR drafting, investigator
  case management, regulatory feed matching against I4C/CERT-In/NCRP/RBI
  CIBIL) rather than a generic fraud score — the kind of tool a bank's
  fraud-ops team would actually sit in front of daily.
- The audit trail (who acted, when, on what) is the seed of exactly the
  investigator-feedback loop the solution doc's retraining strategy depends
  on — the business value compounds over time, not just at launch.

**Scalability**
- The scoring pipeline already runs against the full 3,924-column schema
  (3,923 input features + the target), not a toy feature set; the API is
  stateless and horizontally scalable as written. `README`'s "Extending
  this" section below spells out the exact next steps (Kafka ingestion,
  Neo4j graph, Drools rules) without any rearchitecting of what's already
  built.

**User Experience**
- One consistent design system across all ten pages — same sidebar, same
  risk color language, same typography — so an investigator's mental model
  transfers between Alerts, Accounts, and Network instead of relearning a
  new layout each time.
- Dense, sortable, filterable tables built for an analyst doing this all
  day, not a marketing dashboard: consistent risk badges, tabular numeric
  alignment, keyboard-friendly filters.

**Security**
- The console is now login-gated; case-altering actions (freeze/escalate/
  dismiss) require a valid session token, checked server-side, not just
  hidden behind a UI route.
- Every action is attributed to a named, authenticated analyst in the
  audit trail — a bank's compliance team can answer "who froze this
  account and when."
- This is explicitly a **demo-grade** auth layer (see the caveat on the
  login screen and in `api.py`) — SHA-256 hashed demo credentials and an
  in-memory session store, not bcrypt/argon2, SSO, or MFA. That's an
  honest, intentional scope line: it demonstrates the *shape* of an
  auth-gated, audited workflow that a real deployment would harden with
  the bank's actual IAM/SSO stack, not a claim that this is production
  security.

## What's real vs. simulated (read before demoing)

| Area | Status |
|---|---|
| Isolation Forest anomaly score | ✅ Real, trained on the dataset |
| XGBoost classifier | ✅ Real, trained directly on the dataset's confirmed `FRAUD_TGT` target, cross-validated + genuine 20% held-out split |
| Ensemble SHIELD Score (0.25 anomaly + 0.75 XGB, scaled 0–1000) | ✅ Real |
| SHAP explanations | ✅ Real `shap.TreeExplainer` output, per account |
| Accounts / Overview / Account Detail pages | ✅ Backed by the real API and real scores |
| **Validate page / `predict.py`** | ✅ Real — scores any uploaded CSV with the exact persisted training artifacts (scaler, Isolation Forest, categorical encoding, imputation medians, anomaly-score normalization range). `TARGET_COL` (`F3924`) is stripped from any uploaded file before scoring, so it can never leak in as a feature even if a judge's file happens to include it. Verified to reproduce training-time scores to within floating-point precision (max diff `5.7e-14` across a 500-row test). |
| **Confirmed ground truth, target-leakage fixed** | ✅ The dataset carries a real, confirmed binary fraud label: `F3924` / `FRAUD_TGT` (`0` = non-fraud, `1` = fraud). An earlier build missed this column, trained on a rule-derived proxy label instead, and didn't explicitly exclude `F3924` from the feature matrix — see the leakage note below for the full story and the fix. AUC from that earlier run: **0.980 out-of-fold, 0.986 on a genuine 20% held-out split** — kept here only as a historical baseline, **not** a current claim; see `artifacts/metrics.json` after retraining for the real numbers (`oof_auc`, `holdout_auc`, plus `holdout_pr_auc`, `holdout_precision`, `holdout_recall`, `holdout_f1`). |
| **Ring Detection / Network graph** | ⚠️ Simulated. The dataset has no account-to-account transaction records, so rings are built by grouping same-occupation, elevated-risk accounts. Clearly labeled "SIMULATED / PROTOTYPE" on screen. |
| **Alerts, Investigations, SAR Queue, Model Monitor trend/drift, Data Feeds** | ⚠️ Simulated. These pages have no backing dataset (no alert log, no transaction ledger, no case-management system, no live feed integration exists). Data is deterministically generated from real account IDs/scores so it's stable across navigation, but it is not real activity — tagged with a "SIMULATED / PROTOTYPE" badge throughout. |
| Kafka ingestion, Neo4j graph DB, Drools rule engine, SAR filing to FIU-IND | ❌ Not built — described in the solution doc as next-phase engineering, not attempted here. |

**Say the caveats out loud to judges.** Transparency about what's real
vs. simulated is a stronger pitch than pretending everything is production
data — and it directly maps to the solution doc's own Section 4.8
feedback-loop design (real investigator decisions → real labels → real
retraining), which this prototype's audit trail is built to feed into.

### A note on target leakage (read this if you're asked about the AUC)

There is a real, confirmed binary fraud target in the dataset: column
`F3924` (`FRAUD_TGT`, `0` = non-fraud, `1` = fraud). An earlier version of
this pipeline didn't recognize `F3924` as the target at all, so it
engineered a rule-based pseudo-label instead — and, worse, the
feature-selection step didn't explicitly exclude `F3924` from the numeric
column pool, so the real target could leak into `X` as an input feature.
Either mistake alone inflates AUC for reasons that have nothing to do with
real predictive power. Cross-validation does **not** catch this kind of
leakage, because the leakage is in how the label and the feature matrix
are *defined*, not in how the model is *fit* — that's why the number
stayed high even out-of-fold.

The fix has two parts. First, `data_pipeline.py` now defines
`TARGET_COL = "F3924"` and adds it to the drop-set used when building the
numeric feature matrix, so `F3924` can never enter `X`. Second,
`train_model.py` no longer builds a pseudo-label at all: `y` is read
directly from `df[TARGET_COL]`, validated as strictly binary with no
missing values, and a defensive check raises an error if `TARGET_COL` is
ever found inside `X`. XGBoost is trained on this real `y` for both the
cross-validated/held-out evaluation and the final model that ships with
the dashboard.

The 0.980 / 0.986 AUC figures quoted elsewhere in this repo are from the
last completed run **before** this fix — kept as a historical baseline,
not a current claim. Expect the raw AUC to shift once retrained against
the real target; that's expected, and is actually the point: it means the
model is now being measured against confirmed fraud outcomes instead of
reproducing its own rule. Report precision, recall, F1, and PR-AUC on the
real target going forward — they're more informative than AUC alone on an
imbalanced fraud rate, and they're the numbers `train_model.py` now
computes and saves.

**Open question, not yet resolved:** `F3912`–`F3919` look like
investigator/alert-resolution fields (`FRAUD_SUSPECTED`, `OTHER_RESOLUTION`,
`FALSE_POSITIVE`, `L1`/`L2`/`L3` flags, alert count). They're still in the
feature set. If these are only populated *after* an investigation or fraud
decision, they'd be a second, separate leakage problem — not available at
prediction time for a brand-new account. This needs a look at the data
dictionary before the next retrain; don't remove them without confirming
first.

## Scoring a validation dataset (e.g. from judges)

Two ways to score a new CSV with the trained model — both use the exact
same underlying logic (`predict.py`'s `score_dataframe()`), so results are
identical either way:

**In the app (recommended for a live demo):** log in, go to **Validate**
in the sidebar, drag in a CSV, click Run Validation. You'll get a scored
table, risk distribution, a CSV download, and — importantly — a warning
banner if the uploaded file's columns don't match training's schema
exactly (missing columns get imputed with training's medians; unrecognized
columns are dropped; `F3924`/`FRAUD_TGT` is stripped if present so it's
never scored as a feature; all of this is reported, not hidden).

**From the command line:**
```bash
cd shield_prototype
python predict.py --input /path/to/validation.csv --output predictions.csv
```

Neither path retrains or refits anything on the new file — both reuse the
scaler, Isolation Forest, categorical category list, imputation medians,
and anomaly-score normalization range persisted by `train_model.py`, so
scores are directly comparable to what's shown elsewhere in the console.

## How to run it

**Fastest path — one server, everything included:**

```bash
cd shield_prototype
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
// if uvicorn didnt run use -  " python -m uvicorn api:app --reload --port 8000 "
```

Open **http://localhost:8000** — the built frontend is served directly by
the API, so this is the only command you need for a demo. API docs (handy
to show judges) are at **http://localhost:8000/docs**.

> If `uvicorn` isn't recognized on your system, use
> `python -m uvicorn api:app --reload --port 8000` instead — same fix as
> the `pip`/`streamlit` PATH issue from earlier.

**If you want to modify the frontend and see live changes**, run it as two
separate dev servers instead:

```bash
# Terminal 1 — backend
cd shield_prototype
  uvicorn api:app --reload --port 8010

# Terminal 2 — frontend (hot reload)
cd shield_frontend
npm install
npm run dev
```
Then open **http://localhost:5173** — Vite's dev server proxies `/api/*`
calls to the backend on port 8010 (see `vite.config.ts`).

After making changes, rebuild and redeploy into the single-server setup:
```bash
cd shield_frontend
npm run build
rm -rf ../shield_prototype/frontend
cp -r dist ../shield_prototype/frontend
```

**Before your first run after pulling this fix**, delete the old
artifacts and retrain — they were generated by the old pseudo-label
pipeline and are now stale:

```bash
cd shield_prototype
rm -f artifacts/xgb_model.json artifacts/iso_forest.joblib \
      artifacts/feature_matrix.parquet artifacts/scored_accounts.parquet \
      artifacts/metrics.json artifacts/shap_values.npy artifacts/feature_names.json
python train_model.py
```

## Project structure

```
shield_prototype/
├── data/DataSet.csv          # hackathon dataset (add your own — not bundled, 116MB)
├── data_pipeline.py           # cleaning, sentinel (-1) handling, encoding (train + apply modes), TARGET_COL
├── train_model.py             # Isolation Forest + XGBoost (on real FRAUD_TGT) + SHAP + ensemble + holdout eval
├── predict.py                 # CLI: score any new CSV with the persisted training artifacts, strips TARGET_COL
├── api.py                     # FastAPI backend — scoring, SHAP, ring data, /api/validate, auth, audit trail
├── frontend/                  # BUILT React console (served by api.py) — this is dist/ output
├── frontend_classic/          # original single-page dashboard (kept as fallback)
├── artifacts/                 # generated by train_model.py: models, scaler, categories, medians,
│                               # iso-score range, scores, SHAP values, audit_trail.json
├── requirements.txt
└── README.md

shield_frontend/                # React source — edit here, then `npm run build`
├── src/
│   ├── pages/                  # Overview, Alerts, Accounts, AccountDetail, NetworkPage,
│   │                           # Investigations, SarQueue, Validate, ModelMonitor,
│   │                           # DataFeeds, Reports, Settings, Login
│   ├── layout/                 # Sidebar, Header, AppLayout
│   ├── components/             # RiskBadge, RiskScoreBar, MetricCard, Table primitives, NetworkGraph
│   └── lib/
│       ├── api.ts              # real backend calls (including validateDataset); fraud_target, fraud_positive_rate
│       ├── auth.tsx            # session auth context
│       ├── risk.ts             # tier thresholds (0-400/401-650/651-800/801-1000) + colors
│       └── mock/generators.ts  # deterministic mock data for alerts/investigations/SAR/etc.
```

## API endpoints (see `/docs` for full schema)

| Endpoint | Purpose |
|---|---|
| `GET /api/accounts` | Paginated, filterable, sortable risk queue |
| `GET /api/accounts/{id}` | Full detail + SHAP top factors + narrative |
| `GET /api/accounts/{id}/network` | Simulated ring/cluster graph data |
| `GET /api/metrics` | Portfolio KPIs + AUC/PR-AUC/precision/recall/F1 + the honest disclaimer |
| `GET /api/filters` | Distinct occupation/account-type/segment values for filter dropdowns |
| `POST /api/accounts/{id}/action` | Freeze/escalate/dismiss (auth required), logged to `artifacts/audit_trail.json` |
| `GET /api/audit-trail` | Investigator action history |
| `POST /api/validate` | Upload a CSV (auth required), score it with the trained model, same logic as `predict.py`; `F3924` stripped before scoring |
| `POST /api/auth/login`, `/api/auth/me`, `/api/auth/logout` | Demo session auth (see Security note in the evaluation-criteria section) |

## What to say in the demo

- Open on **Login** — mention it's session-gated and case actions require
  auth server-side, then sign in with the demo analyst account.
- Land on **Overview** — real KPIs, trained against the dataset's actual
  `FRAUD_TGT` target, front and center, not buried in a tooltip.
- **Alerts → click one → drawer** shows the real SHAP explanation pulled
  live from the model, not canned text.
- **Accounts → click a critical account → Account Detail**: real score,
  real SHAP tornado chart, real Freeze/Escalate/Dismiss actions that hit
  the API and write to the audit trail — click one live during the demo.
- **Network**: real ring data from the backend, and the "SIMULATED /
  PROTOTYPE" badge is visible on purpose — frame it as "here's what this
  looks like once we connect a real transaction graph."
- **Validate**: if judges hand you a CSV, this is the page to use live —
  drag it in, click Run Validation, and the results table/CSV export are
  driven by the exact same trained artifacts as everywhere else in the
  app. If the schema doesn't match exactly, the warning banner says so
  instead of silently producing wrong numbers — point that out, it's a
  deliberate design choice, not a bug you're hoping no one notices.
- **Model Monitor**: show the held-out metrics (AUC, PR-AUC, precision,
  recall, F1) and be ready to explain, briefly, that they're measured
  against a real confirmed fraud target — not a rule the team wrote
  itself. If asked why the number moved from an earlier build, the
  target-leakage note above is the honest answer, and it's a good story:
  catching and fixing it is a stronger signal than a suspiciously high
  AUC would have been.
- Pop open **`/docs`** for 10 seconds — a clean, auto-generated FastAPI
  Swagger UI signals "this is a real API," which is a stronger signal than
  any dashboard polish.

## Extending this into the full architecture

- Once investigator-confirmed outcomes accumulate in the audit trail, feed
  them back into future retraining alongside `FRAUD_TGT` — the
  `Settings` page's Audit Settings section is designed around this
  feedback path.
- Resolve the open `F3912`–`F3919` question (see the leakage note above)
  against the real data dictionary before the next retrain.
- Replace `_build_network()` in `api.py` with real transaction-pair edges
  and swap NetworkX/d3-force for Neo4j + Louvain/PageRank at scale.
- Replace `lib/mock/generators.ts` calls page-by-page with real endpoints
  as each system (alert engine, case management, SAR filing, live feeds)
  comes online — the service layer in `lib/api.ts` was kept separate from
  `lib/mock/` specifically so this is a one-file swap per page, not a
  rewrite.
