import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { BookOpen, UserMinus, UploadCloud } from 'lucide-react';

const PostmortemCaseDetailsPage = () => {
  const { id } = useParams();
  const toast = useToast();
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

  useEffect(() => {
    api.get(`/postmortem-examinations/${id}`)
      .then(res => {
        setExam(res.data);
        if (res.data?.authorization_type) setAuthorizationType(res.data.authorization_type);
        if (res.data?.anatomical_notes) setNotes(res.data.anatomical_notes);
      })
      .catch(() => {
        api.get(`/postmortem-examinations`)
          .then(res => {
            const match = res.data.find(e => e.pmr_id == id || e.case_id == id);
            if (match) {
              setExam(match);
              if (match.authorization_type) setAuthorizationType(match.authorization_type);
              if (match.anatomical_notes) setNotes(match.anatomical_notes);
            }
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [id]);

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
      e.target.value = null; // reset input
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!exam) return <div className="p-8">Record not found or restricted.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Postmortem Examination (PMR)</h2>
          <p className="text-slate-500 text-sm mt-1">PMR ID: #{exam.pmr_id} • Inquest: {exam.inquest_no}</p>
        </div>
        <div className="space-x-3">
          <Link to={`/exam-injury?pmrId=${exam.pmr_id}`} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">
            Add Injury
          </Link>
          <button onClick={saveNotes} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">
            Save Notes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Basic Info & Authorization */}
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

      </div>
    </div>
  );
};

export default PostmortemCaseDetailsPage;
