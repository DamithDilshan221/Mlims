import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  Users, FileText, Bell, FlaskConical, AlertTriangle, ShieldCheck,
  Activity, Skull, Gavel, Clock, Scale, ChevronRight,
  FileCheck, ClipboardList, Stethoscope, Plus, Upload, Calendar,
  Shield, Building2, BadgeCheck, Search
} from 'lucide-react';
import clsx from 'clsx';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [policeStats, setPoliceStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [trialCalendar, setTrialCalendar] = useState({ mlrTrials: [], summonsAppearances: [] });

  const isPolice = user?.role === 'police';
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  useEffect(() => {
    api.get('/notifications').then(res => setNotifications(res.data)).catch(() => {});
    api.get('/statistics/dashboard')
      .then(res => setStats(res.data))
      .catch(() => {});
    api.get('/statistics/trial-calendar')
      .then(res => setTrialCalendar(res.data))
      .catch(() => {});
    api.get('/police-hub/dashboard')
      .then(res => setPoliceStats(res.data))
      .catch(() => {});
  }, [user.role]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const allEvents = [
    ...trialCalendar.mlrTrials.map(t => ({ ...t, source: 'MLR Trial' })),
    ...trialCalendar.summonsAppearances.map(t => ({ ...t, source: 'Summons' })),
  ].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  const isUrgent = (dateStr) => {
    if (!dateStr) return false;
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  };

  const stationCounts = policeStats?.stationCounts || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome back, <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
          </h2>
          <p className="text-slate-500 mt-1">
            {isPolice
              ? 'Track inquest orders, police copy handovers, and case progress.'
              : 'Here is your case management overview for today.'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/search" className="flex items-center px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Search className="w-4 h-4 mr-2 text-slate-400" />
            <span className="text-slate-600">Search MLEF / PM / Station / Badge</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards — Role-Appropriate */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {isPolice ? (
          <>
            <StatCard icon={FileText} label="Pending Statements" value={policeStats?.pendingStatements} color="bg-blue-500" href="/police-hub" />
            <StatCard icon={Shield} label="Inquest Orders" value={policeStats?.inquestOrdersReceived} color="bg-amber-500" href="/police-hub/inquests" />
            <StatCard icon={ClipboardList} label="Pending MLEF Copies" value={policeStats?.pendingMlefCopies} color="bg-red-500" href="/police-hub" />
            <StatCard icon={BadgeCheck} label="Uncollected Reports" value={policeStats?.uncollectedReports} color="bg-slate-600" href="/police-hub/handovers" />
          </>
        ) : (
          <>
            <StatCard icon={Activity} label="Active Clinical" value={stats?.activeClinical} color="bg-emerald-500" href="/cases" />
            <StatCard icon={Skull} label="Pending PMRs" value={stats?.pendingPmrs} color="bg-slate-600" href="/pm-registry" />
            <StatCard icon={Gavel} label="Upcoming Trials" value={stats?.upcomingTrials} color="bg-amber-500" href="/court/trials"
              badge={stats?.summonsAlerts > 0 ? `${stats.summonsAlerts} urgent` : null} />
            <StatCard icon={FileText} label="Unissued Reports" value={stats?.unissuedReports} color="bg-red-500" href="/reports" />
          </>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Court Summons & Trial Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Gavel className="w-5 h-5 mr-2 text-amber-500" />
                Court Summons & Trial Alerts
              </h3>
              <Link to="/court/summons" className="text-xs text-primary-600 hover:underline font-medium">View All</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {allEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No upcoming court events.</div>
              ) : (
                allEvents.slice(0, 5).map((event, i) => (
                  <div key={`${event.source}-${event.mlr_id || event.summons_id}-${i}`} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={clsx("w-2 h-2 mt-2 rounded-full flex-shrink-0", isUrgent(event.event_date) ? 'bg-red-500' : 'bg-amber-400')} />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Case: {event.case_number || 'N/A'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{event.court_name} — {event.source}</p>
                          <div className="flex items-center mt-2 space-x-3">
                            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                              event.status === 'dispatched' || event.status === 'complied' ? 'bg-green-100 text-green-700' :
                              event.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                              {event.status?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            {event.court_case_no && <span className="text-xs text-slate-400">{event.court_case_no}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={clsx("text-sm font-bold", isUrgent(event.event_date) ? 'text-red-600' : 'text-slate-800')}>
                          {event.event_date ? new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
                        </p>
                        {isUrgent(event.event_date) && <span className="text-[10px] font-bold text-red-500 uppercase">⚠ Urgent</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Police Requests & Inquest Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-500" />
                Police Requests & Inquest Status
              </h3>
              <Link to="/police-hub" className="text-xs text-primary-600 hover:underline font-medium">View All</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {stationCounts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No police requests data.</div>
              ) : (
                stationCounts.slice(0, 5).map((s, i) => (
                  <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Building2 className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{s.station_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.case_count} active case(s)</p>
                        </div>
                      </div>
                      <span className={clsx(
                        "text-xs font-bold px-2.5 py-1 rounded-full",
                        parseInt(s.case_count) > 5 ? 'bg-red-100 text-red-700' :
                        parseInt(s.case_count) > 2 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      )}>
                        {s.case_count} cases
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-slate-500" />
                Quick Actions
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {isPolice ? (
                <>
                  <Link to="/police-hub/inquests" className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                    <span><Shield className="w-4 h-4 inline mr-2" /> Log Inquest Order</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link to="/police-hub/handovers" className="flex items-center justify-between w-full px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium">
                    <span><Upload className="w-4 h-4 inline mr-2" /> Record Handover</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/cases/new" className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                    <span><Plus className="w-4 h-4 inline mr-2" /> New MLEF</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link to="/pm-registry" className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
                    <span><Plus className="w-4 h-4 inline mr-2" /> New Inquest</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link to="/court/summons" className="flex items-center justify-between w-full px-4 py-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium">
                    <span><Upload className="w-4 h-4 inline mr-2" /> Upload Court Summons</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link to="/reports" className="flex items-center justify-between w-full px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium">
                    <span><FileText className="w-4 h-4 inline mr-2" /> Generate MLR</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </>
              )}
              <Link to="/police-hub" className="flex items-center justify-between w-full px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                <span><Shield className="w-4 h-4 inline mr-2" /> Police Hub</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Dispatch Tracker */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-slate-500" />
                Dispatch Tracker
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="p-4 flex items-start space-x-3">
                <div className="w-5 h-5 mt-0.5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3 h-3 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Police Copy — Pending</p>
                  <p className="text-xs text-slate-500">{policeStats?.pendingMlefCopies || 0} MLEF copies awaiting collection</p>
                </div>
              </div>
              <div className="p-4 flex items-start space-x-3">
                <div className="w-5 h-5 mt-0.5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">COD Form — Pending</p>
                  <p className="text-xs text-slate-500">{stats?.pendingPmrs || 0} PMRs without cause of death</p>
                </div>
              </div>
              <div className="p-4 flex items-start space-x-3">
                <div className="w-5 h-5 mt-0.5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <BadgeCheck className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Uncollected Reports</p>
                  <p className="text-xs text-slate-500">{policeStats?.uncollectedReports || 0} reports signed but not collected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-slate-500" />
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{unreadCount} New</span>
              )}
            </div>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No notifications.</div>
              ) : (
                notifications.slice(0, 5).map(n => (
                  <div key={n.notification_id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start space-x-2">
                      {!n.is_read && <span className="w-2 h-2 mt-1.5 bg-primary-500 rounded-full flex-shrink-0" />}
                      <div className={!n.is_read ? '' : 'ml-4'}>
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {n.created_at ? new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, color, href, badge }) {
  const CardContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center hover:shadow-md transition-shadow relative">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white ${color} shadow-lg mr-5`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value !== undefined ? value : '--'}</p>
      </div>
      {badge && (
        <span className="absolute top-3 right-3 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}><CardContent /></Link>;
  }
  return <CardContent />;
}

export default DashboardPage;
