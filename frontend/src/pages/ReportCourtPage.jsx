import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Calendar, Scale, FileText, CheckCircle, XCircle, Printer } from 'lucide-react';

const mlrStatusBadge = (status) => {
  if (status === 'dispatched') return 'bg-green-100 text-green-700';
  return 'bg-red-100 text-red-700';
};

const receiptStatusBadge = (status) => {
  if (status === 'verified') return 'bg-indigo-100 text-indigo-700';
  return 'bg-amber-100 text-amber-700';
};

const ReportCourtPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [courtId, setCourtId] = useState('');
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(() => {
    setLoading(true);
    let url = `/reporting/court?range=${range}`;
    if (courtId) url += `&courtId=${courtId}`;
    if (status !== 'all') url += `&status=${status}`;
    api.get(url)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courtId, status, range]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handlePrint = () => window.print();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Court Summons & Trial Register</h2>
          <p className="text-slate-500 text-sm mt-1">Trial schedule and MLR dispatch status</p>
        </div>
        {isAdmin && <button onClick={handlePrint} className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <Printer className="w-4 h-4 mr-2" />Print
        </button>}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Court:</span>
          <select value={courtId} onChange={e => setCourtId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Courts</option>
            {data?.courts?.map(c => (
              <option key={c.court_id} value={c.court_id}>{c.court_name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">MLR Status:</span>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="not_dispatched">MLR Not Dispatched</option>
            <option value="dispatched">MLR Dispatched</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Range:</span>
          <select value={range} onChange={e => setRange(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="7">Next 7 Days</option>
            <option value="30">Next 30 Days</option>
            <option value="60">Next 60 Days</option>
            <option value="90">Next 90 Days</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading report...</div>}

      {data && (
        <>
          {data.trials.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
              No upcoming trials match the current filter.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">Trial Schedule & Dispatch Status</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Trial Date</th>
                      <th className="px-6 py-4">Court Name</th>
                      <th className="px-6 py-4">Case / Summons No</th>
                      <th className="px-6 py-4">Doctor Summoned</th>
                      <th className="px-6 py-4">MLR Status</th>
                      <th className="px-6 py-4">Receipt Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.trials.map((row, i) => (
                      <tr key={row.mlr_id || i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {row.trial_date ? new Date(row.trial_date).toLocaleDateString() : '--'}
                        </td>
                        <td className="px-6 py-4">{row.court_name}</td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{row.court_case_no}</span>
                          <span className="text-slate-400 ml-2">({row.case_number})</span>
                        </td>
                        <td className="px-6 py-4">{row.doctor_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${mlrStatusBadge(row.mlr_status)}`}>
                            {row.mlr_status === 'dispatched' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {row.mlr_status === 'dispatched' ? 'Dispatched' : 'Unissued'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${receiptStatusBadge(row.receipt_status)}`}>
                            {row.receipt_status === 'verified' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {row.receipt_status === 'verified' ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportCourtPage;
