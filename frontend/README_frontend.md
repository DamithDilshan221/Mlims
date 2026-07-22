# MLIMS Phase 3: Frontend Setup & Documentation

This React + Vite frontend provides the user interface for the Medico-Legal Information Management System, interacting strictly via the Phase 2 backend.

## Security Architecture (Frontend)

1. **In-Memory Tokens**: JWT Access Tokens are stored solely in memory (React Context). They are never saved to `localStorage` or `sessionStorage` to mitigate XSS exfiltration.
2. **Silent Refresh Interceptors**: `src/utils/api.js` intercepts all outgoing requests to attach the token, and catches 401s to attempt a silent token refresh using the `httpOnly` refresh cookie.
3. **Role-Based Redaction UX**: The `<RestrictedBadge />` component explicitly tells the user when they are looking at data they are unauthorized to view (e.g. `v_patient_public` view or a `sexual_assault` flag).
4. **Append-Only Workflows**: The Chain of Custody relies on `<AppendOnlyTimeline />` — past transfers cannot be edited or deleted in the UI, enforcing the database's strict append-only constraints.

## Role-to-Screen Matrix (Pages 1–20)

| Page / Component | Authorized Roles | Notes |
| :--- | :--- | :--- |
| **Login** | *All* | Shows generic errors vs "Account Locked" explicit state. |
| **Dashboard** | *All* | Widgets filter dynamically (e.g. Doctors see open cases, Police see station stats). |
| **Patient List** | *All* | **Admin/Doctor/Clerk**: Full view. **Police/Court/Auditor**: Restricted view. |
| **Patient Details** | *All* | Renders restricted badges on sensitive fields for unauthorized viewers. |
| **Patient Registration** | Admin, Records Clerk | Client-side NIC format validation & DOB -> Age preview. |
| **Case Registration** | Admin, Records Clerk, Police | Calls `sp_register_case` and renders the generated case number. |
| **Clinical Exam Details** | Admin, Doctor | RLS enforced. Restricted fields (sexual assault) hidden from non-assigned doctors. |
| **Postmortem Details** | Admin, Doctor | RLS enforced. Includes JSON builder for anatomical notes. |
| **Examination Injury** | Admin, Doctor | Shared form that contextually attaches to `mlefId` or `pmrId` (XOR). |
| **Evidence & Custody** | Admin, Forensic Staff, Doctor | Timeline is Read-Only for all. Only Forensic Staff can record new transfers. |
| **Lab Tests** | Admin, Forensic Staff, Doctor | Queue view. Only Forensic Staff can finalize results. |
| **Directories** | Admin, Police, Court | Admins can create/edit. Others have filtered read-only views based on their domain. |
| **Document Upload** | Admin, Police, Clerk | Non-uploaders get read-only view. `<iframe>` limits HTML execution risks. Audit log maps attribution. |
| **Report Approvals** | Admin, Doctor, Court | Unified queue. Court Officials filtered to act only on 'Ready' or 'Issued' reports. |
| **Report Finalization** | Admin, Doctor | Clinical draft/issue workflow and PM Anatomical note/cause of death. Renders printable form view. |
| **Search** | *All* | Aggregated search (Patients, Cases, Specimens) utilizing the `<RestrictedBadge>` for unprivileged roles. |
| **Staff Management** | Admin | Unified roster list and staff creation form (creates `users` and `staff` row transactionally). |
| **User & Roles** | Admin | User account control (Deactivate/Unlock). Roles table is strictly read-only reference reflecting schema restrictions. |
| **Audit Log** | Admin, Auditor | Paginated read-only view. Clickable rows expand to show computed JSON field-level diffs (`old_payload` vs `new_payload`). |
| **Statistics** | Admin, Auditor | Data visualization (Cases by Month, Lab Turnaround, Station metrics) using `recharts`. |
| **Backup & Settings** | Admin | Displays environment variables read-only. Triggers asynchronous database backup enqueue. |

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```
