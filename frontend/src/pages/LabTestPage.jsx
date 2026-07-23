import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';
import { CheckCircle2, Clock, FlaskConical, ChevronRight, X, FileText, AlertCircle, Calendar } from 'lucide-react';

const LabTestPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Result finalization state
  const [activeRequest, setActiveRequest] = useState(null);
  const [resultData, setResultData] = useState({ findings: '', diagnosis: '', documentUri: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/lab-requests/requests');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch lab requests. Please ensure you have the necessary permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenPanel = (request) => {
    setActiveRequest(request);
    setResultData({ findings: '', diagnosis: '', documentUri: '' });
  };

  const handleClosePanel = () => {
    setActiveRequest(null);
  };

  const finalizeResult = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/lab-requests/requests/${activeRequest.request_id}/finalize`, resultData);
      toast.success("Lab result finalized successfully and case updated.");
      handleClosePanel();
      await fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to finalize result.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <FlaskConical size={120} />
        </div>
        <div className="relative z-10 flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-outfit tracking-tight">Laboratory & Toxicology Dashboard</h2>
            <p className="text-blue-100 mt-2 text-lg">Manage pending tests, submit analytical findings, and finalize clinical diagnoses.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start space-x-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lab Queue */}
        <div className={clsx(
          "transition-all duration-500 ease-in-out",
          activeRequest ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"
        )}>
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                Laboratory Requests Queue
              </h3>
              <div className="text-sm font-medium text-slate-500">
                {requests.length} total request{requests.length !== 1 && 's'}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-slate-700 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Request Details</th>
                    <th className="px-6 py-4">Case Reference</th>
                    <th className="px-6 py-4">Status</th>
                    {user.role === 'forensic_staff' && <th className="px-6 py-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                          <p>Loading laboratory queue...</p>
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 && !error ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                        <FlaskConical className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p className="text-lg font-medium text-slate-500">No lab requests found.</p>
                        <p className="text-sm">The queue is currently empty.</p>
                      </td>
                    </tr>
                  ) : (
                    requests.map(r => (
                      <tr 
                        key={r.request_id} 
                        className={clsx(
                          "transition-colors group",
                          activeRequest?.request_id === r.request_id ? "bg-indigo-50/50" : "hover:bg-slate-50/80"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 capitalize tracking-tight">{r.request_type.replace('_', ' ')}</div>
                          <div className="text-xs text-slate-500 flex items-center mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(r.request_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <span className="inline-flex w-fit font-mono text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                              {r.case_id ? `CASE-${r.case_id.toString().padStart(4, '0')}` : 'NO-CASE'}
                            </span>
                            <span className="inline-flex w-fit font-mono text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                              {r.barcode_id || 'NO-BARCODE'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={clsx(
                            "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm",
                            r.status === 'completed' 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {r.status === 'completed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            ) : (
                              <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                            )}
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        {user.role === 'forensic_staff' && (
                          <td className="px-6 py-4 text-right">
                            {r.status === 'pending' ? (
                              <button 
                                onClick={() => handleOpenPanel(r)}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm group-hover:shadow-md"
                              >
                                Finalize
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium px-4">Done</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Panel (Slide in / Fade in) */}
        {user.role === 'forensic_staff' && activeRequest && (
          <div className="lg:col-span-5 xl:col-span-4 transition-all duration-500 ease-out transform opacity-100 translate-x-0 sticky top-8">
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative">
              
              {/* Panel Header */}
              <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
                <div>
                  <div className="text-indigo-300 text-xs font-bold tracking-wider uppercase mb-1">
                    Request #{activeRequest.request_id}
                  </div>
                  <h3 className="font-bold text-white text-lg capitalize flex items-center">
                    {activeRequest.request_type.replace('_', ' ')}
                  </h3>
                </div>
                <button 
                  onClick={handleClosePanel}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel Form */}
              <form onSubmit={finalizeResult} className="p-6 space-y-5 bg-slate-50/50">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                  <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-2">Instructions</h4>
                  <p className="text-sm text-indigo-900/80">
                    Carefully record the findings from the lab analysis. Submitting this form will permanently attach these results to the case record and mark the request as completed.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Detailed Findings *</label>
                  <textarea 
                    rows="4" 
                    required
                    value={resultData.findings} 
                    onChange={e => setResultData({...resultData, findings: e.target.value})}
                    placeholder="Enter analytical data and observations..."
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white shadow-sm resize-none" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Final Diagnosis / Conclusion *</label>
                  <input 
                    type="text" 
                    required
                    value={resultData.diagnosis} 
                    onChange={e => setResultData({...resultData, diagnosis: e.target.value})}
                    placeholder="e.g. Positive for Opioids"
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white shadow-sm" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Document URI (Optional)</label>
                  <input 
                    type="text" 
                    value={resultData.documentUri} 
                    onChange={e => setResultData({...resultData, documentUri: e.target.value})}
                    placeholder="s3://reports/lab-123.pdf"
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white shadow-sm font-mono text-xs" 
                  />
                  <p className="text-xs text-slate-400 mt-1">Provide a link if an external report document is available.</p>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={handleClosePanel} 
                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-70 flex items-center"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Finalizing...
                      </>
                    ) : 'Submit Result'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LabTestPage;
