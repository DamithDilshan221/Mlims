import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Gavel, Scale, FileCheck, Plus, X, Calendar,
  AlertTriangle, CheckCircle, Clock, Search, ChevronRight,
  Building2, FileText, Download, Upload
} from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { id: 'summons', label: 'Summons Register', icon: Scale },
  { id: 'receipts', label: 'Certificates of Receipt', icon: FileCheck },
  { id: 'calendar', label: 'Trial Calendar', icon: Calendar },
];

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  served: 'bg-blue-100 text-blue-700 border-blue-200',
  responded: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  complied: 'bg-green-100 text-green-700 border-green-200',
  dismissed: 'bg-slate-100 text-slate-500 border-slate-200',
};

const CourtDeskPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const tabFromPath = location.pathname.includes('/trials') ? 'calendar' : location.pathname.includes('/summons') ? 'summons' : 'summons';
  const [activeTab, setActiveTab] = useState(tabFromPath);
  const [summons, setSummons] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [trials, setTrials] = useState({ mlrTrials: [], summonsAppearances: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    caseId: '', courtId: '', issueDate: new Date().toISOString().split('T')[0],
    appearanceDate: '', documentUri: '', notes: '', responseStatus: 'pending',
  });
  const [courts, setCourts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/court-summons').catch(() => ({ data: [] })),
      api.get('/reports/court-receipts').catch(() => ({ data: [] })),
      api.get('/statistics/trial-calendar').catch(() => ({ data: { mlrTrials: [], summonsAppearances: [] } })),
      api.get('/lookups/courts').catch(() => ({ data: [] })),
    ]).then(([summonsRes, receiptsRes, trialsRes, courtsRes]) => {
      setSummons(summonsRes.data);
      setReceipts(receiptsRes.data);
      setTrials(trialsRes.data || { mlrTrials: [], summonsAppearances: [] });
      setCourts(courtsRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateSummons = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/court-summons', {
        ...formData,
        caseId: parseInt(formData.caseId, 10),
        courtId: parseInt(formData.courtId, 10),
      });
      toast.success('Summons created successfully.');
      setShowForm(false);
      setFormData({
        caseId: '', courtId: '', issueDate: new Date().toISOString().split('T')[0],
        appearanceDate: '', documentUri: '', notes: '', responseStatus: 'pending',
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create summons.');
    } finally {
      setSubmitting(false);
    }
  };

  const isUrgent = (dateStr) => {
    if (!dateStr) return false;
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  };

  const allEvents = [
    ...trials.mlrTrials.map(t => ({ ...t, source: 'MLR Trial' })),
    ...trials.summonsAppearances.map(t => ({ ...t, source: 'Summons' })),
  ].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  if (loading) return <div className="p-8 text-slate-500">Loading Court & Legal Desk...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <Scale className="w-6 h-6 mr-2 text-amber-500" />
            Court & Legal Desk
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage summons, certificates of receipt, and trial schedule.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Summons Register */}
      {activeTab === 'summons' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <Scale className="w-5 h-5 mr-2 text-slate-500" />
              Summons Register
            </h3>
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center">
              {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {showForm ? 'Cancel' : 'New Summons'}
            </button>
          </div>

          {/* Create Summons Form */}
          {showForm && (
            <form onSubmit={handleCreateSummons} className="p-6 bg-blue-50 border-b border-blue-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Case ID *</label>
                  <input type="number" required value={formData.caseId}
                    onChange={e => setFormData({...formData, caseId: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Court *</label>
                  <select required value={formData.courtId}
                    onChange={e => setFormData({...formData, courtId: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded">
                    <option value="">Select court...</option>
                    {courts.map(c => (
                      <option key={c.court_id} value={c.court_id}>{c.court_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Issue Date</label>
                  <input type="date" value={formData.issueDate}
                    onChange={e => setFormData({...formData, issueDate: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Appearance Date</label>
                  <input type="date" value={formData.appearanceDate}
                    onChange={e => setFormData({...formData, appearanceDate: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Document URI</label>
                  <input type="text" value={formData.documentUri}
                    onChange={e => setFormData({...formData, documentUri: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded" placeholder="/uploads/summons/..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select value={formData.responseStatus}
                    onChange={e => setFormData({...formData, responseStatus: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded">
                    <option value="pending">Pending</option>
                    <option value="served">Served</option>
                    <option value="responded">Responded</option>
                    <option value="complied">Complied</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea rows="2" value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Summons'}
                </button>
              </div>
            </form>
          )}

          {/* Summons List */}
          <div className="divide-y divide-slate-100">
            {summons.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No summons records found.</div>
            ) : (
              summons.map(s => (
                <div key={s.summons_id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={clsx(
                        "w-2 h-2 mt-2 rounded-full",
                        s.response_status === 'complied' ? 'bg-green-500' :
                        s.response_status === 'dismissed' ? 'bg-slate-300' : 'bg-amber-400'
                      )} />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Case: {s.case_number}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.court_name}</p>
                        <div className="flex items-center mt-2 space-x-3">
                          <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border", STATUS_BADGE[s.response_status] || 'bg-slate-100 text-slate-600')}>
                            {s.response_status?.toUpperCase()}
                          </span>
                          {s.patient_name && (
                            <span className="text-xs text-slate-400">Patient: {s.patient_name}</span>
                          )}
                        </div>
                        {s.notes && <p className="text-xs text-slate-400 mt-2">{s.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">Issued: {s.issue_date ? new Date(s.issue_date).toLocaleDateString('en-GB') : '--'}</p>
                      {s.appearance_date && (
                        <p className={clsx("text-xs font-bold mt-1", isUrgent(s.appearance_date) ? 'text-red-500' : 'text-slate-600')}>
                          Trial: {new Date(s.appearance_date).toLocaleDateString('en-GB')}
                        </p>
                      )}
                      {s.document_uri && (
                        <a href={s.document_uri} className="text-xs text-primary-600 hover:underline mt-1 block" target="_blank">View Document</a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Certificates of Receipt */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <FileCheck className="w-5 h-5 mr-2 text-slate-500" />
              Certificates of Receipt
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {receipts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No certificates of receipt recorded.</div>
            ) : (
              receipts.map(r => (
                <div key={r.receipt_id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.court_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.mlr_id ? `MLR #${r.mlr_id}` : r.pmr_id ? `PMR #${r.pmr_id}` : '--'}
                      </p>
                      {r.registrar_sign && (
                        <p className="text-xs text-slate-400 mt-1">Signed by: {r.registrar_sign}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        Received: {r.received_date ? new Date(r.received_date).toLocaleDateString('en-GB') : '--'}
                      </p>
                      {r.trial_date && (
                        <p className="text-xs text-slate-600 mt-1">
                          Trial: {new Date(r.trial_date).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Trial Calendar */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-slate-500" />
              Trial Calendar
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {allEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No upcoming trial dates.</div>
            ) : (
              allEvents.map((event, i) => (
                <div key={i} className={clsx(
                  "p-5 hover:bg-slate-50 transition-colors",
                  isUrgent(event.event_date) ? 'bg-red-50' : ''
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="text-center flex-shrink-0 w-12">
                        <p className={clsx(
                          "text-lg font-bold",
                          isUrgent(event.event_date) ? 'text-red-600' : 'text-slate-800'
                        )}>
                          {event.event_date ? new Date(event.event_date).getDate() : '--'}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase">
                          {event.event_date ? new Date(event.event_date).toLocaleString('en', { month: 'short' }) : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Case: {event.case_number || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">{event.court_name} — {event.source}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className={clsx(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            event.status === 'dispatched' || event.status === 'complied'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            {event.status?.replace('_', ' ').toUpperCase()}
                          </span>
                          {event.court_case_no && (
                            <span className="text-xs text-slate-400">{event.court_case_no}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {event.event_date && (
                        <span className={clsx(
                          "text-xs px-2 py-1 rounded",
                          isUrgent(event.event_date) ? 'bg-red-100 text-red-700 font-bold' : 'text-slate-400'
                        )}>
                          {isUrgent(event.event_date) ? '⚠ WITHIN 3 DAYS' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourtDeskPage;
