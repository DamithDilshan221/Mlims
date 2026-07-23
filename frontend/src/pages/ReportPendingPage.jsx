import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { AlertTriangle, Send, FileText, RefreshCw, Printer } from 'lucide-react';

const BOTTLENECK_LABELS = {
  pending_mlr: 'Pending Final MLR',
  pending_cod: 'Pending Cause of Death',
  pending_lab: 'Awaiting Lab Results',
  pending_toxicology: 'Toxicology Results',
  pending_histology: 'Awaiting Histology',
  missing_police_copy: 'Missing Police Copy',
  other: 'Other',
};

const bottleneckColor = (reason) => {
  const map = {
    pending_mlr: 'bg-orange-100 text-orange-700',
    pending_cod: 'bg-red-100 text-red-700',
    pending_lab: 'bg-amber-100 text-amber-700',
    pending_toxicology: 'bg-amber-100 text-amber-700',
    pending_histology: 'bg-purple-100 text-purple-700',
    missing_police_copy: 'bg-blue-100 text-blue-700',
  };
  return map[reason] || 'bg-slate-100 text-slate-700';
};

const riskBadge = (level) => {
  const map = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-orange-100 text-orange-700 border-orange-200',
    low: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return map[level] || 'bg-slate-100 text-slate-700';
};

const ReportPendingPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [bottleneck, setBottleneck] = useState('all');
  const [threshold, setThreshold] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(() => {
    setLoading(true);
    api.get(`/reporting/pending?bottleneck=${bottleneck}&threshold=${threshold}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bottleneck, threshold]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handlePrint = () => window.print();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pending Cases Bottleneck Tracker</h2>
          <p className="text-slate-500 text-sm mt-1">Overdue cases exceeding SLA targets</p>
        </div>
        {isAdmin && <button onClick={handlePrint} className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><Printer className="w-4 h-4 mr-2" />Print</button>}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Filter Bottleneck:</span>
          <select value={bottleneck} onChange={e => setBottleneck(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Bottlenecks</option>
            <option value="pending_mlr">Pending Final MLR</option>
            <option value="pending_cod">Pending Cause of Death</option>
            <option value="pending_lab">Awaiting Lab Results</option>
            <option value="pending_toxicology">Toxicology Results</option>
            <option value="pending_histology">Awaiting Histology</option>
            <option value="missing_police_copy">Missing Police Copy</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Delay Threshold:</span>
          <select value={threshold} onChange={e => setThreshold(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="3">&gt; 3 Days</option>
            <option value="7">&gt; 7 Days</option>
            <option value="14">&gt; 14 Days</option>
            <option value="30">&gt; 30 Days</option>
          </select>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 ml-auto">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </button>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading report...</div>}

      {data && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Attention Required &mdash; {data.total} case{data.total !== 1 ? 's' : ''} exceeding {threshold}-day SLA target
            </p>
          </div>

          {data.cases.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
              No pending cases match the current filter.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Case No</th>
                      <th className="px-6 py-4">Patient / Deceased</th>
                      <th className="px-6 py-4">Assigned Doctor</th>
                      <th className="px-6 py-4">Bottleneck Reason</th>
                      <th className="px-6 py-4">Days Pending</th>
                      <th className="px-6 py-4">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.cases.map((row, i) => (
                      <tr key={row.case_id || i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{row.case_number}</td>
                        <td className="px-6 py-4">{row.patient_name}</td>
                        <td className="px-6 py-4">{row.doctor_name || '--'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${bottleneckColor(row.bottleneck_reason)}`}>
                            {BOTTLENECK_LABELS[row.bottleneck_reason] || row.bottleneck_reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold">{row.days_pending} Days</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${riskBadge(row.risk_level)}`}>
                            {row.risk_level.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Action Panel</h3>
            <p className="text-sm text-slate-500">Select a case above to view available actions.</p>
            <div className="flex gap-2 mt-3">
              <button className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50" disabled>
                <FileText className="w-3.5 h-3.5 mr-1.5" />Update Status
              </button>
              <button className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50" disabled>
                <Send className="w-3.5 h-3.5 mr-1.5" />Ping Lab Tech
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPendingPage;
