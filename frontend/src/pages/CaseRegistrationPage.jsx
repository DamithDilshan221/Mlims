import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Stethoscope } from 'lucide-react';

const CaseRegistrationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);
  const [referralSources, setReferralSources] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [stationSearch, setStationSearch] = useState('');
  const [showStations, setShowStations] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    stationId: '',
    referralSourceId: '',
    doctorId: '',
    caseType: 'clinical',
    incidentDate: '',
    incidentLocation: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [stationsRes, sourcesRes, doctorsRes] = await Promise.all([
          api.get('/lookups/police_stations').catch(() => ({ data: [] })),
          api.get('/lookups/referral_sources').catch(() => ({ data: [] })),
          api.get('/lookups/doctors').catch(() => ({ data: [] })),
        ]);
        setStations(stationsRes.data);
        setReferralSources(sourcesRes.data);
        setDoctors(doctorsRes.data);
        
        const savedStationId = localStorage.getItem('lastSelectedStationId');
        let initialStationId = '';
        let initialStationName = '';

        if (savedStationId && stationsRes.data.some(s => s.station_id.toString() === savedStationId)) {
          initialStationId = parseInt(savedStationId, 10);
          initialStationName = stationsRes.data.find(s => s.station_id === initialStationId).station_name;
        } else if (stationsRes.data.length > 0) {
          initialStationId = stationsRes.data[0].station_id;
          initialStationName = stationsRes.data[0].station_name;
        }

        setStationSearch(initialStationName);
        setFormData(prev => ({ 
          ...prev, 
          stationId: initialStationId,
          referralSourceId: sourcesRes.data.length > 0 ? sourcesRes.data[0].source_id : ''
        }));
      } catch (_) { }
    };
    load();
  }, []);

  const fillDummyData = () => {
    if (stations.length > 0) {
      setStationSearch(stations[0].station_name);
    }
    setFormData({
      patientId: 1,
      stationId: stations[0]?.station_id || 1,
      referralSourceId: referralSources[0]?.source_id || 1,
      doctorId: doctors[0]?.staff_id || '',
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

    let finalStationId = formData.stationId;
    
    // Auto-resolve station if they typed an exact match but didn't click
    if (!finalStationId && stationSearch) {
      const matched = stations.find(s => s.station_name.toLowerCase() === stationSearch.toLowerCase().trim());
      if (matched) {
        finalStationId = matched.station_id;
      }
    }

    if (!finalStationId) {
      setError('Please select a valid Police Station from the dropdown.');
      setLoading(false);
      return;
    }

    // Build payload with proper number types
    const payload = {
      patientId: parseInt(formData.patientId, 10),
      stationId: parseInt(finalStationId, 10),
      referralSourceId: formData.referralSourceId ? parseInt(formData.referralSourceId, 10) : undefined,
      doctorId: formData.doctorId ? parseInt(formData.doctorId, 10) : undefined,
      caseType: formData.caseType,
      incidentDate: formData.incidentDate,
      incidentLocation: formData.incidentLocation,
    };

    try {
      const res = await api.post('/cases', payload);
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
        <p className="text-slate-500 mb-6">Case {registeredCase.case_number} has been created.</p>

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate(`/cases/${registeredCase.case_type}/${registeredCase.case_id}`)}
            className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-md"
          >
            Go to Case File
          </button>
          <button
            onClick={() => navigate('/cases/new')}
            className="px-6 py-2.5 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Register Another Case
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
            <p className="text-sm text-slate-500 mt-1">Initialize a new case and assign it to a medical officer.</p>
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
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Patient ID *</label>
              <input
                type="number" required min="1"
                value={formData.patientId}
                onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. 1"
              />
              <p className="text-xs text-slate-400 mt-1">
                If patient does not exist, <Link to="/patients/new" className="text-primary-600 hover:underline font-medium">register them first</Link>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Police Station *</label>
              <div className="relative">
                <input 
                  type="text"
                  required
                  placeholder="Search police station..."
                  value={stationSearch}
                  onChange={e => {
                    setStationSearch(e.target.value);
                    setShowStations(true);
                    setFormData({...formData, stationId: ''});
                  }}
                  onFocus={() => setShowStations(true)}
                  onBlur={() => setTimeout(() => setShowStations(false), 200)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                {showStations && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {stations.filter(s => s.station_name.toLowerCase().includes(stationSearch.toLowerCase())).map(s => (
                      <div 
                        key={s.station_id}
                        className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                        onMouseDown={() => {
                          setStationSearch(s.station_name);
                          setFormData({...formData, stationId: s.station_id});
                          localStorage.setItem('lastSelectedStationId', s.station_id.toString());
                          setShowStations(false);
                        }}
                      >
                        {s.station_name}
                      </div>
                    ))}
                    {stations.filter(s => s.station_name.toLowerCase().includes(stationSearch.toLowerCase())).length === 0 && (
                      <div className="px-4 py-2 text-slate-500 text-sm">No stations found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Referral Source *</label>
              <select required
                value={formData.referralSourceId}
                onChange={e => setFormData({ ...formData, referralSourceId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select source...</option>
                {referralSources.map(s => (
                  <option key={s.source_id} value={s.source_id}>{s.source_name} ({s.source_type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Case Type</label>
              <select value={formData.caseType}
                onChange={e => setFormData({ ...formData, caseType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="clinical">Clinical Examination (Living Patient)</option>
                <option value="postmortem">Postmortem (Autopsy)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Incident Date *</label>
              <input type="date" required
                value={formData.incidentDate}
                onChange={e => setFormData({ ...formData, incidentDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Stethoscope className="w-4 h-4 mr-1.5 text-slate-400" />
                Assign Medical Officer
              </label>
              <select value={formData.doctorId}
                onChange={e => setFormData({ ...formData, doctorId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select doctor (optional)...</option>
                {doctors.map(d => (
                  <option key={d.staff_id} value={d.staff_id}>
                    Dr. {d.first_name} {d.last_name}{d.designation ? ` (${d.designation})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">The assigned doctor will handle the MLEF examination.</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Incident Location *</label>
            <input type="text" required
              value={formData.incidentLocation}
              onChange={e => setFormData({ ...formData, incidentLocation: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="Where did the incident occur?"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => navigate('/cases')}
              className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center">
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? 'Registering...' : 'Register Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseRegistrationPage;
