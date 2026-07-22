import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { ShieldCheck, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import clsx from 'clsx';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    table_name: '',
    action_type: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // In a real implementation this would pass query params for filtering and pagination.
      // Phase 2 audit route doesn't have advanced filtering out-of-the-box, but we simulate passing them.
      let url = '/audit-logs?limit=50';
      if (filters.table_name) url += `&table=${filters.table_name}`;
      if (filters.action_type) url += `&action=${filters.action_type}`;
      
      const res = await api.get(url);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    if (expandedRow === id) setExpandedRow(null);
    else setExpandedRow(id);
  };

  const renderDiff = (oldPayload, newPayload) => {
    if (!oldPayload && !newPayload) return <p className="text-sm italic text-slate-400">No payload data.</p>;
    
    // For INSERTs, there's no oldPayload. For DELETEs, no newPayload.
    if (!oldPayload) {
      return (
        <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
          <h4 className="text-xs font-bold text-green-800 uppercase mb-2">Inserted Record</h4>
          <pre className="text-xs text-green-900 whitespace-pre-wrap">{JSON.stringify(newPayload, null, 2)}</pre>
        </div>
      );
    }

    if (!newPayload) {
      return (
        <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
          <h4 className="text-xs font-bold text-red-800 uppercase mb-2">Deleted Record</h4>
          <pre className="text-xs text-red-900 whitespace-pre-wrap">{JSON.stringify(oldPayload, null, 2)}</pre>
        </div>
      );
    }

    // UPDATE - compute diff
    const allKeys = new Set([...Object.keys(oldPayload), ...Object.keys(newPayload)]);
    const diffs = [];

    allKeys.forEach(key => {
      // Basic shallow comparison
      if (JSON.stringify(oldPayload[key]) !== JSON.stringify(newPayload[key])) {
        diffs.push({
          key,
          old: oldPayload[key],
          new: newPayload[key]
        });
      }
    });

    if (diffs.length === 0) return <p className="text-sm italic text-slate-400">No logical changes detected in payload.</p>;

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3 font-semibold w-1/4">Field</th>
              <th className="p-3 font-semibold text-red-700 w-3/8">Old Value</th>
              <th className="p-3 font-semibold text-green-700 w-3/8">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {diffs.map(d => (
              <tr key={d.key}>
                <td className="p-3 font-mono font-medium text-slate-800">{d.key}</td>
                <td className="p-3 font-mono text-red-600 line-through bg-red-50/50">{JSON.stringify(d.old)}</td>
                <td className="p-3 font-mono text-green-600 bg-green-50/50">{JSON.stringify(d.new)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">System Audit Log</h2>
          <p className="text-slate-500 text-sm mt-1">Immutable, append-only record of all system modifications.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Filters */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex space-x-4 items-center">
          <ShieldCheck className="w-5 h-5 text-slate-400" />
          <div className="flex-1 flex space-x-4">
            <input 
              type="text" 
              placeholder="Filter Table (e.g. patients, cases)" 
              value={filters.table_name}
              onChange={e => setFilters({...filters, table_name: e.target.value})}
              className="px-3 py-1.5 text-sm border rounded focus:ring-primary-500 max-w-xs"
            />
            <select 
              value={filters.action_type}
              onChange={e => setFilters({...filters, action_type: e.target.value})}
              className="px-3 py-1.5 text-sm border rounded focus:ring-primary-500"
            >
              <option value="">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            </select>
          </div>
          <p className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">Read-Only View</p>
        </div>

        {/* Table */}
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Table</th>
              <th className="px-6 py-3">Record ID</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : logs.map(log => (
              <React.Fragment key={log.log_id}>
                <tr 
                  onClick={() => toggleRow(log.log_id)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4 text-center">
                    {expandedRow === log.log_id ? <ChevronDown className="w-4 h-4 text-slate-400 inline" /> : <ChevronRight className="w-4 h-4 text-slate-400 inline" />}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{new Date(log.changed_at).toLocaleString()}</td>
                  <td className="px-6 py-4 font-medium">{log.username || `User ID: ${log.user_id}`}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-800">{log.table_name}</td>
                  <td className="px-6 py-4">{log.record_id}</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-2 py-1 rounded text-xs font-bold",
                      log.action_type === 'INSERT' ? "bg-green-100 text-green-700" :
                      log.action_type === 'UPDATE' ? "bg-blue-100 text-blue-700" :
                      log.action_type === 'DELETE' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {log.action_type}
                    </span>
                  </td>
                </tr>
                {/* Expandable diff view */}
                {expandedRow === log.log_id && (
                  <tr>
                    <td colSpan="6" className="bg-slate-50/50 p-6 border-b border-slate-200">
                      <div className="flex items-start space-x-2">
                        <Activity className="w-4 h-4 text-slate-400 mt-1" />
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Payload Diff Analysis</h4>
                          {renderDiff(log.old_payload, log.new_payload)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;
