import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const PatientRegistrationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: 'X',
    address: '',
    nicPassport: ''
  });

  const fillDummyData = () => {
    setFormData({
      fullName: 'Kamal Perera',
      dob: '1985-05-15',
      gender: 'M',
      address: '456 Temple Road, Kandy',
      nicPassport: '198513601234'
    });
  };

  // Client-side age calculation for UX only
  const computeAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    if (isNaN(dob)) return '';
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Basic client-side NIC validation (e.g. Sri Lankan NIC format: 9 digits + V/X or 12 digits)
    if (formData.nicPassport) {
      const nicRegex = /^([0-9]{9}[vxVX]|[0-9]{12})$/;
      if (!nicRegex.test(formData.nicPassport)) {
        setError("Invalid NIC format. Must be 9 digits + V/X or 12 digits.");
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        fullName: formData.fullName,
        dob: formData.dob || undefined,
        gender: formData.gender,
        address: formData.address || undefined,
        nicPassport: formData.nicPassport || undefined
      };
      const res = await api.post('/patients', payload);
      navigate(`/patients/${res.data.patient_id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register patient.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Register New Patient</h2>
            <p className="text-sm text-slate-500 mt-1">Enter demographic and identity details.</p>
          </div>
          <button 
            type="button" 
            onClick={fillDummyData}
            className="px-3 py-1 bg-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-300 transition-colors"
          >
            Fill Dummy Data
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
              <input 
                type="text" required 
                value={formData.fullName} 
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
              <input 
                type="date" 
                value={formData.dob} 
                onChange={e => setFormData({...formData, dob: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Calculated Age (Preview)</label>
              <input 
                type="text" readOnly 
                value={computeAge(formData.dob)}
                className="w-full px-4 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg cursor-not-allowed" 
                placeholder="Auto-calculated from DOB"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
              <select 
                value={formData.gender} 
                onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="X">Other/Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">NIC / Passport</label>
              <input 
                type="text" 
                value={formData.nicPassport} 
                onChange={e => setFormData({...formData, nicPassport: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
                placeholder="e.g. 199012345678"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <textarea 
                rows="3"
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" disabled={loading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientRegistrationPage;
