import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const StatisticsPage = () => {
  const [casesPerMonth, setCasesPerMonth] = useState([]);
  const [labTat, setLabTat] = useState([]);
  const [casesByLoc, setCasesByLoc] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/statistics/cases-per-month'),
      api.get('/statistics/lab-turnaround'),
      api.get('/statistics/cases-by-location')
    ]).then(([casesRes, labRes, locRes]) => {
      // Reformat cases-per-month for stacked bar chart (clinical vs PM)
      const formattedCases = formatCasesForChart(casesRes.data);
      setCasesPerMonth(formattedCases);
      
      // Reverse array so chronological order is left-to-right
      setLabTat(labRes.data.reverse());
      
      setCasesByLoc(locRes.data);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const formatCasesForChart = (data) => {
    // data is like [{ month: '2023-10', case_type: 'clinical', count: 5 }, ...]
    const map = new Map();
    data.forEach(d => {
      if (!map.has(d.month)) map.set(d.month, { month: d.month, clinical: 0, postmortem: 0 });
      const entry = map.get(d.month);
      entry[d.case_type] = parseInt(d.count, 10);
    });
    // Return sorted array (oldest to newest)
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  if (loading) return <div className="p-8 text-center">Loading statistics...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">System Statistics</h2>
        <p className="text-slate-500 text-sm mt-1">Monthly reports and operational metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Cases Per Month Stacked Bar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Cases Registered per Month</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={casesPerMonth} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                <Bar dataKey="clinical" name="Clinical Exams" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="postmortem" name="Postmortems" stackId="a" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lab Turnaround Time Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Avg Lab Turnaround Time (Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={labTat} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                <RechartsTooltip cursor={{stroke: '#cbd5e1', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="avg_days" name="Avg Days" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cases by Police Station Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Total Cases by Police Station</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={casesByLoc} margin={{ top: 5, right: 30, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" name="Total Cases" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StatisticsPage;
