import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { Building2, Shield, PlusCircle, Edit } from 'lucide-react';

const PoliceCourtInfoPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [stations, setStations] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms state for Add/Edit
  const [activeForm, setActiveForm] = useState(null); // 'station' | 'court' | null
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchDirectories();
  }, []);

  const fetchDirectories = () => {
    Promise.all([
      api.get('/lookups/police_stations'),
      api.get('/lookups/courts')
    ])
    .then(([stationRes, courtRes]) => {
      setStations(stationRes.data);
      setCourts(courtRes.data);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  };

  const openForm = (type, existingData = null) => {
    setActiveForm(type);
    if (type === 'station') {
      setFormData(existingData || { station_name: '', area: '', contact_no: '' });
    } else {
      setFormData(existingData || { court_name: '', court_type: 'magistrate', location: '' });
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      const isStation = activeForm === 'station';
      const table = isStation ? 'police_stations' : 'courts';
      const id = isStation ? formData.station_id : formData.court_id;

      if (id) {
        // Edit mode (PATCH)
        await api.patch(`/lookups/${table}/${id}`, formData);
        toast.success(`Updated ${isStation ? 'police station' : 'court'} successfully.`);
      } else {
        // Create mode (POST)
        await api.post(`/lookups/${table}`, formData);
        toast.success(`Added new ${isStation ? 'police station' : 'court'} successfully.`);
      }

      setActiveForm(null);
      fetchDirectories();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save record.");
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Directories</h2>
        <p className="text-slate-500 text-sm mt-1">Manage Police Stations and Courts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Police Stations */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Police Stations
            </h3>
            {isAdmin && (
              <button onClick={() => openForm('station')} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                <PlusCircle className="w-4 h-4 mr-1" /> Add
              </button>
            )}
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {loading ? <p className="text-slate-400">Loading...</p> : (
              <ul className="space-y-3">
                {stations.map(st => (
                  <li key={st.station_id} className="p-4 border border-slate-100 rounded-lg hover:bg-slate-50 flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800">{st.station_name}</p>
                      <p className="text-xs text-slate-500 mt-1">Area: {st.area} • Contact: {st.contact_no || 'N/A'}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-2">Linked Cases: {st.case_count || 0}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => openForm('station', st)} className="text-slate-400 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Courts */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-amber-600" />
              Courts Directory
            </h3>
            {isAdmin && (
              <button onClick={() => openForm('court')} className="text-sm font-medium text-amber-600 hover:text-amber-800 flex items-center">
                <PlusCircle className="w-4 h-4 mr-1" /> Add
              </button>
            )}
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {loading ? <p className="text-slate-400">Loading...</p> : (
              <ul className="space-y-3">
                {courts.map(ct => (
                  <li key={ct.court_id} className="p-4 border border-slate-100 rounded-lg hover:bg-slate-50 flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800">{ct.court_name}</p>
                      <p className="text-xs text-slate-500 mt-1 capitalize">Type: {ct.court_type} • Loc: {ct.location}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-2">Linked Reports: {ct.report_count || 0}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => openForm('court', ct)} className="text-slate-400 hover:text-amber-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Editor Modal */}
      {activeForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 capitalize">{formData.station_id || formData.court_id ? 'Edit' : 'Add'} {activeForm}</h3>
            </div>
            <form onSubmit={submitForm} className="p-6 space-y-4">
              {activeForm === 'station' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Station Name</label>
                    <input required type="text" value={formData.station_name} onChange={e => setFormData({...formData, station_name: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Area</label>
                    <input required type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact No</label>
                    <input type="text" value={formData.contact_no} onChange={e => setFormData({...formData, contact_no: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Court Name</label>
                    <input required type="text" value={formData.court_name} onChange={e => setFormData({...formData, court_name: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Court Type</label>
                    <select required value={formData.court_type} onChange={e => setFormData({...formData, court_type: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500">
                      <option value="magistrate">Magistrate</option>
                      <option value="high_court">High Court</option>
                      <option value="supreme">Supreme</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" />
                  </div>
                </>
              )}
              
              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                <button type="button" onClick={() => setActiveForm(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save {activeForm}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliceCourtInfoPage;
