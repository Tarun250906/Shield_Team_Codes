=# SHIELD — Mule Account Risk Detection System

SHIELD is an AI-powered prototype designed to help banks identify and investigate **potential mule accounts** and suspicious account activity.

It combines **Machine Learning, anomaly detection, explainable AI, and a risk-analysis dashboard** to help investigators prioritize high-risk accounts.

---

## 🚀 Key Features

-  **Account Risk Scoring** — Assigns each account a risk score from 0–1000.
-  **Machine Learning Detection** — Uses XGBoost for risk classification.
-  **Anomaly Detection** — Uses Isolation Forest to identify unusual account behavior.
-  **Explainable AI** — SHAP explains the major factors contributing to an account's risk.
-  **Investigator Dashboard** — View accounts, alerts, risk levels, and model metrics.
-  **Network Analysis** — Provides a prototype view of potentially related high-risk accounts.
-  **CSV Validation** — Upload account data and generate risk scores without retraining the model.
-  **Investigation Actions** — Freeze, escalate, or dismiss accounts with an audit trail.
-  **Authentication** — Demo login and protected investigation actions.

---

## 🧠 How SHIELD Works

```text
Account Data
     ↓
Data Preprocessing
     ↓
Feature Engineering
     ↓
 ┌───────────────────────┐
 │                       │
 ▼                       ▼
XGBoost            Isolation Forest
 │                       │
 └──────────┬────────────┘
            ↓
       Risk Score
            ↓
     Risk Classification
            ↓
   Investigator Dashboard
            ↓
   Investigation / Action
```

SHIELD combines the outputs of a supervised XGBoost model and an Isolation Forest anomaly detector to generate a final risk score.

---

## 🛠️ Technology Stack

### Backend
- Python
- FastAPI
- Pandas
- NumPy
- Scikit-learn
- XGBoost
- SHAP

### Frontend
- React
- TypeScript
- Tailwind CSS

### Data & Storage
- CSV
- Parquet
- Joblib
- JSON

---

## 📁 Project Structure

```text
SHIELD/
│
├── api.py                  # FastAPI backend
├── train_model.py          # Model training
├── predict.py              # Model inference and scoring
├── data_pipeline.py        # Data preprocessing
├── app.py                  # Streamlit prototype
│
├── data/
│   └── DataSet.csv         # Input dataset
│
├── artifacts/
│   ├── xgb_model.json
│   ├── iso_forest.joblib
│   ├── scaler.joblib
│   ├── feature_names.json
│   ├── scored_accounts.parquet
│   ├── shap_values.npy
│   └── metrics.json
│
├── frontend/
│   └── assets/             # React frontend
│
├── requirements.txt
└── README.md
```

---

## 📊 Risk Levels

| Score | Risk Level |
|------:|------------|
| 0–400 | 🟢 Low |
| 401–650 | 🟡 Medium |
| 651–800 | 🟠 High |
| 801–1000 | 🔴 Critical |

Accounts with higher scores are prioritized for investigation.

---

## 🧠 Explainable AI

SHIELD uses **SHAP (SHapley Additive exPlanations)** to explain why an account received a particular risk score.

For every account, investigators can see:

- Top contributing features
- Positive and negative risk factors
- A simple explanation of the account's risk

This makes the model easier for investigators to understand rather than treating it as a black box.

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Cyber-shield-mule-acc-detection
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

Activate it:

**Windows**
```bash
venv\Scripts\activate
```

**Linux / macOS**
```bash
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

## ▶️ Run SHIELD

Start the FastAPI backend:

```bash
uvicorn api:app --reload --port 8000
```

Open the application:

```text
http://localhost:8000
```

FastAPI API documentation:

```text
http://localhost:8000/docs
```

---

## 🔐 Demo Login

```text
Username: analyst
Password: shield123
```

> These credentials are for demonstration purposes only and should be replaced with proper authentication in production.

---

## 📁 CSV Validation

The **Validation** feature allows investigators to upload a CSV file and generate risk scores for accounts.

```text
CSV Upload
    ↓
Schema Check
    ↓
Preprocessing
    ↓
Feature Transformation
    ↓
ML Inference
    ↓
Risk Score
    ↓
Risk Level
```

The validation process performs **inference only** and does not retrain the models.

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/accounts` | Get account list |
| GET | `/api/accounts/{account_id}` | Account details |
| GET | `/api/accounts/{account_id}/network` | Network analysis |
| GET | `/api/metrics` | Model metrics |
| GET | `/api/filters` | Available filters |
| POST | `/api/accounts/{account_id}/action` | Investigation action |
| GET | `/api/audit-trail` | View audit trail |
| POST | `/api/validate` | Validate uploaded CSV |

---

## ⚠️ Prototype Disclaimer

SHIELD is a **hackathon prototype** intended to demonstrate an approach to mule-account risk detection.

The current prototype uses available account data and model-generated/proxy signals rather than confirmed real-world fraud labels.

The network-analysis component is also a prototype because the available dataset does not contain real account-to-account transaction relationships.

Therefore, the system should **not be used as a production fraud-decision system without further validation and real banking data**.

---

## 🔮 Future Improvements

- Real-time transaction ingestion using **Kafka**
- Stream processing using **Apache Flink**
- Real transaction graphs using **Neo4j**
- Production-grade SSO, MFA and RBAC
- Real confirmed fraud labels
- Continuous model monitoring and retraining
- Feature stores for real-time features
- Scalable model serving
- Advanced case-management and SAR workflows

---

## 🎯 Objective

The goal of SHIELD is to provide investigators with a **single, explainable and scalable interface** for identifying high-risk accounts and prioritizing suspicious accounts for further investigation.

> **Detect early. Explain clearly. Investigate smarter.**

---

## 👥 Team

Developed as part of the **BOI CyberShield Hackathon**.

**SHIELD — Mule Account Risk Detection System**
