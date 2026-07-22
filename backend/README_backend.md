# MLIMS Backend API

This is the Node.js / Express REST API for the Medico-Legal Information Management System (MLIMS).

## Architecture

This API strictly follows the **Thin Application, Fat Database** pattern, leveraging the advanced features built into the PostgreSQL database from Phase 1.

### Key Principles

1. **No ORM**: The application connects directly to the database using the raw `pg` driver (node-postgres). Every database interaction is a plain, parameterized SQL string (`$1`, `$2`, etc.) or a call to a stored procedure `SELECT * FROM sp_xxx(...)`.
2. **Database-Level Enforcement**: The database is the ultimate source of truth for authorization, auditing, and complex business logic.
3. **Role-Based Connection Pools**: The backend maintains multiple connection pools—one for each PostgreSQL role (`admin_role`, `doctor_role`, `police_role`, etc.). Incoming requests are routed to the pool matching the user's role from their JWT.
4. **Session Variables for Context**: To propagate the application user ID and staff ID down to the database triggers and Row-Level Security (RLS) policies, every API request that touches the DB wraps its queries in a transaction (`BEGIN`) and sets transaction-scoped local variables (`SET LOCAL app.current_user_id = $1`).

### Security Layers

1. **Application Layer (Defense in Depth)**:
   - **Rate Limiting**: Throttles brute-force login attempts and global request spam.
   - **Zod Validation**: Rejects malformed payloads or invalid schemas before querying the DB.
   - **Express RBAC**: Middleware checks `req.user.role_name` to instantly block obvious unauthorized route access.
   - **Application-Level Encryption**: Highly sensitive Personally Identifiable Information (PII), like the National Identity Card (NIC) number, is encrypted using `AES-256-GCM` before reaching the database, making a compromised database dump useless for stealing identities. A deterministic `HMAC-SHA256` hash is also computed to allow exact-match searching without full-table decryption.

2. **Database Layer (The Ironclad Core)**:
   - **GRANT/REVOKE**: Even if the Express RBAC fails, the `doctor_role` literally cannot `DELETE` from `audit_logs` because PostgreSQL will reject it with a `42501 Insufficient Privilege` error.
   - **Row-Level Security (RLS)**: Doctors are restricted by RLS policies so they can only `SELECT` clinical and postmortem examinations where `doctor_id` matches their own `staff_id`.
   - **Atomic Stored Procedures**: Multi-step workflows (like registering a case or finalizing lab results) are handled by PL/pgSQL stored procedures, eliminating race conditions.
   - **Immutable Auditing**: Database triggers capture every `INSERT`/`UPDATE`/`DELETE` and write it to `audit_logs` using the session variables passed from the backend.
   - **Account Lockout**: The database `audit_logs` are used directly to detect 5 failed login attempts in 15 minutes, instantly locking the account.

## Directory Structure

```
backend/
├── src/
│   ├── config/          # Environment variables and config loading
│   ├── db/              # pg Pool initialization and transaction wrappers
│   ├── middleware/      # Express middlewares (Auth, RBAC, Validation, Error Handling)
│   ├── repositories/    # Raw SQL queries grouping by entity
│   ├── routes/          # Express route handlers
│   ├── utils/           # Helpers (JWT, Encryption, Sanitization)
│   ├── app.js           # Express app assembly
│   └── server.js        # Entry point and graceful shutdown
├── tests/
│   └── integration/     # Jest tests for Auth, RBAC, RLS, and SQLi prevention
├── .env                 # Environment variables (do not commit)
├── package.json
└── jest.config.js
```

## Setup & Running

1. **Prerequisites**: Node.js 18+ and the PostgreSQL MLIMS Phase 1 database running.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment**: Copy `.env.example` to `.env` and adjust the PostgreSQL connection strings and JWT/Encryption keys.
4. **Run Server**:
   ```bash
   npm run dev
   ```
5. **Run Tests**:
   ```bash
   npm test
   ```
