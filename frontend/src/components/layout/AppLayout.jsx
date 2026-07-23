import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Users, FileText, FlaskConical, 
  ShieldAlert, LogOut, Search, Building2, FileCheck,
  UserCog, ShieldCheck, BarChart3, Settings, BookOpen
} from 'lucide-react';
import clsx from 'clsx';

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Patients', path: '/patients', icon: Users },
    { label: 'Cases', path: '/cases', icon: FileText, roles: ['admin', 'records_clerk', 'doctor', 'police'] },
    { label: 'Evidence', path: '/evidence', icon: ShieldAlert },
    { label: 'Lab & Tox', path: '/lab-tests', icon: FlaskConical },
    { label: 'Reports', path: '/reports', icon: FileCheck },
    { label: 'Directories', path: '/directories', icon: Building2 },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'PM Registry', path: '/pm-registry', icon: BookOpen, roles: ['admin', 'doctor', 'police', 'court'] },
    { label: 'Staff & Users', path: '/users', icon: UserCog, roles: ['admin'] },
    { label: 'Audit Log', path: '/audit-log', icon: ShieldCheck, roles: ['admin', 'auditor'] },
    { label: 'Statistics', path: '/statistics', icon: BarChart3, roles: ['admin', 'auditor'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <span className="text-xl font-bold text-white tracking-tight">MLIMS</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary-600 text-white shadow-md shadow-primary-500/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-3 opacity-80" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold mr-3">
              {user.role.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.role}</p>
              <p className="text-xs text-slate-500 truncate">ID: {user.id}</p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">
            {/* Could inject dynamic page title here via context */}
            Medico-Legal Information Management System
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
