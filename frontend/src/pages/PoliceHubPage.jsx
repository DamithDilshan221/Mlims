import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FileText, Shield, Building2, AlertTriangle, Search, Upload,
  Plus, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp,
  BadgeCheck, User, Calendar, MapPin, Scale, Gavel,
} from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { key: 'inquests', label: 'Inquest Orders Register', icon: FileText },
  { key: 'handovers', label: 'Police Copy Handover Log', icon: Shield },
  { key: 'stations', label: 'Police Station Directory', icon: Building2 },
  { key: 'escalations', label: 'Magistrate Escalations', icon: AlertTriangle },
];

const PoliceHubPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const tabFromPath = location.pathname.includes('/inquests') ? 'inquests' : location.pathname.includes('/handovers') ? 'handovers' : 'inquests';
  const [activeTab, setActiveTab] = useState(tabFromPath);
  const [inquests, setInquests] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [stations, setStations] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState({});

  const isPolice = user?.role === 'police';
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  const fetchTab = useCallback(async (tab) => {
    setLoading(prev => ({ ...prev, [tab]: true }));
    try {
      switch (tab) {
        case 'inquests': {
          const res = await api.get('/police-hub/inquests');
          setInquests(res.data);
          break;
        }
        case 'handovers': {
          const res = await api.get('/police-hub/handovers');
          setHandovers(res.data);
          break;
        }
        case 'stations': {
          const res = await api.get('/lookups/police_stations');
          setStations(Array.isArray(res.data) ? res.data : []);
          break;
        }
        case 'escalations': {
          const res = await api.get('/police-hub/inquests');
          setEscalations(res.data.filter(i => i.authorization_type === 'magistrate_court_order' || i.death_category === 'high_profile'));


          break;
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, []);

  useEffect(() => { fetchTab(activeTab); }, [activeTab, fetchTab]);

  const handleUploadInquest = async (caseId) => {
    const fileName = prompt('Enter file name:');
    const fileUri = prompt('Enter file URI (path or URL):');
    if (!fileName || !fileUri) return;
    try {
      await api.post(`/police-hub/inquests/${caseId}`, { fileName, fileUri });
      toast.success('Inquest order uploaded.');
      fetchTab('inquests');
    } catch { toast.error('Upload failed.'); }
  };

  const handleLogHandover = async (caseId) => {
    const officerName = prompt('Collecting Officer Name:');
    const officerBadge = prompt('Officer Badge/PIN:');
    if (!officerName || !officerBadge) return;
    try {
      await api.post(`/police-hub/handovers/${caseId}`, {
        documentType: 'mlef_police_copy',
        officerName, officerBadge,
      });
      toast.success('Handover logged.');
      fetchTab('handovers');
    } catch { toast.error('Failed to log handover.'); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-600" />
            Police & Inquest Hub
          </h2>
          <p className="text-slate-500 mt-1">
            {isPolice ? 'Manage inquest orders, case statements, and document handovers.' : 'Police liaison, inquest tracking, and document dispatch.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
            )}>
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'inquests' && (
        <InquestTab data={inquests} loading={loading.inquests} onUpload={handleUploadInquest} isDoctor={isDoctor} />
      )}
      {activeTab === 'handovers' && (
        <HandoverTab data={handovers} loading={loading.handovers} onLogHandover={handleLogHandover} isPolice={isPolice} />
      )}
      {activeTab === 'stations' && (
        <StationTab data={stations} loading={loading.stations} />
      )}
      {activeTab === 'escalations' && (
        <EscalationTab data={escalations} loading={loading.escalations} />
      )}
    </div>
  );
};

/* ─── Inquest Orders Register ─── */
const InquestTab = ({ data, loading, onUpload, isDoctor }) => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Inquest Orders Register</h3>
        <span className="text-xs text-slate-500">{data.length} records</span>
      </div>
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading...</div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm">No inquest records found.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {data.map((item) => (
            <div key={item.pmr_id || item.case_id} className="hover:bg-slate-50">
              <div className="p-5 cursor-pointer" onClick={() => setExpanded(expanded === item.case_id ? null : item.case_id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={clsx(
                      "w-2 h-2 mt-2 rounded-full flex-shrink-0",
                      item.authorization_type === 'magistrate_court_order' ? 'bg-red-500' :
                      item.authorization_type === 'police_inquest' ? 'bg-amber-500' : 'bg-blue-500'
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-semibold text-slate-800">{item.case_number || 'N/A'}</p>
                        <span className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                          item.authorization_type === 'magistrate_court_order' ? 'bg-red-100 text-red-700' :
                          item.authorization_type === 'police_inquest' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {item.authorization_type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.station_name} — Ordered by: {item.ordered_by || 'N/A'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
                        {item.date_of_pm && <span>PM: {new Date(item.date_of_pm).toLocaleDateString('en-GB')}</span>}
                        {item.inquest_no && <span>Inquest #{item.inquest_no}</span>}
                        {item.manner_of_death && <span>Manner: {item.manner_of_death}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isDoctor && (
                      <button onClick={(e) => { e.stopPropagation(); onUpload(item.case_id); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Upload inquest order">
                        <Upload className="w-4 h-4" />
                      </button>
                    )}
                    {expanded === item.case_id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </div>
              {expanded === item.case_id && (
                <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-slate-500">Case Type:</span> <span className="font-medium capitalize">{item.case_type}</span></div>
                    <div><span className="text-slate-500">Police Station:</span> <span className="font-medium">{item.station_name}</span></div>
                    <div><span className="text-slate-500">Status:</span>
                      <span className={clsx("font-medium ml-1", item.case_status === 'completed' ? 'text-green-600' : item.case_status === 'closed' ? 'text-slate-400' : 'text-amber-600')}>
                        {item.case_status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div><span className="text-slate-500">Doc:</span> <span className="font-medium">{item.has_inquest_doc ? 'Attached' : 'None'}</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Police Copy Handover Log ─── */
const HandoverTab = ({ data, loading, onLogHandover, isPolice }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <h3 className="font-semibold text-slate-800">Police Copy Handover Log</h3>
      <span className="text-xs text-slate-500">{data.length} handovers</span>
    </div>
    {loading ? (
      <div className="p-12 text-center text-slate-500">Loading...</div>
    ) : data.length === 0 ? (
      <div className="p-12 text-center text-slate-500 text-sm">No handovers recorded yet.</div>
    ) : (
      <div className="divide-y divide-slate-100">
        {data.map((h) => {
          const payload = h.new_payload || {};
          return (
            <div key={h.handover_id} className="p-5 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Case: {h.case_number}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{h.station_name}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {payload.document_type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">
                        Officer: {payload.officer_name} ({payload.officer_badge})
                      </span>
                    </div>
                    {h.acknowledged_by && (
                      <p className="text-xs text-green-600 mt-1 flex items-center">
                        <BadgeCheck className="w-3 h-3 mr-1" />
                        Acknowledged by: {h.acknowledged_by}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{h.handover_date ? new Date(h.handover_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
    {isPolice && (
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 mb-3">Log a new handover by using the case details page or enter Case ID below:</p>
        <HandoverForm onLog={onLogHandover} />
      </div>
    )}
  </div>
);

const HandoverForm = ({ onLog }) => {
  const [caseId, setCaseId] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!caseId) return;
    onLog(caseId);
    setCaseId('');
  };
  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-3">
      <input type="number" placeholder="Enter Case ID..." value={caseId} onChange={(e) => setCaseId(e.target.value)}
        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center">
        <Plus className="w-4 h-4 mr-1" /> Log Handover
      </button>
    </form>
  );
};

/* ─── Police Station Directory ─── */
const StationTab = ({ data, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <h3 className="font-semibold text-slate-800">Police Station Directory</h3>
      <span className="text-xs text-slate-500">{data.length} stations</span>
    </div>
    {loading ? (
      <div className="p-12 text-center text-slate-500">Loading...</div>
    ) : data.length === 0 ? (
      <div className="p-12 text-center text-slate-500 text-sm">No stations found.</div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {data.map((s) => (
          <div key={s.station_id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{s.station_name}</p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />{s.area || 'N/A'}
                </p>
                {s.contact_no && (
                  <p className="text-xs text-slate-500 mt-1">{s.contact_no}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ─── Magistrate Escalations ─── */
const EscalationTab = ({ data, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <h3 className="font-semibold text-slate-800 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
        Magistrate Escalations (High-Profile Deaths)
      </h3>
      <span className="text-xs text-slate-500">{data.length} cases</span>
    </div>
    {loading ? (
      <div className="p-12 text-center text-slate-500">Loading...</div>
    ) : data.length === 0 ? (
      <div className="p-12 text-center text-slate-500 text-sm">No high-profile or magistrate-ordered cases.</div>
    ) : (
      <div className="divide-y divide-slate-100">
        {data.map((item) => (
          <div key={item.case_id} className="p-5 hover:bg-red-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 mt-2 bg-red-500 rounded-full flex-shrink-0" />
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-slate-800">{item.case_number}</p>
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
                      {item.death_category === 'high_profile' ? 'HIGH PROFILE' : 'COURT ORDER'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.station_name} — {item.ordered_by ? `Ordered by: ${item.ordered_by}` : ''}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
                    {item.date_of_pm && <span>PM: {new Date(item.date_of_pm).toLocaleDateString('en-GB')}</span>}
                    <span>Authorization: {item.authorization_type?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
              <Link to={`/cases/${item.case_id}`} className="text-xs text-blue-600 hover:underline font-medium flex-shrink-0">View Case</Link>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default PoliceHubPage;
