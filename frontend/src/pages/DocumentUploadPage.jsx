import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { UploadCloud, File, Image as ImageIcon, X } from 'lucide-react';

const DocumentUploadPage = () => {
  const { id: caseId } = useParams();
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Per DB Grants, only certain roles can upload.
  const canUpload = ['admin', 'police', 'records_clerk'].includes(user.role);

  useEffect(() => {
    fetchDocuments();
  }, [caseId]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/digital-assets?caseId=${caseId}`);
      // For each doc, we fetch the audit log to determine 'who uploaded this' as requested in prompt.
      const docsWithUploader = await Promise.all(res.data.map(async (doc) => {
        try {
          const auditRes = await api.get(`/audit-logs?table=digital_assets&action=INSERT&recordId=${doc.asset_id}`);
          // Fallback to "System" if no audit log is found
          doc.uploadedBy = auditRes.data.length > 0 ? `User ID: ${auditRes.data[0].user_id}` : 'System';
        } catch {
          doc.uploadedBy = 'Unknown';
        }
        return doc;
      }));
      setDocuments(docsWithUploader);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side extension validation (mirroring backend rules)
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      alert("Invalid file type. Allowed: PDF, JPG, PNG, DOCX.");
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
      fetchDocuments(); // Refresh list
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    return <File className="w-8 h-8 text-red-500" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Digital Assets & Documents</h2>
          <p className="text-slate-500 text-sm mt-1">Case #{caseId}</p>
        </div>
        
        {canUpload && (
          <div>
            <label className="cursor-pointer px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm flex items-center">
              {uploading ? (
                <span className="animate-pulse">Uploading...</span>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-slate-500">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <File className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No documents found</h3>
          <p className="text-sm text-slate-500 mt-1">There are no digital assets attached to this case.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => (
            <div key={doc.asset_id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mr-4">
                  {getFileIcon(doc.file_name)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-slate-800 truncate" title={doc.file_name}>{doc.file_name}</h4>
                  <p className="text-xs text-slate-400 mt-1">Uploaded by: <span className="font-medium text-slate-600">{doc.uploadedBy}</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(doc.upload_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end space-x-3">
                {/* Relying on browser's handling of the backend's Content-Disposition */}
                <a 
                  href={`/api/digital-assets/${doc.asset_id}/content`} 
                  target="_blank" rel="noreferrer"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Download
                </a>
                
                {/* Preview is only for pdf and images */}
                {['pdf', 'jpg', 'jpeg', 'png'].includes(doc.file_name.split('.').pop().toLowerCase()) && (
                  <button 
                    onClick={() => setPreviewDoc(doc)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-800"
                  >
                    Preview Inline
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline Preview Modal (iframe) */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col z-50 p-4 lg:p-12">
          <div className="bg-white rounded-t-xl flex justify-between items-center px-6 py-4 shadow-sm z-10 relative">
            <h3 className="font-bold text-slate-800">{previewDoc.file_name}</h3>
            <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 bg-slate-100 rounded-b-xl overflow-hidden relative">
            {/* The backend explicitly sends Content-Type. For images/PDFs, iframe handles it securely without HTML execution. */}
            <iframe 
              src={`/api/digital-assets/${previewDoc.asset_id}/content`} 
              className="w-full h-full border-0"
              title="Document Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadPage;
