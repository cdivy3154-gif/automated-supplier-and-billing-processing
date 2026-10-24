# GSCSCL - Automated Commodity Supplier Billing & Payment Processing System
### ગુજરાત રાજ્ય નાગરિક પુરવઠા નિગમ લિમિટેડ (Gujarat State Civil Supplies Corporation Limited)
*Food, Civil Supplies & Consumer Affairs Department, Government of Gujarat*

---

## 🏛️ Project Overview

The **GSCSCL Automated Commodity Supplier Billing & Payment Processing System** is an enterprise-grade government portal designed for digitisation of commodity procurement invoicing, multi-tier administrative scrutiny, 3-way reconciliation (PO vs GRN vs Invoice), statutory tax deductions (TDS under IT Sec 194Q & GST-TDS), official noting sheet approvals, and treasury disbursement integration (IFMS-Gujarat / PFMS).

The application is built using **HTML5, Modern CSS (Tailwind CSS via CDN), and Vanilla JavaScript**, styled according to official Government of Gujarat Single Sign-On (SSO) portal guidelines.

---

## 🔐 Government SSO Role-Based Authentication System

The portal features a **Gujarat Single Sign-On (SSO) Login Screen** securing all dashboards:

### ⚡ Quick-Demo 1-Click Login:
On the login screen, click any of the 6 role chips to **instantly authenticate** without typing:
1. **Supplier / Vendor:** `SUP-881` / `Vendor@2026`
2. **Godown Manager:** `GDN-AHM-01` / `Godown@2026`
3. **Branch / Pre-Audit Staff:** `AUD-HQ-04` / `Audit@2026`
4. **General Manager:** `GM-SANCTION` / `Admin@2026`
5. **Finance Branch:** `FIN-TREASURY` / `Finance@2026`
6. **Management / Admin Monitor:** `MD-MONITOR` / `Oversight@2026`

### 🛡️ Authentication Features:
- Alphanumeric **4-character Security Captcha** with refresh button.
- Password input with **Show/Hide password toggle**.
- **Forgot Password / Reset PIN** modal with simulated 6-digit OTP verification.
- **Session Management:** Securely stores session in `localStorage`.
- **Top Header Integration:** Displays authenticated officer photo, designation, department, and role badge.
- **Prominent Logout Button (`Logout / સાઇન આઉટ`):** Safely terminates the session and returns to the login screen.

---

## 🚀 Live Demo & Local Server

```bash
# Start the local server
node server.js
```
Open your browser and navigate to:
**`http://localhost:3000/`**

Or simply double-click the all-in-one standalone file:
**`GSCSCL_Standalone.html`**

---

## 👥 Role Perspectives & Workflows

| # | Role | Username | Active Persona | Key Focus & Queue |
|---|---|---|---|---|
| **1** | **Supplier** | `SUP-881` | *Shree Gujarat Agro Commodities FPO Ltd.* | Vendor invoice submission, draft saving, bill tracking, correction & resubmission, payment status, query raising |
| **2** | **Godown Manager** | `GDN-AHM-01` | *R. K. Patel (Sanand Central Godown)* | Inward weighbridge gross/tare verification, moisture tests, physical certification |
| **3** | **Branch / Pre-Audit Staff** | `AUD-HQ-04` | *Hasmukhbhai Shah (Gandhinagar HQ)* | 3-Way match (PO vs GRN vs Invoice), statutory tax deductions (TDS 194Q & GST TDS 2%), official noting sheet |
| **4** | **General Manager** | `GM-SANCTION` | *Dr. V. M. Jadeja, GAS (Competent Authority)* | Financial sanction under Budget Head `2408-PDS Procurement`, single & bulk approvals |
| **5** | **Finance Branch** | `FIN-TREASURY` | *Nilesh M. Trivedi (Chief Accounts Officer)* | Treasury clearance, IFMS-Gujarat / PFMS RTGS electronic disbursement, real-time UTR generation |
| **6** | **Management / Admin Monitor** | `MD-MONITOR` | *Executive Oversight / Managing Director* | High-level KPI summary, stage-wise pipeline, SLA delayed cases alert, Chart.js analytics |

---

## 🌾 Enhanced Supplier Portal (Self-Service View)

The **Supplier Portal** is tailored specifically for commodity suppliers and vendors with clean, simple English:

### 1. Simple English Supplier Dashboard (6 Metric Cards):
1. **Total Bills Submitted:** Count of all submitted claims.
2. **Bills Pending:** Inward godown verification and audit approval in progress.
3. **Bills Returned for Correction:** Flagged bills needing supplier action with direct "Correct & Resubmit" alert banner.
4. **Approved Bills:** Sanctioned bills queued for treasury payment.
5. **Payments Completed:** Successfully disbursed via electronic bank transfer.
6. **Total Payment Pending:** Clear rupee total of all pending receivables.

### 2. 8-Column Supplier Invoices Table:
- **Bill Number:** System reference and draft indicator.
- **Receipt ID:** Linked digital Godown Inward Receipt (GRN).
- **Commodity Type:** Category (CGP/TOC), commodity name, and billed quantity.
- **Bill Amount:** Net payable and gross claim.
- **Submission Date:** Official submission timestamp.
- **Current Status:** Simple English badges (*Draft, Waiting for Verification, Waiting for Approval, Returned for Correction, Payment in Process, Payment Completed*).
- **Remarks:** Official reasons, feedback, or query message indicators.
- **Actions:** Context-sensitive actions based on status.

### 3. Strict Role-Based Separation:
- **Official Actions Removed:** Suppliers have **NO** access to official approval buttons (*Verify Stock, Pass Pre-Audit, Sanction Bill, Send to Finance, Disburse Payment, Resolve Discrepancy*), internal noting sheets, or confidential audit checklists.
- **Supplier Permissions Supported:**
  - Create & Submit Bills (with Save as Draft)
  - View & Track own bills with simple progress stepper
  - Correct and Resubmit bills returned by officials
  - Check read-only payment reference (UTR) and date
  - Raise queries and receive official replies directly within the bill view

---

## 📦 Package Distribution Files

- **`GSCSCL_Standalone.html`**: Zero-dependency single-file bundle (~215 KB) that can be shared and opened directly in any web browser.
- **`GSCSCL_Project.zip`**: Complete source code archive (~95 KB) containing all HTML, CSS, JS, server, and documentation files.
