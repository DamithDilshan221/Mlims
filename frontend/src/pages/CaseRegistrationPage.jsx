import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const CaseRegistrationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);
  
  const [formData, setFormData] = useState({
    patientId: '',
    stationId: '',
    caseType: 'clinical',
    incidentDate: '',
    incidentLocation: ''
  });

  useEffect(() => {
    api.get('/lookups/police_stations')
      .then(res => {
        setStations(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, stationId: res.data[0].station_id }));
        }
      })
      .catch(() => {});
  }, []);

  const fillDummyData = () => {
    setFormData({
      patientId: 1,
      stationId: stations[0]?.station_id || 1,
      caseType: 'clinical',
      incidentDate: new Date().toISOString().split('T')[0],
      incidentLocation: '123 Main Street, Colombo'
    });
  };

  const [registeredCase, setRegisteredCase] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/cases', formData);
      setRegisteredCase(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register case.");
    } finally {
      setLoading(false);
    }
  };

  if (registeredCase) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white rounded-xl shadow-lg border border-emerald-100 overflow-hidden text-center p-12">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Case Registered Successfully</h2>
        <p className="text-slate-500 mb-8">The database has atomically generated the case number.</p>
        
        <div className="bg-slate-50 py-4 px-6 rounded-lg inline-block border border-slate-200 mb-8 text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Generated Case Number</p>
          <p className="text-3xl font-mono text-slate-800 font-bold tracking-tight">
            {registeredCase.case_number}
          </p>
        </div>
        
        <div>
          <button 
            onClick={() => navigate(`/cases/${registeredCase.case_type}/${registeredCase.case_id}`)}
            className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Case File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Register Forensic Case</h2>
            <p className="text-sm text-slate-500 mt-1">Initialize a new case to get a generated Case Number.</p>
          </div>
          {import.meta.env.DEV && (
            <button 
              type="button" 
              onClick={fillDummyData}
              className="px-3 py-1 bg-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-300 transition-colors"
            >
              Fill Dummy Data
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Patient ID *</label>
              <input 
                type="number" required 
                value={formData.patientId} 
                onChange={e => setFormData({...formData, patientId: e.target.value ? parseInt(e.target.value) : ''})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
                placeholder="e.g. 1"
              />
              <p className="text-xs text-slate-400 mt-1">If patient does not exist, <a href="/patients/new" className="text-primary-600 hover:underline">register them first</a>.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Police Station *</label>
              <select
                required
                value={formData.stationId}
                onChange={e => setFormData({...formData, stationId: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                {stations.map(s => (
                  <option key={s.station_id} value={s.station_id}>{s.station_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Case Type</label>
              <select 
                value={formData.caseType} 
                onChange={e => setFormData({...formData, caseType: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="clinical">Clinical Examination</option>
                <option value="postmortem">Postmortem (Autopsy)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Incident Date</label>
              <input 
                type="date" required
                value={formData.incidentDate} 
                onChange={e => setFormData({...formData, incidentDate: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Incident Location</label>
              <input 
                type="text" 
                value={formData.incidentLocation} 
                onChange={e => setFormData({...formData, incidentLocation: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
                placeholder="Where did the incident occur?"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" disabled={loading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseRegistrationPage;
