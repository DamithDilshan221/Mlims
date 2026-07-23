import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RestrictedBadge from '../components/layout/RestrictedBadge';
import CaseDocumentsWidget from '../components/documents/CaseDocumentsWidget';

import { Activity, ShieldAlert, CheckSquare, Stethoscope, Plus, X, FileText, ClipboardList, Landmark, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const AUTH_LABELS = {
  hospital_police: 'Hospital Police',
  police_station: 'Police Station',
  request_letter: 'Request Letter',
  court_order: 'Court Order',
};

const STATUS_BADGE = {
  registered: 'bg-slate-100 text-slate-700 border-slate-300',
  under_investigation: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_report: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

// import { Activity, ShieldAlert, CheckSquare, File } from 'lucide-react';
// import clsx from 'clsx';

// import { useAuth } from '../context/AuthContext';


const ClinicalCaseDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const toast = useToast();

  const [caseInfo, setCaseInfo] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isDoctor = ['admin', 'doctor'].includes(user?.role);
  const isPolice = user?.role === 'police';

  // MLEF Creation Form (comprehensive — matches full spec)
  const [mlefForm, setMlefForm] = useState({
    examDate: new Date().toISOString().split('T')[0],
    examTime: '',
    ward: '',
    bhtNo: '',
    dischargeDate: '',
    patientConsent: false,
    briefHistory: '',
    alcoholInfluence: '',
    drugInfluence: '',
    sexualAssault: false,
    authorizationType: '',
    // Section 1: Header & Administrative Metadata
    officerName: '',
    officerRank: '',
    officerBadgeNo: '',
    mlefSerialNo: '',
    courtCaseNo: '',
    // Section 2: Referral Context
    referralCategory: '',
    // Section 3: Physical Examination
    identificationMarks: '',
    thumbImpressionLeft: '',
    thumbImpressionRight: '',
    medicalOfficerNotes: '',
    // Section 4: Investigations & Follow-up
    investigationsNotes: '',
    followUpNotes: '',
    // Section 5: Storage Data Checklist
    hasDoctorCopy: false,
    hasInjuryPhotos: false,
    hasInvestigationFindings: false,
    hasExternalReports: false,
    hasCourtSummons: false,
    hasMlrCopy: false,
    hasCertificateOfReceipt: false,
  });
  const [creating, setCreating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ section1: true, section2: false, section3: false, section4: false, section5: false });

  // Medical referrals
  const [referrals, setReferrals] = useState([]);
  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm, setRefForm] = useState({ specialty: '', referralDate: '', reviewNotes: '' });

  useEffect(() => {
    loadCase();
  }, [id]);

  const loadCase = () => {
    setLoading(true);
    api.get(`/cases/${id}/timeline`)
      .then(res => {
        setCaseInfo(res.data.case);
        const match = res.data.clinical_examination;
        setExam(match);
        if (match) {
          api.get(`/clinical-examinations/${match.mlef_id}/referrals`).then(r => setReferrals(r.data)).catch(() => {});
        }
      })
      .catch(() => setError("Case not found or you don't have access."))
      .finally(() => setLoading(false));
  };

  const createMLEF = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/clinical-examinations', { ...mlefForm, caseId: parseInt(id, 10) });
      toast.success("MLEF created successfully.");
      loadCase();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create MLEF.");
    } finally {
      setCreating(false);
    }
  };

  const addReferral = async () => {
    if (!exam || !refForm.specialty.trim()) return;
    try {
      const res = await api.post(`/clinical-examinations/${exam.mlef_id}/referrals`, refForm);
      setReferrals(prev => [...prev, res.data]);
      setRefForm({ specialty: '', referralDate: '', reviewNotes: '' });
      setShowRefForm(false);
    } catch (err) {
      console.error('Failed to add referral');
    }
  };

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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isPolice ? `Case Management: ${caseInfo.patient_name || 'Unknown Patient'}` : `Clinical Case: ${caseInfo.patient_name || 'Unknown Patient'}`}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Case: {caseInfo.case_number} • 
            {exam ? ` MLEF #${exam.mlef_id}` : ' MLEF not yet created'}
            {caseInfo.assigned_doctor_name && <span> • Assigned: Dr. {caseInfo.assigned_doctor_name}</span>}
          </p>
        </div>

        <div className="flex space-x-2">
          {exam && isDoctor && (
            <Link to={`/exam-injury?mlefId=${exam.mlef_id}`}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm">
              Add Injury
            </Link>
          )}
          {exam && (
            <Link to={`/reports/generate/clinical/${exam.mlef_id}`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">
              View Report

            </Link>
          )}
        </div>
      </div>

      {/* Police Case Management View */}
      {isPolice && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Case Status</p>
            <span className={clsx("inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border", STATUS_BADGE[caseInfo.status] || 'bg-slate-100 text-slate-600')}>
              {caseInfo.status?.replace(/_/g, ' ').toUpperCase() || 'REGISTERED'}
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Police Station</p>
            <p className="mt-2 text-sm font-bold text-slate-800">{caseInfo.station_name || '--'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Examination Status</p>
            <p className="mt-2">
              {exam ? (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">MLEF RECORDED</span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">PENDING DOCTOR</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Core Details (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Case Information */}
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
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">Assigned Doctor</span>
                <span className="text-slate-900 font-medium">{caseInfo.assigned_doctor_name || '--'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">Referral Source</span>
                <span className="text-slate-900 font-medium">{caseInfo.referral_source_id ? `#${caseInfo.referral_source_id}` : 'Direct'}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-medium text-slate-500 mb-1">Incident Location</span>
                <span className="text-slate-900 font-medium">{caseInfo.incident_location || '--'}</span>
              </div>
            </div>
          </div>

          {/* MLEF Creation Form (doctors only, no exam exists) — Comprehensive */}
          {!exam && isDoctor && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
                <h3 className="font-semibold text-blue-900 flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
                  Medico-Legal Examination Form (MLEF)
                </h3>
              </div>
              <form onSubmit={createMLEF} className="p-6 space-y-6">
                {/* Section 1 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setExpandedSections(prev => ({...prev, section1: !prev.section1}))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-800">
                    <span>1. Header &amp; Administrative Metadata</span>
                    <span className="text-slate-400">{expandedSections.section1 ? '▲' : '▼'}</span>
                  </button>
                  {expandedSections.section1 && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Exam Date *</label><input type="date" required value={mlefForm.examDate} onChange={e => setMlefForm({...mlefForm, examDate: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-blue-500" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Exam Time</label><input type="time" value={mlefForm.examTime} onChange={e => setMlefForm({...mlefForm, examTime: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-blue-500" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Ward</label><input type="text" placeholder="e.g. Ward 3A" value={mlefForm.ward} onChange={e => setMlefForm({...mlefForm, ward: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">BHT No</label><input type="text" placeholder="Bed Head Ticket number" value={mlefForm.bhtNo} onChange={e => setMlefForm({...mlefForm, bhtNo: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Discharge Date</label><input type="date" value={mlefForm.dischargeDate} onChange={e => setMlefForm({...mlefForm, dischargeDate: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Authorization Type</label>
                          <select value={mlefForm.authorizationType} onChange={e => setMlefForm({...mlefForm, authorizationType: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded">
                            <option value="">Select...</option>
                            <option value="hospital_police">Hospital Police</option>
                            <option value="police_station">Police Station</option>
                            <option value="request_letter">Request Letter</option>
                            <option value="court_order">Court Order</option>
                          </select>
                        </div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">MLEF Serial No</label><input type="text" placeholder="MLEF serial number" value={mlefForm.mlefSerialNo} onChange={e => setMlefForm({...mlefForm, mlefSerialNo: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Court Case No</label><input type="text" placeholder="Court case/code number" value={mlefForm.courtCaseNo} onChange={e => setMlefForm({...mlefForm, courtCaseNo: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                      </div>
                      <div className="border-t border-slate-200 pt-4">
                        <p className="text-xs font-semibold text-slate-600 mb-3">Police Officer Information</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div><label className="block text-xs font-medium text-slate-700 mb-1">Officer Name</label><input type="text" placeholder="Name" value={mlefForm.officerName} onChange={e => setMlefForm({...mlefForm, officerName: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                          <div><label className="block text-xs font-medium text-slate-700 mb-1">Rank</label><input type="text" placeholder="Rank" value={mlefForm.officerRank} onChange={e => setMlefForm({...mlefForm, officerRank: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                          <div><label className="block text-xs font-medium text-slate-700 mb-1">Badge No</label><input type="text" placeholder="Badge number" value={mlefForm.officerBadgeNo} onChange={e => setMlefForm({...mlefForm, officerBadgeNo: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Section 2 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setExpandedSections(prev => ({...prev, section2: !prev.section2}))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-800">
                    <span>2. Referral &amp; Legal Context</span>
                    <span className="text-slate-400">{expandedSections.section2 ? '▲' : '▼'}</span>
                  </button>
                  {expandedSections.section2 && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-2">Referral Category</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[{v:'trauma',l:'Trauma'},{v:'domestic_abuse',l:'Domestic Abuse'},{v:'sexual_abuse',l:'Sexual Abuse'},{v:'child_abuse',l:'Child Abuse'},{v:'detainee',l:'Detainee'},{v:'drug_addiction',l:'Drug Addiction'},{v:'age_estimation',l:'Age Estimation'},{v:'dna_sample',l:'DNA Sample'},{v:'other',l:'Other'}].map(o =>
                            <label key={o.v} className="flex items-center space-x-2 p-2 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
                              <input type="radio" name="referralCategory" value={o.v} checked={mlefForm.referralCategory === o.v} onChange={e => setMlefForm({...mlefForm, referralCategory: e.target.value})} className="accent-blue-600" />
                              <span className="text-sm text-slate-700">{o.l}</span>
                            </label>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Brief History</label>
                        <textarea rows="3" value={mlefForm.briefHistory} onChange={e => setMlefForm({...mlefForm, briefHistory: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" placeholder="Patient history, circumstances of injury..." />
                      </div>
                    </div>
                  )}
                </div>
                {/* Section 3 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setExpandedSections(prev => ({...prev, section3: !prev.section3}))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-800">
                    <span>3. Physical Examination &amp; Injury Mapping</span>
                    <span className="text-slate-400">{expandedSections.section3 ? '▲' : '▼'}</span>
                  </button>
                  {expandedSections.section3 && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Alcohol Influence</label><input type="text" placeholder="e.g. Positive, Negative" value={mlefForm.alcoholInfluence} onChange={e => setMlefForm({...mlefForm, alcoholInfluence: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Drug Influence</label><input type="text" placeholder="e.g. Positive, Negative" value={mlefForm.drugInfluence} onChange={e => setMlefForm({...mlefForm, drugInfluence: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                      </div>
                      <div className="flex space-x-6">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={mlefForm.patientConsent} onChange={e => setMlefForm({...mlefForm, patientConsent: e.target.checked})} className="rounded border-slate-300" /><span className="text-sm text-slate-700">Patient Consent Obtained</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={mlefForm.sexualAssault} onChange={e => setMlefForm({...mlefForm, sexualAssault: e.target.checked})} className="rounded border-slate-300" /><span className="text-sm text-slate-700">Sexual Assault Suspected</span></label>
                      </div>
                      <div><label className="block text-xs font-medium text-slate-700 mb-1">Identification Marks</label><textarea rows="2" value={mlefForm.identificationMarks} onChange={e => setMlefForm({...mlefForm, identificationMarks: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" placeholder="Tattoos, scars, or other distinct visual markers" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Left Thumb Impression</label><input type="text" placeholder="URI / reference" value={mlefForm.thumbImpressionLeft} onChange={e => setMlefForm({...mlefForm, thumbImpressionLeft: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                        <div><label className="block text-xs font-medium text-slate-700 mb-1">Right Thumb Impression</label><input type="text" placeholder="URI / reference" value={mlefForm.thumbImpressionRight} onChange={e => setMlefForm({...mlefForm, thumbImpressionRight: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" /></div>
                      </div>
                      <div><label className="block text-xs font-medium text-slate-700 mb-1">Medical Officer's Notes</label><textarea rows="3" value={mlefForm.medicalOfficerNotes} onChange={e => setMlefForm({...mlefForm, medicalOfficerNotes: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" placeholder="Clinical observations recorded at the time of examination" /></div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-medium mb-1">Injury Mapping</p>
                        <p className="text-blue-600">After saving the MLEF, use the <strong>"Add Injury"</strong> button above to map injuries on anatomical diagrams with full details (nature, dimensions, anatomical site).</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Section 4 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setExpandedSections(prev => ({...prev, section4: !prev.section4}))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-800">
                    <span>4. Investigations &amp; Referrals</span>
                    <span className="text-slate-400">{expandedSections.section4 ? '▲' : '▼'}</span>
                  </button>
                  {expandedSections.section4 && (
                    <div className="p-4 space-y-4">
                      <div><label className="block text-xs font-medium text-slate-700 mb-1">Special Investigations</label><textarea rows="3" value={mlefForm.investigationsNotes} onChange={e => setMlefForm({...mlefForm, investigationsNotes: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" placeholder="X-ray/CT scan findings, blood/urine toxicology, swab test results..." /></div>
                      <div><label className="block text-xs font-medium text-slate-700 mb-1">Follow-up Review Notes</label><textarea rows="2" value={mlefForm.followUpNotes} onChange={e => setMlefForm({...mlefForm, followUpNotes: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-300 rounded" placeholder="Inward or outpatient review progress notes" /></div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-medium mb-1">Specialist Referrals</p>
                        <p className="text-blue-600">After saving the MLEF, use the <strong>"Medical Referrals"</strong> section to add specialist referrals.</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Section 5 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={() => setExpandedSections(prev => ({...prev, section5: !prev.section5}))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-800">
                    <span>5. Required Storage Data</span>
                    <span className="text-slate-400">{expandedSections.section5 ? '▲' : '▼'}</span>
                  </button>
                  {expandedSections.section5 && (
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-slate-500">Mark which documents have been received/stored for this case.</p>
                      {[{k:'hasDoctorCopy',l:'Doctor\'s Copy of completed MLEF'},{k:'hasInjuryPhotos',l:'Clinical Injury Photographs'},{k:'hasInvestigationFindings',l:'Investigation Findings & Imaging'},{k:'hasExternalReports',l:'External Referral Reports'},{k:'hasCourtSummons',l:'Court Summons / Request Forms'},{k:'hasMlrCopy',l:'Copy of Generated Medico-Legal Report (MLR)'},{k:'hasCertificateOfReceipt',l:'Certificate of Receipt (signed/sealed)'}].map(item =>
                        <label key={item.k} className="flex items-center space-x-3 p-2 border border-slate-100 rounded hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={mlefForm[item.k]} onChange={e => setMlefForm({...mlefForm, [item.k]: e.target.checked})} className="rounded border-slate-300 accent-blue-600" />
                          <span className="text-sm text-slate-700">{item.l}</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
                <div className="pt-2 flex justify-end border-t border-slate-200">
                  <button type="submit" disabled={creating} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50">
                    {creating ? 'Creating MLEF...' : 'Create MLEF Report'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* No exam, not a doctor */}
          {!exam && !isDoctor && !isPolice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
              <h3 className="text-amber-800 font-bold mb-2">Examination Not Initiated</h3>
              <p className="text-amber-700 text-sm">A medical officer has not yet created the MLEF report for this case.</p>
            </div>
          )}

          {!exam && isPolice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
              <h3 className="text-amber-800 font-bold mb-2">Awaiting Medical Officer</h3>
              <p className="text-amber-700 text-sm">The case has been referred. A medical officer needs to conduct the examination and file the MLEF report.</p>
            </div>
          )}

          {/* Existing exam: Admission & History */}
          {exam && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2 text-slate-500" />
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
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-1">Authorization Type</span>
                    <span className="text-slate-900 font-medium">{exam.authorization_type ? AUTH_LABELS[exam.authorization_type] || exam.authorization_type : '--'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-1">Exam Date</span>
                    <span className="text-slate-900 font-medium">{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : '--'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs font-medium text-slate-500 mb-1">Brief History</span>
                    <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-800 border border-slate-100">
                      <RestrictedBadge allowedRoles={['admin', 'doctor']} fallback="Medical history restricted for this role.">
                        {exam.brief_history || 'No history recorded.'}
                      </RestrictedBadge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Referrals */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center">
                    <Stethoscope className="w-5 h-5 mr-2 text-slate-500" />
                    Medical Referrals
                  </h3>
                  {isDoctor && (
                    <button onClick={() => setShowRefForm(!showRefForm)}
                      className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded font-medium hover:bg-slate-700 flex items-center">
                      {showRefForm ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                      {showRefForm ? 'Cancel' : 'Add Referral'}
                    </button>
                  )}
                </div>
                <div className="p-6 space-y-4">
                  {showRefForm && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                      <input placeholder="Specialty (e.g., Psychiatry, Pediatrics)" value={refForm.specialty}
                        onChange={e => setRefForm({...refForm, specialty: e.target.value})}
                        className="w-full px-3 py-2 text-sm border rounded" />
                      <input type="date" value={refForm.referralDate}
                        onChange={e => setRefForm({...refForm, referralDate: e.target.value})}
                        className="w-full px-3 py-2 text-sm border rounded" />
                      <textarea rows="2" placeholder="Review notes / reason for referral" value={refForm.reviewNotes}
                        onChange={e => setRefForm({...refForm, reviewNotes: e.target.value})}
                        className="w-full px-3 py-2 text-sm border rounded" />
                      <button onClick={addReferral} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Save Referral</button>
                    </div>
                  )}
                  {referrals.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No referrals recorded.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {referrals.map(ref => (
                        <div key={ref.referral_id} className="py-3 first:pt-0 last:pb-0">
                          <p className="text-sm font-medium text-slate-800">{ref.specialty}</p>
                          <p className="text-xs text-slate-500">{ref.referral_date ? new Date(ref.referral_date).toLocaleDateString() : ''}</p>
                          {ref.review_notes && <p className="text-xs text-slate-600 mt-1">{ref.review_notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right column: Flags & Status */}
        <div className="space-y-6">
          {exam && (
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
                  <RestrictedBadge allowedRoles={['admin', 'doctor']} fallback="Sensitive flags restricted.">
                    <div className="space-y-3">
                      {['Alcohol', 'Drug', 'Sexual Assault'].map((label, i) => {
                        const keys = ['alcohol_influence', 'drug_influence', 'sexual_assault'];
                        const val = exam[keys[i]];
                        return (
                          <div key={label} className="flex items-center">
                            <CheckSquare className={clsx("w-4 h-4 mr-2", val ? "text-red-500" : "text-slate-300")} />
                            <span className="text-sm text-slate-700">{label}{typeof val === 'string' && val ? `: ${val}` : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </RestrictedBadge>
                </div>
              </div>
            </div>
          )}

          {/* Case management status card for police */}
          {isPolice && !exam && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 flex items-center">
                  <Landmark className="w-5 h-5 mr-2 text-slate-500" />
                  Case Tracking
                </h3>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status</span>
                  <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border", STATUS_BADGE[caseInfo.status])}>
                    {caseInfo.status?.replace(/_/g, ' ').toUpperCase() || 'REGISTERED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Referral</span>
                  <span className="text-slate-800 font-medium">{caseInfo.referral_source_id ? `#${caseInfo.referral_source_id}` : 'Direct'}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <Link to={`/cases/${id}/documents`} className="text-blue-600 hover:underline text-xs font-medium">Upload Case Documents</Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Case Documents Widget */}
          <CaseDocumentsWidget caseId={caseInfo.case_id} />
        </div>
      </div>
    </div>
  );
};

export default ClinicalCaseDetailsPage;
