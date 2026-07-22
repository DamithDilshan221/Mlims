import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import RestrictedBadge from '../components/layout/RestrictedBadge';
import { User, Activity, MapPin, Hash, FileText } from 'lucide-react';

const PatientDetailsPage = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/patients/${id}`)
      .then(res => setPatient(res.data))
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
                  <RestrictedBadge allowedRoles={['admin', 'doctor', 'records_clerk']} />
                )}
              </span>
            </div>
            <div className="col-span-2 flex items-start text-slate-600 mt-2">
              <MapPin className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                {patient.address !== undefined ? (
                  patient.address || 'No address on file'
                ) : (
                  <RestrictedBadge allowedRoles={['admin', 'doctor', 'records_clerk']} />
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
            Linked Forensic Cases
          </h3>
        </div>
        <div className="divide-y divide-slate-100 p-6">
          <p className="text-slate-500 text-sm">
            (In a full implementation, this section would render the list of cases tied to this patient ID.)
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailsPage;
