import React from 'react';
import { ArrowRight, User } from 'lucide-react';

const AppendOnlyTimeline = ({ transfers }) => {
  if (!transfers || transfers.length === 0) {
    return <div className="text-sm text-slate-500 italic p-4 text-center">No custody records found.</div>;
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 my-6">
      {transfers.map((transfer, index) => (
        <div key={transfer.transfer_id || index} className="relative pl-6">
          <div className="absolute w-4 h-4 bg-primary-500 rounded-full -left-[9px] top-1 border-4 border-white" />
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400">
                {new Date(transfer.transfer_date).toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1.5 text-slate-400" />
                {transfer.transferred_by_name || 'System'}
              </div>
              <ArrowRight className="w-4 h-4 mx-3 text-slate-300" />
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1.5 text-slate-400" />
                {transfer.transferred_to_name}
              </div>
            </div>
            
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-700 mr-2">Purpose:</span>
              {transfer.purpose}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AppendOnlyTimeline;
