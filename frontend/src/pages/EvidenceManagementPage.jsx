import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import AppendOnlyTimeline from '../components/layout/AppendOnlyTimeline';
import { Package, Search, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EvidenceManagementPage = () => {
  const { user } = useAuth();
  const [specimens, setSpecimens] = useState([]);
  const [loading, setLoading] = useState(true);

  // New transfer form state (Forensic Staff Only)
  const [showTransferForm, setShowTransferForm] = useState(null); // holds specimen_id
  const [transferData, setTransferData] = useState({ transferred_to: '', purpose: '' });

  useEffect(() => {
    api.get('/specimens')
      .then(res => setSpecimens(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submitTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/chain-of-custody', { ...transferData, specimen_id: showTransferForm });
      setShowTransferForm(null);
      // Reload specimens (in a real app, update state directly)
      const res = await api.get('/specimens');
      setSpecimens(res.data);
    } catch (err) {
      alert("Failed to record transfer");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Evidence & Samples</h2>
        <p className="text-slate-500 text-sm mt-1">Manage physical specimens and track chain of custody.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Scan Barcode or Search..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : specimens.map(s => (
            <div key={s.specimen_id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center">
                    <Package className="w-5 h-5 mr-2 text-slate-400" />
                    <h3 className="font-bold text-slate-800 text-lg">{s.specimen_type}</h3>
                  </div>
                  <p className="text-sm text-slate-500 font-mono mt-1">Barcode: {s.barcode_id}</p>
                </div>
                
                {user.role === 'forensic_staff' && showTransferForm !== s.specimen_id && (
                  <button 
                    onClick={() => setShowTransferForm(s.specimen_id)}
                    className="flex items-center px-3 py-1.5 text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-md font-medium"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Record Transfer
                  </button>
                )}
              </div>

              {/* Custody Timeline */}
              <div className="pl-7">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chain of Custody</h4>
                <AppendOnlyTimeline transfers={s.custody_records || []} />
                
                {/* Append-Only Form */}
                {showTransferForm === s.specimen_id && (
                  <form onSubmit={submitTransfer} className="mt-4 bg-slate-50 p-4 border border-slate-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Transfer To (Staff ID)</label>
                        <input type="number" required value={transferData.transferred_to} onChange={e => setTransferData({...transferData, transferred_to: e.target.value})} className="w-full px-3 py-1.5 text-sm border rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Purpose</label>
                        <input type="text" required value={transferData.purpose} onChange={e => setTransferData({...transferData, purpose: e.target.value})} className="w-full px-3 py-1.5 text-sm border rounded" />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button type="button" onClick={() => setShowTransferForm(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded">Cancel</button>
                      <button type="submit" className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded font-medium hover:bg-slate-800">Save Transfer</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EvidenceManagementPage;
