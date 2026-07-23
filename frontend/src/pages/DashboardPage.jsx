import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Users, FileText, Bell, FlaskConical, AlertTriangle, ShieldCheck } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Dashboard state
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    // Fetch notifications (All roles)
    api.get('/notifications').then(res => setNotifications(res.data)).catch(() => {});
    
    // Fetch aggregated role-specific dashboard statistics
    api.get('/statistics/dashboard')
      .then(res => setStats(res.data))
      .catch(err => console.error("Failed to load dashboard stats", err));
  }, [user.role]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Welcome back, {user.role}</h2>
        <p className="text-slate-500 mt-1">Here is what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Administrator Widgets */}
        {user.role === 'admin' && (
          <>
            <StatCard icon={Users} label="Active Users" value={stats?.activeUsers} color="bg-blue-500" />
            <StatCard icon={ShieldCheck} label="Audit Logs" value="View All" color="bg-indigo-500" />
            <StatCard icon={AlertTriangle} label="Locked Accounts" value={stats?.lockedAccounts} color="bg-red-500" />
          </>
        )}

        {/* Doctor Widgets */}
        {user.role === 'doctor' && (
          <>
            <StatCard icon={FileText} label="My Open Cases" value={stats?.openCases} color="bg-emerald-500" />
            <StatCard icon={FlaskConical} label="Pending Lab Results" value={stats?.pendingLabs} color="bg-amber-500" />
          </>
        )}

        {/* Forensic/Lab Staff Widgets */}
        {user.role === 'forensic_staff' && (
          <>
            <StatCard icon={FlaskConical} label="Lab Queue" value={stats?.pendingLabs} color="bg-amber-500" />
            <StatCard icon={FileText} label="Pending Custody Updates" value={stats?.pendingTransfers} color="bg-purple-500" />
          </>
        )}

        {/* Police Officer Widgets */}
        {user.role === 'police' && (
          <StatCard icon={FileText} label="Station Cases" value={stats?.openCases} color="bg-blue-600" />
        )}
      </div>

      {/* Notifications Panel (All Roles) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8 max-w-2xl">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-slate-500" />
            Recent Notifications
          </h3>
          <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-1 rounded-full">
            {notifications.length} Unread
          </span>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No new notifications.
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.notification_id} className="p-6 hover:bg-slate-50 transition-colors">
                <p className="text-slate-800 text-sm font-medium">{n.message}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${color} shadow-lg mr-5`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value !== undefined ? value : '--'}</p>
      </div>
    </div>
  );
}

export default DashboardPage;
