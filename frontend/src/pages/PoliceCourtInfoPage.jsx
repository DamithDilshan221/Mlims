import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { Building2, Shield, PlusCircle, Edit, Stethoscope, Siren, FlaskConical, GitBranch } from 'lucide-react';

const LOOKUP_CONFIG = [
  { key: 'police_stations', label: 'Police Stations', icon: Shield, color: 'blue', fields: [
    { name: 'station_name', label: 'Station Name', type: 'text', required: true },
    { name: 'area', label: 'Area', type: 'text', required: true },
    { name: 'contact_no', label: 'Contact No', type: 'text', required: false },
  ]},
  { key: 'courts', label: 'Courts', icon: Building2, color: 'amber', fields: [
    { name: 'court_name', label: 'Court Name', type: 'text', required: true },
    { name: 'court_type', label: 'Court Type', type: 'select', required: true, options: ['magistrate', 'high_court', 'supreme', 'district'] },
    { name: 'location', label: 'Location', type: 'text', required: true },
  ]},
  { key: 'referral_sources', label: 'Referral Sources', icon: GitBranch, color: 'purple', fields: [
    { name: 'source_name', label: 'Source Name', type: 'text', required: true },
    { name: 'source_type', label: 'Type (Internal/External/Postmortem)', type: 'text', required: false },
  ]},
  { key: 'injury_types', label: 'Injury Types', icon: Siren, color: 'red', fields: [
    { name: 'name', label: 'Injury Name', type: 'text', required: true },
  ]},
  { key: 'weapon_types', label: 'Weapon Types', icon: Stethoscope, color: 'slate', fields: [
    { name: 'name', label: 'Weapon Name', type: 'text', required: true },
  ]},
  { key: 'specimen_types', label: 'Specimen Types', icon: FlaskConical, color: 'emerald', fields: [
    { name: 'name', label: 'Specimen Name', type: 'text', required: true },
  ]},
];

const PK_MAP = {
  police_stations: 'station_id',
  courts: 'court_id',
  referral_sources: 'source_id',
  injury_types: 'injury_type_id',
  weapon_types: 'weapon_type_id',
  specimen_types: 'specimen_type_id',
};

const PoliceCourtInfoPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'admin';

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [activeTable, setActiveTable] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all(LOOKUP_CONFIG.map(cfg => 
      api.get(`/lookups/${cfg.key}`).then(res => ({ key: cfg.key, data: res.data }))
    ))
    .then(results => {
      const map = {};
      results.forEach(r => { map[r.key] = r.data; });
      setData(map);
    })
    .catch(() => toast.error("Failed to load directories."))
    .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const openForm = (tableKey, existing = null) => {
    const cfg = LOOKUP_CONFIG.find(c => c.key === tableKey);
    if (!cfg) return;
    setActiveTable(tableKey);
    const blank = {};
    cfg.fields.forEach(f => { blank[f.name] = ''; });
    setFormData(existing ? { ...blank, ...existing } : blank);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!activeTable) return;
    setSaving(true);
    try {
      const pk = PK_MAP[activeTable];
      const id = formData[pk];
      if (id) {
        await api.patch(`/lookups/${activeTable}/${id}`, formData);
        toast.success("Updated successfully.");
      } else {
        await api.post(`/lookups/${activeTable}`, formData);
        toast.success("Added successfully.");
      }
      setActiveTable(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">System Directories</h2>
        <p className="text-slate-500 text-sm mt-1">Manage all lookup tables used across the system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {LOOKUP_CONFIG.map(cfg => {
          const items = data[cfg.key] || [];
          const Icon = cfg.icon;
          return (
            <div key={cfg.key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className={`bg-${cfg.color}-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center`}>
                <h3 className="font-semibold text-slate-800 flex items-center text-sm">
                  <Icon className={`w-4 h-4 mr-2 text-${cfg.color}-600`} />
                  {cfg.label}
                </h3>
                {isAdmin && (
                  <button onClick={() => openForm(cfg.key)} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center">
                    <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add
                  </button>
                )}
              </div>
              <div className="p-3 max-h-72 overflow-y-auto">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
                ) : items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No entries.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map(item => {
                      const pk = PK_MAP[cfg.key];
                      const display = item.name || item.source_name || item.station_name || item.court_name || `#${item[pk]}`;
                      const subtitle = item.area || item.court_type || item.source_type || item.contact_no || '';
                      return (
                        <li key={item[pk]} className="px-3 py-2 border border-slate-100 rounded-lg hover:bg-slate-50 flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate">{display}</p>
                            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                          </div>
                          {isAdmin && (
                            <button onClick={() => openForm(cfg.key, item)} className="text-slate-400 hover:text-blue-600 ml-2 flex-shrink-0">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Modal */}
      {activeTable && (() => {
        const cfg = LOOKUP_CONFIG.find(c => c.key === activeTable);
        if (!cfg) return null;
        const pk = PK_MAP[activeTable];
        const isEdit = !!formData[pk];
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{isEdit ? 'Edit' : 'Add'} {cfg.label}</h3>
                <button onClick={() => setActiveTable(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>
              <form onSubmit={submitForm} className="p-6 space-y-4">
                {cfg.fields.map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <select required={f.required} value={formData[f.name] || ''} onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500">
                        <option value="">Select...</option>
                        {(f.options || []).map(o => <option key={o} value={o}>{o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                      </select>
                    ) : (
                      <input required={f.required} type={f.type} value={formData[f.name] || ''} onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500" />
                    )}
                  </div>
                ))}
                <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                  <button type="button" onClick={() => setActiveTable(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PoliceCourtInfoPage;
