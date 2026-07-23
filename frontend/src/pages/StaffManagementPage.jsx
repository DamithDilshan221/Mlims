import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Users, PlusCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
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
    role_id: 2, // Default to Doctor role ID
    first_name: '',
    last_name: '',
    designation: 'Doctor',
    contact_no: '',
    slmc_reg_no: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lookup for roles
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
      toast.success("Personnel account created successfully!");
      setShowForm(false);
      setFormData({
        username: '', password: '', role_id: 2, first_name: '', last_name: '', designation: 'Doctor', contact_no: '', slmc_reg_no: ''
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create personnel.");
      toast.error("Failed to create personnel.");
    } finally {
      setSubmitting(false);
    }
  };

  // Automatically map designation to system access role ID
  const handleDesignationChange = (e) => {
    const desig = e.target.value;
    setFormData(prev => {
      let role_id = prev.role_id;
      const findRole = (rName) => roles.find(r => r.role_name === rName || r.role_name === `${rName}_role`);

      if (desig === 'Doctor') role_id = findRole('doctor')?.role_id || 2;
      else if (desig === 'Forensic Staff') role_id = findRole('forensic_staff')?.role_id || 3;
      else if (desig === 'Police Officer') role_id = findRole('police')?.role_id || 4;
      else if (desig === 'Court Official') role_id = findRole('court')?.role_id || 5;
      else if (desig === 'Records Clerk') role_id = findRole('records_clerk')?.role_id || 6;
      else if (desig === 'Admin') role_id = findRole('admin')?.role_id || 1;

      return { ...prev, designation: desig, role_id };
    });
  };

  const currentRoleObj = roles.find(r => r.role_id === formData.role_id);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Staff & Personnel Onboarding</h2>
          <p className="text-slate-500 text-sm mt-1">Add and manage Doctors/JMOs, Forensic Staff, Police Officers, Court Officials, and Records Clerks.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm flex items-center"
        >
          <PlusCircle className="w-4 h-4 mr-2" /> {showForm ? 'Close Form' : 'Add New Personnel'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 mb-8 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Onboard New Personnel & System Account</h3>
            <p className="text-xs text-slate-500">Creates a personnel profile and automatically assigns database access permissions based on their role.</p>
          </div>

          <form onSubmit={handleCreateStaff} className="p-6">
            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex"><ShieldAlert className="w-4 h-4 mr-2 mt-0.5" />{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Staff Profile Side */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">1. Officer Profile</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                    <input required type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-primary-500" placeholder="e.g. Priyantha" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                    <input required type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-primary-500" placeholder="e.g. Gunawardena" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Officer Role / Designation *</label>
                  <select value={formData.designation} onChange={handleDesignationChange} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-primary-500">
                    <option value="Doctor">Doctor / JMO (Judicial Medical Officer)</option>
                    <option value="Forensic Staff">Forensic Staff (Lab Technician / Analyst)</option>
                    <option value="Police Officer">Police Officer (Investigating Officer)</option>
                    <option value="Court Official">Court Official (Registrar / Magistrate)</option>
                    <option value="Records Clerk">Records Clerk (Patient & Case Admin)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Contact No</label>
                    <input type="text" value={formData.contact_no} onChange={e => setFormData({ ...formData, contact_no: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="e.g. 0771234567" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">SLMC Reg No (Doctors Only)</label>
                    <input
                      type="text"
                      disabled={formData.designation !== 'Doctor'}
                      value={formData.slmc_reg_no}
                      onChange={e => setFormData({ ...formData, slmc_reg_no: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:opacity-60"
                      placeholder="e.g. SLMC-2020-12345"
                    />
                  </div>
                </div>
              </div>

              {/* User Account Side */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">2. System Access Account</h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username *</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-blue-50/50 font-mono font-bold" placeholder="e.g. dr.priyantha or ofc.gunawardena" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Temporary Password *</label>
                  <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-blue-50/50 font-mono" placeholder="e.g. Pass1234!" />
                </div>

                {/* Auto-Assigned Access Badge (Dropdown removed) */}
                <div className="pt-1">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-medium text-slate-500">Database Access Role</span>
                      <span className="text-xs font-mono font-bold text-primary-700 flex items-center mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-green-600" />
                        {currentRoleObj ? currentRoleObj.role_name : `Role ID ${formData.role_id}`}
                      </span>
                    </div>
                    <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      Auto-Assigned
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-sm disabled:opacity-50">
                {submitting ? 'Creating Personnel & Account...' : 'Complete Onboarding'}
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
