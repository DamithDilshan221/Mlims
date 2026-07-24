import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import { BookOpen, UserMinus, UploadCloud, UserCheck, Activity, File } from 'lucide-react';
import CaseDocumentsWidget from '../components/documents/CaseDocumentsWidget';



const PostmortemCaseDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [caseInfo, setCaseInfo] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Authorization and Notes
  const [authorizationType, setAuthorizationType] = useState('');

  // Anatomical notes JSON editor state
  const [notes, setNotes] = useState({
    head: '',
    chest: '',
    abdomen: ''
  });

  // Cause of Death
  const [causeOfDeath, setCauseOfDeath] = useState(null);
  const [codForm, setCodForm] = useState({ immediateCause: '', antecedentCause: '', contributory: '', underInvestigation: false });

  // Deceased Identifications
  const [identifications, setIdentifications] = useState([]);
  const [showIdForm, setShowIdForm] = useState(false);
  const [idForm, setIdForm] = useState({ identifierName: '', identifierAddress: '', relationship: '', nic: '' });

  useEffect(() => {
    api.get(`/cases/${id}/timeline`)
      .then(res => {
        setCaseInfo(res.data.case);
        const match = res.data.postmortem_examination;
        if (match) {
          setExam(match);
          if (match.authorization_type) setAuthorizationType(match.authorization_type);
          if (match.anatomical_notes) setNotes(match.anatomical_notes);
          // Fetch cause of death and identifications
          api.get(`/postmortem-examinations/${match.pmr_id}/cause-of-death`).then(r => {
            if (r.data && r.data.cod_id) {
              setCauseOfDeath(r.data);
              setCodForm({
                immediateCause: r.data.immediate_cause || '',
                antecedentCause: r.data.antecedent_cause || '',
                contributory: r.data.contributory || '',
                underInvestigation: r.data.under_investigation || false,
              });
            }
          }).catch(() => {});
          api.get(`/postmortem-examinations/${match.pmr_id}/identifications`).then(r => setIdentifications(r.data)).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const initiateExam = async () => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().split(' ')[0].substring(0, 5);
      await api.post('/postmortem-examinations', {
        caseId: parseInt(id),
        dateOfPm: dateStr,
        timeOfPm: timeStr
      });
      window.location.reload();
    } catch (err) {
      toast.error("Failed to initiate examination. Ensure you are authorized.");
    }
  };

  const saveNotes = async () => {
    try {
      await api.patch(`/postmortem-examinations/${id}`, { 
        anatomicalNotes: notes,
        authorizationType: authorizationType || null
      });
      toast.success("Postmortem details saved successfully.");
    } catch (err) {
      toast.error("Failed to save details.");
    }
  };

  const saveCauseOfDeath = async () => {
    if (!exam) return;
    try {
      if (causeOfDeath) {
        await api.patch(`/postmortem-examinations/${exam.pmr_id}/cause-of-death/${causeOfDeath.cod_id}`, codForm);
        toast.success("Cause of death updated.");
      } else {
        const res = await api.post(`/postmortem-examinations/${exam.pmr_id}/cause-of-death`, codForm);
        setCauseOfDeath(res.data);
        toast.success("Cause of death recorded.");
      }
    } catch (err) {
      toast.error("Failed to save cause of death.");
    }
  };

  const addIdentification = async () => {
    if (!exam || !idForm.identifierName.trim()) return;
    try {
      const res = await api.post(`/postmortem-examinations/${exam.pmr_id}/identifications`, idForm);
      setIdentifications(prev => [...prev, res.data]);
      setIdForm({ identifierName: '', identifierAddress: '', relationship: '', nic: '' });
      setShowIdForm(false);
      toast.success("Identifier added.");
    } catch (err) {
      toast.error("Failed to add identifier.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('case_id', exam.case_id);
    formData.append('file_name', file.name);

    try {
      await api.post('/digital-assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Supporting document uploaded successfully.");
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!caseInfo) return <div className="p-8">Case record not found or restricted.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Postmortem Case: {caseInfo.patient_name || 'Unknown Subject'}</h2>
          <p className="text-slate-500 text-sm mt-1">
            Case ID: CASE-{caseInfo.case_id.toString().padStart(4, '0')} • 
            {exam ? ` PMR ID: #${exam.pmr_id} • Inquest: ${exam.inquest_no}` : ' No Exam Record Yet'}
          </p>
        </div>
        {exam && (
          <div className="flex space-x-3">
            <Link 
              to={`/cases/${caseInfo.case_id}/documents`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center"
            >
              <File className="w-4 h-4 mr-2" />
              Case Files
            </Link>
            <Link to={`/exam-injury?pmrId=${exam.pmr_id}`} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center">
              Add Injury
            </Link>
            <button onClick={saveNotes} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">
              Save Notes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Case Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
            <UserMinus className="w-5 h-5 mr-2 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Case Information</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
        </div>

        {!exam ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 flex flex-col justify-center items-center text-center">
            <h3 className="text-amber-800 font-bold mb-2">Examination Not Initiated</h3>
            <p className="text-amber-700 text-sm mb-4">A doctor has not yet created the postmortem examination file for this case.</p>
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
          <>
            {/* Death Details & Authorization */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
                <UserMinus className="w-5 h-5 mr-2 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Death Details</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <label className="block text-xs font-medium text-slate-700 mb-2">Authorization Type *</label>
                  <select 
                    value={authorizationType}
                    onChange={e => setAuthorizationType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500 focus:border-primary-500 mb-4"
                  >
                    <option value="">Select Authorization...</option>
                    <option value="police_inquest">Police Inquest Order</option>
                    <option value="magistrate_court_order">Magistrate / Court Order</option>
                  </select>

                  {authorizationType && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900">Supporting Document</h4>
                        <p className="text-xs text-blue-700 mt-1">Please upload the official {authorizationType === 'police_inquest' ? 'inquest' : 'court'} order.</p>
                      </div>
                      <label className="cursor-pointer px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 shadow-sm flex items-center">
                        {uploading ? 'Uploading...' : <><UploadCloud className="w-4 h-4 mr-1.5" /> Upload</>}
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleFileUpload} disabled={uploading} />
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-1">Manner of Death</span>
                    <span className="text-slate-900 font-medium capitalize">{exam.manner_of_death?.replace('_', ' ') || '--'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-1">Rigor Mortis</span>
                    <span className="text-slate-900 font-medium capitalize">{exam.rigor_mortis?.replace('_', ' ') || '--'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Anatomical Notes JSON Builder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Anatomical Notes Builder</h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 mb-4">These fields are serialized directly to the JSONB column.</p>
                {['head', 'chest', 'abdomen'].map(region => (
                  <div key={region}>
                    <label className="block text-xs font-medium text-slate-700 capitalize mb-1">{region}</label>
                    <textarea 
                      rows="2"
                      value={notes[region]} 
                      onChange={e => setNotes({...notes, [region]: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-primary-500 focus:border-primary-500" 
                      placeholder={`Notes for ${region}...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Cause of Death Section (GAP 10) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Cause of Death</h3>
                {causeOfDeath && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Recorded</span>}
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Immediate Cause</label>
                  <textarea
                    rows="2"
                    value={codForm.immediateCause}
                    onChange={e => setCodForm({...codForm, immediateCause: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                    placeholder="e.g., Hypovolemic shock due to..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Antecedent Cause</label>
                  <textarea
                    rows="2"
                    value={codForm.antecedentCause}
                    onChange={e => setCodForm({...codForm, antecedentCause: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                    placeholder="e.g., Laceration of left femoral artery..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contributory Factors</label>
                  <textarea
                    rows="2"
                    value={codForm.contributory}
                    onChange={e => setCodForm({...codForm, contributory: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
                  />
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={codForm.underInvestigation} onChange={e => setCodForm({...codForm, underInvestigation: e.target.checked})} className="rounded" />
                  <span className="text-sm text-slate-700">Under Investigation</span>
                </label>
                <button onClick={saveCauseOfDeath} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700">
                  {causeOfDeath ? 'Update Cause of Death' : 'Record Cause of Death'}
                </button>
              </div>
            </div>

            {/* Deceased Identifications Section (GAP 8) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">Deceased Identifications</h3>
                </div>
                <button onClick={() => setShowIdForm(!showIdForm)} className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded font-medium hover:bg-slate-700">
                  {showIdForm ? 'Cancel' : '+ Add Identifier'}
                </button>
              </div>
              <div className="p-6 space-y-4">
                {showIdForm && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                    <input
                      placeholder="Identifier Name *"
                      value={idForm.identifierName}
                      onChange={e => setIdForm({...idForm, identifierName: e.target.value})}
                      className="w-full px-3 py-2 text-sm border rounded"
                    />
                    <input
                      placeholder="Address"
                      value={idForm.identifierAddress}
                      onChange={e => setIdForm({...idForm, identifierAddress: e.target.value})}
                      className="w-full px-3 py-2 text-sm border rounded"
                    />
                    <input
                      placeholder="Relationship to Deceased"
                      value={idForm.relationship}
                      onChange={e => setIdForm({...idForm, relationship: e.target.value})}
                      className="w-full px-3 py-2 text-sm border rounded"
                    />
                    <input
                      placeholder="NIC (optional)"
                      value={idForm.nic}
                      onChange={e => setIdForm({...idForm, nic: e.target.value})}
                      className="w-full px-3 py-2 text-sm border rounded"
                    />
                    <button onClick={addIdentification} className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium">
                      Save Identifier
                    </button>
                  </div>
                )}
                {identifications.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No identifiers recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {identifications.map(idRec => (
                      <div key={idRec.identification_id} className="py-3 first:pt-0 last:pb-0">
                        <p className="text-sm font-medium text-slate-800">{idRec.identifier_name}</p>
                        <p className="text-xs text-slate-500">{idRec.relationship}{idRec.relationship && idRec.identifier_address ? ' • ' : ''}{idRec.identifier_address}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Case Documents Widget */}
            <CaseDocumentsWidget caseId={caseInfo.case_id} />
          </>
        )}
      </div>
    </div>
  );
};

export default PostmortemCaseDetailsPage;
