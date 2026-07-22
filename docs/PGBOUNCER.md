# MLIMS Connection Pooling with PgBouncer

Because MLIMS utilizes the PostgreSQL Row-Level Security (RLS) feature extensively, the application must assume the identity of the specific user for every database operation.

## Why `SET LOCAL` is Critical
In Phase 2, the Express backend utilizes `SET LOCAL role TO ...` inside a `BEGIN; COMMIT;` transaction block rather than a plain session-scoped `SET role TO ...`.

When PgBouncer operates in **Transaction Pooling Mode** (`pool_mode = transaction`), physical connections to the database are returned to the pool the instant a `COMMIT` or `ROLLBACK` is issued. 

If we used a session-scoped `SET`, the authorization context would leak to whichever request was assigned that physical connection next, resulting in severe cross-tenant data exposure. By using `SET LOCAL`, PostgreSQL guarantees the authorization context is destroyed the moment the transaction ends, perfectly aligning with PgBouncer's transaction mode mechanics.

## pgbouncer.ini Configuration

```ini
[databases]
; Map the incoming MLIMS database to the actual local database
mlims = host=127.0.0.1 port=5432 dbname=mlims

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
admin_users = postgres

; =======================================================
; CRITICAL: Must be 'transaction' to support our 
; SET LOCAL transactional RLS architecture.
; =======================================================
pool_mode = transaction

; Pool sizing per role. 
; The backend maintains 7 logic pools (admin, doctor, etc.) 
; mapped to PgBouncer.
max_client_conn = 1000
default_pool_size = 20
```

## Integrating with Node.js
Update the Node.js connection strings in `.env` to point to port `6432` instead of `5432`. PgBouncer will seamlessly handle multiplexing the Express queries across a minimal set of backend physical connections.
