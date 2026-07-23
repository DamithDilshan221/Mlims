import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AlertCircle } from 'lucide-react';

const ExaminationFormPage = () => {
  const [searchParams] = useSearchParams();
  const mlefId = searchParams.get('mlefId');
  const pmrId = searchParams.get('pmrId');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [injuryTypes, setInjuryTypes] = useState([]);
  const [weaponTypes, setWeaponTypes] = useState([]);

  const [formData, setFormData] = useState({
    injuryTypeId: '',
    weaponTypeId: '',
    bodyPart: '',
    sizeAndShape: '',
    categoryOfHurt: 'simple'
  });

  useEffect(() => {
    Promise.all([
      api.get('/lookups/injury_types'),
      api.get('/lookups/weapon_types')
    ]).then(([injRes, wpnRes]) => {
      setInjuryTypes(injRes.data);
      setWeaponTypes(wpnRes.data);
      if (injRes.data.length > 0) {
        setFormData(prev => ({ ...prev, injuryTypeId: injRes.data[0].injury_type_id }));
      }
    }).catch(() => {});
  }, []);

  const fillDummyData = () => {
    setFormData({
      injuryTypeId: injuryTypes[0]?.injury_type_id || 1,
      weaponTypeId: weaponTypes[0]?.weapon_type_id || '',
      bodyPart: 'Left Forearm',
      sizeAndShape: '3cm linear abrasion',
      categoryOfHurt: 'simple'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      injuryTypeId: parseInt(formData.injuryTypeId, 10),
      weaponTypeId: formData.weaponTypeId ? parseInt(formData.weaponTypeId, 10) : undefined,
      mlefId: mlefId ? parseInt(mlefId, 10) : undefined,
      pmrId: pmrId ? parseInt(pmrId, 10) : undefined
    };

    try {
      await api.post('/exam-injuries', payload);
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save injury.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add Examination Injury</h2>
            <p className="text-sm text-slate-500 mt-1">
              Attaching to {mlefId ? `Clinical Exam #${mlefId}` : `Postmortem Exam #${pmrId}`}
            </p>
          </div>
          {import.meta.env.DEV && (
            <button 
              type="button" 
              onClick={fillDummyData}
              className="px-3 py-1 bg-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-300 transition-colors"
            >
              Fill Dummy Data
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start text-sm border border-red-200">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Injury Type *</label>
                <select
                  required
                  value={formData.injuryTypeId}
                  onChange={e => setFormData({...formData, injuryTypeId: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500"
                >
                  {injuryTypes.map(it => (
                    <option key={it.injury_type_id} value={it.injury_type_id}>{it.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Weapon Type (Optional)</label>
                <select
                  value={formData.weaponTypeId}
                  onChange={e => setFormData({...formData, weaponTypeId: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500"
                >
                  <option value="">None / Unknown</option>
                  {weaponTypes.map(wt => (
                    <option key={wt.weapon_type_id} value={wt.weapon_type_id}>{wt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Body Part</label>
              <input 
                type="text" required 
                value={formData.bodyPart} 
                onChange={e => setFormData({...formData, bodyPart: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Size & Shape</label>
              <input 
                type="text" required 
                value={formData.sizeAndShape} 
                onChange={e => setFormData({...formData, sizeAndShape: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category of Hurt</label>
              <select 
                value={formData.categoryOfHurt} 
                onChange={e => setFormData({...formData, categoryOfHurt: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="simple">Simple</option>
                <option value="grievous">Grievous</option>
                <option value="fatal">Fatal</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" onClick={() => navigate(-1)}
              className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" disabled={loading}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Injury'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExaminationFormPage;
