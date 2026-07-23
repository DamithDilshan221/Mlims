import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import RestrictedBadge from '../components/layout/RestrictedBadge';

import { useAuth } from '../context/AuthContext';
import { User, Activity, MapPin, Hash, FileText, UploadCloud, Scale } from 'lucide-react';

const PatientDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const canAddPdf = ['admin', 'doctor', 'records_clerk'].includes(user?.role);
  const canOpenCourtReport = ['admin', 'doctor', 'court'].includes(user?.role);

  useEffect(() => {
    Promise.all([
      api.get(`/patients/${id}`),
      api.get(`/cases?patientId=${id}`).catch(() => ({ data: [] }))
    ])
      .then(([patientRes, casesRes]) => {
        setPatient(patientRes.data);
        setCases(casesRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500">Loading patient...</div>;
  if (!patient) return <div className="p-8 text-red-500">Patient not found or restricted.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-start">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mr-8 flex-shrink-0">
          <User className="w-10 h-10" />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-slate-900">{patient.full_name}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-slate-600">
              <Activity className="w-4 h-4 mr-2 text-slate-400" />
              <span>{patient.age ?? '--'} years • {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</span>
            </div>
            <div className="flex items-center text-slate-600">
              <Hash className="w-4 h-4 mr-2 text-slate-400" />
              <span>
                NIC: &nbsp;
                {patient.nic_passport !== undefined ? (
                  patient.nic_passport || 'None'
                ) : (
                  <RestrictedBadge allowedRoles={['admin', 'doctor', 'records_clerk', 'police', 'court']} />
                )}
              </span>
            </div>
            <div className="col-span-2 flex items-start text-slate-600 mt-2">
              <MapPin className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                {patient.address !== undefined ? (
                  patient.address || 'No address on file'
                ) : (
                  <RestrictedBadge allowedRoles={['admin', 'doctor', 'records_clerk', 'police', 'court']} />
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Cases */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-slate-500" />
            Linked Forensic Cases ({cases.length})
          </h3>
          {['admin', 'records_clerk', 'police'].includes(user.role) && (
            <Link to="/cases/new" className="text-xs font-semibold text-primary-600 hover:text-primary-800">
              + New Case
            </Link>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {cases.length === 0 ? (
            <p className="p-6 text-slate-500 text-sm">No forensic cases currently linked to this patient.</p>
          ) : (
            cases.map(c => (
              <div key={c.case_id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                <div>
                  <Link to={`/cases/${c.case_type}/${c.case_id}`} className="font-bold text-slate-800 hover:text-primary-600">
                    {c.case_number}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">Type: {c.case_type} • Location: {c.incident_location || 'N/A'}</p>
                  {(canAddPdf || canOpenCourtReport) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canAddPdf && (
                        <Link
                          to={`/cases/${c.case_id}/documents`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                          Add PDF
                        </Link>
                      )}
                      {canOpenCourtReport && (
                        <Link
                          to="/reports/court"
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"
                        >
                          <Scale className="w-3.5 h-3.5 mr-1.5" />
                          Court Report
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                  {c.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetailsPage;
