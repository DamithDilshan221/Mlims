import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FileText, PlusCircle, Search, Calendar, ChevronRight, Activity, Crosshair } from 'lucide-react';
import clsx from 'clsx';

const CaseListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      // The cases endpoint includes patient details as well due to the repository view
      const res = await api.get('/cases');
      setCases(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch cases. Ensure you have the right permissions.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.case_id?.toString().includes(q) ||
      c.patient_name?.toLowerCase().includes(q) ||
      c.case_type?.toLowerCase().includes(q)
    );
  });

  const navigateToCase = (c) => {
    if (c.case_type === 'clinical') {
      navigate(`/cases/clinical/${c.case_id}`);
    } else {
      navigate(`/cases/postmortem/${c.case_id}`);
    }
  };

  const canCreateCase = ['admin', 'records_clerk', 'police'].includes(user.role);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-sky-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex justify-between items-center">
        <div className="absolute top-0 left-0 p-12 opacity-10">
          <FileText size={160} />
        </div>
        <div className="relative z-10 flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-outfit tracking-tight">Case Management</h2>
            <p className="text-blue-100 mt-2 text-lg font-light">View, search, and manage all registered forensic cases.</p>
          </div>
        </div>
        {canCreateCase && (
          <button 
            onClick={() => navigate('/cases/new')}
            className="relative z-10 bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center group"
          >
            <PlusCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Register New Case
          </button>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by ID, Patient Name, or Case Type..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white shadow-sm"
            />
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {filteredCases.length} Case{filteredCases.length !== 1 && 's'} Found
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-lg">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-slate-700 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Case ID</th>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Case Type</th>
                <th className="px-6 py-4">Incident Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p>Loading cases...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 && !error ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p className="text-lg font-medium text-slate-500">No cases found.</p>
                    <p className="text-sm">Try adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                filteredCases.map(c => (
                  <tr 
                    key={c.case_id} 
                    onClick={() => navigateToCase(c)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                        CASE-{c.case_id?.toString().padStart(4, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {c.patient_name || <span className="text-slate-400 italic font-normal">Unknown</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {c.case_type === 'clinical' ? (
                          <Activity className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Crosshair className="w-4 h-4 text-rose-500" />
                        )}
                        <span className="capitalize font-medium text-slate-700">
                          {c.case_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-slate-500">
                        <Calendar className="w-4 h-4 mr-2 opacity-70" />
                        {c.incident_date ? new Date(c.incident_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex px-2.5 py-1 rounded-full text-xs font-bold border",
                        c.status === 'open' 
                          ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm" 
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      )}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors group-hover:text-blue-600">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CaseListPage;
