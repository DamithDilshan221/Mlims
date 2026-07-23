import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, FileText, FlaskConical,
  ShieldAlert, LogOut, Search, Building2, FileCheck,
  UserCog, ShieldCheck, BarChart3, Settings, BookOpen,
  ClipboardList, Skull, Gavel, Menu, X, ChevronDown, ChevronRight,
  Stethoscope, Microscope, Scale, Library, Bell, Shield,
  AlertTriangle, Upload
} from 'lucide-react';
import clsx from 'clsx';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Clinical Forensics',
    roles: ['admin', 'doctor'],
    items: [
      { label: 'New MLEF Entry', path: '/cases/new', icon: ClipboardList },
      { label: 'Active Cases', path: '/cases', icon: Stethoscope },
      { label: 'MLR Reports', path: '/reports', icon: FileCheck },
    ],
  },
  {
    label: 'Autopsy Desk',
    roles: ['admin', 'doctor', 'forensic_staff'],
    items: [
      { label: 'PM Registry', path: '/pm-registry', icon: BookOpen },
      { label: 'Lab & Tox', path: '/lab-tests', icon: Microscope },
      { label: 'Evidence', path: '/evidence', icon: ShieldAlert },
    ],
  },
  {
    label: 'Police & Inquest Hub',
    roles: ['admin', 'police', 'doctor', 'court'],
    items: [
      { label: 'Police Hub', path: '/police-hub', icon: Shield },
    ],
  },
  {
    label: 'Court & Legal Desk',
    roles: ['admin', 'court', 'doctor', 'police'],
    items: [
      { label: 'Summons Register', path: '/court/summons', icon: Scale },
      { label: 'Trial Calendar', path: '/court/trials', icon: Gavel },
      { label: 'Directories', path: '/directories', icon: Building2 },
    ],
  },
  {
    label: 'Search & Trace',
    items: [
      { label: 'Search', path: '/search', icon: Search },
      { label: 'Patients', path: '/patients', icon: Users },
    ],
  },
  {
    label: 'Administration',
    roles: ['admin'],
    items: [
      { label: 'Staff & Users', path: '/users', icon: UserCog },
      { label: 'Audit Log', path: '/audit-log', icon: ShieldCheck },
      { label: 'Statistics', path: '/statistics', icon: BarChart3 },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

const getValidSections = (role) => {
  return NAV_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || item.roles.includes(role)),
    }))
    .filter(section => section.items.length > 0 && (!section.roles || section.roles.includes(role)));
};

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});

  const sections = getValidSections(user?.role);
  const roleColorMap = {
    admin: 'bg-purple-600',
    doctor: 'bg-emerald-600',
    police: 'bg-blue-600',
    court: 'bg-amber-600',
    forensic_staff: 'bg-cyan-600',
    records_clerk: 'bg-slate-600',
    auditor: 'bg-rose-600',
  };

  const toggleSection = (label) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className={clsx(
        "bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Brand Header */}
        <div className={clsx(
          "h-16 flex items-center border-b border-slate-800 bg-slate-950",
          sidebarOpen ? "px-6 justify-between" : "px-3 justify-center"
        )}>
          {sidebarOpen ? (
            <>
              <span className="text-xl font-bold text-white tracking-tight">MLIMS</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-2">
          {sections.map(section => (
            <div key={section.label}>
              {sidebarOpen && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300"
                >
                  <span>{section.label}</span>
                  {expandedSections[section.label] !== false ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              )}
              {(expandedSections[section.label] !== false) && section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => clsx(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    sidebarOpen ? "px-4 py-3 mx-1" : "px-3 py-3 justify-center mx-0",
                    isActive
                      ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                      : "hover:bg-slate-800 hover:text-white"
                  )}
                  title={item.label}
                >
                  <item.icon className={clsx("opacity-80", sidebarOpen ? "w-5 h-5 mr-3" : "w-5 h-5")} />
                  {sidebarOpen && item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div className={clsx("border-t border-slate-800", sidebarOpen ? "p-4" : "p-2")}>
          <div className={clsx("flex items-center", sidebarOpen ? "mb-4 px-2" : "mb-2 justify-center")}>
            <div className={clsx(
              "rounded-full flex items-center justify-center text-white font-bold",
              roleColorMap[user?.role] || 'bg-slate-600',
              sidebarOpen ? "w-8 h-8 mr-3" : "w-8 h-8"
            )}>
              {user?.role?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate capitalize">{user?.role?.replace('_', ' ')}</p>
                <p className="text-xs text-slate-500 truncate">ID: {user?.id}</p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className={clsx(
              "flex items-center text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors",
              sidebarOpen ? "w-full px-4 py-2" : "w-full px-3 py-2 justify-center"
            )}
            title="Sign Out"
          >
            <LogOut className={clsx("w-4 h-4", sidebarOpen ? "mr-3" : "")} />
            {sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center space-x-4 flex-1">
            <h1 className="text-lg font-semibold text-slate-800">
              Medico-Legal Information Management System
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                roleColorMap[user?.role] || 'bg-slate-600'
              )}>
                {user?.role?.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-700 capitalize">{user?.role?.replace('_', ' ')}</p>
                <p className="text-xs text-slate-400">ID: {user?.id}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
