import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { BookOpen, Search } from 'lucide-react';

const PMRegistryPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/pm-registry')
      .then(res => setEntries(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? entries.filter(e =>
        e.case_number?.toLowerCase().includes(search.toLowerCase()) ||
        e.station_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.doctor_name?.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  if (loading) return <div className="p-8">Loading PM Registry...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-slate-500" />
            PM Registry
          </h2>
          <p className="text-slate-500 text-sm mt-1">Consolidated postmortem registry for court/police distribution</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search registry..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Case #</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">PM Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Doctor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Station</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Inquest #</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">COD</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Auth Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Court Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-500">No entries found.</td></tr>
              ) : filtered.map(entry => (
                <tr key={entry.case_id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/cases/postmortem/${entry.case_id}`)}>
                  <td className="px-4 py-3 font-medium text-slate-800">{entry.case_number}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.date_of_pm ? new Date(entry.date_of_pm).toLocaleDateString() : '--'}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.doctor_name || '--'}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.station_name || '--'}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.inquest_no || '--'}</td>
                  <td className="px-4 py-3">
                    {entry.immediate_cause ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Recorded</span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{entry.authorization_type?.replace('_', ' ') || '--'}</td>
                  <td className="px-4 py-3">
                    {entry.receipt_id ? (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Received</span>
                    ) : (
                      <span className="text-xs text-slate-400">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PMRegistryPage;
