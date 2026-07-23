import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Users, PlusCircle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

const StaffManagementPage = () => {
  const toast = useToast();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Unified Add Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role_id: 2, // Default to a standard role ID
    first_name: '',
    last_name: '',
    designation: 'Doctor',
    contact_no: '',
    slmc_reg_no: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lookup for roles to populate dropdown
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        api.get('/admin/staff'),
        api.get('/lookups/roles')
      ]);
      setStaffList(staffRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      await api.post('/admin/staff', formData);
      toast.success("Staff member and user account created successfully!");
      setShowForm(false);
      setFormData({
        username: '', password: '', role_id: 2, first_name: '', last_name: '', designation: 'Doctor', contact_no: '', slmc_reg_no: ''
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create staff member.");
      toast.error("Failed to create staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  // Simple heuristic: map designation to likely role
  const handleDesignationChange = (e) => {
    const desig = e.target.value;
    setFormData(prev => {
      let role_id = prev.role_id;
      if (desig === 'Doctor') role_id = roles.find(r => r.role_name === 'doctor_role')?.role_id || 2;
      else if (desig === 'Records Clerk') role_id = roles.find(r => r.role_name === 'records_clerk_role')?.role_id || 6;
      else if (desig === 'Admin') role_id = roles.find(r => r.role_name === 'admin_role')?.role_id || 1;
      
      return { ...prev, designation: desig, role_id };
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Staff Roster</h2>
          <p className="text-slate-500 text-sm mt-1">Manage personnel profiles and system access onboarding.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm flex items-center"
        >
          <PlusCircle className="w-4 h-4 mr-2" /> Add Staff Member
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Create New Staff & Account</h3>
            <p className="text-xs text-slate-500">This transactionally creates both a Staff profile and their initial Login Account.</p>
          </div>
          
          <form onSubmit={handleCreateStaff} className="p-6">
            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex"><ShieldAlert className="w-4 h-4 mr-2 mt-0.5" />{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Staff Profile Side */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Profile Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                    <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                    <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <select value={formData.designation} onChange={handleDesignationChange} className="w-full px-3 py-2 text-sm border rounded">
                    <option value="Doctor">Doctor (JMO / AJMO)</option>
                    <option value="Forensic Staff">Forensic Staff</option>
                    <option value="Records Clerk">Records Clerk</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Contact No</label>
                    <input type="text" value={formData.contact_no} onChange={e => setFormData({...formData, contact_no: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">SLMC Reg No (If Doctor)</label>
                    <input type="text" value={formData.slmc_reg_no} onChange={e => setFormData({...formData, slmc_reg_no: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
                  </div>
                </div>
              </div>

              {/* User Account Side */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">System Account</h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 text-sm border rounded bg-blue-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Temporary Password</label>
                  <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 text-sm border rounded bg-blue-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">System Role (Access Level)</label>
                  <select required value={formData.role_id} onChange={e => setFormData({...formData, role_id: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm border rounded">
                    {roles.map(r => (
                      <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary-600 text-white rounded font-medium disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Staff & Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Designation</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">SLMC No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : staffList.map(st => (
              <tr key={st.staff_id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">#{st.staff_id}</td>
                <td className="px-6 py-4 font-medium">{st.first_name} {st.last_name}</td>
                <td className="px-6 py-4">{st.designation}</td>
                <td className="px-6 py-4">{st.contact_no || '--'}</td>
                <td className="px-6 py-4">{st.slmc_reg_no || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffManagementPage;
