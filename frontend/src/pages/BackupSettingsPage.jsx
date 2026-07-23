import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Database, HardDrive, Settings as SettingsIcon, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';

const BackupSettingsPage = () => {
  const toast = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await api.get('/audit-logs?table=SYSTEM_BACKUP&limit=20');
      setBackups(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBackup = async () => {
    if (!window.confirm("Trigger a manual database backup?")) return;
    
    setTriggering(true);
    try {
      await api.post('/admin/backup');
      toast.success("Backup enqueued successfully. It will appear in the log shortly.");
      setTimeout(fetchBackups, 3000);
    } catch (err) {
      toast.error("Failed to enqueue backup.");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">System Backup & Settings</h2>
        <p className="text-slate-500 text-sm mt-1">Operational configuration and database snapshots.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Backup Log */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <Database className="w-5 h-5 mr-2 text-slate-500" />
              Backup History (Audit Log)
            </h3>
            <button 
              onClick={handleRunBackup}
              disabled={triggering}
              className="px-4 py-2 bg-slate-900 text-white font-medium text-sm rounded hover:bg-slate-800 disabled:opacity-50 flex items-center shadow-sm"
            >
              <HardDrive className="w-4 h-4 mr-2" />
              {triggering ? 'Triggering...' : 'Run Backup Now'}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white sticky top-0 text-slate-700 font-semibold border-b border-slate-200 shadow-sm z-10">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Triggered By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading...</td></tr>
                ) : backups.length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-slate-400">No backup records found.</td></tr>
                ) : backups.map(log => {
                  const payload = log.new_payload || {};
                  const isSuccess = log.action_type === 'BACKUP_COMPLETED';
                  
                  return (
                    <tr key={log.log_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs">{new Date(log.changed_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={clsx("inline-flex items-center px-2 py-1 rounded-full text-xs font-bold", isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {isSuccess ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {isSuccess ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {isSuccess ? `Size: ${payload.size}` : `Error: ${payload.error}`}
                      </td>
                      <td className="px-6 py-4">{log.username || `User #${log.user_id}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Read-Only Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2 text-slate-500" />
              Environment Settings
            </h3>
          </div>
          <div className="p-6">
            <p className="text-xs text-slate-500 mb-6">
              These settings are configured via secure environment variables (`.env`). They are displayed here read-only to prevent runtime configuration drift.
            </p>

            <div className="space-y-4">
              <div className="p-4 border border-slate-100 rounded bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Session Timeout</p>
                <p className="font-mono text-sm text-slate-800">15 Minutes (900s)</p>
              </div>
              
              <div className="p-4 border border-slate-100 rounded bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">JWT Expiry</p>
                <p className="font-mono text-sm text-slate-800">15m (Access) / 8h (Refresh)</p>
              </div>

              <div className="p-4 border border-slate-100 rounded bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Password Hashing Rounds</p>
                <p className="font-mono text-sm text-slate-800">Bcrypt Salt 10</p>
              </div>

              <div className="p-4 border border-slate-100 rounded bg-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">DB Connection Pool</p>
                <p className="font-mono text-sm text-slate-800">Max 20 clients per role</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BackupSettingsPage;
