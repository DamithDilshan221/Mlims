import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import { FileCheck, Activity, UserMinus, FileText } from 'lucide-react';
import clsx from 'clsx';

const ReportListPage = () => {
  const { user } = useAuth();
  
  const [reports, setReports] = useState({ clinical: [], postmortem: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/all')
      .then(res => {
        const clinical = res.data.filter(r => r.case_type === 'clinical' || r.mlef_id);
        const postmortem = res.data.filter(r => r.case_type === 'postmortem' || r.pmr_id);
        setReports({ clinical, postmortem });
      })
      .catch(() => {
        // Fallback to separate endpoints if view query fails
        Promise.all([
          api.get('/clinical-examinations'),
          api.get('/postmortem-examinations')
        ]).then(([clinRes, pmRes]) => {
          setReports({
            clinical: clinRes.data,
            postmortem: pmRes.data
          });
        }).catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute status for Clinical (requires fetching medico_legal_reports, 
  // but for simplicity in this UI prototype we assume the API joins this data: 
  // report_issue_date, and receipt_id)
  const getClinicalStatus = (exam) => {
    if (exam.receipt_id) return { label: 'Acknowledged', color: 'bg-indigo-100 text-indigo-700' };
    if (exam.report_issue_date) return { label: 'Issued', color: 'bg-green-100 text-green-700' };
    return { label: 'Draft', color: 'bg-amber-100 text-amber-700' };
  };

  // Compute status for Postmortem
  const getPostmortemStatus = (exam) => {
    if (exam.receipt_id) return { label: 'Acknowledged', color: 'bg-indigo-100 text-indigo-700' };
    if (exam.has_causes_of_death) return { label: 'Ready', color: 'bg-green-100 text-green-700' };
    return { label: 'In Progress', color: 'bg-amber-100 text-amber-700' };
  };

  const isCourtActionable = (statusLabel) => {
    return statusLabel === 'Issued' || statusLabel === 'Ready';
  };

  const renderTable = (data, type, getStatusFn, icon) => {
    // Court Officials only see items they can act on (or have acted on)
    const filteredData = user.role === 'court' 
      ? data.filter(item => isCourtActionable(getStatusFn(item).label) || getStatusFn(item).label === 'Acknowledged')
      : data;

    if (filteredData.length === 0) return <div className="p-8 text-center text-slate-400">No reports found.</div>;

    return (
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
          <tr>
            <th className="px-6 py-4">Case #</th>
            <th className="px-6 py-4">Report Type</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredData.map(item => {
            const status = getStatusFn(item);
            const id = type === 'clinical' ? item.mlef_id : item.pmr_id;
            const date = type === 'clinical' ? item.exam_date : item.date_of_pm;

            return (
              <tr key={id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">#{item.case_id}</td>
                <td className="px-6 py-4 flex items-center">
                  {icon}
                  <span className="capitalize ml-2">{type}</span>
                </td>
                <td className="px-6 py-4">{date ? new Date(date).toLocaleDateString() : '--'}</td>
                <td className="px-6 py-4">
                  <span className={clsx("inline-flex items-center px-2 py-1 rounded-full text-xs font-bold", status.color)}>
                    {status.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {/* Action varies: Court Official issues receipt, Doctor edits/prints */}
                  {user.role === 'court' && isCourtActionable(status.label) ? (
                    <Link to={`/reports/generate/${type}/${id}`} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-wide">
                      Acknowledge (Receipt)
                    </Link>
                  ) : (
                    <Link to={`/reports/generate/${type}/${id}`} className="text-primary-600 hover:text-primary-800 font-medium text-xs uppercase tracking-wide">
                      {status.label === 'Draft' || status.label === 'In Progress' ? 'Edit Draft' : 'View / Print'}
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Reports & Approvals</h2>
        <p className="text-slate-500 text-sm mt-1">
          {user.role === 'court' ? 'Pending reports awaiting court acknowledgment.' : 'Manage Medico-Legal Reports and Postmortem finalizations.'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-slate-500" />
            Clinical Reports (MLEF)
          </h3>
        </div>
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : renderTable(reports.clinical, 'clinical', getClinicalStatus, <Activity className="w-4 h-4 text-slate-400"/>)}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center">
            <UserMinus className="w-5 h-5 mr-2 text-slate-500" />
            Postmortem Reports (PMR)
          </h3>
        </div>
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : renderTable(reports.postmortem, 'postmortem', getPostmortemStatus, <UserMinus className="w-4 h-4 text-slate-400"/>)}
      </div>
    </div>
  );
};

export default ReportListPage;
