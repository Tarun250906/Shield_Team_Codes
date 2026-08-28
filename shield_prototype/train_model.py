"""
SHIELD Prototype - Model Training
---------------------------------
Model 1: Isolation Forest (unsupervised anomaly score)
Model 2: XGBoost classifier (supervised fraud-risk score)

The dataset provides a real binary fraud target:

    F3924 = FRAUD_TGT
    0 = non-fraud
    1 = fraud

Therefore the XGBoost classifier is trained directly against FRAUD_TGT.
No pseudo-labels or proxy-label rules are used for supervised training.

The Isolation Forest remains an independent unsupervised anomaly detector.
The final SHIELD Score combines the anomaly signal and supervised fraud
probability.
"""

import json
import os
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

from data_pipeline import (
    load_raw,
    build_feature_matrix,
    select_top_features,
    TARGET_COL,
)

ARTIFACTS = "artifacts"
RANDOM_STATE = 42

def train():
    print("Loading raw data...")
    df = load_raw()
    X_full, meta, _, fit_info = build_feature_matrix(df)

    print("Selecting top features by variance (prototype speed, mirrors doc's "
          "mutual-info top-200 approach for Isolation Forest)...")
    engineered_cols = ["sentinel_count", "na_count", "sparsity_ratio"]
    cat_prefixes = ["account_type", "segment", "occupation", "gender",
                     "business_type", "tenure_bucket"]
    X = select_top_features(X_full, engineered_cols, cat_prefixes, top_k=400)
    feature_names = list(X.columns)
    print(f"Reduced feature matrix: {X.shape}")

    print(f"Using real target column: {TARGET_COL}")

    y = pd.to_numeric(df[TARGET_COL], errors="coerce")

    if y.isna().any():
        raise ValueError(f"{TARGET_COL} contains missing or invalid values.")

    y = y.astype(int).values

    if not set(np.unique(y)).issubset({0, 1}):
        raise ValueError(f"{TARGET_COL} must contain only binary 0/1 values.")

    if TARGET_COL in X.columns:
        raise ValueError(f"TARGET LEAKAGE: {TARGET_COL} is present in X.")

    print("FRAUD_TGT distribution:")
    print(pd.Series(y).value_counts())
    print(pd.Series(y).value_counts(normalize=True))

    # ---- genuine held-out split, carved out BEFORE any fitting/tuning ----
    idx = np.arange(len(X))
    train_idx, holdout_idx = train_test_split(
        idx, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    X_tr, X_ho = X.iloc[train_idx].reset_index(drop=True), X.iloc[holdout_idx].reset_index(drop=True)
    y_tr, y_ho = y[train_idx], y[holdout_idx]
    print(f"Held-out split: {len(X_tr)} train / {len(X_ho)} untouched holdout "
          f"({y_ho.mean()*100:.2f}% positive)")

    print("Fitting Isolation Forest (Model 1: unsupervised anomaly detector, "
          "trained on the 80% training split only)...")
    scaler = StandardScaler()
    X_tr_scaled = scaler.fit_transform(X_tr)

    iso = IsolationForest(n_estimators=300, contamination=0.02, random_state=RANDOM_STATE, n_jobs=-1)
    iso.fit(X_tr_scaled)

    def iso_normalize(X_subset_scaled, raw_min, raw_max):
        raw = -iso.score_samples(X_subset_scaled)
        norm = (raw - raw_min) / (raw_max - raw_min)
        return np.clip(norm, 0.0, 1.0)

    raw_tr = -iso.score_samples(X_tr_scaled)
    iso_score_min, iso_score_max = float(raw_tr.min()), float(raw_tr.max())
    iso_norm_tr = iso_normalize(X_tr_scaled, iso_score_min, iso_score_max)

    print("Training XGBoost classifier (Model 2: supervised risk classifier)...")
    scale_pos_weight = (len(y_tr) - y_tr.sum()) / max(y_tr.sum(), 1)
    skf = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_STATE)
    oof_pred = np.zeros(len(y_tr))

    model_params = dict(
        n_estimators=150,       # scaled down from doc's 800 for demo speed
        max_depth=4,             # shallower than before -- reduces variance
        learning_rate=0.08,
        subsample=0.75,
        colsample_bytree=0.65,
        min_child_weight=5,      # extra regularization against small, noisy splits
        reg_lambda=2.0,
        scale_pos_weight=scale_pos_weight,
        eval_metric="auc",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        tree_method="hist",
    )

    for fold, (tr_idx, va_idx) in enumerate(skf.split(X_tr, y_tr)):
        m = xgb.XGBClassifier(**model_params)
        m.fit(X_tr.iloc[tr_idx], y_tr[tr_idx])
        oof_pred[va_idx] = m.predict_proba(X_tr.iloc[va_idx])[:, 1]

    oof_auc = roc_auc_score(y_tr, oof_pred)
    print(f"Out-of-fold AUC on the 80% training split (FRAUD_TGT): {oof_auc:.4f}")

    print("Training final model on the 80% training split...")
    final_model = xgb.XGBClassifier(**model_params)
    final_model.fit(X_tr, y_tr)

    print("Scoring the untouched 20% holdout (never seen during fitting or "
          "threshold tuning) for an honest generalization estimate...")
    X_ho_scaled = scaler.transform(X_ho)
    iso_norm_ho = iso_normalize(X_ho_scaled, iso_score_min, iso_score_max)
    xgb_ho_pred = final_model.predict_proba(X_ho)[:, 1]
    holdout_auc = roc_auc_score(y_ho, xgb_ho_pred)
    print(f"Held-out AUC (truly unseen rows, FRAUD_TGT): {holdout_auc:.4f}")

    # ---- refit final artifacts on the FULL dataset for deployment ----
    # (standard practice: once the held-out number tells you how the
    # approach generalizes, retrain on all available data for the model
    # that actually gets shipped/scored against)
    print("Refitting final Isolation Forest + XGBoost on the full dataset "
          "for deployment...")
    scaler_full = StandardScaler()
    X_full_scaled = scaler_full.fit_transform(X)
    iso_full = IsolationForest(n_estimators=300, contamination=0.02, random_state=RANDOM_STATE, n_jobs=-1)
    iso_full.fit(X_full_scaled)
    raw_full = -iso_full.score_samples(X_full_scaled)
    iso_full_min, iso_full_max = float(raw_full.min()), float(raw_full.max())
    iso_norm_full = np.clip((raw_full - iso_full_min) / (iso_full_max - iso_full_min), 0.0, 1.0)

    y_full = pd.to_numeric(df[TARGET_COL], errors="coerce").astype(int).values
    final_model_full = xgb.XGBClassifier(**model_params)
    final_model_full.fit(X, y_full)
    xgb_scores_full = final_model_full.predict_proba(X)[:, 1]

    print("Computing SHAP values (TreeExplainer)...")
    explainer = shap.TreeExplainer(final_model_full)
    shap_values = explainer.shap_values(X)

    print("Blending ensemble SHIELD Score = 0.25*anomaly + 0.75*xgb ...")
    shield_score = (0.15 * iso_norm_full + 0.85 * xgb_scores_full) * 1000

    # ---- persist everything the dashboard AND predict.py need ----
    os.makedirs(ARTIFACTS, exist_ok=True)

    final_model_full.save_model(f"{ARTIFACTS}/xgb_model.json")
    joblib.dump(scaler_full, f"{ARTIFACTS}/scaler.joblib")
    joblib.dump(iso_full, f"{ARTIFACTS}/iso_forest.joblib")

    with open(f"{ARTIFACTS}/categorical_categories.json", "w") as f:
        json.dump(fit_info["categories"], f)
    with open(f"{ARTIFACTS}/imputation_medians.json", "w") as f:
        json.dump(fit_info["medians"], f)
    with open(f"{ARTIFACTS}/iso_score_range.json", "w") as f:
        json.dump({"min": iso_full_min, "max": iso_full_max}, f)
    with open(f"{ARTIFACTS}/feature_names.json", "w") as f:
        json.dump(feature_names, f)
    with open(f"{ARTIFACTS}/model_params.json", "w") as f:
        json.dump(model_params, f)

    results = meta.copy()
    results["iso_score"] = iso_norm_full
    results["xgb_score"] = xgb_scores_full
    results["shield_score"] = shield_score
    results["fraud_target"] = y_full
    results["flagged"] = (shield_score >= 650).astype(int)
    results.to_parquet(f"{ARTIFACTS}/scored_accounts.parquet")

    np.save(f"{ARTIFACTS}/shap_values.npy", shap_values)
    X.to_parquet(f"{ARTIFACTS}/feature_matrix.parquet")

    with open(f"{ARTIFACTS}/metrics.json", "w") as f:
        json.dump({
            "n_accounts": int(len(y_full)),
            "n_features": int(X.shape[1]),
            "fraud_positive_rate": float(y_full.mean()),
            "oof_auc": float(oof_auc),
            "holdout_auc": float(holdout_auc),
            "holdout_size": int(len(X_ho)),
            "flagged_count": int(results["flagged"].sum()),
            "target_column": TARGET_COL,
            "target_values": [0, 1],
        }, f, indent=2)

    print("Done. Artifacts saved to ./artifacts/")
    print(f"\nSUMMARY  oof_auc={oof_auc:.4f}  holdout_auc={holdout_auc:.4f}  "
          f"(both evaluated against real {TARGET_COL})")


if __name__ == "__main__":
    train()
