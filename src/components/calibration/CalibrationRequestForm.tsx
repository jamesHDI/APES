import React, { useState, useEffect } from 'react';
import { CalibrationRequest, CalibrationStatus, Evaluation, User } from '../../types';
import { MessageSquare, Plus, XCircle, Send, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { saveCalibrationRequestToSupabase, fetchCalibrationRequestsFromSupabase } from '../../services/supabaseService';

const STATUS_LABELS: Record<CalibrationStatus, string> = {
  pending_dept_head: 'Pending Dept Head Review',
  accepted: 'Accepted by Dept Head',
  rejected: 'Rejected by Dept Head',
  resubmitted_to_pod: 'Resubmitted to POD',
  pod_approved: 'POD Approved',
  pod_rejected: 'POD Rejected',
  deployed: 'Deployed',
};

const STATUS_COLORS: Record<CalibrationStatus, string> = {
  pending_dept_head: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  resubmitted_to_pod: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  pod_approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pod_rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  deployed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

interface CalibrationRequestFormProps {
  currentUser: User;
  evaluations: Evaluation[];
}

export const CalibrationRequestForm: React.FC<CalibrationRequestFormProps> = ({ currentUser, evaluations }) => {
  const [myRequests, setMyRequests] = useState<CalibrationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEvalId, setSelectedEvalId] = useState('');
  const [selectedComponentType, setSelectedComponentType] = useState<'kpi' | 'core_value' | 'weight' | 'other'>('kpi');
  const [requestedComponent, setRequestedComponent] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [requestedValue, setRequestedValue] = useState('');
  const [employeeRemark, setEmployeeRemark] = useState('');

  // Employees can only request calibration once they have received the form from POD deployment
  const myEvaluations = evaluations.filter(ev => {
    const isEmpMatch = ev.employeeId === currentUser.id || 
      (currentUser.email && ev.employeeEmail?.toLowerCase() === currentUser.email.toLowerCase());
    const isDeployedForm = ev.status !== 'archived' && ev.status !== 'superseded';
    return isEmpMatch && isDeployedForm;
  });

  const selectedEvaluation = myEvaluations.find(e => e.id === selectedEvalId);

  useEffect(() => {
    loadMyRequests();
    if (myEvaluations.length > 0 && !selectedEvalId) {
      setSelectedEvalId(myEvaluations[0].id);
    }
  }, [evaluations]);

  const loadMyRequests = async () => {
    const all = await fetchCalibrationRequestsFromSupabase();
    if (all) setMyRequests(all.filter(r => r.employeeId === currentUser.id));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleComponentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setRequestedComponent('');
      setCurrentValue('');
      return;
    }
    
    if (val.startsWith('kpi:')) {
      const kpiId = val.replace('kpi:', '');
      const kpi = selectedEvaluation?.kpiRatings.find(k => k.kpiId === kpiId || k.name === kpiId);
      if (kpi) {
        setRequestedComponent(`KPI: ${kpi.name} (${kpi.kraName})`);
        setCurrentValue(`Weight: ${kpi.weightPercent}%`);
      }
    } else if (val.startsWith('cv:')) {
      const cvId = val.replace('cv:', '');
      const cv = selectedEvaluation?.coreValueRatings.find(c => c.coreValueId === cvId || c.name === cvId);
      if (cv) {
        setRequestedComponent(`Core Value: ${cv.name}`);
        setCurrentValue('Core Value Rating Criteria');
      }
    } else if (val === 'formula_eligibility') {
      setRequestedComponent('Formula: Eligibility Weight (Part 1A)');
      setCurrentValue(`${selectedEvaluation?.formulaConfig?.eligibilityWeight ?? 85}%`);
    } else if (val === 'formula_core_values') {
      setRequestedComponent('Formula: Core Values Weight (Part 1B)');
      setCurrentValue(`${selectedEvaluation?.formulaConfig?.coreValuesWeight ?? 15}%`);
    } else {
      setRequestedComponent(val);
      setCurrentValue('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedEvalId) {
      showToast('Please select a deployed evaluation.');
      return;
    }
    if (!requestedComponent.trim() || !requestedValue.trim()) {
      showToast('Please fill in the component and requested value.');
      return;
    }

    setLoading(true);
    const selectedEval = selectedEvaluation || myEvaluations.find(e => e.id === selectedEvalId);
    const newRequest: CalibrationRequest = {
      id: `cal_${Date.now()}`,
      evaluationId: selectedEvalId,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      departmentId: currentUser.departmentId || '',
      departmentName: currentUser.departmentName || '',
      evaluationTitle: selectedEval?.title || selectedEval?.templateTitle || 'Evaluation Form',
      requestedComponent: requestedComponent.trim(),
      currentValue: currentValue.trim(),
      requestedValue: requestedValue.trim(),
      employeeRemark: employeeRemark.trim(),
      status: 'pending_dept_head',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveCalibrationRequestToSupabase(newRequest);
    setLoading(false);
    if (saved) {
      setMyRequests(prev => [newRequest, ...prev]);
      setShowForm(false);
      setRequestedComponent(''); 
      setCurrentValue(''); 
      setRequestedValue(''); 
      setEmployeeRemark('');
      showToast('Calibration request submitted to Department Head!');
    } else {
      showToast('Could not submit calibration request. Please try again.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-500 flex items-center gap-2 animate-in fade-in">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-500" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Calibration Requests</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Request an adjustment or review for specific KPIs, weights, or standards on your deployed evaluation form.
          </p>
        </div>
        <button 
          onClick={() => {
            if (myEvaluations.length === 0) {
              showToast('No deployed evaluation form received from POD yet.');
              return;
            }
            setShowForm(true);
          }} 
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md flex items-center gap-2 shrink-0 transition-all"
        >
          <Plus className="w-4 h-4" /> New Calibration Request
        </button>
      </div>

      {/* No Deployed Form Notice */}
      {myEvaluations.length === 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold">Awaiting Evaluation Form from POD Deployment</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              You can only submit calibration requests once People Operations (POD) deploys an evaluation form to you. Once received, your form components and KPIs will be available here for calibration.
            </p>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">New Calibration Request</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Deployed Evaluation Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Deployed Evaluation Form *
                </label>
                <select 
                  value={selectedEvalId} 
                  onChange={e => setSelectedEvalId(e.target.value)} 
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {myEvaluations.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title || ev.templateTitle || 'Evaluation Form'} ({ev.appraisalPeriod || 'Current Period'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Component Picker from Deployed Form */}
              {selectedEvaluation && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Select from Deployed Form Components
                  </label>
                  <select
                    onChange={handleComponentSelect}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose a KPI or Component to Autofill --</option>
                    <optgroup label="Eligibility KPIs (Part 1A)">
                      {selectedEvaluation.kpiRatings?.map(kpi => (
                        <option key={kpi.kpiId} value={`kpi:${kpi.kpiId}`}>
                          [{kpi.kraName}] {kpi.name} — Current Weight: {kpi.weightPercent}%
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Formula Weights">
                      <option value="formula_eligibility">Part 1A Eligibility Weight ({selectedEvaluation.formulaConfig?.eligibilityWeight ?? 85}%)</option>
                      <option value="formula_core_values">Part 1B Core Values Weight ({selectedEvaluation.formulaConfig?.coreValuesWeight ?? 15}%)</option>
                    </optgroup>
                    <optgroup label="Core Values (Part 1B)">
                      {selectedEvaluation.coreValueRatings?.map(cv => (
                        <option key={cv.coreValueId} value={`cv:${cv.coreValueId}`}>{cv.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Custom / Selected Component Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Target Component / KPI *
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. KPI: Sales Quota Target, Weight %" 
                  value={requestedComponent} 
                  onChange={e => setRequestedComponent(e.target.value)} 
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" 
                />
              </div>

              {/* Current & Requested Values */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Current Value</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Weight: 20%" 
                    value={currentValue} 
                    onChange={e => setCurrentValue(e.target.value)} 
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Requested Value *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Weight: 15%" 
                    value={requestedValue} 
                    onChange={e => setRequestedValue(e.target.value)} 
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold" 
                  />
                </div>
              </div>

              {/* Reason / Justification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Reason / Justification for Calibration
                </label>
                <textarea 
                  rows={3} 
                  placeholder="Explain why this calibration is requested (e.g. change in scope, target adjustment)..." 
                  value={employeeRemark} 
                  onChange={e => setEmployeeRemark(e.target.value)} 
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white resize-none" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setShowForm(false)} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 flex items-center gap-1.5 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" /> {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests History List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          My Calibration Requests ({myRequests.length})
        </h3>
        {myRequests.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No calibration requests submitted yet.</p>
            {myEvaluations.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1">Click "New Calibration Request" to submit one for your active form.</p>
            )}
          </div>
        ) : myRequests.map(req => (
          <div key={req.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors" 
              onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-700'}`}>
                  {STATUS_LABELS[req.status] || req.status}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{req.requestedComponent}</p>
                  <p className="text-[10px] text-slate-400">
                    {req.evaluationTitle} • Requested: <span className="font-bold text-brand-600">{req.requestedValue}</span> • {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {expandedId === req.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {expandedId === req.id && (
              <div className="px-4 pb-4 space-y-2.5 text-xs border-t border-slate-100 dark:border-slate-700 pt-3">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-750">
                  <div>
                    <p className="text-slate-400 uppercase font-semibold text-[10px]">Current Value</p>
                    <p className="text-slate-800 dark:text-white mt-0.5">{req.currentValue || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase font-semibold text-[10px]">Requested Value</p>
                    <p className="font-bold text-brand-600 dark:text-brand-400 mt-0.5">{req.requestedValue}</p>
                  </div>
                </div>

                {req.employeeRemark && (
                  <div className="text-slate-600 dark:text-slate-300 italic bg-slate-50/50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-750">
                    "{req.employeeRemark}"
                  </div>
                )}

                {req.deptHeadRemark && (
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">Dept Head Remarks</p>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">{req.deptHeadRemark}</p>
                  </div>
                )}

                {req.podRemark && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">POD Remarks</p>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">{req.podRemark}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
