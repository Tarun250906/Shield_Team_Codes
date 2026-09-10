SHIELD — Mule Account Risk Console

SHIELD is a prototype fraud-risk investigation platform that helps financial institutions identify potentially suspicious accounts, understand why they were flagged, and prioritize them for investigation.

It combines machine learning, explainable AI, and an investigator dashboard into one system.

What SHIELD does
Assigns a 0–1000 risk score to accounts.
Combines Isolation Forest anomaly detection with XGBoost classification.
Shows the main factors contributing to an account's risk using SHAP explanations.
Provides searchable, filterable account records.
Allows investigators to freeze, escalate, or dismiss cases.
Maintains an audit trail of investigator actions.
Supports uploading a new CSV to test the trained model.
Includes a simulated network view to demonstrate how suspicious account relationships could be explored.
How it works
Account Data
     ↓
Data Preprocessing
     ↓
Isolation Forest + XGBoost
     ↓
Combined SHIELD Score
     ↓
Risk Tier
     ↓
Investigator Dashboard
     ↓
Review → Investigate → Take Action
Risk levels
Score	Risk level
0–400	Low
401–650	Medium
651–800	High
801–1000	Critical
Technology Stack

Frontend

React
TypeScript
Tailwind CSS
React Router

Backend

Python
FastAPI
Pandas
NumPy

Machine Learning

Isolation Forest
XGBoost
SHAP

Data & Storage

Parquet
NumPy artifacts
JSON audit trail
Project Structure
shield_prototype/
│
├── api.py                  # FastAPI backend
├── train_model.py          # Model training
├── predict.py              # Prediction on new CSV files
├── data_pipeline.py        # Data preprocessing
├── requirements.txt        # Python dependencies
├── README.md
│
├── data/                   # Input datasets
├── artifacts/              # Trained models and generated outputs
│
└── frontend/               # Built React frontend
How to Run
1. Clone the repository
git clone https://github.com/Tarun250906/Shield_Team_Codes.git
cd Shield_Team_Codes
2. Install dependencies
pip install -r requirements.txt
3. Start the backend
python -m uvicorn api:app --reload --port 8000
4. Open the application

Visit:

http://localhost:8000

API documentation:

http://localhost:8000/docs

The backend serves the built frontend, so one server is enough to run the demo.

Demo Login

The prototype includes demo accounts:

Username: analyst
Password: shield123
Username: admin
Password: shield123

Note: These are demonstration credentials, not production authentication.

Validate a New Dataset

SHIELD supports testing a new CSV using the same trained model artifacts used by the application.

New CSV
   ↓
Preprocessing
   ↓
Trained Models
   ↓
Risk Scores
   ↓
Validation Results

The validation process does not retrain the model.

You can also use the command line:

python predict.py --input /path/to/validation.csv --output predictions.csv

The uploaded CSV must contain the features expected by the trained model.

API Endpoints
Endpoint	Purpose
GET /api/accounts	View accounts with filters and sorting
GET /api/accounts/{id}	View account details and SHAP explanations
GET /api/accounts/{id}/network	View simulated account network
GET /api/metrics	View model and portfolio metrics
POST /api/validate	Upload and score a new CSV
POST /api/accounts/{id}/action	Freeze, escalate, or dismiss an account
GET /api/audit-trail	View investigator actions
POST /api/auth/login	Login
GET /api/auth/me	View current user
POST /api/auth/logout	Logout
Important Prototype Notes

SHIELD is a hackathon prototype, not a production banking system.

The trained models and SHAP explanations are real.
The validation feature uses the persisted training artifacts.
The network/ring view is simulated because the current dataset does not contain real account-to-account transaction links.
Some investigation and monitoring pages use simulated data.
Authentication is demo-grade and should be replaced with production SSO, MFA, RBAC, and secure session management.
Production deployment would require real transaction data, confirmed fraud labels, stronger security, and integration with banking systems.
Future Improvements
Real-time transaction ingestion using Kafka.
Stream processing using Flink or similar technology.
Real transaction graph using Neo4j.
Advanced graph algorithms for ring detection.
Production authentication with SSO, MFA, and RBAC.
Continuous model monitoring and retraining using investigator feedback.
Integration with banking case-management and reporting systems.
Team

Developed as part of the BOI Hackathon at IIT Hyderabad.