import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PIE_COLORS = ['#3b82f6','#0f172a','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

const KpiCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
    <p className="text-sm text-slate-500 mb-1">{label}</p>
    <p className="text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

const ReportMonthlyPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePrint = () => window.print();
  const handleExportPdf = async () => {
    try {
      const response = await api.get(`/reporting/monthly/pdf?year=${year}&month=${String(month + 1).padStart(2, '0')}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a'); a.href = url; a.download = `monthly-report-${year}-${String(month+1).padStart(2,'0')}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  const fetchReport = useCallback(() => {
    setLoading(true);
    api.get(`/reporting/monthly?year=${year}&month=${String(month + 1).padStart(2, '0')}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Monthly Departmental Report</h2>
          <p className="text-slate-500 text-sm mt-1">Aggregated monthly operational statistics</p>
        </div>
        {isAdmin && <div className="flex gap-2 no-print">
          <button onClick={() => {
            if (!data) return;
            const rows = data.breakdown.map(r => `${r.category},${r.clinical_count},${r.autopsy_count},${r.total_volume}`);
            const csv = 'Category,Clinical Count,Autopsy Count,Total Volume\n' + rows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `monthly-report-${year}-${String(month+1).padStart(2,'0')}.csv`; a.click();
            URL.revokeObjectURL(url);
          }} className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><Download className="w-4 h-4 mr-2" />Export CSV</button>
          <button onClick={handleExportPdf} className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><Download className="w-4 h-4 mr-2" />Export PDF</button>
        </div>}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 no-print">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={fetchReport} disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
          <BarChart3 className="w-4 h-4 mr-2" />Generate
        </button>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading report...</div>}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Total Admissions" value={data.kpis.total_admissions} />
            <KpiCard label="MLR Reports Issued" value={data.kpis.mlr_issued} />
            <KpiCard label="Autopsies Conducted" value={data.kpis.autopsies_conducted} />
            <KpiCard label="Court Dispatches" value={data.kpis.court_dispatches} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Monthly Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="count" name="Cases" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Breakdown by Category</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.breakdown} dataKey="total_volume" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, pct }) => `${category}: ${pct}%`}>
                      {data.breakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Breakdown by Category</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Clinical Count</th>
                    <th className="px-6 py-4">Autopsy Count</th>
                    <th className="px-6 py-4">Total Volume</th>
                    <th className="px-6 py-4">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.breakdown.map((row, i) => {
                    const pct = data.kpis.total_admissions > 0
                      ? ((row.total_volume / data.kpis.total_admissions) * 100).toFixed(1)
                      : '0';
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900 capitalize">{row.category}</td>
                        <td className="px-6 py-4">{row.clinical_count}</td>
                        <td className="px-6 py-4">{row.autopsy_count}</td>
                        <td className="px-6 py-4 font-bold">{row.total_volume}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full" style={{width: `${pct}%`}} />
                            </div>
                            <span className="text-xs text-slate-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportMonthlyPage;
