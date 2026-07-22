import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { UserCog, ShieldBan, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/admin/users'), // Assuming Admin route exists or falls back
        api.get('/lookups?type=roles')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} user #${userId}?`)) return;
    
    try {
      if (action === 'deactivate') {
        // Calls sp_deactivate_user in backend repository
        await api.delete(`/admin/users/${userId}`); 
      } else {
        // Unlock
        await api.patch(`/admin/users/${userId}`, { isActive: true });
      }
      fetchData();
    } catch (err) {
      alert(`Failed to ${action} user.`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">User & Role Management</h2>
        <p className="text-slate-500 text-sm mt-1">Manage system accounts and access control statuses.</p>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
          <UserCog className="w-5 h-5 mr-2 text-slate-500" />
          <h3 className="font-semibold text-slate-800">System Accounts</h3>
        </div>
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Linked Staff</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Login</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.user_id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-900">{u.username}</td>
                <td className="px-6 py-4">{u.first_name} {u.last_name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">{u.role_name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx("px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit", u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {u.is_active ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldBan className="w-3 h-3 mr-1" />}
                    {u.is_active ? 'Active' : 'Locked'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleDeactivate(u.user_id, u.is_active)}
                    className={clsx("text-xs font-medium hover:underline", u.is_active ? "text-red-600" : "text-green-600")}
                  >
                    {u.is_active ? 'Deactivate' : 'Unlock'}
                  </button>
                  <button className="text-xs font-medium text-amber-600 hover:underline">
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Read-Only Roles Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center">
            <KeyRound className="w-5 h-5 mr-2 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Database Roles</h3>
          </div>
          <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3 mr-1" /> Schema Restricted
          </span>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6 max-w-3xl">
            The 7 core roles are enforced at the PostgreSQL database level via Row-Level Security (RLS) and GRANTs. 
            Creating or deleting a role requires a database schema migration and cannot be performed from this UI. 
            You may only edit the description text for reference purposes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(r => (
              <div key={r.role_id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <h4 className="font-bold text-slate-800 font-mono">{r.role_name}</h4>
                <p className="text-sm text-slate-500 mt-2">{r.description || 'No description provided.'}</p>
                <button className="mt-3 text-xs font-medium text-blue-600 hover:underline">Edit Description</button>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default UserManagementPage;
