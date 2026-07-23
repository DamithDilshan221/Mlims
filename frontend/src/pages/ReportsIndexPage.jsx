import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, BarChart3, AlertTriangle, Scale, PieChart, ArrowRight } from 'lucide-react';

const REPORTS = [
  {
    path: '/reports/daily',
    label: 'Daily Case Report',
    desc: 'Operational summary of clinical examinations and autopsy admissions within a 24-hour window',
    icon: CalendarDays,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    path: '/reports/monthly',
    label: 'Monthly Report',
    desc: 'Aggregated monthly operational statistics for departmental auditing and reporting',
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    path: '/reports/pending',
    label: 'Pending Cases Report',
    desc: 'Overdue cases and bottleneck tracker for quality assurance',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    path: '/reports/court',
    label: 'Court Report',
    desc: 'Court summons, trial schedule, and MLR dispatch status',
    icon: Scale,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    path: '/reports/statistical',
    label: 'Statistical Report',
    desc: 'Yearly analytics, admission trends, cause of death distribution, and demographics',
    icon: PieChart,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
];

const ReportsIndexPage = () => {
  const location = useLocation();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
        <p className="text-slate-500 text-sm mt-1">
          Operational, legal, and analytical reports for the Forensic Medicine Department
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {REPORTS.map(r => {
          const Icon = r.icon;
          return (
            <Link key={r.path} to={r.path}
              className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary-200 transition-all">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${r.bg}`}>
                  <Icon className={`w-6 h-6 ${r.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{r.label}</h3>
                  <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsIndexPage;
