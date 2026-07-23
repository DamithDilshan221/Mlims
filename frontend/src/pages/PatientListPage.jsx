import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import RestrictedBadge from '../components/layout/RestrictedBadge';
import { Search } from 'lucide-react';

const PatientListPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/patients')
      .then(res => setPatients(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredPatients = patients.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      (p.nic_passport && p.nic_passport.toLowerCase().includes(q)) ||
      (p.nic_search_hash && p.nic_search_hash.toLowerCase().includes(q)) ||
      String(p.patient_id).includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Patients Directory</h2>
          <p className="text-slate-500 text-sm mt-1">Showing all registered patients.</p>
        </div>
        <Link to="/patients/new" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
          + New Patient
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by NIC, Hash, or Name..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Age / Gender</th>
                <th className="px-6 py-4">NIC / Passport</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No matching patients found.</td></tr>
              ) : filteredPatients.map(p => (
                <tr key={p.patient_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">#{p.patient_id}</td>
                  <td className="px-6 py-4">{p.full_name}</td>
                  <td className="px-6 py-4">{p.age ?? '--'} / {p.gender}</td>
                  <td className="px-6 py-4">
                    <RestrictedBadge allowedRoles={['admin', 'records_clerk', 'doctor', 'police', 'court']}>
                      {p.nic_passport}
                    </RestrictedBadge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/patients/${p.patient_id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                      View Profile
                    </Link>
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

export default PatientListPage;
