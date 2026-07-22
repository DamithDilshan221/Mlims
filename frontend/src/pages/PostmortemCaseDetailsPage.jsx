import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { BookOpen, UserMinus } from 'lucide-react';

const PostmortemCaseDetailsPage = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  // Anatomical notes JSON editor state
  const [notes, setNotes] = useState({
    head: '',
    chest: '',
    abdomen: ''
  });

  useEffect(() => {
    api.get(`/postmortem-examinations`)
      .then(res => {
        const match = res.data.find(e => e.pmr_id == id);
        if (match) {
          setExam(match);
          if (match.anatomical_notes) setNotes(match.anatomical_notes);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const saveNotes = async () => {
    try {
      await api.patch(`/postmortem-examinations/${id}`, { anatomicalNotes: notes });
      alert("Notes saved successfully");
    } catch (err) {
      alert("Failed to save notes");
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
        
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
            <UserMinus className="w-5 h-5 mr-2 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Death Details</h3>
          </div>
          <div className="p-6 space-y-4">
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
