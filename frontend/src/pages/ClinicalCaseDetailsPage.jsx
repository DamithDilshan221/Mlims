import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import RestrictedBadge from '../components/layout/RestrictedBadge';
import { Activity, ShieldAlert, CheckSquare, File } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../context/AuthContext';

const ClinicalCaseDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [caseInfo, setCaseInfo] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/cases/${id}/timeline`)
      .then(res => {
        setCaseInfo(res.data.case);
        setExam(res.data.clinical_examination);
      })
      .catch(() => {
        setError("Case not found or you don't have access.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const initiateExam = async () => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().split(' ')[0].substring(0, 5);
      await api.post('/clinical-examinations', {
        caseId: parseInt(id),
        examDate: dateStr,
        examTime: timeStr,
        patientConsent: false,
        sexualAssault: false
      });
      window.location.reload();
    } catch (err) {
      alert("Failed to initiate examination. Ensure you are authorized.");
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading clinical file...</div>;
  if (error || !caseInfo) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clinical Case: {caseInfo.patient_name || 'Unknown Patient'}</h2>
          <p className="text-slate-500 text-sm mt-1">
            Case ID: CASE-{caseInfo.case_id.toString().padStart(4, '0')} • 
            {exam ? ` MLEF ID: #${exam.mlef_id}` : ' No Exam Record Yet'}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link 
            to={`/cases/${caseInfo.case_id}/documents`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center"
          >
            <File className="w-4 h-4 mr-2" />
            Case Files
          </Link>
          {exam && (
            <Link 
              to={`/exam-injury?mlefId=${exam.mlef_id}`}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm flex items-center"
            >
              Add Examination Injury
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-slate-500" />
                Case Information
              </h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">Incident Date</span>
                <span className="text-slate-900 font-medium">{caseInfo.incident_date ? new Date(caseInfo.incident_date).toLocaleDateString() : '--'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">Police Station</span>
                <span className="text-slate-900 font-medium">{caseInfo.station_name || '--'}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-500 mb-1">Incident Location</span>
                <span className="text-slate-900 font-medium">{caseInfo.incident_location || '--'}</span>
              </div>
            </div>
          </div>

          {!exam ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
              <h3 className="text-amber-800 font-bold mb-2">Examination Not Initiated</h3>
              <p className="text-amber-700 text-sm mb-4">A doctor has not yet created the medical examination file for this case.</p>
              {user.role === 'admin' || user.role === 'doctor' ? (
                <button 
                  onClick={initiateExam}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 shadow-sm"
                >
                  Initiate Examination Now
                </button>
              ) : null}
            </div>
          ) : (
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
                    <RestrictedBadge allowedRoles={['admin', 'doctor']} fallback="Medical history restricted.">
                      {exam.brief_history || 'No history recorded.'}
                    </RestrictedBadge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Sensitive Flags */}
        {exam && (
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
        )}

      </div>
    </div>
  );
};

export default ClinicalCaseDetailsPage;
