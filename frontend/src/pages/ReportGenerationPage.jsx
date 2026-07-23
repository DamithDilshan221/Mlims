import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Printer, Save, FileCheck, Landmark, ShieldCheck } from 'lucide-react';
import RestrictedBadge from '../components/layout/RestrictedBadge';

const ReportGenerationPage = () => {
  const { type, id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Draft state for clinical
  const [clinicalDraft, setClinicalDraft] = useState({
    court_id: '',
    court_case_no: '',
    serial_no: '',
    final_opinion: '',
    is_grievous_311: false
  });

  const isCourtOfficial = user.role === 'court';
  const isDoctorOrAdmin = ['doctor', 'admin'].includes(user.role);

  useEffect(() => {
    const endpoint = type === 'clinical' ? `/clinical-examinations/${id}` : `/postmortem-examinations/${id}`;
    
    api.get(endpoint)
      .then(res => {
        const item = Array.isArray(res.data) ? res.data.find(e => (e.mlef_id || e.pmr_id) == id) : res.data;
        setData(item);
        if (type === 'clinical' && item?.mlr) {
          setClinicalDraft(item.mlr);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, id]);

  const handleSaveDraft = async () => {
    try {
      await api.patch(`/reports/clinical/${id}/draft`, clinicalDraft);
      toast.success("Draft saved successfully.");
    } catch {
      toast.error("Failed to save draft.");
    }
  };

  const handleIssueClinical = async () => {
    if (!window.confirm("Are you sure? Issuing the report locks it.")) return;
    try {
      await api.post(`/reports/clinical/${id}/issue`);
      toast.success("Report issued successfully.");
      navigate('/reports');
    } catch {
      toast.error("Failed to issue report.");
    }
  };

  const handleIssuePoliceCopy = async () => {
    if (!window.confirm("Issue the police copy for this MLEF?")) return;
    try {
      await api.post(`/clinical-examinations/${id}/police-copy`);
      toast.success("Police copy issued successfully.");
      setData(prev => ({ ...prev, police_copy_issued: true }));
    } catch {
      toast.error("Failed to issue police copy.");
    }
  };

  const handleCourtAcknowledgment = async () => {
    try {
      await api.post(`/reports/${type}/${id}/acknowledge`);
      toast.success("Court Receipt Issued Successfully.");
      navigate('/reports');
    } catch {
      toast.error("Failed to issue receipt.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8 text-red-500">Record not found or access restricted.</div>;

  // Determine computed status locally
  const isAcknowledged = !!data.receipt_id;
  const isIssued = type === 'clinical' ? !!data.report_issue_date : !!data.has_causes_of_death;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Non-Printable Action Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {type === 'clinical' ? 'Medico-Legal Report (Clinical)' : 'Postmortem Report'}
          </h2>
          <p className="text-sm text-slate-500">ID: #{id} • Case: #{data.case_id}</p>
        </div>
        
        <div className="flex space-x-3">
          <button onClick={handlePrint} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-lg flex items-center transition-colors">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </button>
          
          {type === 'clinical' && isDoctorOrAdmin && !isIssued && (
            <>
              <button onClick={handleSaveDraft} className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 font-medium rounded-lg flex items-center">
                <Save className="w-4 h-4 mr-2" /> Save Draft
              </button>
              <button onClick={handleIssueClinical} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 font-medium rounded-lg flex items-center">
                <FileCheck className="w-4 h-4 mr-2" /> Issue Report
              </button>
            </>
          )}

          {type === 'clinical' && isIssued && !data.police_copy_issued && (
            <button onClick={handleIssuePoliceCopy} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-lg flex items-center shadow-md">
              <ShieldCheck className="w-4 h-4 mr-2" /> Issue Police Copy
            </button>
          )}

          {isCourtOfficial && isIssued && !isAcknowledged && (
            <button onClick={handleCourtAcknowledgment} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-medium rounded-lg flex items-center shadow-md">
              <Landmark className="w-4 h-4 mr-2" /> Acknowledge (Generate Receipt)
            </button>
          )}
        </div>
      </div>

      {/* Printable Report View */}
      {/* We use a specific div that spans full page when printing */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 print:shadow-none print:border-none print:p-0">
        
        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
          <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900">
            {type === 'clinical' ? 'Medico-Legal Examination Form' : 'Postmortem Examination Report'}
          </h1>
          <p className="text-sm font-semibold mt-2">Ministry of Health / Justice</p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p><span className="font-bold">Case Reference:</span> {data.case_number}</p>
            <p><span className="font-bold">Date of Exam:</span> {type === 'clinical' ? data.exam_date : data.date_of_pm}</p>
          </div>
          <div className="text-right">
            <p><span className="font-bold">Generated:</span> {new Date().toLocaleDateString()}</p>
            <p><span className="font-bold">Status:</span> {isAcknowledged ? 'Court Acknowledged' : isIssued ? 'Final Issued' : 'DRAFT'}</p>
            {type === 'clinical' && data.police_copy_issued && (
              <p className="text-blue-600 font-bold mt-1 text-xs uppercase tracking-wide border border-blue-200 inline-block px-2 py-1 rounded bg-blue-50">
                <ShieldCheck className="w-3 h-3 inline mr-1 -mt-0.5" />
                Police Copy Issued
              </p>
            )}
          </div>
        </div>

        {/* Clinical Form Section */}
        {type === 'clinical' && (
          <div className="mt-8 space-y-6">
            
            <div className="bg-slate-50 p-4 border border-slate-200 rounded">
              <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Medical History</h3>
              <RestrictedBadge allowedRoles={['admin', 'doctor', 'court']} fallback="Patient medical history is restricted for this role.">
                <p className="whitespace-pre-wrap">{data.brief_history || 'No history recorded.'}</p>
              </RestrictedBadge>
            </div>

            {/* If doctor editing draft, show inputs instead of text */}
            {!isIssued && isDoctorOrAdmin ? (
              <div className="bg-blue-50 p-6 border border-blue-200 rounded space-y-4 print:hidden">
                <h3 className="font-bold text-blue-900">Report Editing (Draft)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Court ID</label>
                    <input type="number" value={clinicalDraft.court_id} onChange={e => setClinicalDraft({...clinicalDraft, court_id: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Court Case No</label>
                    <input type="text" value={clinicalDraft.court_case_no} onChange={e => setClinicalDraft({...clinicalDraft, court_case_no: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Final Opinion</label>
                  <textarea rows="3" value={clinicalDraft.final_opinion} onChange={e => setClinicalDraft({...clinicalDraft, final_opinion: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" />
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Final Opinion</h3>
                <p className="whitespace-pre-wrap">{data.mlr?.final_opinion || 'Not finalized yet.'}</p>
              </div>
            )}
            
          </div>
        )}

        {/* PM Form Section */}
        {type === 'postmortem' && (
          <div className="mt-8 space-y-6">
            <div className="bg-slate-50 p-4 border border-slate-200 rounded">
              <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Anatomical Notes</h3>
              {data.anatomical_notes ? (
                <pre className="whitespace-pre-wrap font-sans text-sm">{JSON.stringify(data.anatomical_notes, null, 2)}</pre>
              ) : (
                <p className="italic text-slate-500">None recorded.</p>
              )}
            </div>

            <div className="mt-8">
              <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Cause of Death</h3>
              {data.has_causes_of_death ? (
                <div className="space-y-2 text-sm">
                  <p><strong>Immediate:</strong> {data.immediate_cause}</p>
                  <p><strong>Antecedent:</strong> {data.antecedent_cause}</p>
                </div>
              ) : (
                <p className="italic text-amber-600">Pending final cause of death analysis.</p>
              )}
            </div>
          </div>
        )}

        {/* Signature Block */}
        <div className="mt-24 pt-8 flex justify-between">
          <div className="text-center w-64">
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <p className="font-bold text-sm">Signature of Medical Officer</p>
            <p className="text-xs text-slate-500">Date: ____________</p>
          </div>
          {isAcknowledged && (
            <div className="text-center w-64">
              <div className="border-b border-indigo-400 mb-2 pb-8 flex items-end justify-center">
                <span className="text-indigo-600 font-bold text-xl opacity-30 transform -rotate-12 absolute">RECEIVED</span>
              </div>
              <p className="font-bold text-sm">Acknowledged by Court</p>
              <p className="text-xs text-slate-500">Receipt ID: #{data.receipt_id}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ReportGenerationPage;
