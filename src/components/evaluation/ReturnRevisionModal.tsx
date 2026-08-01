import React, { useState } from 'react';
import { User, Evaluation } from '../../types';
import { RotateCcw, AlertCircle, X, Send } from 'lucide-react';

interface ReturnRevisionModalProps {
  isOpen: boolean;
  evaluation: Evaluation;
  currentUser: User;
  onClose: () => void;
  onConfirmReturn: (reason: string) => void;
}

export const ReturnRevisionModal: React.FC<ReturnRevisionModalProps> = ({
  isOpen,
  evaluation,
  currentUser,
  onClose,
  onConfirmReturn,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a detailed reason for returning this evaluation for revision.');
      return;
    }
    setError('');
    onConfirmReturn(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Return Evaluation for Revision
            </h3>
            <p className="text-xs text-slate-500">
              Return scorecard for <strong className="text-slate-700 dark:text-slate-300">{evaluation.employeeName}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Required Revision Reason / Remarks
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Specify the exact sections, KPI ratings, evidence files, or comments that require revision before resubmission..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-bold">Workflow Action Notice:</p>
            <p>
              Returning this evaluation will switch its status to <strong>Returned for Revision (reopened)</strong> and automatically notify the recipient with your revision notes.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md flex items-center space-x-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirm & Return for Revision</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
