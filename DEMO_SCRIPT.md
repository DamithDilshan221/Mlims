# MLIMS Final Demonstration Script

**Estimated Time:** 15–20 minutes  
**Objective:** Demonstrate comprehensive end-to-end functionality, Role-Based Access Control (RBAC), Row-Level Security (RLS) enforcement, and System Administration workflows.

---

## Part 1: Login & Role-Based Access (3 minutes)

1. **Admin Login**
   - Log in as `admin_sys` (Administrator).
   - Show the navigation bar with full access (Staff & Users, Audit Log, Settings, Reports).
   - Log out.

2. **Police Login & UI Redaction**
   - Log in as `police_officer_1` (Police Officer).
   - Note the restricted navigation bar (no Lab, no Staff Management).
   - Search for a patient. Demonstrate the `<RestrictedBadge />` overlay on clinical data, proving PII/Medical data is redacted for non-clinical roles.
   - Log out.

---

## Part 2: RLS Proof & The Clinical/Postmortem Split (5 minutes)

1. **Doctor A vs Doctor B (Proving RLS)**
   - Log in as `doctor_smith` (JMO).
   - Navigate to the **Cases** list. Note the visible case IDs.
   - Edit the browser URL to forcefully attempt accessing a Case ID owned exclusively by `doctor_jones`.
   - **Expected Result:** The system returns a 404/Not Found or Empty state. The Express backend allows the route, but PostgreSQL RLS silently drops the row at the database level because `jmo_id` does not match the session variable set by `SET LOCAL role`.

2. **Patient & Case Registration**
   - As `doctor_smith`, register a new Patient (triggering AES encryption on the NIC).
   - Register a new Postmortem Case linked to this Patient (triggers `sp_register_case`).

---

## Part 3: The Postmortem Workflow (5 minutes)

1. **Evidence & Chain of Custody**
   - Navigate to the newly created Postmortem Case.
   - Log an injury in the Examination Form.
   - Add a biological Specimen (e.g., Blood).
   - Log out.

2. **Forensic Staff & Lab Integration**
   - Log in as `forensic_staff_1`.
   - Navigate to the Specimen. Record a Transfer in the Chain of Custody (show the append-only timeline).
   - Submit a Lab Request for the Specimen.
   - Switch to the **Lab Tests** page and finalize the results.

---

## Part 4: Reporting & Court Acknowledgment (4 minutes)

1. **Report Generation (Doctor)**
   - Log back in as `doctor_smith`.
   - Complete the "Causes of Death" form on the Postmortem Case.
   - Navigate to **Reports**, generate the PDF, and click "Issue Report". The status changes to "Ready".

2. **Court Receipt (Court Official)**
   - Log in as `court_official_1`.
   - Navigate to the **Reports Queue**. Show that *only* 'Ready' or 'Issued' reports are visible.
   - Click "Acknowledge" on the new report. 
   - Status updates to "Acknowledged" (executing `sp_issue_court_receipt`).

---

## Part 5: Audit Logs, Statistics & Backup (3 minutes)

1. **Audit Logs & Diffs**
   - Log in as `admin_sys`.
   - Navigate to the **Audit Log**. Filter by `table = chain_of_custody`.
   - Expand a row to show the JSON payload diff engine highlighting the exact field modifications.

2. **Statistics Views**
   - Navigate to **Statistics**. Show the Recharts visualizations (Cases by Month, Lab TAT) powered by the new `V8__reporting_views.sql`.

3. **Backup & Recovery**
   - Open a terminal and run `./scripts/backup.sh` manually.
   - Run `./scripts/restore_test.sh` manually.
   - Refresh the **Backup & Settings** page to see the `SYSTEM_BACKUP` audit log entries dynamically populate with "SUCCESS" and the verified row counts.

**End of Demo.**
