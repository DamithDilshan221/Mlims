# MLIMS PostgreSQL Streaming Replication & High Availability

To fulfill Security Goal 4 (Availability and Disaster Recovery), this document outlines the procedure for configuring asynchronous streaming replication between a Primary PostgreSQL node and a Standby node.

## Why Streaming Replication?
Physical streaming replication operates at the Write-Ahead Log (WAL) level. Because it is physical:
- **Audit Logs** (`audit_logs`) and **Chain of Custody** (`chain_of_custody`) tables are inherently replicated exactly byte-for-byte. 
- There is no risk of logical decoding failures or missing triggers. The standby is a perfect block-for-block mirror of the primary, satisfying the high-availability storage requirements for forensic evidence tracking.

## Configuration (Primary Node)

1. Edit `postgresql.conf` to enable replication:
```ini
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB
listen_addresses = '*'
```

2. Edit `pg_hba.conf` to allow the standby to connect:
```ini
host replication repuser 192.168.1.100/32 scram-sha-256
```

3. Create the replication user:
```sql
CREATE ROLE repuser WITH REPLICATION PASSWORD 'strong_password' LOGIN;
```

## Configuration (Standby Node)

1. Stop the PostgreSQL service on the standby.
2. Clear the existing data directory.
3. Run `pg_basebackup` to clone the primary:
```bash
pg_basebackup -h 192.168.1.50 -U repuser -D /var/lib/postgresql/15/main -Fp -Xs -P -R
```
*(The `-R` flag automatically generates `standby.signal` and configures `primary_conninfo` in `postgresql.auto.conf`.)*

4. Start the PostgreSQL service. The standby will now stream WAL records from the primary.

## Automated Failover
To ensure the system redirects traffic to the standby within minutes of a primary failure, we recommend **Patroni**.
- Patroni uses a distributed consensus store (like etcd or Consul) to monitor node health.
- If the primary fails, Patroni automatically promotes the standby and updates the routing layer (e.g., HAProxy or PgBouncer) to redirect application traffic seamlessly.
