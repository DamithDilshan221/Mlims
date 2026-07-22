import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import RestrictedBadge from '../components/layout/RestrictedBadge';
import { Search as SearchIcon, FileText, User, Package } from 'lucide-react';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState({ patients: [], cases: [], specimens: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) {
      setError('Please enter at least 3 characters to search.');
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    setError(null);

    const encoded = encodeURIComponent(query.trim());

    try {
      if (searchType === 'all') {
        // Fire all 3 searches in parallel, catching individual failures
        const [caseRes, patientRes, specimenRes] = await Promise.allSettled([
          api.get(`/search?q=${encoded}&type=case`),
          api.get(`/search?q=${encoded}&type=patient`),
          api.get(`/search?q=${encoded}&type=specimen`),
        ]);

        setResults({
          cases: caseRes.status === 'fulfilled' ? caseRes.value.data : [],
          patients: patientRes.status === 'fulfilled' ? patientRes.value.data : [],
          specimens: specimenRes.status === 'fulfilled' ? specimenRes.value.data : [],
        });
      } else {
        const res = await api.get(`/search?q=${encoded}&type=${searchType}`);
        setResults({
          cases: searchType === 'case' ? res.data : [],
          patients: searchType === 'patient' ? res.data : [],
          specimens: searchType === 'specimen' ? res.data : [],
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Search failed.');
      setResults({ patients: [], cases: [], specimens: [] });
    } finally {
      setLoading(false);
    }
  };

  const totalResults = results.patients.length + results.cases.length + results.specimens.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Global Search</h2>
        
        {/* Search type tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {[
            { value: 'all', label: 'All' },
            { value: 'case', label: 'Cases' },
            { value: 'patient', label: 'Patients (by NIC)' },
            { value: 'specimen', label: 'Specimens (by Barcode)' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setSearchType(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                searchType === tab.value 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
          <input 
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              searchType === 'case' ? 'Enter Case Number (e.g. CASE-2026...)' :
              searchType === 'patient' ? 'Enter NIC number (e.g. 199012345678)' :
              searchType === 'specimen' ? 'Enter Barcode ID' :
              'Search by Case Number, NIC, or Barcode ID...'
            }
            className="w-full pl-6 pr-16 py-4 text-lg border-2 border-slate-200 rounded-full focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm transition-all"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SearchIcon className="w-5 h-5" />}
          </button>
        </form>

        {error && (
          <p className="text-red-600 text-sm mt-3">{error}</p>
        )}
      </div>

      {hasSearched && !loading && (
        <div className="space-y-8">
          <p className="text-slate-500 font-medium text-sm">
            Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
          </p>

          {/* PATIENT RESULTS */}
          {results.patients.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-200 pb-2">
                <User className="w-5 h-5 mr-2 text-primary-600" /> Patients ({results.patients.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.patients.map(p => (
                  <div key={p.patient_id} 
                    onClick={() => navigate(`/patients/${p.patient_id}`)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <h4 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{p.full_name}</h4>
                    <div className="mt-2 text-sm text-slate-500 space-y-1">
                      <p>NIC: {p.nic_passport !== undefined ? p.nic_passport : <RestrictedBadge allowedRoles={['admin', 'doctor', 'records_clerk']} />}</p>
                      <p>Gender: {p.gender}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CASE RESULTS */}
          {results.cases.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-200 pb-2">
                <FileText className="w-5 h-5 mr-2 text-amber-600" /> Forensic Cases ({results.cases.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.cases.map(c => (
                  <div key={c.case_id} 
                    onClick={() => navigate(`/cases/${c.case_type}/${c.case_id}`)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{c.case_number}</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize">{c.case_type}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500 space-y-1">
                      <p>Status: {c.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPECIMEN RESULTS */}
          {results.specimens.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4 border-b border-slate-200 pb-2">
                <Package className="w-5 h-5 mr-2 text-emerald-600" /> Specimens ({results.specimens.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.specimens.map(s => (
                  <div key={s.specimen_id} 
                    onClick={() => navigate(`/evidence`)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{s.barcode_id}</h4>
                    <div className="mt-2 text-sm text-slate-500 space-y-1">
                      <p>Location: {s.current_location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SearchPage;
