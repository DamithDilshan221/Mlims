import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { UploadCloud, FileText, Image as ImageIcon, X, File } from 'lucide-react';
import clsx from 'clsx';

const CaseDocumentsWidget = ({ caseId }) => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const canUpload = ['admin', 'police', 'records_clerk', 'doctor', 'forensic_staff'].includes(user?.role);

  useEffect(() => {
    if (caseId) fetchDocuments();
  }, [caseId]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/digital-assets?caseId=${caseId}`);
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      toast.error("Invalid file type. Allowed: PDF, JPG, PNG, DOCX.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('case_id', caseId);
    formData.append('file_name', file.name);

    try {
      await api.post('/digital-assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Document uploaded successfully.");
      fetchDocuments();
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-slate-500" />
          Case Documents & Reports
        </h3>
        {canUpload && (
          <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center">
            {uploading ? 'Uploading...' : '+ Upload'}
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleFileUpload} disabled={uploading} />
          </label>
        )}
      </div>
      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No reports or images uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.asset_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center flex-1 overflow-hidden pr-2">
                  {getFileIcon(doc.file_name)}
                  <div className="ml-3 truncate">
                    <p className="text-sm font-medium text-slate-800 truncate" title={doc.file_name}>{doc.file_name}</p>
                    <p className="text-xs text-slate-400">{new Date(doc.upload_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {['pdf', 'jpg', 'jpeg', 'png'].includes(doc.file_name.split('.').pop().toLowerCase()) && (
                    <button onClick={() => setPreviewDoc(doc)} className="text-xs font-bold text-primary-600 hover:text-primary-800">
                      View
                    </button>
                  )}
                  <a href={`/api/digital-assets/${doc.asset_id}/content`} target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-500 hover:text-slate-800">
                    DL
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col z-50 p-4 lg:p-12">
          <div className="bg-white rounded-t-xl flex justify-between items-center px-6 py-4 shadow-sm z-10 relative">
            <h3 className="font-bold text-slate-800">{previewDoc.file_name}</h3>
            <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 bg-slate-100 rounded-b-xl overflow-hidden relative">
            <iframe src={`/api/digital-assets/${previewDoc.asset_id}/content`} className="w-full h-full border-0" title="Document Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDocumentsWidget;
