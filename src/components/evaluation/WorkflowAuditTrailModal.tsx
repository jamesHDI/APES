import React from 'react';
import { EvaluationAuditTrailEntry } from '../../types';
import { X, History, ShieldCheck, Clock, UserCheck } from 'lucide-react';

interface WorkflowAuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditTrail: EvaluationAuditTrailEntry[];
  employeeName: string;
}

export const WorkflowAuditTrailModal: React.FC<WorkflowAuditTrailModalProps> = ({
  isOpen,
  onClose,
  auditTrail = [],
  employeeName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Evaluation Workflow Audit Trail
              </h3>
              <p className="text-xs text-slate-500">Employee: {employeeName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Log Timeline */}
        {auditTrail.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No audit log entries recorded yet for this evaluation.
          </div>
        ) : (
          <div className="space-y-3">
            {auditTrail.map((entry) => (
              <div key={entry.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-brand-700 dark:text-brand-300">
                    {entry.actionPerformed}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {entry.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>Performed By:</strong> {entry.performedBy} ({entry.performedByRole})</p>
                  <p><strong>Assigned Recipient:</strong> {entry.assignedTo}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500">
                    Status: <span className="uppercase text-slate-700 dark:text-slate-300">{entry.previousStatus}</span> → <span className="uppercase text-brand-600">{entry.newStatus}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">IP: {entry.ipAddress || '192.168.1.100'}</span>
                </div>

                {entry.remarks && (
                  <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 mt-1">
                    "{entry.remarks}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
          >
            Close Audit Trail
          </button>
        </div>

      </div>
    </div>
  );
};
