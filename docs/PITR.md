# MLIMS Point-in-Time Recovery (PITR)

For disaster recovery scenarios involving accidental data deletion or corruption, Point-in-Time Recovery allows restoring the database state to a specific minute before the event occurred.

## 1. Enable WAL Archiving
On the primary node, configure `postgresql.conf` to archive WAL segments securely offsite (e.g., to an NFS mount, S3, or a dedicated backup server).

```ini
wal_level = replica
archive_mode = on
# Example using a local NFS mount. In AWS, this might use aws s3 cp.
archive_command = 'test ! -f /mnt/nfs_archives/%f && cp %p /mnt/nfs_archives/%f'
```
*Restart PostgreSQL to apply `archive_mode` changes.*

## 2. Base Backups
PITR requires a base backup to apply the WAL logs against. Use `pg_basebackup` regularly (e.g., weekly) to establish these checkpoints.

```bash
pg_basebackup -h localhost -U postgres -D /var/backups/base_backups/backup_$(date +%Y%m%d) -Ft -z
```

## 3. Restore Procedure

If corruption occurs at 2026-07-23 14:35:00:

1. Stop the PostgreSQL service.
2. Move the corrupted data directory out of the way.
3. Extract the last good base backup into the data directory.
4. Create a `recovery.signal` file in the data directory:
   ```bash
   touch /var/lib/postgresql/15/main/recovery.signal
   ```
5. Edit `postgresql.conf` to specify the restore target and the command to fetch archived WAL files:
   ```ini
   restore_command = 'cp /mnt/nfs_archives/%f %p'
   recovery_target_time = '2026-07-23 14:34:00'
   ```
6. Start PostgreSQL. It will replay the WAL logs exactly up to the target time and then pause or promote itself (based on `recovery_target_action`).
