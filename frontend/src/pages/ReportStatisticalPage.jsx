import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { BarChart3, PieChart, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart as RPieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#3b82f6','#0f172a','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

const AGE_LABELS = { '0-12': '0-12', '13-24': '13-24', '25-59': '25-59', '60+': '60+' };

const ReportStatisticalPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('trends');

  const fetchReport = useCallback(() => {
    setLoading(true);
    api.get(`/reporting/statistical?year=${year}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handlePrint = () => window.print();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Advanced Analytics & Statistical Report</h2>
          <p className="text-slate-500 text-sm mt-1">Yearly trends, cause of death distribution, and demographic breakdown</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          {isAdmin && <button onClick={handlePrint} className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Printer className="w-4 h-4 mr-2" />Print
          </button>}
          <span className="text-sm text-slate-500">Year:</span>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchReport} disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
            <BarChart3 className="w-4 h-4 mr-2" />Apply
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2 no-print">
        {[
          { key: 'trends', label: 'Admission Trends' },
          { key: 'cod', label: 'Cause of Death Distribution' },
          { key: 'demographics', label: 'Demographic Heatmap' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white text-primary-600 border border-b-white border-slate-200 -mb-[3px]' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading report...</div>}

      {data && (
        <>
          {tab === 'trends' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-6">Monthly Admission Volume ({year})</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month_label" tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                    <Bar dataKey="clinical_count" name="Clinical" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="pm_count" name="Postmortem" stackId="a" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'cod' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6">Autopsy Cause of Death Breakdown</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={data.causeOfDeath} dataKey="count" nameKey="cause_group" cx="50%" cy="50%" outerRadius={90} label={({ cause_group, pct }) => `${cause_group}: ${pct}%`}>
                        {data.causeOfDeath.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Cause Distribution Details</h3>
                {data.causeOfDeath.length === 0 ? (
                  <p className="text-slate-400 text-sm">No cause of death data for {year}.</p>
                ) : (
                  <div className="space-y-3">
                    {data.causeOfDeath.map((row, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{row.cause_group}</span>
                          <span className="text-slate-500">{row.count} ({row.pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width: `${row.pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length]}} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'demographics' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Demographic Summary</h3>
              {data.demographics.length === 0 ? (
                <p className="text-slate-400 text-sm">No demographic data for {year}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Age Group</th>
                        <th className="px-6 py-4">Male Cases</th>
                        <th className="px-6 py-4">Female Cases</th>
                        <th className="px-6 py-4">Total Volume</th>
                        <th className="px-6 py-4">% of Total</th>
                        <th className="px-6 py-4">Primary Incident Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.demographics.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{row.age_group}</td>
                          <td className="px-6 py-4">{row.male_cases}</td>
                          <td className="px-6 py-4">{row.female_cases}</td>
                          <td className="px-6 py-4 font-bold">{row.total_volume}</td>
                          <td className="px-6 py-4">{row.pct}%</td>
                          <td className="px-6 py-4 text-slate-500">{row.primary_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportStatisticalPage;
