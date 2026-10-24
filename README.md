# Automated State Commodity Supplier Billing & Payment Processing System
## ગુજરાત રાજ્ય નાગરિક પુરવઠા નિગમ લિમિટેડ (GSCSCL)
*Food, Civil Supplies & Consumer Affairs Department, Government of Gujarat*

---

## 🏛️ Project Overview

The **Automated Commodity Supplier Billing & Payment Processing System** is a unified enterprise platform developed for the **Gujarat State Civil Supplies Corporation Limited (GSCSCL)**. It automates commodity procurement invoicing, multi-tier administrative scrutiny, 3-way reconciliation (PO vs GRN vs Invoice), statutory tax deductions (TDS under IT Sec 194Q & GST-TDS), official noting sheet approvals, and treasury disbursement integration (IFMS-Gujarat / PFMS).

---

## 📂 Repository Structure

```
automated-supplier-and-billing-processing/
├── frontend/                       # GSCSCL Enterprise Web Application
│   ├── index.html                  # Main application entry point
│   ├── GSCSCL_Standalone.html      # Zero-dependency single-file offline bundle
│   ├── GSCSCL_Project.zip          # Portable source code distribution archive
│   ├── server.js                   # Node.js local HTTP server (port 3000)
│   ├── build-standalone.js         # Automated single-file compiler
│   ├── css/
│   │   └── styles.css              # Government portal custom stylesheet
│   ├── js/
│   │   ├── app.js                  # Application controller & modal router
│   │   ├── components.js           # Badges, steppers & noting sheet renderers
│   │   ├── data.js                 # Seed database, roles metadata & catalogs
│   │   └── state.js                # Reactive AppStateManager & security guards
│   ├── README.md                   # Dedicated frontend documentation
│   └── WORK_REPORT.md              # Detailed work and progress report
│
├── backend/                        # FastAPI REST API Microservice (Phase 2A+)
│   ├── app/
│   │   ├── main.py                 # FastAPI application factory & CORS
│   │   ├── api/v1/endpoints/       # Auth & health endpoints
│   │   ├── core/                   # JWT verification (ES256/HS256) & settings
│   │   ├── dependencies/           # RBAC dependency guards
│   │   └── schemas/                # Pydantic V2 data models
│   ├── tests/                      # pytest test suite
│   ├── requirements.txt            # Python dependencies
│   └── README.md                   # Backend architecture documentation
│
├── sql/                            # Database Migrations & Schemas (Phase 1)
├── supabase/                       # Supabase Configuration & Policies
├── WORK_REPORT.md                  # Comprehensive Technical Work Report
├── DATABASE_SETUP.md               # Supabase PostgreSQL schema guide
└── GSCSCL_Standalone.html          # Quick root copy of offline standalone bundle
```

---

## 🚀 Quick Start Guide

### 1. Run the Frontend Web Application
```bash
# Navigate to the frontend directory
cd frontend

# Start the local Node.js web server
node server.js
```
Open your browser and navigate to:
**`http://localhost:3000/`**

> **Zero-Setup Alternative:** You can directly open [frontend/GSCSCL_Standalone.html](./frontend/GSCSCL_Standalone.html) (or [GSCSCL_Standalone.html](./GSCSCL_Standalone.html)) in any web browser without starting a server.

### 2. Run the Backend API Service
```bash
# Navigate to the backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI ASGI server
uvicorn app.main:app --reload --port 8000
```
API Documentation (Swagger UI):
**`http://localhost:8000/docs`**

---

## 🔐 Demo Credentials (SSO 1-Click Login)

The portal features an authentic **Gujarat State Single Sign-On (SSO)** login screen with 1-Click Persona switching:

| # | Role | Username | Password | Persona & Department |
|---|---|---|---|---|
| **1** | **Supplier / Vendor** | `SUP-881` | `Vendor@2026` | *Shree Gujarat Agro Commodities FPO Ltd.* |
| **2** | **Godown Manager** | `GDN-AHM-01` | `Godown@2026` | *R. K. Patel (Sanand Central Base Godown)* |
| **3** | **Branch / Pre-Audit Staff** | `AUD-HQ-04` | `Audit@2026` | *Hasmukhbhai Shah (Pre-Audit Branch, Gandhinagar)* |
| **4** | **General Manager** | `GM-SANCTION` | `Admin@2026` | *Dr. V. M. Jadeja, GAS (Competent Authority)* |
| **5** | **Finance Branch** | `FIN-TREASURY` | `Finance@2026` | *Nilesh M. Trivedi (Chief Accounts Officer)* |
| **6** | **Management Monitor** | `MD-MONITOR` | `Oversight@2026` | *Executive Oversight / Managing Director* |

---

## 📑 Detailed Documentation & Reports

- 📖 **[WORK_REPORT.md](./WORK_REPORT.md)** — Comprehensive technical report detailing all completed frontend and architecture work, permissions matrix, and QA tests.
- 🌾 **[frontend/README.md](./frontend/README.md)** — In-depth guide to the frontend architecture, reactive state manager, and role-based workflows.
- ⚙️ **[backend/README.md](./backend/README.md)** — Backend FastAPI setup, JWT ES256/HS256 signing, and endpoints.
- 🗄️ **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** — Supabase PostgreSQL schema, tables, and security policies.

---
*Government of Gujarat • Gujarat State Civil Supplies Corporation Limited*
