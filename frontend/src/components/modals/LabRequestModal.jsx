import React, { useState, useEffect } from 'react';
import { X, FlaskConical, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const LabRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cases, setCases] = useState([]);
  const [specimens, setSpecimens] = useState([]);

  const [formData, setFormData] = useState({
    caseId: '',
    specimenId: '',
    requestType: 'Toxicology',
    clinicalNotes: '',
    govtAnalystRef: ''
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch cases where status != 'closed'
      api.get('/cases?limit=100').then(res => {
        // Filter to only active cases, allowing doctors to select from any case in the system
        const activeCases = res.data.filter(c => c.status !== 'closed');
        setCases(activeCases);
      }).catch(err => console.error(err));
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (formData.caseId) {
      api.get(`/specimens?caseId=${formData.caseId}`).then(res => {
        setSpecimens(res.data);
      }).catch(err => console.error(err));
    } else {
      setSpecimens([]);
    }
  }, [formData.caseId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/lab-requests', {
        specimenId: parseInt(formData.specimenId, 10),
        requestType: formData.requestType,
        requestDate: new Date().toISOString().split('T')[0],
        clinicalNotes: formData.clinicalNotes || undefined,
        govtAnalystRef: formData.govtAnalystRef || undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
          <h2 className="text-xl font-bold font-outfit flex items-center">
            <FlaskConical className="w-5 h-5 mr-2" /> Request Lab / Tox Report
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Select Case *</label>
            <select 
              required
              value={formData.caseId}
              onChange={e => setFormData({ ...formData, caseId: e.target.value, specimenId: '' })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a case...</option>
              {cases.map(c => (
                <option key={c.case_id} value={c.case_id}>{c.case_number} — {c.patient_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Select Specimen *</label>
            <select 
              required
              value={formData.specimenId}
              onChange={e => setFormData({ ...formData, specimenId: e.target.value })}
              disabled={!formData.caseId || specimens.length === 0}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">{formData.caseId ? (specimens.length > 0 ? "Select a specimen..." : "No specimens found for this case") : "Select a case first"}</option>
              {specimens.map(s => (
                <option key={s.specimen_id} value={s.specimen_id}>{s.barcode_id} ({s.specimen_type_name})</option>
              ))}
            </select>
            {formData.caseId && specimens.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> A specimen must be collected and logged before requesting a lab test.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Test Type *</label>
            <select 
              required
              value={formData.requestType}
              onChange={e => setFormData({ ...formData, requestType: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Toxicology">Toxicology (Tox Screen)</option>
              <option value="Histopathology">Histopathology</option>
              <option value="DNA Analysis">DNA Analysis</option>
              <option value="Blood Alcohol Content (BAC)">Blood Alcohol Content (BAC)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Clinical Notes & Findings</label>
            <textarea 
              value={formData.clinicalNotes}
              onChange={e => setFormData({ ...formData, clinicalNotes: e.target.value })}
              rows={3}
              placeholder="Provide background context or specific requests for the analyst..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !formData.specimenId}
              className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow hover:shadow-lg transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FlaskConical className="w-5 h-5 mr-2" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LabRequestModal;
