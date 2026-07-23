import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import RestrictedBadge from '../components/layout/RestrictedBadge';
import { Activity, ShieldAlert, CheckSquare } from 'lucide-react';
import clsx from 'clsx';

const ClinicalCaseDetailsPage = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/clinical-examinations/${id}`)
      .then(res => setExam(res.data))
      .catch(() => {
        api.get(`/clinical-examinations`)
          .then(res => {
            const match = res.data.find(e => e.mlef_id == id || e.case_id == id);
            if (match) setExam(match);
            else setError("Examination not found or you don't have access.");
          })
          .catch(() => setError("Failed to load examination."));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500">Loading clinical file...</div>;
  if (error || !exam) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clinical Examination File</h2>
          <p className="text-slate-500 text-sm mt-1">MLEF ID: #{exam.mlef_id} • Case: #{exam.case_id}</p>
        </div>
        <Link 
          to={`/exam-injury?mlefId=${exam.mlef_id}`}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm"
        >
          Add Examination Injury
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-slate-500" />
                Admission & History
              </h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">Ward</span>
                <span className="text-slate-900 font-medium">{exam.ward || '--'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">BHT No</span>
                <span className="text-slate-900 font-medium">{exam.bht_no || '--'}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-500 mb-1">Brief History</span>
                <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">
                  {/* Restricted view wrapper */}
                  <RestrictedBadge allowedRoles={['admin', 'doctor']} fallback="Medical history restricted.">
                    {exam.brief_history || 'No history recorded.'}
                  </RestrictedBadge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sensitive Flags */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-amber-500" />
                Flags & Consent
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Patient Consent</span>
                <span className={clsx("text-xs font-bold px-2 py-1 rounded-full", exam.patient_consent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                  {exam.patient_consent ? 'YES' : 'NO'}
                </span>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <RestrictedBadge allowedRoles={['admin', 'doctor']} fallback="Flags restricted.">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CheckSquare className={clsx("w-4 h-4 mr-2", exam.alcohol_influence ? "text-red-500" : "text-slate-300")} />
                      <span className="text-sm text-slate-700">Alcohol Influence</span>
                    </div>
                    <div className="flex items-center">
                      <CheckSquare className={clsx("w-4 h-4 mr-2", exam.drug_influence ? "text-red-500" : "text-slate-300")} />
                      <span className="text-sm text-slate-700">Drug Influence</span>
                    </div>
                    <div className="flex items-center">
                      <CheckSquare className={clsx("w-4 h-4 mr-2", exam.sexual_assault ? "text-red-500" : "text-slate-300")} />
                      <span className="text-sm text-slate-700">Sexual Assault Suspicion</span>
                    </div>
                  </div>
                </RestrictedBadge>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClinicalCaseDetailsPage;
