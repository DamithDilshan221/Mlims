import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { CheckCircle2, Clock } from 'lucide-react';

const LabTestPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Result finalization state
  const [activeRequest, setActiveRequest] = useState(null);
  const [resultData, setResultData] = useState({ findings: '', diagnosis: '' });

  useEffect(() => {
    api.get('/lab-requests')
      .then(res => setRequests(res.data))
      .finally(() => setLoading(false));
  }, []);

  const finalizeResult = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/lab-requests/${activeRequest}/finalize`, resultData);
      setActiveRequest(null);
      // Reload
      const res = await api.get('/lab-requests');
      setRequests(res.data);
    } catch (err) {
      alert("Failed to finalize result.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Laboratory & Toxicology</h2>
        <p className="text-slate-500 text-sm mt-1">Pending requests and result management.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lab Queue */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Request Type</th>
                <th className="px-6 py-4">Case #</th>
                <th className="px-6 py-4">Status</th>
                {user.role === 'forensic_staff' && <th className="px-6 py-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : requests.map(r => (
                <tr key={r.request_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 capitalize">{r.request_type.replace('_', ' ')}</td>
                  <td className="px-6 py-4">{r.case_id}</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-bold",
                      r.status === 'completed' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {r.status === 'completed' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  {user.role === 'forensic_staff' && (
                    <td className="px-6 py-4 text-right">
                      {r.status === 'pending' && (
                        <button 
                          onClick={() => setActiveRequest(r.request_id)}
                          className="text-primary-600 hover:text-primary-800 font-medium text-xs"
                        >
                          Finalize Result
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Panel */}
        {user.role === 'forensic_staff' && activeRequest && (
          <div className="bg-white rounded-xl shadow-xl border border-primary-100 overflow-hidden h-fit sticky top-8">
            <div className="bg-primary-50 px-6 py-4 border-b border-primary-100">
              <h3 className="font-bold text-primary-900">Finalize Result #{activeRequest}</h3>
            </div>
            <form onSubmit={finalizeResult} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Findings</label>
                <textarea 
                  rows="3" required
                  value={resultData.findings} 
                  onChange={e => setResultData({...resultData, findings: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis</label>
                <input 
                  type="text" required
                  value={resultData.diagnosis} 
                  onChange={e => setResultData({...resultData, diagnosis: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" 
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setActiveRequest(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-sm bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700">Submit Final Result</button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default LabTestPage;
